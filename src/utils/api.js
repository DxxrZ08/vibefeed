import { mockArticles } from './mockData';
import { getCategoryByKey, NEWS_CATEGORIES, NEWS_REGIONS } from './newsTaxonomy';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
const PUBLIC_NEWS_BASE = 'https://saurav.tech/NewsAPI/top-headlines/category';

const stopWords = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'and', 'but', 'or', 'if', 'then', 'this', 'that', 'these', 'those', 'into', 'about',
  'your', 'their', 'they', 'them', 'while', 'after', 'before', 'through', 'over', 'under', 'more', 'most', 'some',
  'such', 'only', 'than', 'very', 'just', 'also', 'because', 'when', 'where', 'what', 'which', 'who', 'whom',
]);

const sentimentLexicon = {
  positive: ['breakthrough', 'success', 'win', 'surge', 'growth', 'gain', 'record', 'innovation', 'strong', 'boost'],
  negative: ['crash', 'drop', 'loss', 'probe', 'crisis', 'decline', 'threat', 'warning', 'risk', 'layoff'],
};

export const extractKeywords = (text = '') => {
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  const counts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
};

export const analyzeSentiment = (text = '') => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;

  words.forEach((word) => {
    if (sentimentLexicon.positive.includes(word)) score += 1;
    if (sentimentLexicon.negative.includes(word)) score -= 1;
  });

  if (score >= 2) return { sentiment: 'Positive', score };
  if (score <= -2) return { sentiment: 'Negative', score };
  return { sentiment: 'Neutral', score };
};

