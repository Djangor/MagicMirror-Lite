const moment = require('moment');
const sqlite3 = require('sqlite3');
let db = new sqlite3.Database('./db/database.sqlite');

module.exports.addToAssetHistory = function(asset) {
    const sql = 'INSERT INTO assetValues VALUES (' + asset + ', "' + moment().format('YYYY-MM-DD HH:mm:ss') + '")';
    db.run(sql, function(err) {
        if (err) {
            console.log('something failed inserting asset: ' + err);
        }
    })
}

module.exports.addToCoinHistory = function(coins) {
    const currentTSD = moment().format('YYYY-MM-DD HH:mm:ss');
    const rows = coins.rates.map(rate => '("' + rate.symbol + '", ' + rate.price + ', "' + currentTSD + '", ' +
        rate.change1h + ', ' + rate.change24h + ', ' + rate.change7d + ', ' + rate.assetValue + ')');
    const sql = 'INSERT INTO coinPrices VALUES ' + rows.join(', ');
    console.log('inserting coins: ' + sql);
    db.run(sql, function(err) {
        if (err) {
            console.log('something failed on insert coins: ' + err);
        }
    });
}

module.exports.addToCurrencyHistory = function(currencies) {
    const currentTSD = moment().format('YYYY-MM-DD HH:mm:ss');
    const rows = currencies.rates.map(currency => '("' + currency.currency + '", ' + currency.rate + ', "' + currentTSD + '")');
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
                resolve({rates: rows, lastUpdate: moment().format('YYYY-MM-DD HH:mm:ss')});
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
                        resolve({rates: rows, lastUpdate: moment().format('YYYY-MM-DD HH:mm:ss')});
                    } else {
                        resolve({rates: rows, asset: row.assetValue, lastUpdate: moment().format('YYYY-MM-DD HH:mm:ss')});
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

module.exports.getCoinHistory = function(symbol, limit) {
    if (limit === 'curr') {
        const today00 = moment().hours('00').seconds('00').minutes('00').format('YYYY-MM-DD');
        return new Promise((resolve, reject) => {
            db.all("SELECT price, timestamp FROM coinPrices WHERE symbol ='" + symbol + "' AND timestamp >= '" + today00 + "' ORDER BY TIMESTAMP desc", [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    } else {
        return new Promise((resolve, reject) => {
            const startDate = moment().subtract(limit, 'days').format('YYYY-MM-DD');
            db.all("SELECT min, max, avg, date, hour FROM aggregatedValues WHERE symbol ='" + symbol + "' AND date >= '" + startDate + "' ORDER BY date desc, hour desc", [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    }
}

module.exports.getCurrencyHistory = function(symbol, limit) {
    if (limit === 'curr') {
        return new Promise((resolve, reject) => {
            const today00 = moment().hours('00').seconds('00').minutes('00').format('YYYY-MM-DD');
            db.all("SELECT rate, timestamp FROM exchangeRates WHERE symbol ='" + symbol + "' AND timestamp >= '" + today00 + "' ORDER BY TIMESTAMP desc", [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    } else {
        return new Promise((resolve, reject) => {
            const startDate = moment().subtract(limit, 'days').format('YYYY-MM-DD');
            db.all("SELECT min, max, avg, date, hour FROM aggregatedValues WHERE symbol ='" + symbol + "' AND date >= '" + startDate + "' ORDER BY date desc, hour desc", [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            })
        })
    }
}

//function to move entries from 15min intraday table to aggregatedTable with 4 entries per day
module.exports.aggregateDay = function() {
    db.all("SELECT distinct symbol FROM coinPrices", [], (err, rows) => {
        if (err) {
            reject(err);
        } else {
            for(let i=0;i<rows.length;i++) {
                _aggregateCoin(rows[i].symbol, moment().subtract(1, 'days'));
            }
        }
    })
    db.all("SELECT distinct symbol FROM exchangeRates", [], (err, rows) => {
        if (err) {
            reject(err);
        } else {
            for(let i=0;i<rows.length;i++) {
                _aggregateCurrency(rows[i].symbol, moment().subtract(1, 'days'));
            }
        }
    })
}

const _average = (array) => {
    if (array && array.length > 0) {
        return array.reduce((a, b) => a + b) / array.length;
    } else {
        return 0;
    }
}

const cleanup = (isCoins) => {
    const yesterday = moment().subtract(1, 'days').hours('23').seconds('59').minutes('59').format('YYYY-MM-DD HH:mm:ss');
    const table = isCoins ? 'coinPrices' : 'exchangeRates';
    db.run('DELETE FROM ' + table + ' WHERE timestamp < "' + yesterday + '"', function(err) {
        if (err) {
            console.log('error cleaning up ' + table + ' ' + err);
        } else {
            console.log(table + ' cleaned up');
        }
    })
}


const _aggregateCoin = (symbol, date) => {
    const dataPoints = [3,9,15,21];
    const insertDate = date.format('YYYY-MM-DD');
    const promises = [];
    for (let i=0;i < dataPoints.length; i++) {
        promises.push(new Promise(resolve => {
            date.seconds('00').minutes('00');
            const fromDate = date.hours(dataPoints[i] - 3).format('YYYY-MM-DD HH:mm:ss');
            date.seconds('59').minutes('59');
            const toDate = date.hours(dataPoints[i] + 2).format('YYYY-MM-DD HH:mm:ss');
            const sql = "SELECT price FROM coinPrices WHERE symbol='" + symbol + "' and timestamp between '" + fromDate + "' AND '" + toDate + "'";
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.log(err);
                    resolve();
                } else {
                    if (rows && rows.length > 0) {
                        const simplePrices = rows.map(function (item) {
                            return item['price'];
                        });
                        const minPrice = Math.min(...simplePrices);
                        const maxPrice = Math.max(...simplePrices);
                        const avgPrice = _average(simplePrices);
                        const setHour = dataPoints[i] < 10 ? '0' + dataPoints[i].toString() : dataPoints[i].toString();
                        const sql2 = "INSERT INTO aggregatedValues VALUES('" + symbol + "', " + minPrice + ", " + maxPrice + ", " + avgPrice + ", '" + insertDate + "', '" + setHour + "')";
                        db.run(sql2, function (err) {
                            if (err) {
                                console.log(err);
                            }
                            resolve();
                        })
                    } else {
                        resolve();
                    }
                }
            })
        }))
    }
    Promise.all(promises)
        .then((resolves) => {
            console.log('aggregating coins done');
            cleanup(true);
        })
        .catch((err) => console.log(err));
}

const _aggregateCurrency = (symbol, date) => {
    const dataPoints = [3,9,15,21];
    date.seconds('00').minutes('00');
    const insertDate = date.format('YYYY-MM-DD');
    const promises = []
    for (let i=0;i < dataPoints.length; i++) {
        promises.push(new Promise(resolve => {
            const fromDate = date.hours(dataPoints[i] - 3).format('YYYY-MM-DD HH:mm:ss');
            const toDate = date.hours(dataPoints[i] + 3).format('YYYY-MM-DD HH:mm:ss');
            const sql = "SELECT rate FROM exchangeRates WHERE symbol='" + symbol + "' and timestamp between '" + fromDate + "' AND '" + toDate + "'";
            db.all(sql, [], (err, rows) => {
                if (err) {
                    console.log(err);
                    resolve()
                } else {
                    if (rows && rows.length > 0) {
                        const simplePrices = rows.map(function (item) {
                            return item['rate'];
                        });
                        const minPrice = Math.min(...simplePrices);
                        const maxPrice = Math.max(...simplePrices);
                        const avgPrice = _average(simplePrices);
                        const setHour = dataPoints[i] < 10 ? '0' + dataPoints[i].toString() : dataPoints[i].toString();
                        const sql2 = "INSERT INTO aggregatedValues VALUES('" + symbol + "', " + minPrice + ", " + maxPrice + ", " + avgPrice + ", '" + insertDate + "', '" + setHour + "')";
                        db.run(sql2, function (err) {
                            if (err) {
                                console.log(err);
                            }
                            resolve();
                        })
                    } else {
                        resolve();
                    }
                }
            })
        }));
    }
    Promise.all(promises)
        .then((resolves) => {
            console.log('aggregating coins done');
            cleanup(true);
        })
        .catch((err) => console.log(err));
}
