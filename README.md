# MagicMirror-Lite

## Config


|Option|Description|type|
|---|---|---|
|`coinMarketCapAPIKey`|MANDATORY: API key from [CoinMarketCap](https://pro.coinmarketcap.com/)|string|
|`coinsToShow`| One or more cryptos you want to display.|array|
|`coinRefreshRate`|Frequency, in seconds, to updata data values|number|
|`fixerAPIKey`|MANDATORY: API key from [fixer.io](https://fixer.io/)|string|
|`currenciesToShow`| One or more currencies you want to display.|array|
|`currencyRefreshRate`| Frequency, in seconds, to updata data values|number|
|`port`| Port where the UI should run|number|

Here is an example of an entry in `config.js`
```
{
    dataCacheSettings: {
        coinMarketCapAPIKey: '123',
        coinsToShow: ['BTC', 'ETH'],
        coinRefreshRate: 3600000,
        fixerAPIKey: '123',
        currenciesToShow: ['THB', 'CHF', 'USD'],
        currencyRefreshRate: 3600000
    },
    port: 3005
}
```
