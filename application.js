var YQL = require('yql');
var https = require('https');
var fs = require('fs');
var dateFormat = require('dateformat');
var numeral = require('numeral');

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


options = {
  host: 'query.yahooapis.com',
  path: '/v1/public/yql?q=select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22%5EGDAXI%22%2C%22%5ETECDAX%22%2C%22%5EMDAXI%22%2C%22EURUSD%3DX%22%2C%22GC%3DF%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys'
}

var dax;
var tecdax;
var mdax;
var eur;
var gold;

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



function createSVG(){
  var file = fs.readFileSync("./icons/template.svg");
  var createdFile = file.toString();
  var formattedDate =  formatDate();
  createdFile = createdFile.replace('#TODAY',formattedDate);
  createdFile = createdFile.replace('#DAX',formatedStockPriceString(dax));
  createdFile = createdFile.replace('#TECDAX',formatedStockPriceString(tecdax));
  createdFile = createdFile.replace('#MDAX',formatedStockPriceString(mdax));
  createdFile = createdFile.replace('#EUR',formatedStockPriceString(eur));
  createdFile = createdFile.replace('#GOLD',formatedStockPriceString(gold));


  fs.writeFile('message.svg', createdFile.toString(), (err) => {
  if (err) throw err;
  console.log('It\'s saved!');
});
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
