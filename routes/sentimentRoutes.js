const express = require('express');
const router = express.Router();
const CryptoSentimentService = require('../services/CryptoSentimentService');

// Initialize the service - this will automatically start caching
const cryptoSentimentService = new CryptoSentimentService();

router.get('/sentiment', async (req, res) => {
  try {
    // This will use cached data from the service
    const results = await cryptoSentimentService.getSentimentAnalysis();
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in sentiment analysis route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentiment analysis',
      error: error.message
    });
  }
});

router.get('/sentiment/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    
    try {
      // This will use cached data from the service
      const result = await cryptoSentimentService.getSentimentForCoin(symbol);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error in sentiment analysis for ${req.params.symbol}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentiment analysis',
      error: error.message
    });
  }
});

module.exports = router;