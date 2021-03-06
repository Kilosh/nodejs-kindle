var https = require('https');
var fs = require('fs');
var dateFormat = require('dateformat');
var numeral = require('numeral');
var Forecast = require('forecast');
var Feed = require('rss-to-json');
var config = require('./config')
var express = require('express')

var app = express()

app.get('/getPNG', function (req, res) {
  getNews(news => {
    getStockData((error, stockData) => {
      getWeatherInformation((error, weather) => {
        var body = createSVG(stockData, weather, news);
        res.set('Content-Length', Buffer.byteLength(body));
        res.set('Content-Type', 'image/svg+xml');
        res.send(body);
        res.end();
      });
    });
  });
});

app.get('/ping', function (req, res) {
  var pingResponseString = dateFormat(new Date(), "dd.mm.yyyy HH:MM:ss");
  res.set('Content-Length', Buffer.byteLength(pingResponseString));
  res.set('Content-Type', 'text/plain');
  res.send(pingResponseString);
  res.end();
});

app.listen(config.server.port, function () {
  console.log('Example app listening on port '+config.server.port+'!');
});

function getNews(callback) {
  Feed.load('http://www.spiegel.de/schlagzeilen/tops/index.rss', function (err, rss) {
    var news = rss.items;
    callback(news);
  });
}

// Initialize
var forecast = new Forecast({
  service: 'darksky',
  key: config.forecastKey, //get your api key from https://darksky.net/dev/ and place it in the config.js file
  units: 'celcius',
  lang: 'de',
  cache: true,      // Cache API requests
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/
    minutes: 15,
    seconds: 00
  }
});

numeral.register('locale', 'de', {
  delimiters: {
    thousands: '.',
    decimal: ','
  },
  abbreviations: {
    thousand: 'k',
    million: 'm',
    billion: 'mrd',
    trillion: 't'
  },
  currency: {
    symbol: '€'
  }
});
numeral.locale('de')

function getWeatherInformation(callback) {
  forecast.get([48.1738, 11.5858], function (err, weather) {
    if (err) return callback(err);
    var weatherMunich = weather.daily.data[0];
    callback(null, weatherMunich);
  });
}

yahooStockData = {
  host: 'query.yahooapis.com',
  path: '/v1/public/yql?q=select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22%5EGDAXI%22%2C%22%5ETECDAX%22%2C%22%5EMDAXI%22%2C%22EURUSD%3DX%22%2C%22GC%3DF%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'
}

function getStockData(callback) {
  var stockData = {};
  https.get(yahooStockData, function (response) {
    response.setEncoding('utf8')
    let rawData = '';
    response.on('data', (chunk) => rawData += chunk);
    response.on('end', () => {
      try {
        let parsedData = JSON.parse(rawData);
        stockData.dax = parsedData.query.results.quote[0];
        stockData.tecdax = parsedData.query.results.quote[1];
        stockData.mdax = parsedData.query.results.quote[2];
        stockData.eur = parsedData.query.results.quote[3];
        stockData.gold = parsedData.query.results.quote[4];
        callback(null, stockData);
      } catch (e) {
        console.log(e.message);
        callback(e, stockData);
      }
    });
    response.on('err', function (e) {
      callback(e, stockData);
    })
  });
}


function createSVG(stockData, weatherMunich, news) {
  var file = fs.readFileSync("./template.svg");
  var createdFile = file.toString();
  var formattedDate = formatDate();
  var formattedTimeStamp = dateFormat(new Date(), "dd.mm.yyyy HH:MM:ss");
  createdFile = createdFile.replace('#TODAY', formattedDate);
  createdFile = createdFile.replace('#TIMESTAMP', formattedTimeStamp);
  createdFile = createdFile.replace('#DAX', formatedStockPriceString(stockData.dax));
  createdFile = createdFile.replace('#TECDAX', formatedStockPriceString(stockData.tecdax));
  createdFile = createdFile.replace('#MDAX', formatedStockPriceString(stockData.mdax));
  createdFile = createdFile.replace('#EUR', formatedStockPriceString(stockData.eur));
  createdFile = createdFile.replace('#GOLD', formatedStockPriceString(stockData.gold));
  createdFile = createdFile.replace('#WEATHER_SUMMARY', weatherMunich.summary);
  createdFile = createdFile.replace('#MAXIMUM', numeral(weatherMunich.temperatureMax).format('0,0.0'));
  createdFile = createdFile.replace('#MINIMUM', numeral(weatherMunich.temperatureMin).format('0,0.0'));
  createdFile = createdFile.replace('#WEATHER_ICON', weatherMunich.icon);
  createdFile = createdFile.replace('#NEWS0', news[0].title);
  createdFile = createdFile.replace('#NEWS1', news[1].title);
  createdFile = createdFile.replace('#NEWS2', news[2].title);
  return createdFile;
}

function formatedStockPriceString(stock) {
  var stockprice = Number(stock.LastTradePriceOnly);
  var difference = Number(stock.Change)
  var stockPriceT0 = Number(stockprice + difference);
  var changeProz = difference / stockPriceT0
  var formattedStockPrice = numeral(stockprice).format('0,0.00');
  var formatedChangeProz = numeral(changeProz).format('+0.00%');
  return formattedStockPrice + " (" + formatedChangeProz + ")";
}

function formatDate() {
  var formattedDate = dateFormat(new Date(), "dddd, dd.mm.yyyy");
  formattedDate = formattedDate.replace('Monday', 'Montag')
  formattedDate = formattedDate.replace('Tuesday', 'Dienstag')
  formattedDate = formattedDate.replace('Wednesday', 'Mittwoch')
  formattedDate = formattedDate.replace('Thursday', 'Donnerstag')
  formattedDate = formattedDate.replace('Friday', 'Freitag')
  formattedDate = formattedDate.replace('Saturday', 'Samstag')
  formattedDate = formattedDate.replace('Sunday', 'Sonntag')
  return formattedDate;
}
