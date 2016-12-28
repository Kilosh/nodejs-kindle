var YQL = require('yql');
var https = require('https');
var fs = require('fs');
var dateFormat = require('dateformat');
var numeral = require('numeral');
var Forecast = require('forecast');
var Feed = require('rss-to-json');
var svg2png = require("svg2png");
var http = require('http');
var url = require('url');
var path =  require('path');


var server = http.createServer(function (request, response) {
	if (request.method != 'GET') {
        return response.end('send me a GET\n');
        response.end();
    }
  var requestUrl = url.parse(request.url, true);
  else if (requestUrl.pathname == '/getPNG') {
    svg2png(fs.readFileSync("./message.svg"))
        .then(buffer => {
          response.write(buffer);
          response.end();
        }).catch(e => console.error(e));
  }
  else {
    console.log(requestUrl+ 'unknown path');
    response.end();
  }
  return;
});

server.listen(process.argv[2]);


var news;
function getNews(){
Feed.load('http://www.spiegel.de/schlagzeilen/tops/index.rss', function(err, rss){
   news = rss.items;
   getStockData();
});
}

// Initialize
var forecast = new Forecast({
  service: 'darksky',
  key: '3e71b627ce9d2e4f00040eac1db9833a',
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


var weatherMunich;
function getWeatherInformation(){
  forecast.get([48.1738,11.5858], function(err, weather) {
    if(err) return console.dir(err);
    weatherMunich = weather.daily.data[0];
    console.log(weatherMunich);
    getNews();
  });
}

options = {
  host: 'query.yahooapis.com',
  path: '/v1/public/yql?q=select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22%5EGDAXI%22%2C%22%5ETECDAX%22%2C%22%5EMDAXI%22%2C%22EURUSD%3DX%22%2C%22GC%3DF%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'
}

var dax;
var tecdax;
var mdax;
var eur;
var gold;

function getStockData(){
  https.get(options, function (response){
  	response.setEncoding('utf8')
    let rawData = '';
    response.on('data', (chunk) => rawData += chunk);
    response.on('end', () => {
      try {
        let parsedData = JSON.parse(rawData);
        dax = parsedData.query.results.quote[0];
        tecdax = parsedData.query.results.quote[1];
        mdax = parsedData.query.results.quote[2];
        eur = parsedData.query.results.quote[3];
        gold = parsedData.query.results.quote[4];

        console.log(parsedData.query.results.quote);
        createSVG()
      } catch (e) {
        console.log(e.message);
      }
    });
  	response.on('err', function (data){
      console.log("EROOR")
  		console.log(err.toString())
  	})
  });
}


function createSVG(){
  var file = fs.readFileSync("./template.svg");
  var createdFile = file.toString();
  var formattedDate =  formatDate();
  var formattedTimeStamp =  dateFormat(new Date(), "dd.mm.yyyy HH:MM:ss");
  createdFile = createdFile.replace('#TODAY',formattedDate);
  createdFile = createdFile.replace('#TIMESTAMP',formattedTimeStamp);
  createdFile = createdFile.replace('#DAX',formatedStockPriceString(dax));
  createdFile = createdFile.replace('#TECDAX',formatedStockPriceString(tecdax));
  createdFile = createdFile.replace('#MDAX',formatedStockPriceString(mdax));
  createdFile = createdFile.replace('#EUR',formatedStockPriceString(eur));
  createdFile = createdFile.replace('#GOLD',formatedStockPriceString(gold));
  createdFile = createdFile.replace('#WEATHER_SUMMARY',weatherMunich.summary);
  createdFile = createdFile.replace('#MAXIMUM',numeral(weatherMunich.temperatureMax).format('0,0.0'));
  createdFile = createdFile.replace('#MINIMUM',numeral(weatherMunich.temperatureMin).format('0,0.0'));
  createdFile = createdFile.replace('#WEATHER_ICON',weatherMunich.icon);
  createdFile = createdFile.replace('#NEWS0',news[0].title);
  createdFile = createdFile.replace('#NEWS1',news[1].title);
  createdFile = createdFile.replace('#NEWS2',news[2].title);

  console.log(news[2].title);

  fs.writeFile('message.svg', createdFile.toString(), (err) => {
  if (err) throw err;
  console.log('It\'s saved!');
});

svg2png(createdFile)
    .then(buffer => fs.writeFile("dest.png", buffer))
    .catch(e => console.error(e));
}

function formatedStockPriceString(stock){
  var stockprice = Number(stock.LastTradePriceOnly);
  var difference = Number(stock.Change)
  var stockPriceT0=Number(stockprice+difference);
  var changeProz = difference/stockPriceT0

  var formattedStockPrice = numeral(stockprice).format('0,0.00');
  var formatedChangeProz = numeral(changeProz).format('+0.00%');
  return formattedStockPrice+ " ("+formatedChangeProz+")";
}

function formatDate() {
  var formattedDate =  dateFormat(new Date(), "dddd, dd.mm.yyyy");
  formattedDate = formattedDate.replace('Monday', 'Montag')
  formattedDate = formattedDate.replace('Tuesday', 'Dienstag')
  formattedDate = formattedDate.replace('Wednesday', 'Mittwoch')
  formattedDate = formattedDate.replace('Thursday', 'Donnerstag')
  formattedDate = formattedDate.replace('Friday', 'Freitag')
  formattedDate = formattedDate.replace('Saturday', 'Samstag')
  formattedDate = formattedDate.replace('Sunday', 'Sonntag')
  return formattedDate;
}
