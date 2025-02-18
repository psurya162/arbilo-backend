// services/CryptoSentimentService.js

const ccxt = require('ccxt');
const vader = require('vader-sentiment');
const axios = require('axios');

class CryptoSentimentService {
  constructor() {
    // Define a list of 15 coins with their symbols and names.
    this.coins = [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'XRP', name: 'XRP' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'DOGE', name: 'Dogecoin' },
      { symbol: 'SOL', name: 'Solana' },
      { symbol: 'DOT', name: 'Polkadot' },
      { symbol: 'LTC', name: 'Litecoin' },
      { symbol: 'BCH', name: 'Bitcoin Cash' },
      { symbol: 'LINK', name: 'Chainlink' },
      { symbol: 'AVAX', name: 'Avalanche' },
      { symbol: 'UNI', name: 'Uniswap' },
      { symbol: 'ALGO', name: 'Algorand' },
      { symbol: 'MATIC', name: 'Polygon' },
      { symbol: 'ATOM', name: 'Cosmos' }
    ];
    
    // Set API keys
    this.CRYPTO_PANIC_API_KEY = process.env.CRYPTO_PANIC_API_KEY || "aa9fd67db49e72006060a2f3faef0183c53edfb2";
    this.NEWSAPI_KEY = process.env.NEWSAPI_KEY || "f317e9c9c24f44aea92c64ba804d7d31";
  }

  /**
   * Sleep for the given number of milliseconds.
   * @param {number} ms - Milliseconds to sleep.
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetches the current market price for a given symbol (e.g., 'BTC/USDT') from Binance.
   * @param {string} symbol - The market pair symbol.
   * @returns {Promise<number|null>} - The last traded price or null if an error occurs.
   */
  async getMarketPrice(symbol) {
    try {
      const exchange = new ccxt.binance();
      const ticker = await exchange.fetchTicker(symbol);
      return ticker.last;
    } catch (error) {
      console.error(`Error fetching market price for ${symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Fetches recent Reddit posts for a given coin by searching for its name or symbol
   * in the r/CryptoCurrency subreddit.
   * @param {Object} coin - An object with coin symbol and name.
   * @param {number} maxResults - Maximum number of posts to fetch.
   * @returns {Promise<Array>} - An array of post objects.
   */
  async fetchRedditPostsForCoin(coin, maxResults = 5) {
    const query = `${coin.name} OR ${coin.symbol}`;
    const url = `https://www.reddit.com/r/CryptoCurrency/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&restrict_sr=1`;
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CryptoStrategy/1.0)' }
      });
      const posts = response.data.data.children.map(child => {
        const post = child.data;
        // Combine title and selftext (if available) for sentiment analysis.
        return { text: `${post.title} ${post.selftext || ""}`.trim() };
      });
      return posts;
    } catch (error) {
      console.error(`Error fetching Reddit posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetches recent crypto news posts for a given coin using the CryptoPanic API.
   * @param {Object} coin - An object with coin symbol and name.
   * @param {number} maxResults - Maximum number of posts to fetch.
   * @returns {Promise<Array>} - An array of news post objects.
   */
  async fetchCryptoPanicPostsForCoin(coin, maxResults = 5) {
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${this.CRYPTO_PANIC_API_KEY}&currencies=${coin.symbol}&public=true&limit=${maxResults}`;
    try {
      const response = await axios.get(url);
      // The API returns posts in response.data.results.
      const posts = response.data.results.map(post => {
        // Use the news title for sentiment analysis.
        return { text: post.title };
      });
      return posts;
    } catch (error) {
      console.error(`Error fetching CryptoPanic posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  /**
   * Fetches recent influencer news for a given coin using NewsAPI.
   * This query explicitly targets famous crypto influencers such as "Elon Musk",
   * "Vitalik Buterin", "CZ", and "Brian Armstrong" along with the coin name/symbol.
   * @param {Object} coin - An object with coin symbol and name.
   * @param {number} maxResults - Maximum number of articles to fetch.
   * @returns {Promise<Array>} - An array of influencer news post objects.
   */
  async fetchNewsApiInfluencerPostsForCoin(coin, maxResults = 5) {
    // Define a list of famous influencers.
    const influencers = `"Elon Musk" OR "Vitalik Buterin" OR "CZ" OR "Brian Armstrong"`;
    // Construct a query to capture articles that mention the coin (by name or symbol) and one of these influencers.
    const query = encodeURIComponent(`(${coin.name} OR ${coin.symbol}) AND (${influencers})`);
    const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=${maxResults}&sortBy=publishedAt&language=en&apiKey=${this.NEWSAPI_KEY}`;
    try {
      const response = await axios.get(url);
      const posts = response.data.articles.map(article => {
        return { text: article.title };
      });
      return posts;
    } catch (error) {
      console.error(`Error fetching NewsAPI influencer posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  /**
   * Analyzes sentiment for an array of items (each with a 'text' property) using VADER.
   * @param {Array} items - Array of objects with a 'text' property.
   * @returns {number} - The average compound sentiment score.
   */
  analyzeSentiment(items) {
    if (!items || items.length === 0) return 0;
    let totalCompound = 0;
    items.forEach(item => {
      const scores = vader.SentimentIntensityAnalyzer.polarity_scores(item.text);
      totalCompound += scores.compound;
    });
    return totalCompound / items.length;
  }

  /**
   * Generates a trading signal based on the average sentiment score.
   * @param {number} avgSentiment - The average compound sentiment score.
   * @returns {string} - "Buy", "Sell", or "Hold".
   */
  generateTradingSignal(avgSentiment) {
    if (avgSentiment > 0.2) return "Buy";
    else if (avgSentiment < -0.2) return "Sell";
    else return "Hold";
  }

  /**
   * Processes a single coin: fetches its market price, Reddit posts, CryptoPanic news,
   * and NewsAPI influencer posts; computes individual and overall sentiments; and determines a trading signal.
   * @param {Object} coin - An object with coin symbol and name.
   * @returns {Promise<Object>} - An object containing coin info, market data, sentiments, and signal.
   */
  async processCoin(coin) {
    // Assume the market pair is coin symbol with USDT (e.g., "BTC/USDT")
    const marketPair = `${coin.symbol}/USDT`;
    const price = await this.getMarketPrice(marketPair);

    // Fetch data from all sources.
    const redditPosts = await this.fetchRedditPostsForCoin(coin);
    await this.sleep(1000);
    const cryptoPanicPosts = await this.fetchCryptoPanicPostsForCoin(coin);
    await this.sleep(1000);
    const newsApiInfluencerPosts = await this.fetchNewsApiInfluencerPostsForCoin(coin);

    // Analyze sentiments.
    const redditSentiment = this.analyzeSentiment(redditPosts);
    const cryptoPanicSentiment = this.analyzeSentiment(cryptoPanicPosts);
    const newsApiSentiment = this.analyzeSentiment(newsApiInfluencerPosts);

    // Compute overall sentiment as a weighted average.
    const totalCount = redditPosts.length + cryptoPanicPosts.length + newsApiInfluencerPosts.length;
    let overallSentiment = 0;
    if (totalCount > 0) {
      overallSentiment =
        (redditPosts.length * redditSentiment +
          cryptoPanicPosts.length * cryptoPanicSentiment +
          newsApiInfluencerPosts.length * newsApiSentiment) /
        totalCount;
    }

    const signal = this.generateTradingSignal(overallSentiment);

    return {
      coin,
      marketPair,
      marketPrice: price,
      redditPostCount: redditPosts.length,
      cryptoPanicPostCount: cryptoPanicPosts.length,
      newsApiPostCount: newsApiInfluencerPosts.length,
      redditSentiment,
      cryptoPanicSentiment,
      newsApiSentiment,
      overallSentiment,
      signal,
      redditPosts,
      cryptoPanicPosts,
      newsApiInfluencerPosts
    };
  }

  /**
   * Main function to process all coins, sort them by overall sentiment,
   * and return their market data, sentiment scores, and trading signals.
   */
  async getSentimentAnalysis() {
    const results = [];

    // Process each coin sequentially.
    for (const coin of this.coins) {
      const result = await this.processCoin(coin);
      results.push(result);
      // Delay to help avoid rate limits.
      await this.sleep(3000);
    }

    // Sort coins by overall sentiment (highest first)
    results.sort((a, b) => b.overallSentiment - a.overallSentiment);
    
    return results;
  }
}

module.exports = CryptoSentimentService;