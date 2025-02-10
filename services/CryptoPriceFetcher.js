const ccxt = require('ccxt');

class CryptoArbitrageFinder {
    constructor() {
        this.exchangeNames = [
            'binance', 'bybit', 'coinbase', 'okx', 'crypto.com',
            'upbit', 'gate.io', 'bitget', 'mexc', 'htx',
            'kraken', 'kucoin', 'bitfinex', 'bitmart', 'bitmex',
            'poloniex', 'bittrex', 'hitbtc', 'whitebit', 'ascendex'
        ];
        
        

        this.coinSymbols = [
            'BTC', 'ETH', 'XRP', 'ADA', 'DOT', 'SOL', 'DOGE', 'SHIB', 'LTC', 'LINK',
            'MATIC', 'AVAX', 'XLM', 'UNI', 'BCH', 'FIL', 'VET', 'ALGO', 'ATOM', 'ICP'
        ];
    }

    async fetchPrices() {
        let results = {}; // Reset results every call
    
        const exchanges = await Promise.allSettled(
            this.exchangeNames.map(async (exchangeName) => {
                try {
                    const exchange = new ccxt[exchangeName]();
                    await exchange.loadMarkets();
                    exchange.options['fetchTicker'] = { timestamp: Date.now() }; // Force fresh data
                    return exchange;
                } catch (err) {
                    console.log(`❌ Error initializing ${exchangeName}: ${err.message}`);
                    return null;
                }
            })
        );
    
        // Filter out failed exchanges
        const validExchanges = exchanges
            .filter(res => res.status === 'fulfilled' && res.value !== null)
            .map(res => res.value);
    
        await Promise.all(validExchanges.map(async (exchange) => {
            const exchangeName = exchange.id;
            await Promise.allSettled(this.coinSymbols.map(async (coin) => {
                const pair = `${coin}/USDT`;
                if (exchange.has['fetchTicker'] && exchange.markets[pair]) {
                    try {
                        let ticker = await exchange.fetchTicker(pair);
                        if (!results[coin]) results[coin] = [];
                        results[coin].push({
                            exchange: exchangeName,
                            price: ticker.last
                        });
                    } catch (err) {
                        console.log(`❌ Error fetching ${pair} from ${exchangeName}: ${err.message}`);
                    }
                } else {
                    console.log(`⚠️ ${exchangeName} does not support ${pair}`);
                }
            }));
        }));
    
        return this.calculateArbitrageOpportunities(results);
    }
    

    calculateArbitrageOpportunities(results) {
        let arbitrageOpportunities = {};

        for (const [coin, prices] of Object.entries(results)) {
            if (prices.length < 2) continue;

            const highest = prices.reduce((max, current) => current.price > max.price ? current : max);
            const lowest = prices.reduce((min, current) => current.price < min.price ? current : min);
            const profitPercentage = ((highest.price - lowest.price) / lowest.price) * 100;

            arbitrageOpportunities[coin] = {
                coin,
                highestExchange: highest.exchange,
                lowestExchange: lowest.exchange,
                highestPrice: highest.price,
                lowestPrice: lowest.price,
                profitPercentage: profitPercentage.toFixed(2)
            };
        }

        return arbitrageOpportunities;
    }
}



module.exports = CryptoArbitrageFinder;
