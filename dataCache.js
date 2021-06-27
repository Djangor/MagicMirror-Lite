const http = require('http');
const https = require('https');
const NodeCache = require('node-cache');
const myCache = new NodeCache();
const config = require('./config/config');
const moment = require('moment');

module.exports.getCoins = function() {
    return _getCoins();
}

module.exports.getAssetHistory = function() {
    let history = _getAssetHistory();
    history = history.slice(-10);
    const labels = [];
    const data = []
    for(let i=0;i<history.length;i++) {
        labels.push(history[i].time);
        data.push(history[i].asset);
    }
    return {labels: labels, data: data};
}

module.exports.getCurrencies = function() {
    return _getCurrencies();
}

module.exports.getCoinHistory = function() {
    return _getCoinHistory();
}

module.exports.getSingleCoinHistory = function(coin) {
    const coinHistory = _getCoinHistory();
    let singleCoinHistory = [];
    let singleCoinDates = [];
    for (let i=0;i<coinHistory.length;i++) {
        for (let j=0;j<coinHistory[i].rates[j].length;j++) {
            if (coinHistory[i].rates[j].symbol === coin ) {
                singleCoinDates.push(coinHistory[i].lastUpdate);
                singleCoinHistory.push(coinHistory[i].rates[j].price);
            }
        }
    }
    return {labels: singleCoinDates, data: singleCoinHistory};
}

module.exports.getCurrencyHistory = function() {
    return _getCurrencyHistory();
}

function _getCoins() {
   const coins = myCache.get('coins');
   if (!coins) {
       return updateCoins();
   } else {
       return coins;
   }
}

function _getCurrencies() {
    const currencies = myCache.get('currencies');
    if (!currencies) {
        return updateCurrencies();
    } else {
        return currencies;
    }
}

function addToAssetHistory(asset) {
    const assetHistory = _getAssetHistory();
    assetHistory.push({asset: asset, time: moment().format('DD-MM-YYYY HH:mm:ss')})
    myCache.set('assetHistory', assetHistory);
}

function _getAssetHistory() {
    return myCache.get('assetHistory') || [];
}

function _addToCoinHistory(coins) {
    const coinHistory = _getCoinHistory();
    coinHistory.push({coins: coins, time: moment().format('DD-MM-YYYY HH:mm:ss')})
    myCache.set('coinHistory', coinHistory);
}

function _getCoinHistory() {
    return myCache.get('coinHistory') || [];
}

function _addToCurrencyHistory(currencies) {
    const currencyHistory = _getCurrencyHistory();
    currencyHistory.push({currencies: currencies, time: moment().format('DD-MM-YYYY HH:mm:ss')})
    myCache.set('currencyHistory', currencyHistory);
}

function _getCurrencyHistory() {
    return myCache.get('currencyHistory') || [];
}


