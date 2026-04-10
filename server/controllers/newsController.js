const { getDiscoveredFeed, getLiveFeed, getVibeScope } = require('../services/newsPipeline');
const { sendJson } = require('../utils/http');

const parseInterests = (value = '') =>
  String(value)
    .split(',')
    .map((interest) => interest.trim())
    .filter(Boolean);

const getLiveFeedController = async (req, res, parsedUrl) => {
  try {
    const category = parsedUrl.searchParams.get('category') || 'all';
    const region = parsedUrl.searchParams.get('region') || 'us';
    const limit = Number(parsedUrl.searchParams.get('limit') || 18);
    const interests = parseInterests(parsedUrl.searchParams.get('interests') || '');

    const payload = await getLiveFeed({ category, region, limit, interests });
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unable to load live feed.' });
  }
};

const getDiscoverController = async (req, res, parsedUrl) => {
  try {
    const payload = await getDiscoveredFeed({
      query: parsedUrl.searchParams.get('q') || '',
      category: parsedUrl.searchParams.get('category') || 'all',
      region: parsedUrl.searchParams.get('region') || 'us',
      interests: parseInterests(parsedUrl.searchParams.get('interests') || ''),
    });
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unable to search feed.' });
  }
};

const getVibeScopeController = async (req, res, parsedUrl) => {
  try {
    const regions = String(parsedUrl.searchParams.get('regions') || 'us,gb,in')
      .split(',')
      .map((region) => region.trim())
      .filter(Boolean);
    const payload = await getVibeScope({
      category: parsedUrl.searchParams.get('category') || 'all',
      regions,
    });
    sendJson(res, 200, payload);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unable to load Vibe Scope.' });
  }
};

module.exports = {
  getLiveFeedController,
  getDiscoverController,
  getVibeScopeController,
};
