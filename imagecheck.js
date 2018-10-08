require('chromedriver');
var webdriver = require('selenium-webdriver'),
  argv = require('yargs').argv,
  ls = require('./lib/linkSearcher'),
  db = require('./lib/db'),
  fs = require("fs");

var writeStream = fs.createWriteStream("log.txt");
// writeStream.end(); // закрываем


var driver;

/*var pref = new webdriver.logging.Preferences();
pref.setLevel('browser', webdriver.logging.Level.ALL);
pref.setLevel('driver', webdriver.logging.Level.ALL); */

if (argv.site == undefined) {
  console.log('Укажите id сайта');
  process.exit();
}

var links = [],
  ignoredLinks = [],
  siteId = argv.site,
  host = '';

async function checkImages() {
  var naturalWidth = await driver.executeScript("var images = $('img'); \
	var b = false; \
	images.each(function (i, img) { \
		if (img.naturalWidth == 0) { \
			 b = true; \
		} \
	}); \
	return b;");

  return naturalWidth;
};

async function parser(i) {
  if (i >= links.length) {
    console.log('End');
    return;
  }

  var data = links[i];

  await driver.get(data.link);

  if (await checkImages()) {
    writeStream.write(data.link + "\n");
    console.log(data.link);
  }

  parser(i + 1);
}

function parserInit() {
  driver = new webdriver.Builder()
    .forBrowser('chrome')
    // .setLoggingPrefs(pref)
    .build();

  parser(0);
}

var connection = db.init(function () {
  connection.query('SELECT host FROM sites WHERE id = ' + siteId + ' LIMIT 1', {},
    function (err, result) {
      if (err) {
        console.log('err4');
        throw err;
      }

      host = result[0].host;

      connection.query('SELECT * FROM linkes WHERE site = ' + siteId + ' AND link NOT LIKE "http://art-blesk.com/catalog/%" AND link NOT LIKE "http://art-blesk.com/ru/catalog/%" AND link NOT LIKE "http://art-blesk.com/upload/%" GROUP BY `link` ', {},
        function (err, result) {
          if (err) {
            console.log('err5');
            throw err;
          }

          console.log('Links: ' + result.length);

          for (var i = 0; i < result.length; i++) {
            if (result[i].link == 'http://art-blesk.com/ajax/get_captcha/') continue;

            links.push(result[i]);
          }

          parserInit();
        });
    });
});