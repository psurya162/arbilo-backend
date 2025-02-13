const ccxt = require('ccxt');

class CryptoArbitrageFinder {
    constructor() {
        this.exchangeNames = [
            'binance', 
            'bybit', 
            'p2b',
            'xt',
            'woo',
            'okx', 
            'crypto.com', 
            'gate.io', 
            'bitget', 
            'mexc', 
            'htx',
            'kraken', 
            'kucoin', 
            'bitfinex', 
            'bitmart', 
            'bitmex',
            'poloniex', 
            'probit',
            'phemex',
            'whitebit', 
            'ascendex',
            'bitget',
        ];

        this.coinSymbols = [
            'BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'SOL', 'DOGE', 'SHIB', 'LTC', 'LINK',
            'MATIC', 'AVAX', 'XLM', 'UNI', 'BCH', 'FIL', 'VET', 'ALGO', 'ATOM', 'ICP'
        ];

        this.MIN_VOLUME = 200000; // Minimum 24h volume in USDT
        this.exchanges = new Map(); // Cache exchange instances
    }

    async initializeExchanges() {
        const initPromises = this.exchangeNames.map(async (exchangeName) => {
            try {
                if (!this.exchanges.has(exchangeName)) {
                    const exchange = new ccxt[exchangeName]({
                        timeout: 30000, // 30 second timeout
                        enableRateLimit: true
                    });
                    await exchange.loadMarkets();
                    this.exchanges.set(exchangeName, exchange);
                }
            } catch (err) {
                console.warn(`⚠️ Failed to initialize ${exchangeName}: ${err.message}`);
                this.exchanges.delete(exchangeName);
            }
        });

        await Promise.allSettled(initPromises);
    }

    async fetchMarketData(exchange, pair) {
        try {
            const ticker = await exchange.fetchTicker(pair);
            const volume = ticker.quoteVolume || (ticker.baseVolume * ticker.last);
            
            return {
                price: ticker.last,
                volume: volume,
                timestamp: Date.now()
            };
        } catch (err) {
            console.log(`❌ Error fetching ${pair} from ${exchange.id}: ${err.message}`);
            return null;
        }
    }

    async fetchPrices() {
        await this.initializeExchanges();
        let marketData = {};

        const fetchPromises = Array.from(this.exchanges.entries()).map(async ([exchangeName, exchange]) => {
            const coinPromises = this.coinSymbols.map(async (coin) => {
                const pair = `${coin}/USDT`;
                
                if (!exchange.markets[pair]) {
                    console.log(`⚠️ ${exchangeName} does not support ${pair}`);
                    return;
                }

                const data = await this.fetchMarketData(exchange, pair);
                if (!data) return;

                if (data.volume < this.MIN_VOLUME) {
                    console.log(`⚠️ ${pair} on ${exchangeName} has insufficient volume (${data.volume.toFixed(2)} USDT)`);
                    return;
                }

                if (!marketData[coin]) marketData[coin] = [];
                marketData[coin].push({
                    exchange: exchangeName,
                    price: data.price,
                    volume: data.volume,
                    timestamp: data.timestamp
                });
            });

            await Promise.allSettled(coinPromises);
        });

        await Promise.allSettled(fetchPromises);
        return this.calculateArbitrageOpportunities(marketData);
    }

    calculateArbitrageOpportunities(marketData) {
        let opportunities = {};

        for (const [coin, data] of Object.entries(marketData)) {
            if (data.length < 2) continue;

            // Find highest and lowest prices among exchanges with sufficient volume
            const highest = data.reduce((max, current) => 
                current.price > max.price ? current : max
            );
            
            const lowest = data.reduce((min, current) => 
                current.price < min.price ? current : min
            );

            // Calculate potential profit
            const profitPercentage = ((highest.price - lowest.price) / lowest.price) * 100;
            
            // Skip if profit is too small (e.g., < 0.5%)
            if (profitPercentage < 0.5) continue;

            // Calculate the maximum trade size based on available volume
            const maxTradeSize = Math.min(highest.volume, lowest.volume);

            opportunities[coin] = {
                coin,
                highestExchange: highest.exchange,
                lowestExchange: lowest.exchange,
                highestPrice: Number(highest.price.toFixed(8)),
                lowestPrice: Number(lowest.price.toFixed(8)),
                profitPercentage: Number(profitPercentage.toFixed(2)),
                volumeHighest: Number(highest.volume.toFixed(2)),
                volumeLowest: Number(lowest.volume.toFixed(2)),
                maxTradeSize: Number(maxTradeSize.toFixed(2)),
                timestamp: Date.now(),
                potentialProfit: Number((maxTradeSize * (profitPercentage / 100)).toFixed(2))
            };
        }

        // Sort opportunities by profit percentage
        const sortedOpportunities = Object.values(opportunities)
            .sort((a, b) => b.profitPercentage - a.profitPercentage);

        return {
            opportunities: sortedOpportunities,
            timestamp: Date.now(),
            exchangeCount: this.exchanges.size,
            scannedPairs: Object.keys(marketData).length
        };
    }

    async startArbitrageScanner(intervalMs = 60000) {
        console.log('🚀 Starting arbitrage scanner...');
        
        const scan = async () => {
            try {
                console.log('📊 Scanning markets...');
                const results = await this.fetchPrices();
                
                console.log('\n=== Arbitrage Opportunities ===');
                results.opportunities.forEach(opp => {
                    console.log(`
                    ${opp.coin}/USDT:
                    Buy: ${opp.lowestExchange} @ ${opp.lowestPrice}
                    Sell: ${opp.highestExchange} @ ${opp.highestPrice}
                    Profit: ${opp.profitPercentage}%
                    Volume: ${opp.maxTradeSize} USDT
                    Potential Profit: ${opp.potentialProfit} USDT
                    `);
                });
                
                console.log(`\n✅ Scan complete. Found ${results.opportunities.length} opportunities across ${results.exchangeCount} exchanges.`);
            } catch (error) {
                console.error('❌ Scan failed:', error);
            }
        };

        // Initial scan
        await scan();
        
        // Set up interval for continuous scanning
        return setInterval(scan, intervalMs);
    }
}

module.exports = CryptoArbitrageFinder;