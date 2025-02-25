const ccxt = require('ccxt');
const vader = require('vader-sentiment');
const axios = require('axios');
const CacheService = require('./CacheService');
const {cryptoPanicKey,newsApiKey}  =require("../config/dotenvConfig")

class CryptoSentimentService {
  constructor() {
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
      { symbol: 'ATOM', name: 'Cosmos' }
    ];
    
    this.CRYPTO_PANIC_API_KEY = cryptoPanicKey;
    this.NEWSAPI_KEY = newsApiKey;
    this.exchange = new ccxt.binance(); // Reuse exchange instance
    
    // Initialize cache system when service is created
    this.initializeCache();
  }
  
  async initializeCache() {
    try {
      console.log('Initializing cryptocurrency sentiment cache...');
      
      // Initial cache population for all coins' sentiment
      await CacheService.getOrSetCache(
        CacheService.CACHE_KEYS.SENTIMENT_ALL, 
        () => this.fetchAllSentimentData()
      );
      
      // Set up periodic refresh for all coins
      CacheService.refreshCachePeriodically(
        () => this.fetchAllSentimentData(),
        CacheService.CACHE_KEYS.SENTIMENT_ALL
      );
      
      // Cache each individual coin
      for (const coin of this.coins) {
        const coinKey = `${CacheService.CACHE_KEYS.SENTIMENT_COIN}_${coin.symbol}`;
        
        // Initial cache for each coin
        await CacheService.getOrSetCache(
          coinKey,
          () => this.processCoin(coin)
        );
        
        // Set up periodic refresh for each coin
        CacheService.refreshCachePeriodically(
          () => this.processCoin(coin),
          coinKey
        );
      }
      
      console.log('Cryptocurrency sentiment cache initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cryptocurrency sentiment cache:', error);
    }
  }

  async getMarketPrice(symbol) {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      return ticker.last;
    } catch (error) {
      console.error(`Error fetching market price for ${symbol}:`, error.message);
      return null;
    }
  }

  async fetchRedditPostsForCoin(coin, maxResults = 5) {
    const query = `${coin.name} OR ${coin.symbol}`;
    const url = `https://www.reddit.com/r/CryptoCurrency/search.json?q=${encodeURIComponent(query)}&limit=${maxResults}&restrict_sr=1`;
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CryptoStrategy/1.0)' }
      });
      return response.data.data.children.map(child => ({
        text: `${child.data.title} ${child.data.selftext || ""}`.trim()
      }));
    } catch (error) {
      console.error(`Error fetching Reddit posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  async fetchCryptoPanicPostsForCoin(coin, maxResults = 5) {
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${this.CRYPTO_PANIC_API_KEY}&currencies=${coin.symbol}&public=true&limit=${maxResults}`;
    try {
      const response = await axios.get(url);
      return response.data.results.map(post => ({ text: post.title }));
    } catch (error) {
      console.error(`Error fetching CryptoPanic posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  async fetchNewsApiInfluencerPostsForCoin(coin, maxResults = 5) {
    const influencers = `"Elon Musk" OR "Vitalik Buterin" OR "CZ" OR "Brian Armstrong"`;
    const query = encodeURIComponent(`(${coin.name} OR ${coin.symbol}) AND (${influencers})`);
    const url = `https://newsapi.org/v2/everything?q=${query}&pageSize=${maxResults}&sortBy=publishedAt&language=en&apiKey=${this.NEWSAPI_KEY}`;
    try {
      const response = await axios.get(url);
      return response.data.articles.map(article => ({ text: article.title }));
    } catch (error) {
      console.error(`Error fetching NewsAPI posts for ${coin.name}:`, error.message);
      return [];
    }
  }

  analyzeSentiment(items) {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => {
      if (!item.text || typeof item.text !== "string") {
        console.warn("Invalid text data for sentiment analysis:", item);
        return sum; // Skip invalid items
      }
      const scores = vader.SentimentIntensityAnalyzer.polarity_scores(item.text);
      return sum + scores.compound;
    }, 0) / items.length;
  }

  generateTradingSignal(avgSentiment) {
    if (avgSentiment > 0.2) return "Buy";
    else if (avgSentiment < -0.2) return "Sell";
    else return "Hold";
  }

  async processCoin(coin) {
    const marketPair = `${coin.symbol}/USDT`;
    
    // Fetch all data concurrently
    const [price, redditPosts, cryptoPanicPosts, newsApiInfluencerPosts] = await Promise.all([
      this.getMarketPrice(marketPair),
      this.fetchRedditPostsForCoin(coin),
      this.fetchCryptoPanicPostsForCoin(coin),
      this.fetchNewsApiInfluencerPostsForCoin(coin)
    ]);

    // Analyze sentiments
    const redditSentiment = this.analyzeSentiment(redditPosts);
    const cryptoPanicSentiment = this.analyzeSentiment(cryptoPanicPosts);
    const newsApiSentiment = this.analyzeSentiment(newsApiInfluencerPosts);

    // Compute overall sentiment
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
      newsApiInfluencerPosts,
      lastUpdated: new Date().toISOString()
    };
  }

  async getSentimentAnalysis() {
    // Use cache for all sentiment data
    return await CacheService.getOrSetCache(
      CacheService.CACHE_KEYS.SENTIMENT_ALL,
      () => this.fetchAllSentimentData()
    );
  }
  
  async fetchAllSentimentData() {
    // Process all coins concurrently
    const results = await Promise.all(
      this.coins.map(coin => this.processCoin(coin))
    );

    // Sort by overall sentiment
    results.sort((a, b) => b.overallSentiment - a.overallSentiment);
    
    return results;
  }
  
  async getSentimentForCoin(symbol) {
    const coin = this.coins.find(c => c.symbol === symbol);
    if (!coin) {
      throw new Error(`Cryptocurrency ${symbol} not found`);
    }
    
    // Use cache for individual coin data
    const coinKey = `${CacheService.CACHE_KEYS.SENTIMENT_COIN}_${symbol}`;
    return await CacheService.getOrSetCache(
      coinKey,
      () => this.processCoin(coin)
    );
  }
}

module.exports = CryptoSentimentService;