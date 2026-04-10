const PUBLIC_NEWS_BASE = 'https://saurav.tech/NewsAPI/top-headlines/category';
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';
const CACHE_TTL_MS = 1000 * 60 * 5;
const MAX_ARTICLE_AGE_HOURS = 72;

const CATEGORY_MAP = {
  all: { apiCategory: 'general', label: 'All Signals', query: 'latest breaking news' },
  general: { apiCategory: 'general', label: 'World', query: 'world news' },
  technology: { apiCategory: 'technology', label: 'Technology', query: 'technology OR AI OR startup' },
  business: { apiCategory: 'business', label: 'Business', query: 'business OR markets OR economy' },
  science: { apiCategory: 'science', label: 'Science', query: 'science OR research OR space' },
  health: { apiCategory: 'health', label: 'Health', query: 'health OR medicine' },
  sports: { apiCategory: 'sports', label: 'Sports', query: 'sports' },
  entertainment: { apiCategory: 'entertainment', label: 'Entertainment', query: 'entertainment OR movies OR music' },
};

const REGION_MAP = {
  us: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  gb: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  in: { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  au: { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
  ca: { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  sg: { hl: 'en-SG', gl: 'SG', ceid: 'SG:en' },
};

const stopWords = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'and', 'but', 'or', 'if', 'then', 'this', 'that', 'these', 'those', 'into', 'about',
  'your', 'their', 'they', 'them', 'while', 'after', 'before', 'through', 'over', 'under', 'more', 'most', 'some',
  'such', 'only', 'than', 'very', 'just', 'also', 'because', 'when', 'where', 'what', 'which', 'who', 'whom',
]);

const cache = new Map();

const sentimentLexicon = {
  positive: ['breakthrough', 'success', 'win', 'surge', 'growth', 'gain', 'record', 'innovation', 'strong', 'boost'],
  negative: ['crash', 'drop', 'loss', 'probe', 'crisis', 'decline', 'threat', 'warning', 'risk', 'layoff'],
};

const getCategoryConfig = (key = 'all') => CATEGORY_MAP[key] || CATEGORY_MAP.all;
const getRegionConfig = (region = 'us') => REGION_MAP[region] || REGION_MAP.us;
const makeCacheKey = (prefix, values) => `${prefix}:${values.join(':')}`;

const getCached = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return cached.value;
};

const setCached = (key, value) => {
  cache.set(key, { timestamp: Date.now(), value });
};

const cleanText = (text = '') => text.replace(/\[[^\]]*]/g, '').replace(/\s+/g, ' ').trim();

