const express = require('express');
const CryptoArbitrageService = require('../services/CryptoArbitrageService');
const cryptoPriceFetcher = require('../services/CryptoPriceFetcher');
const combinedMiddleware = require("../middleware/userMiddleware")

const router = express.Router();
const cryptoService = new CryptoArbitrageService();
const priceFetcher = new cryptoPriceFetcher();


router.get('/arbitrack', async (req, res) => {
  try {
      // Fetch crypto price data
      const coinPriceData = await priceFetcher.fetchPrices();

      // Sort the data by profit percentage from highest to lowest
      const sortedData = Object.entries(coinPriceData)
          .sort(([, a], [, b]) => b.profitPercentage - a.profitPercentage);

      // Convert sorted data back to an object
      const sortedResult = Object.fromEntries(sortedData);

      // Send sorted data as response
      res.json(sortedResult);
  } catch (error) {
      console.error('Error fetching crypto data:', error);
      res.status(500).json({ error: 'Failed to fetch crypto data' });
  }
});

// ✅ Keep this AFTER '/arbitrack' so it does not override
router.get('/:investment?',combinedMiddleware, async (req, res) => {
  try {
    let investment = parseFloat(req.params.investment);

    if (isNaN(investment) || investment <= 0) {
      investment = 1000; // Default investment amount
    }

    const opportunities = await cryptoService.getArbitrageOpportunities(investment);
    res.json(opportunities);
  } catch (error) {
    console.error('Error processing arbitrage opportunities request:', error);
    res.status(500).json({ error: 'Internal server error while fetching arbitrage opportunities' });
  }
});

module.exports = router;