export const classifyTopic = (title = '', summary = '') => {
  const text = `${title} ${summary}`.toLowerCase();

  const topicRules = {
    Technology: ['ai', 'software', 'startup', 'chip', 'cyber', 'cloud', 'app'],
    Business: ['market', 'stocks', 'economy', 'business', 'trade', 'company', 'investor'],
    Science: ['research', 'study', 'space', 'scientist', 'climate', 'discovery'],
    Health: ['health', 'medicine', 'hospital', 'disease', 'wellness', 'doctor'],
    Sports: ['match', 'league', 'player', 'team', 'goal', 'championship'],
    Entertainment: ['movie', 'music', 'film', 'show', 'celebrity', 'streaming'],
    World: ['government', 'election', 'policy', 'war', 'minister', 'president'],
  };

  const scoredTopic = Object.entries(topicRules)
    .map(([topic, keywords]) => ({
      topic,
      score: keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return scoredTopic?.score ? scoredTopic.topic : 'World';
};

export const calculateRelevance = (article, userPreferences = []) => {
  let score = 66;

  if (!userPreferences.length) {
    return score;
  }

  const text = `${article.title} ${article.summary} ${article.category} ${article.topic}`.toLowerCase();

  userPreferences.forEach((preference) => {
    const normalized = String(preference).toLowerCase();
    if (text.includes(normalized)) score += 10;
  });

  if (article.sentiment === 'Positive') score += 4;
  if ((article.keywords || []).length >= 4) score += 5;

  return Math.min(99, Math.max(55, score));
};

const normalizeBackendArticle = (article, userPreferences = []) => {
  const sentimentResult = analyzeSentiment(`${article.title} ${article.summary}`);
  const keywords = article.keywords?.length ? article.keywords : extractKeywords(`${article.title} ${article.summary}`);
  const topic = article.topic || classifyTopic(article.title, article.summary);
  const categoryLabel = article.categoryLabel || getCategoryByKey(article.category).label;

  const enriched = {
    ...article,
    summary: article.summary || article.description || 'No summary available yet.',
    image:
      article.image ||
      'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80',
    category: categoryLabel,
    keywords,
    topic,
    sentiment: article.sentiment || sentimentResult.sentiment,
    sentimentScore: article.sentimentScore ?? sentimentResult.score,
  };

  enriched.relevanceScore = article.relevanceScore || calculateRelevance(enriched, userPreferences);
  enriched.mlTags = article.mlTags || [
    enriched.relevanceScore > 88 ? 'High Match' : 'Live Signal',
    article.aiEnhanced ? 'AI Summary' : 'ML Ranked',
  ];

  return enriched;
};

const fetchFallbackNews = async (categoryKey = 'all', region = 'us', userPreferences = []) => {
  const category = getCategoryByKey(categoryKey);
  const apiCategory = category.apiCategory || 'general';
  const response = await fetch(`${PUBLIC_NEWS_BASE}/${apiCategory}/${region}.json`);

  if (!response.ok) {
    throw new Error('Fallback API request failed');
  }

  const data = await response.json();
  const todayDate = new Date().toISOString().slice(0, 10);

  return data.articles
    .filter((article) => article.title && article.description && article.publishedAt?.startsWith(todayDate))
    .slice(0, 18)
    .map((article, index) =>
      normalizeBackendArticle(
        {
          id: `fallback-${region}-${apiCategory}-${index}`,
          title: article.title,
          summary: article.description,
          image: article.urlToImage,
          category: categoryKey,
          categoryLabel: category.label,
          source: article.source.name,
          date: article.publishedAt,
          url: article.url,
          region,
        },
        userPreferences
      )
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

const fetchFromBackend = async (category, region, userPreferences) => {
  const params = new URLSearchParams({
    category,
    region,
    limit: '18',
    interests: userPreferences.join(','),
    from: new Date().toISOString().slice(0, 10),
  });

  const response = await fetch(`${BACKEND_URL}/news/live-feed?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Backend live feed unavailable');
  }

  return response.json();
};

const buildLocalBundle = (articles, provider = 'fallback') => ({
  articles,
  clusters: [],
  digest: articles.length
    ? `Tracking ${articles.length} live fallback stories while the primary backend reconnects.`
    : 'Fallback feed is active, but no stories matched this request.',
  meta: {
    provider,
    articleCount: articles.length,
    clusterCount: 0,
  },
});

export const fetchNews = async (category = 'all', region = 'us', userPreferences = []) => {
  try {
    const data = await fetchFromBackend(category, region, userPreferences);
    return data.articles.map((article) => normalizeBackendArticle(article, userPreferences));
  } catch (error) {
    console.error('Falling back to direct news feed:', error);

    try {
      return await fetchFallbackNews(category, region, userPreferences);
    } catch (fallbackError) {
      console.error('Using mock data:', fallbackError);

      return mockArticles.map((article) =>
        normalizeBackendArticle(
          {
            ...article,
            category: article.category.toLowerCase(),
            categoryLabel: article.category,
            topic: classifyTopic(article.title, article.summary),
          },
          userPreferences
        )
      );
    }
  }
};

export const fetchNewsBundle = async (category = 'all', region = 'us', userPreferences = []) => {
  try {
    const data = await fetchFromBackend(category, region, userPreferences);
    const articles = data.articles.map((article) => normalizeBackendArticle(article, userPreferences));

    return {
      ...data,
      articles,
      clusters: data.clusters || [],
      digest: data.digest || '',
      meta: data.meta || {},
    };
  } catch {
    const articles = await fetchNews(category, region, userPreferences);
    return buildLocalBundle(articles);
  }
};

export const searchNews = async ({ query = '', category = 'all', region = 'us', userPreferences = [] }) => {
  const normalizedQuery = String(query).trim().toLowerCase();

  try {
    const params = new URLSearchParams({
      q: query,
      category,
      region,
      interests: userPreferences.join(','),
      from: new Date().toISOString().slice(0, 10),
    });

    const response = await fetch(`${BACKEND_URL}/news/discover?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Unable to search live feed.');
    }

    const data = await response.json();
    return {
      ...data,
      articles: data.articles.map((article) => normalizeBackendArticle(article, userPreferences)),
    };
  } catch {
    const fallbackArticles = await fetchNews(category, region, userPreferences);
    const filteredArticles = normalizedQuery
      ? fallbackArticles.filter((article) =>
          `${article.title} ${article.summary} ${article.topic} ${(article.keywords || []).join(' ')}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : fallbackArticles;

    return buildLocalBundle(filteredArticles, 'fallback-search');
  }
};

export const fetchVibeScope = async (category = 'all', regions = ['us', 'gb', 'in']) => {
  try {
    const params = new URLSearchParams({
      category,
      regions: regions.join(','),
    });

    const response = await fetch(`${BACKEND_URL}/news/vibe-scope?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Unable to load Vibe Scope.');
    }

    return response.json();
  } catch {
    const cards = await Promise.all(
      regions.slice(0, 4).map(async (region) => {
        const articles = await fetchNews(category, region, []);
        const sentiments = articles.map((article) => article.sentimentScore || 0);
        return {
          region,
          dominantTopic: articles[0]?.topic || getCategoryByKey(category).label,
          topKeywords: [...new Set(articles.flatMap((article) => article.keywords || []))].slice(0, 4),
          headline: articles[0]?.title || 'No live signal available.',
          summary: articles[0]?.summary || 'No summary available.',
          sentimentScore: sentiments.reduce((sum, score) => sum + score, 0) / Math.max(sentiments.length, 1),
          articleCount: articles.length,
        };
      })
    );

    const scoreSpread = cards.length
      ? Math.max(...cards.map((card) => card.sentimentScore)) - Math.min(...cards.map((card) => card.sentimentScore))
      : 0;
    const divergenceScore = Math.min(100, Math.round(scoreSpread * 12 + new Set(cards.map((card) => card.dominantTopic)).size * 18 + 24));

    return {
      divergenceScore,
      emergingKeywords: [...new Set(cards.flatMap((card) => card.topKeywords))].slice(0, 8),
      cards,
      insight:
        divergenceScore > 65
          ? 'Different regions are framing this story very differently right now.'
          : 'The narrative is relatively aligned across the selected regions.',
    };
  }
};

export const mlUtils = {
  extractKeywords,
  analyzeSentiment,
  classifyTopic,
  calculateRelevance,
};

export { NEWS_CATEGORIES, NEWS_REGIONS };
