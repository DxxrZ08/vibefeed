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

const cleanText = (text = '') =>
  String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const normalizeText = (text = '') => cleanText(text).toLowerCase();

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
  const words = String(text).toLowerCase().match(/\b\w+\b/g) || [];
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
  const text = normalizeText(`${title} ${summary}`);
  const rules = {
    Technology: ['ai', 'software', 'startup', 'chip', 'cyber', 'cloud', 'app'],
    Business: ['market', 'stocks', 'economy', 'business', 'trade', 'company', 'investor'],
    Science: ['research', 'study', 'space', 'scientist', 'climate', 'discovery'],
    Health: ['health', 'medicine', 'hospital', 'disease', 'wellness', 'doctor'],
    Sports: ['match', 'league', 'player', 'team', 'goal', 'championship'],
    Entertainment: ['movie', 'music', 'film', 'show', 'celebrity', 'streaming'],
    World: ['government', 'election', 'policy', 'war', 'minister', 'president'],
  };

  const topic = Object.entries(rules)
    .map(([name, keywords]) => ({
      topic: name,
      score: keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)[0];

  return topic?.score ? topic.topic : 'World';
};

const getFreshnessScore = (publishedAt) => {
  const published = new Date(publishedAt);
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);
  if (Number.isNaN(hoursAgo)) return 50;
  if (hoursAgo <= 2) return 98;
  if (hoursAgo <= 6) return 90;
  if (hoursAgo <= 12) return 82;
  if (hoursAgo <= 24) return 72;
  return 58;
};

module.exports = {
  cleanText,
  extractKeywords,
  analyzeSentiment,
  classifyTopic,
  getFreshnessScore,
  normalizeText,
};