const decodeXml = (text = '') =>
  text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const extractKeywords = (text = '') => {
  const words = cleanText(text)
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

const analyzeSentiment = (text = '') => {
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

const classifyTopic = (title = '', summary = '') => {
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

  const result = Object.entries(topicRules)
    .map(([topic, keywords]) => ({
      topic,
      score: keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return result?.score ? result.topic : 'World';
};

const getArticleAgeHours = (publishedAt) => {
  const published = new Date(publishedAt);
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);
  return Number.isFinite(hoursAgo) ? hoursAgo : Number.POSITIVE_INFINITY;
};

const isFreshEnough = (publishedAt) => getArticleAgeHours(publishedAt) <= MAX_ARTICLE_AGE_HOURS;

const summarizeLocally = (title = '', description = '') => {
  const sourceText = cleanText(description || title);
  if (!sourceText) return 'No summary available yet.';
  const clipped = sourceText.split('. ').slice(0, 2).join('. ');
  return clipped.length > 180 ? `${clipped.slice(0, 177)}...` : clipped;
};

const getFreshnessScore = (publishedAt) => {
  const hoursAgo = getArticleAgeHours(publishedAt);
  if (hoursAgo <= 2) return 98;
  if (hoursAgo <= 6) return 90;
  if (hoursAgo <= 12) return 82;
  if (hoursAgo <= 24) return 72;
  return 58;
};

const buildRelevance = (article, interests = []) => {
  let score = 68;
  const text = `${article.title} ${article.summary} ${article.topic} ${article.categoryLabel}`.toLowerCase();

  interests.forEach((interest) => {
    const normalized = String(interest).trim().toLowerCase();
    if (normalized && text.includes(normalized)) score += 9;
  });

  if (article.sentiment === 'Positive') score += 4;
  if ((article.keywords || []).length >= 4) score += 5;

  return Math.min(99, Math.max(55, score));
};

const normalizeArticle = ({ item, provider, categoryKey, region, index, interests }) => {
  const summary = summarizeLocally(item.title, item.description);
  const sentimentResult = analyzeSentiment(`${item.title} ${item.description}`);
  const keywords = extractKeywords(`${item.title} ${item.description}`);
  const topic = classifyTopic(item.title, item.description);
  const category = getCategoryConfig(categoryKey);

  const article = {
    id: `${provider}-${region}-${category.apiCategory}-${index}`,
    title: item.title,
    summary,
    description: item.description,
    image: item.image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80',
    source: item.source || 'Unknown Source',
    date: item.date,
    url: item.url,
    category: categoryKey,
    categoryLabel: category.label,
    region,
    topic,
    keywords,
    sentiment: sentimentResult.sentiment,
    sentimentScore: sentimentResult.score,
    aiEnhanced: false,
    provider,
  };

  article.freshnessScore = getFreshnessScore(article.date);
  article.breakingScore = Math.min(100, article.freshnessScore + (article.title.toLowerCase().includes('breaking') ? 8 : 0));
  article.relevanceScore = buildRelevance(article, interests);
  article.mlTags = [
    article.relevanceScore > 88 ? 'High Match' : 'Live Signal',
    'ML Ranked',
    article.breakingScore > 90 ? 'Breaking' : 'Fresh',
  ];

  return article;
};

const buildSyntheticArticles = ({ categoryKey, region, limit, interests }) => {
  const category = getCategoryConfig(categoryKey);
  const regionLabel = region.toUpperCase();
  const templates = [
    {
      title: `${category.label} briefing: ${regionLabel} markets and policy signals update`,
      description: `A locally generated fallback story for ${regionLabel} covering ${category.label.toLowerCase()} developments, market reaction, and policy movement.`,
    },
    {
      title: `${regionLabel} watch: analysts track the latest ${category.label.toLowerCase()} momentum`,
      description: `Editors are monitoring breaking signals, public reaction, and timeline shifts across the ${category.label.toLowerCase()} cycle.`,
    },
    {
      title: `${category.label} pulse: what changed in the last few hours for ${regionLabel}`,
      description: `This fallback article summarizes the most important changes, likely implications, and the keywords shaping the live story arc.`,
    },
    {
      title: `${regionLabel} signal deck: top ${category.label.toLowerCase()} headlines to watch`,
      description: `A resilience-mode article created when external providers are unavailable, keeping the app responsive with categorized sample content.`,
    },
  ];

  return templates.slice(0, Math.max(1, Math.min(limit, templates.length))).map((item, index) =>
    normalizeArticle({
      item: {
        ...item,
        source: 'Vibefeed Fallback',
        date: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
        url: `https://vibefeed.local/${region}/${category.apiCategory}/${index}`,
        image: null,
      },
      provider: 'local-fallback',
      categoryKey,
      region,
      index,
      interests,
    })
  );
};

const fetchFromGoogleNews = async ({ categoryKey, region, limit, interests }) => {
  const category = getCategoryConfig(categoryKey);
  const edition = getRegionConfig(region);
  const url = new URL(GOOGLE_NEWS_RSS);
  url.searchParams.set('q', category.query);
  url.searchParams.set('hl', edition.hl);
  url.searchParams.set('gl', edition.gl);
  url.searchParams.set('ceid', edition.ceid);

  const response = await fetch(url);
  if (!response.ok) throw new Error('Google News RSS unavailable.');
  const xml = await response.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => match[1])
    .slice(0, limit * 2)
    .map((item) => {
      const title = decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').replace(/\s+-\s+[^-]+$/, '');
      const description = cleanText(
        decodeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]+>/g, ' ')
      );
      const source = decodeXml(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News');
      const date = decodeXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '');
      const link = decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '');

      return {
        title,
        description,
        source,
        date,
        url: link,
        image: null,
      };
    })
    .filter((article) => article.title && article.url && isFreshEnough(article.date))
    .slice(0, limit)
    .map((item, index) => normalizeArticle({ item, provider: 'google-news-rss', categoryKey, region, index, interests }));

  return items;
};

const fetchFromSaurav = async ({ categoryKey, region, limit, interests }) => {
  const category = getCategoryConfig(categoryKey);
  const response = await fetch(`${PUBLIC_NEWS_BASE}/${category.apiCategory}/${region}.json`);
  if (!response.ok) throw new Error('Fallback news feed unavailable.');
  const data = await response.json();

  return (data.articles || [])
    .filter((article) => article.title && article.description && isFreshEnough(article.publishedAt))
    .slice(0, limit)
    .map((article, index) =>
      normalizeArticle({
        item: {
          title: article.title,
          description: article.description,
          source: article.source?.name,
          date: article.publishedAt,
          url: article.url,
          image: article.urlToImage,
        },
        provider: 'saurav-newsapi',
        categoryKey,
        region,
        index,
        interests,
      })
    );
};

const fetchLiveArticles = async ({ category, region, limit, interests }) => {
  try {
    const articles = await fetchFromGoogleNews({ categoryKey: category, region, limit, interests });
    if (articles.length > 0) {
      return { provider: 'google-news-rss', articles };
    }
  } catch (error) {
    // fall through to backup
  }

  try {
    const fallbackArticles = await fetchFromSaurav({ categoryKey: category, region, limit, interests });
    if (fallbackArticles.length > 0) {
      return { provider: 'saurav-newsapi', articles: fallbackArticles };
    }
  } catch (error) {
    // fall through to local resilience fallback
  }

  return {
    provider: 'local-fallback',
    articles: buildSyntheticArticles({ categoryKey: category, region, limit, interests }),
  };
};

