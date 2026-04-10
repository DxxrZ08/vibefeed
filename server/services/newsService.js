const cache = require('../utils/cache');
const {
  analyzeSentiment,
  classifyTopic,
  extractKeywords,
  getFreshnessScore,
  normalizeText,
} = require('../utils/text');

const CACHE_TTL = 5 * 60 * 1000;
const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80';

const CATEGORIES = [
  { key: 'all', label: 'All Signals', apiCategory: 'general' },
  { key: 'technology', label: 'Technology', apiCategory: 'technology' },
  { key: 'business', label: 'Business', apiCategory: 'business' },
  { key: 'science', label: 'Science', apiCategory: 'science' },
  { key: 'health', label: 'Health', apiCategory: 'health' },
  { key: 'sports', label: 'Sports', apiCategory: 'sports' },
  { key: 'entertainment', label: 'Entertainment', apiCategory: 'entertainment' },
  { key: 'general', label: 'World', apiCategory: 'general' },
];

const REGIONS = [
  { value: 'us', label: 'United States' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'in', label: 'India' },
  { value: 'au', label: 'Australia' },
  { value: 'ca', label: 'Canada' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
  { value: 'za', label: 'South Africa' },
  { value: 'sg', label: 'Singapore' },
  { value: 'ae', label: 'United Arab Emirates' },
];

const REGION_MAP = {
  us: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  gb: { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' },
  in: { hl: 'en-IN', gl: 'IN', ceid: 'IN:en' },
  au: { hl: 'en-AU', gl: 'AU', ceid: 'AU:en' },
  ca: { hl: 'en-CA', gl: 'CA', ceid: 'CA:en' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  it: { hl: 'it', gl: 'IT', ceid: 'IT:it' },
  jp: { hl: 'ja', gl: 'JP', ceid: 'JP:ja' },
  br: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
  mx: { hl: 'es-419', gl: 'MX', ceid: 'MX:es-419' },
  za: { hl: 'en-ZA', gl: 'ZA', ceid: 'ZA:en' },
  sg: { hl: 'en-SG', gl: 'SG', ceid: 'SG:en' },
  ae: { hl: 'en-AE', gl: 'AE', ceid: 'AE:en' },
};

const QUERY_MAP = {
  all: 'latest breaking news',
  general: 'world news',
  technology: 'technology OR AI OR startup',
  business: 'business OR markets OR economy',
  science: 'science OR research OR space',
  health: 'health OR medicine',
  sports: 'sports',
  entertainment: 'entertainment OR movies OR music',
};

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((category) => [category.key, category.label]));

const pickCategory = (key = 'all') => CATEGORIES.find((category) => category.key === key) || CATEGORIES[0];

const decodeXml = (value = '') =>
  String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const stripTags = (value = '') => decodeXml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const parseInterests = (interests = []) =>
  Array.isArray(interests)
    ? interests
    : String(interests)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

const toRssUrl = ({ categoryKey, region }) => {
  const edition = REGION_MAP[region] || REGION_MAP.us;
  const query = QUERY_MAP[categoryKey] || QUERY_MAP.all;
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', edition.hl);
  url.searchParams.set('gl', edition.gl);
  url.searchParams.set('ceid', edition.ceid);
  return url.toString();
};

const extractItems = (xml = '') => [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);

const summarize = (title = '', description = '') => {
  const source = stripTags(description || title);
  if (!source) return 'No summary available yet.';
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  const clipped = sentences.slice(0, 2).join(' ');
  return clipped.length > 220 ? `${clipped.slice(0, 217)}...` : clipped;
};

const isRecentArticle = (date, maxAgeHours = 72) => {
  const published = new Date(date);
  if (Number.isNaN(published.getTime())) return true;
  const ageHours = (Date.now() - published.getTime()) / (1000 * 60 * 60);
  return ageHours <= maxAgeHours;
};

const buildFallbackArticles = ({ categoryKey, region, limit }) => {
  const category = pickCategory(categoryKey);
  const queries = [
    `Major ${category.label.toLowerCase()} shift gains momentum`,
    `Markets react to the latest ${category.label.toLowerCase()} signal`,
    `New policy pressure reshapes ${category.label.toLowerCase()} coverage`,
    `Regional leaders respond to the ${category.label.toLowerCase()} update`,
    `Analysts watch the next move in ${category.label.toLowerCase()}`,
  ];

  return queries.slice(0, limit).map((title, index) => {
    const summary = `${title} for ${region.toUpperCase()} readers, generated as a live fallback while the news feed reconnects.`;
    const keywords = extractKeywords(`${title} ${summary}`);
    const sentiment = analyzeSentiment(`${title} ${summary}`);
    return {
      id: `fallback-${region}-${category.key}-${index}`,
      title,
      summary,
      description: summary,
      image: PLACEHOLDER_IMAGE,
      source: 'VibeFeed Live Fallback',
      date: new Date(Date.now() - index * 3600_000).toISOString(),
      url: 'https://news.google.com/',
      category: category.key,
      categoryLabel: category.label,
      region,
      topic: classifyTopic(title, summary),
      keywords,
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      freshnessScore: getFreshnessScore(new Date(Date.now() - index * 3600_000).toISOString()),
      aiEnhanced: false,
      provider: 'fallback',
    };
  });
};

const normalizeArticle = ({ item, region, categoryKey, index }) => {
  const category = pickCategory(categoryKey);
  const title = stripTags(item.title).replace(/\s+-\s+Google News$/, '');
  const description = stripTags(item.description);
  const source = stripTags(item.source) || 'Google News';
  const date = stripTags(item.pubDate) || new Date().toISOString();
  const summary = summarize(title, description);
  const keywords = extractKeywords(`${title} ${summary}`);
  const sentiment = analyzeSentiment(`${title} ${summary}`);

  return {
    id: `${region}-${category.key}-${index}`,
    title,
    summary,
    description,
    image: PLACEHOLDER_IMAGE,
    source,
    date,
    url: stripTags(item.link),
    category: category.key,
    categoryLabel: CATEGORY_LABELS[category.key] || category.label,
    region,
    topic: classifyTopic(title, summary),
    keywords,
    sentiment: sentiment.sentiment,
    sentimentScore: sentiment.score,
    freshnessScore: getFreshnessScore(date),
    aiEnhanced: false,
    provider: 'google-news-rss',
  };
};

const fetchRssArticles = async ({ categoryKey, region, limit }) => {
  const response = await fetch(toRssUrl({ categoryKey, region }));
  if (!response.ok) {
    throw new Error(`Unable to load news for ${categoryKey}/${region}`);
  }

  const xml = await response.text();
  return extractItems(xml)
    .slice(0, Math.max(limit, 12))
    .map((item, index) =>
      normalizeArticle({
        item: {
          title: item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '',
          description: item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '',
          link: item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '',
          source: item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || 'Google News',
          pubDate: item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || new Date().toISOString(),
        },
        region,
        categoryKey,
        index,
      })
    )
    .filter((article) => article.title)
    .filter((article) => isRecentArticle(article.date, 72))
    .slice(0, limit);
};

const scoreArticle = (article, interests = []) => {
  let score = 66;
  const text = normalizeText(`${article.title} ${article.summary} ${article.categoryLabel} ${article.topic}`).toLowerCase();

  interests.forEach((interest) => {
    if (text.includes(String(interest).toLowerCase())) score += 10;
  });

  if (article.sentiment === 'Positive') score += 4;
  if ((article.keywords || []).length >= 4) score += 5;
  score += Math.min(12, Math.max(0, article.freshnessScore - 60) / 4);

  return Math.min(99, Math.max(55, Math.round(score)));
};

const enrichArticles = (articles, interests = []) =>
  articles.map((article) => ({
    ...article,
    relevanceScore: scoreArticle(article, interests),
    mlTags: [article.provider === 'fallback' ? 'Fallback Feed' : 'Live Feed', article.freshnessScore > 88 ? 'High Match' : 'Live Signal'],
  }));

const buildClusters = (articles) => {
  const groups = new Map();

  articles.forEach((article) => {
    const fingerprint = [...new Set((article.keywords || []).slice(0, 3).filter(Boolean))].sort().join('-') || article.topic.toLowerCase();
    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, {
        id: fingerprint,
        topic: article.topic,
        representativeHeadline: article.title,
        keywords: article.keywords.slice(0, 4),
        headlineCount: 0,
        regions: new Set(),
      });
    }

    const cluster = groups.get(fingerprint);
    cluster.headlineCount += 1;
    cluster.regions.add(article.region);
  });

  return [...groups.values()]
    .map((cluster) => ({
      ...cluster,
      regions: [...cluster.regions],
    }))
    .sort((a, b) => b.headlineCount - a.headlineCount)
    .slice(0, 6);
};