function updateCoins() {
    if (config.dataCacheSettings.mock) {
        const coins = {
            "rates": [
                {
                    "price": 28723.33259102757,
                    "symbol": "BTC",
                    "assetValue": 39523.12957122516,
                    "change1h": 0.34193215,
                    "change24h": 2.21601391,
                    "change7d": -10.49089125
                },
                {
                    "price": 1621.6016668167429,
                    "symbol": "ETH",
                    "assetValue": 404.36082409160616,
                    "change1h": 0.11036701,
                    "change24h": -1.07707917,
                    "change7d": -18.01598846
                },
                {
                    "price": 0.22194206829646781,
                    "symbol": "DOGE",
                    "assetValue": 142.86410936243635,
                    "change1h": 2.06115013,
                    "change24h": 10.75520094,
                    "change7d": -13.67425243
                },
                {
                    "price": 0.540400024436518,
                    "symbol": "XRP",
                    "assetValue": 123.12800936656403,
                    "change1h": 0.18709473,
                    "change24h": -1.17079642,
                    "change7d": -24.17199761
                },
                {
                    "price": 0.000005879398920777598,
                    "symbol": "SHIB",
                    "assetValue": 32.74229027822555,
                    "change1h": 2.01580549,
                    "change24h": 3.53164336,
                    "change7d": -8.54617071
                },
                {
                    "price": 1.275132871650637,
                    "symbol": "NEXO",
                    "assetValue": 1939.4925738005043,
                    "change1h": 0.34299752,
                    "change24h": 2.2820584,
                    "change7d": -15.60624343
                }
            ],
            "asset": 42165.7173781245,
            "date": "2021-06-25T09:30:41.181Z",
            "lastUpdate": "25-06-2021 16:30:41"
        };
        coins.lastUpdate = moment().format('DD-MM-YYYY HH:mm:ss');
        addToAssetHistory(coins.asset + Math.floor(Math.random() * (100)));
        myCache.set('coins', coins, 6);
        return coins;
    } else {
        https.get(
            'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?start=1&limit=100&convert=EUR&CMC_PRO_API_KEY=' + config.dataCacheSettings.coinMarketCapAPIKey,
            res => {
                let data = [];
                res.on('data', chunk => {
                    data.push(chunk);
                });
                let coins = {};
                res.on('end', () => {
                    const response = JSON.parse(Buffer.concat(data).toString());
                    if (response.status.error_code === 0) {
                        coins.rates = [];
                        let total = 0.00;
                        for (let i = 0; i < response.data.length; i++) {
                            for (let j = 0; j < config.dataCacheSettings.coinsToShow.length; j++) {
                                if (response.data[i].symbol === config.dataCacheSettings.coinsToShow[j].symbol) {
                                    let dataset = response.data[i];
                                    let assetValue = dataset.quote.EUR.price * config.dataCacheSettings.coinsToShow[j].amt;
                                    total = total + assetValue;
                                    coins.rates.push({price: dataset.quote.EUR.price, symbol: dataset.symbol, assetValue: assetValue,
                                        change1h: dataset.quote.EUR.percent_change_1h, change24h: dataset.quote.EUR.percent_change_24h,
                                        change7d: dataset.quote.EUR.percent_change_7d
                                    });
                                }
                            }
                        }
                        addToAssetHistory(total);
                        coins.asset = asset;
                        coins.date = response.status.timestamp;
                        coins.lastUpdate = moment().format('DD-MM-YYYY HH:mm:ss');
                        console.log('successfully updated cryptos: ' + JSON.stringify(coins));
                    } else {
                        console.log('error refreshing cryptos: ' + response.status.error_message);
                        coins.error = response.error;
                    }
                    myCache.set('coins', coins, config.dataCacheSettings.coinRefreshRate);
                    _addToCoinHistory(coins);
                    return coins;
                });
            }).on('error', error => {
            console.log('error refreshing cryptos: ' + error);
            return {};
        });
    }
}

function updateCurrencies() {
    if (config.dataCacheSettings.mock) {
        const currencies = {"rates":[{"currency":"THB","rate":37.929856},{"currency":"CHF","rate":1.095748},{"currency":"USD","rate":1.194171}],"date":"2021-06-25","lastUpdate":"25-06-2021 16:30:40"};
        currencies.lastUpdate = moment().format('DD-MM-YYYY HH:mm:ss');
        myCache.set('currencies', currencies, 6);
        return currencies;
    } else {
        const currencies = config.dataCacheSettings.currenciesToShow.join(',');
        http.get(
            "http://data.fixer.io/api/latest?access_key=" + config.dataCacheSettings.fixerAPIKey + "&currencies=" + currencies + "&format=1",
            res => {
                let data = [];
                res.on('data', chunk => {
                    data.push(chunk);
                });
                let currencies = {};
                res.on('end', () => {
                    const response = JSON.parse(Buffer.concat(data).toString());
                    if (response.success) {
                        currencies.rates = [];
                        for (let j = 0; j < config.dataCacheSettings.currenciesToShow.length; j++) {
                            currencies.rates.push({
                                currency: config.dataCacheSettings.currenciesToShow[j],
                                rate: response.rates[config.dataCacheSettings.currenciesToShow[j]]
                            });
                        }
                        currencies.date = response.date;
                        currencies.lastUpdate = moment().format('DD-MM-YYYY HH:mm:ss');
                        console.log('successfully updated currencies: ' + JSON.stringify(currencies));
                    } else {
                        console.log('error refreshing currencies: ' + JSON.stringify(response.error));
                        currencies.error = response.error;
                    }
                    myCache.set('currencies', currencies, config.dataCacheSettings.currencyRefreshRate);
                    _addToCurrencyHistory(currencies);
                    return currencies;
                });
            }).on('error', error => {
            console.log('error refreshing currencies: ' + JSON.stringify(error));
            return {};
        });
    }
}