const clusterArticles = (articles = []) => {
  const clusterMap = new Map();

  articles.forEach((article) => {
    const fingerprint = [...(article.keywords || []).slice(0, 3)].sort().join('-') || article.topic.toLowerCase();

    if (!clusterMap.has(fingerprint)) {
      clusterMap.set(fingerprint, {
        id: fingerprint,
        topic: article.topic,
        representativeHeadline: article.title,
        keywords: article.keywords.slice(0, 4),
        headlineCount: 0,
        regions: new Set(),
      });
    }

    const cluster = clusterMap.get(fingerprint);
    cluster.headlineCount += 1;
    cluster.regions.add(article.region);
  });

  return [...clusterMap.values()]
    .map((cluster) => ({
      ...cluster,
      regions: [...cluster.regions],
    }))
    .sort((a, b) => b.headlineCount - a.headlineCount)
    .slice(0, 6);
};

const buildDigest = ({ articles, category, region }) => {
  const categoryLabel = getCategoryConfig(category).label.toLowerCase();
  const dominantTopic = articles[0]?.topic || 'global news';
  return `Top ${categoryLabel} signals in ${region.toUpperCase()} are clustering around ${dominantTopic}, with the freshest stories carrying the highest urgency.`;
};

const computeNarrativeDivergence = (cards) => {
  if (!cards.length) return 0;
  const sentimentValues = cards.map((card) => card.sentimentScore);
  const maxSentiment = Math.max(...sentimentValues);
  const minSentiment = Math.min(...sentimentValues);
  const topicVariety = new Set(cards.map((card) => card.dominantTopic)).size;
  return Math.min(100, Math.round((maxSentiment - minSentiment) * 12 + topicVariety * 18 + 24));
};

const getLiveFeed = async ({ category = 'all', region = 'us', limit = 18, interests = [] }) => {
  const cacheKey = makeCacheKey('live-feed', [category, region, String(limit), interests.join('|')]);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await fetchLiveArticles({ category, region, limit, interests });
  const clusters = clusterArticles(result.articles);
  const payload = {
    articles: result.articles,
    clusters,
    digest: buildDigest({ articles: result.articles, category, region }),
    meta: {
      provider: result.provider,
      fetchedAt: new Date().toISOString(),
      articleCount: result.articles.length,
      clusterCount: clusters.length,
    },
  };

  setCached(cacheKey, payload);
  return payload;
};

const getDiscoveredFeed = async ({ query = '', category = 'all', region = 'us', interests = [] }) => {
  const bundle = await getLiveFeed({ category, region, limit: 24, interests });
  const normalizedQuery = String(query).trim().toLowerCase();

  if (!normalizedQuery) {
    return bundle;
  }

  const filteredArticles = bundle.articles.filter((article) =>
    `${article.title} ${article.summary} ${article.topic} ${(article.keywords || []).join(' ')}`.toLowerCase().includes(normalizedQuery)
  );

  return {
    ...bundle,
    articles: filteredArticles,
    meta: {
      ...bundle.meta,
      articleCount: filteredArticles.length,
    },
  };
};

const getVibeScope = async ({ category = 'all', regions = ['us', 'gb', 'in'] }) => {
  const normalizedRegions = regions.slice(0, 4);
  const cacheKey = makeCacheKey('vibe-scope', [category, normalizedRegions.join('|')]);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const cards = await Promise.all(
    normalizedRegions.map(async (region) => {
      const bundle = await getLiveFeed({ category, region, limit: 6, interests: [] });
      const sentiments = bundle.articles.map((article) => article.sentimentScore || 0);
      return {
        region,
        dominantTopic: bundle.articles[0]?.topic || getCategoryConfig(category).label,
        topKeywords: [...new Set(bundle.articles.flatMap((article) => article.keywords || []))].slice(0, 4),
        headline: bundle.articles[0]?.title || 'No live signal available.',
        summary: bundle.articles[0]?.summary || 'No summary available.',
        sentimentScore: sentiments.reduce((sum, score) => sum + score, 0) / Math.max(sentiments.length, 1),
        articleCount: bundle.articles.length,
      };
    })
  );

  const divergenceScore = computeNarrativeDivergence(cards);
  const payload = {
    divergenceScore,
    emergingKeywords: [...new Set(cards.flatMap((card) => card.topKeywords))].slice(0, 8),
    cards,
    insight:
      divergenceScore > 65
        ? 'Different regions are framing this story very differently right now.'
        : 'The narrative is relatively aligned across the selected regions.',
  };

  setCached(cacheKey, payload);
  return payload;
};

module.exports = {
  getLiveFeed,
  getDiscoveredFeed,
  getVibeScope,
};
