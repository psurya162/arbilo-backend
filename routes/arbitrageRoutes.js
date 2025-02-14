const express = require("express");
const redisClient = require("../config/redisClient");
const CryptoArbitrageService = require("../services/CryptoArbitrageService");
const cryptoPriceFetcher = require("../services/CryptoPriceFetcher");
const combinedMiddleware = require("../middleware/userMiddleware");

const router = express.Router();
const priceFetcher = new cryptoPriceFetcher();
const CACHE_KEY = "crypto_arbitrage_data"; 
const CACHE_EXPIRY = 300; // Cache expires in 5 minutes

// Function to fetch and update cache
const fetchAndCacheCryptoData = async () => {
  try {
    console.log("⚡ Fetching new crypto price data...");
    const coinPriceData = await priceFetcher.fetchPrices();
    const sortedData = Object.entries(coinPriceData).sort(
      ([, a], [, b]) => b.profitPercentage - a.profitPercentage
    );
    const sortedResult = Object.fromEntries(sortedData);

    // Store in Redis with a 5-minute expiry
    await redisClient.set(CACHE_KEY, JSON.stringify(sortedResult), {
      EX: CACHE_EXPIRY,
    });

    console.log("✅ Crypto data updated in Redis cache.");
  } catch (error) {
    console.error("❌ Error updating crypto data:", error);
  }
};

// Route to get cached data
router.get("/arbitrack", async (req, res) => {
  try {
    // Check Redis cache first
    const cachedData = await redisClient.get(CACHE_KEY);
    if (cachedData) {
      console.log("✅ Serving data from cache");
      return res.json(JSON.parse(cachedData));
    }

    // If no cache, fetch new data
    await fetchAndCacheCryptoData();
    const newData = await redisClient.get(CACHE_KEY);
    res.json(JSON.parse(newData));
  } catch (error) {
    console.error("❌ Error fetching crypto data:", error);
    res.status(500).json({ error: "Failed to fetch crypto data" });
  }
});

// Investment-based arbitrage route with Redis caching
router.get("/:investment?", combinedMiddleware, async (req, res) => {
  try {
    let investment = parseFloat(req.params.investment) || 100000; // Default investment
    const cacheKey = `arbitrage_${investment}`;

    // Check if data is in Redis
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`✅ Serving cached arbitrage data for investment: ${investment}`);
      return res.json(JSON.parse(cachedData));
    }

    // If no cache, fetch fresh arbitrage opportunities
    const cryptoService = new CryptoArbitrageService();
    const opportunities = await cryptoService.getArbitrageOpportunities(investment);

    // Store result in Redis
    await redisClient.set(cacheKey, JSON.stringify(opportunities), { EX: CACHE_EXPIRY });

    res.json(opportunities);
  } catch (error) {
    console.error("❌ Error calculating arbitrage opportunities:", error);
    res.status(500).json({ error: "Failed to calculate arbitrage opportunities" });
  }
});

// Automatically refresh cache every 5 minutes
setInterval(fetchAndCacheCryptoData, 5 * 60 * 1000); // 5 min

module.exports = router;