const buildDigest = (articles, categoryKey, region) => {
  const category = pickCategory(categoryKey);
  const lead = articles[0]?.topic || category.label;
  const freshest = articles[0]?.source || 'live coverage';
  return `Top ${category.label.toLowerCase()} signals in ${region.toUpperCase()} are clustering around ${lead}, with ${freshest} driving the strongest momentum.`;
};

const buildLiveFeed = async ({ category = 'all', region = 'us', limit = 18, interests = [] }) => {
  const normalizedInterests = parseInterests(interests);
  const cacheKey = `feed:${category}:${region}:${limit}:${normalizedInterests.join('|')}`;
  const cached = cache.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  let articles = [];
  try {
    articles = await fetchRssArticles({ categoryKey: category, region, limit });
  } catch {
    articles = buildFallbackArticles({ categoryKey: category, region, limit });
  }

  const enriched = enrichArticles(articles, normalizedInterests).sort((a, b) => b.relevanceScore - a.relevanceScore);
  const clusters = buildClusters(enriched);
  const digest = buildDigest(enriched, category, region);
  const meta = {
    provider: enriched[0]?.provider || 'fallback',
    fetchedAt: new Date().toISOString(),
    articleCount: enriched.length,
    clusterCount: clusters.length,
    category,
    region,
  };

  const payload = { articles: enriched, clusters, digest, meta, cached: false };
  cache.set(cacheKey, payload, CACHE_TTL);
  return payload;
};

