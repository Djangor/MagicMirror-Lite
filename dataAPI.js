const http = require('http');
const https = require('https');
const config = require('./config/config');
const moment = require('moment');
const scheduler = require('node-schedule');
const persistence = require('./persistenceLayer');

module.exports.getCoins = function() {
    return persistence.getCurrentCoins();
}

module.exports.getAssetHistory = async function() {
    return new Promise((resolve, reject) => {
        persistence.getAssetHistory(10)
            .then((rows) => {
                const labels = [];
                const data = [];
                rows = rows.reverse();
                for(let i=0;i<rows.length;i++) {
                    labels.push(rows[i].timestamp);
                    data.push(rows[i].assetValue);
                }
                resolve({labels: labels, data: data});
            })
            .catch((err) => {
                console.log(err);
            })
        });
}

module.exports.getCurrencies = function() {
    return persistence.getCurrentCurrencies();
}

function updateCoins() {
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
                    persistence.addToAssetHistory(total);
                    coins.asset = total;
                    coins.date = response.status.timestamp;
                    coins.lastUpdate = moment().format('DD-MM-YYYY HH:mm:ss');
                    console.log('successfully updated cryptos: ' + JSON.stringify(coins));
                } else {
                    console.log('error refreshing cryptos: ' + response.status.error_message);
                    coins.error = response.error;
                }
                persistence.addToCoinHistory(coins);
            });
        }).on('error', error => {
        console.log('error refreshing cryptos: ' + error);
    });
}

function updateCurrencies() {
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
                persistence.addToCurrencyHistory(currencies);
            });
        }).on('error', error => {
        console.log('error refreshing currencies: ' + JSON.stringify(error));
    });
}

console.log('---starting scheduler for currencies with: ' + config.dataCacheSettings.currencyRefreshRate);
const schedulerUpdateCurrencies = scheduler.scheduleJob(config.dataCacheSettings.currencyRefreshRate, function(){
    console.log('running update for currencies');
    updateCurrencies();
});

console.log('---starting scheduler for coins with: ' + config.dataCacheSettings.coinRefreshRate);
const schedulerUpdateCoins = scheduler.scheduleJob(config.dataCacheSettings.coinRefreshRate, function(){
    console.log('running update for coins');
    updateCoins();
});