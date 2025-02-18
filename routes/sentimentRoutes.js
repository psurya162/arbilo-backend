// routes/sentimentRoutes.js

const express = require('express');
const CryptoSentimentService = require('../services/CryptoSentimentService');
const router = express.Router();

// Memory cache with expiration
const cache = {
  data: null,
  lastUpdated: null,
  expirationTime: 30000 // 30 seconds
};

const getCachedData = async () => {
  const now = Date.now();
  if (!cache.data || !cache.lastUpdated || (now - cache.lastUpdated) > cache.expirationTime) {
    const sentimentService = new CryptoSentimentService();
    cache.data = await sentimentService.getSentimentAnalysis();
    cache.lastUpdated = now;
  }
  return cache.data;
};

router.get('/', async (req, res) => {
  try {
    const data = await getCachedData();
    res.json(data);
  } catch (error) {
    console.error('Error analyzing cryptocurrency sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze cryptocurrency sentiment' });
  }
});

router.get('/best', async (req, res) => {
  try {
    const data = await getCachedData();
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No cryptocurrency data found' });
    }
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching best cryptocurrency by sentiment:', error);
    res.status(500).json({ error: 'Failed to fetch best cryptocurrency by sentiment' });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await getCachedData();
    const coinData = data.find(result => result.coin.symbol === symbol);

    if (!coinData) {
      return res.status(404).json({ error: `No data found for cryptocurrency: ${symbol}` });
    }

    res.json(coinData);
  } catch (error) {
    console.error(`Error fetching sentiment for specific cryptocurrency: ${req.params.symbol}`, error);
    res.status(500).json({ error: 'Failed to fetch sentiment for specific cryptocurrency' });
  }
});

module.exports = router;