const discoverLiveFeed = async ({ query = '', category = 'all', region = 'us', limit = 24, interests = [] }) => {
  const bundle = await buildLiveFeed({ category, region, limit, interests });
  const normalizedQuery = String(query || '').trim().toLowerCase();

  if (!normalizedQuery) {
    return bundle;
  }

  const filteredArticles = bundle.articles.filter((article) =>
    `${article.title} ${article.summary} ${article.topic} ${(article.keywords || []).join(' ')}`
      .toLowerCase()
      .includes(normalizedQuery)
  );

  return {
    ...bundle,
    articles: filteredArticles,
    meta: {
      ...bundle.meta,
      resultCount: filteredArticles.length,
    },
    query: normalizedQuery,
  };
};

const buildVibeScope = async ({ category = 'all', regions = ['us', 'gb', 'in'] }) => {
  const normalizedRegions = (Array.isArray(regions) ? regions : String(regions).split(','))
    .map((region) => String(region).trim())
    .filter(Boolean)
    .slice(0, 4);

  const cards = [];

  for (const region of normalizedRegions) {
    const bundle = await buildLiveFeed({ category, region, limit: 6, interests: [] });
    const sentiments = bundle.articles.map((article) => article.sentimentScore || 0);

    cards.push({
      region,
      dominantTopic: bundle.articles[0]?.topic || pickCategory(category).label,
      topKeywords: [...new Set(bundle.articles.flatMap((article) => article.keywords || []))].slice(0, 4),
      headline: bundle.articles[0]?.title || 'No live signal available.',
      summary: bundle.articles[0]?.summary || 'No summary available.',
      sentimentScore: sentiments.reduce((sum, score) => sum + score, 0) / Math.max(sentiments.length, 1),
      articleCount: bundle.articles.length,
    });
  }

  const sentimentValues = cards.map((card) => card.sentimentScore);
  const maxSentiment = Math.max(...sentimentValues);
  const minSentiment = Math.min(...sentimentValues);
  const topicVariety = new Set(cards.map((card) => card.dominantTopic)).size;
  const divergenceScore = Number.isFinite(maxSentiment) && Number.isFinite(minSentiment)
    ? Math.min(100, Math.round((maxSentiment - minSentiment) * 12 + topicVariety * 18 + 24))
    : 24;
  const emergingKeywords = [...new Set(cards.flatMap((card) => card.topKeywords))].slice(0, 8);

  return {
    divergenceScore,
    emergingKeywords,
    cards,
    insight:
      divergenceScore > 65
        ? 'Different regions are framing this story very differently right now.'
        : 'The narrative is relatively aligned across the selected regions.',
  };
};

module.exports = {
  buildLiveFeed,
  buildVibeScope,
  discoverLiveFeed,
  getLiveFeed: buildLiveFeed,
  getDiscoveredFeed: discoverLiveFeed,
  getVibeScope: buildVibeScope,
};
