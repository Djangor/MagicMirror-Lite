const moment = require('moment');
const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('./db/database.sqlite');

module.exports.addToAssetHistory = function(asset) {
    const sql = 'INSERT INTO assetValues VALUES (' + asset + ', CURRENT_TIMESTAMP)';
    console.log('adding asset: ' + sql);
    db.run(sql, function(err) {
        if (err) {
            console.log('something failed inserting asset: ' + err);
        }
    })
}

module.exports.addToCoinHistory = function(coins) {
    const rows = [];
    for (let i=0;i<coins.rates.length;i++) {
        rows.push('("' + coins.rates[i].symbol + '", ' + coins.rates[i].price + ', CURRENT_TIMESTAMP, ' +
            coins.rates[i].change1h + ', ' + coins.rates[i].change24h + ', ' + coins.rates[i].change7d + ', ' + coins.rates[i].assetValue + ')');
    }
    const sql = 'INSERT INTO coinPrices VALUES ' + rows.join(', ');
    console.log('inserting coins: ' + sql);
    db.run(sql, function(err) {
        if (err) {
            console.log('something failed on insert coins: ' + err);
        }
    });
}

module.exports.addToCurrencyHistory = function(currencies) {
    const rows = [];
    for (let i=0;i<currencies.rates.length;i++) {
        rows.push('("' + currencies.rates[i].currency + '", ' + currencies.rates[i].rate + ', CURRENT_TIMESTAMP)');
    }
    const sql = 'INSERT INTO exchangeRates VALUES ' + rows.join(', ');
    console.log('inserting currencies: ' + sql);
    db.run(sql, function(err) {
        if (err) {
            console.log('something failed on insert currencies: ' + err);
        }
    });
}

module.exports.getCurrentCurrencies = async function() {
    return new Promise((resolve, reject) => {
        db.all("SELECT symbol, rate from exchangeRates WHERE timestamp = (SELECT max(timestamp) from exchangeRates)", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve({rates: rows, lastUpdate: moment().format('DD-MM-YYYY HH:mm:ss')});
            }
        });
    });
}

module.exports.getCurrentCoins = function() {
    return new Promise((resolve, reject) => {
        db.all("SELECT symbol, price, change1h, change24h, change7d, assetValue from coinPrices WHERE timestamp = (SELECT max(timestamp) from coinPrices)", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                db.get("SELECT assetValue from assetValues WHERE timestamp = (SELECT max(timestamp) from assetValues)", [], (err, row) => {
                    if (err) {
                        resolve({rates: rows, lastUpdate: moment().format('DD-MM-YYYY HH:mm:ss')});
                    } else {
                        resolve({rates: rows, asset: row.assetValue, lastUpdate: moment().format('DD-MM-YYYY HH:mm:ss')});
                    }
                })
            }
        });
    });
}

module.exports.getAssetHistory = function(limit) {
    return new Promise((resolve, reject) => {
        db.all("SELECT assetValue, timestamp FROM assetValues ORDER BY TIMESTAMP desc LIMIT " + limit, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        })
    })
}