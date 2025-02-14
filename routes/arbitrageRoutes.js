const express = require("express");
const redisClient = require("../config/redisClient");
const CryptoArbitrageService = require("../services/CryptoArbitrageService");
const cryptoPriceFetcher = require("../services/CryptoPriceFetcher");
const combinedMiddleware = require("../middleware/userMiddleware");

const router = express.Router();
const priceFetcher = new cryptoPriceFetcher();
const CACHE_KEY = "crypto_arbitrage_data";
const REFRESH_INTERVAL = 300000; // 5 minutes in milliseconds
const CACHE_EXPIRY = 300; // 5 minutes in seconds

// Keep track of last refresh time and next scheduled refresh
let lastRefreshTime = null;
let nextRefreshTime = null;

// Function to update refresh times
const updateRefreshTimes = () => {
    lastRefreshTime = Date.now();
    nextRefreshTime = lastRefreshTime + REFRESH_INTERVAL;
};

// Function to fetch and update cache
const fetchAndCacheCryptoData = async () => {
    try {
        console.log("⚡ Fetching new crypto price data...");
        const coinPriceData = await priceFetcher.fetchPrices();
        const sortedData = Object.entries(coinPriceData).sort(
            ([, a], [, b]) => b.profitPercentage - a.profitPercentage
        );
        const sortedResult = Object.fromEntries(sortedData);

        // Update refresh times
        updateRefreshTimes();

        // Store in Redis with expiry
        await redisClient.set(CACHE_KEY, JSON.stringify(sortedResult), {
            EX: CACHE_EXPIRY,
        });

        // Store timing information in Redis
        await redisClient.set('crypto_refresh_times', JSON.stringify({
            lastRefreshTime,
            nextRefreshTime
        }), { EX: CACHE_EXPIRY });

        console.log("✅ Crypto data updated in Redis cache.");
    } catch (error) {
        console.error("❌ Error updating crypto data:", error);
    }
};

// New endpoint to get server status
router.get("/status", combinedMiddleware, async (req, res) => {
    try {
        const timingData = await redisClient.get('crypto_refresh_times');
        if (timingData) {
            res.json(JSON.parse(timingData));
        } else {
            // If no timing data exists, trigger a refresh and return new timing
            await fetchAndCacheCryptoData();
            res.json({
                lastRefreshTime,
                nextRefreshTime
            });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch server status" });
    }
});

// Route to get cached data
router.get("/arbitrack", combinedMiddleware, async (req, res) => {
    try {
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
            console.log("✅ Serving data from cache");
            return res.json(JSON.parse(cachedData));
        }

        await fetchAndCacheCryptoData();
        const newData = await redisClient.get(CACHE_KEY);
        res.json(JSON.parse(newData));
    } catch (error) {
        console.error("❌ Error fetching crypto data:", error);
        res.status(500).json({ error: "Failed to fetch crypto data" });
    }
});

// Investment-based arbitrage route
router.get("/:investment?", combinedMiddleware, async (req, res) => {
    try {
        let investment = parseFloat(req.params.investment) || 100000;
        const cacheKey = `arbitrage_${investment}`;

        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const cryptoService = new CryptoArbitrageService();
        const opportunities = await cryptoService.getArbitrageOpportunities(investment);

        await redisClient.set(cacheKey, JSON.stringify(opportunities), { EX: CACHE_EXPIRY });
        res.json(opportunities);
    } catch (error) {
        console.error("❌ Error calculating arbitrage opportunities:", error);
        res.status(500).json({ error: "Failed to calculate arbitrage opportunities" });
    }
});

// Initialize refresh cycle
updateRefreshTimes();
setInterval(fetchAndCacheCryptoData, REFRESH_INTERVAL);

module.exports = router;