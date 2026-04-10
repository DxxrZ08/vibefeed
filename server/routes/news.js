const express = require('express');
const { buildLiveFeed, buildVibeScope, discoverLiveFeed } = require('../services/newsService');

const router = express.Router();

router.get('/live-feed', async (req, res) => {
  try {
    const { category = 'all', region = 'us', limit = 18, interests = '' } = req.query;
    const bundle = await buildLiveFeed({
      category,
      region,
      limit: Number(limit) || 18,
      interests: String(interests)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/discover', async (req, res) => {
  try {
    const { q = '', category = 'all', region = 'us', interests = '' } = req.query;
    const bundle = await discoverLiveFeed({
      query: q,
      category,
      region,
      interests: String(interests)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    res.json(bundle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vibe-scope', async (req, res) => {
  try {
    const { category = 'all', regions = 'us,gb,in' } = req.query;
    const payload = await buildVibeScope({
      category,
      regions: String(regions)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
