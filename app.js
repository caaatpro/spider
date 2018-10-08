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
	host = '',
	saveQueue = [],
	visited = [];

async function getHtml() {
	var el = await driver.findElement(webdriver.By.css('html'));

	return await el.getAttribute("innerHTML");
}

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

	if (visited.indexOf(data.link) != -1) {
		parser(i + 1);
		return;
	}

	await driver.get(data.link);

	var html = await getHtml();

	if (await checkImages()) {
		writeStream.write(data.link + "\n");
		console.log(data.link);
	}

	data.statusCode = -1;

	addToSaveQueue(data);

	visited.push(data.link);
	ignoredLinks.push(data.link);

	ls.search(html, host, data.link, ignoredLinks, function(resultLinks) {
		// console.log(resultLinks);
		for (var resultLink in resultLinks) {
			if (!resultLinks.hasOwnProperty(resultLink)) continue;
			var linkData = {
				link: resultLinks[resultLink],
				statusCode: 0,
				site: siteId,
				parent: data.link
			};

			addToLink(linkData);
			addToSaveQueue(linkData);
		}

		parser(i + 1);
	})
}

function addToLink(data) {
	for (var i = 0; i < links.length; i++) {
		if (links[i].link == data.link) {
			return;
		}
	}

	links.push(data);
}

function addToSaveQueue(data) {
	var startUpdateLink = false;
	if (saveQueue.length == 0) {
		startUpdateLink = true;
	}
	for (var i = 0; i < saveQueue.length; i++) {
		if (saveQueue[i].link == data.link && saveQueue[i].parent == data.parent) {
			saveQueue[i] = data;
			return;
		}
	}

	saveQueue.push(data);

	if (startUpdateLink) {
		updateLink();
	}
};

function updateLink() {
	if (saveQueue.length == 0) {
		return;
	}

	console.log('updateLink. Left ' + saveQueue.length - 1);

	var data = saveQueue[0];

	if (data.hasOwnProperty('id')) {
		// update by id
		connection.query('UPDATE linkes SET ' +
			'statusCode = {statusCode}' +
			' WHERE link = {link}', {
				link: data.link,
				statusCode: data.statusCode,
			},
			function(err, result) {
				if (err) {
					console.log('err1');
					throw err;
				}

				saveQueue.splice(0, 1);

				updateLink();
			});
	} else {
		connection.query('SELECT id FROM linkes WHERE site = {site} AND link = {link} AND parent = {parent} LIMIT 1', {
				link: data.link,
				site: data.site,
				parent: data.parent
			},
			function(err, result) {
				if (err) {
					console.log('err2');
					throw err;
				}

				if (result.length == 0) {
					connection.query('INSERT INTO linkes (link, ' +
						'statusCode, ' +
						'site, ' +
						'parent ' +
						') VALUES (' +
						'{link},' +
						'{statusCode},' +
						'{site},' +
						'{parent}' +
						')', {
							link: data.link,
							statusCode: data.statusCode,
							site: data.site,
							parent: data.parent
						},
						function(err, result) {
							if (err) {
								console.log('err3');
								throw err;
							}

							saveQueue.splice(0, 1);

							updateLink();
						});
				} else {

					saveQueue.splice(0, 1);

					updateLink();
				}
			});
	}
}

function parserInit() {
	driver = new webdriver.Builder()
		.forBrowser('chrome')
		// .setLoggingPrefs(pref)
		.build();

	parser(0);
}

var connection = db.init(function() {
	connection.query('SELECT host FROM sites WHERE id = ' + siteId + ' LIMIT 1', {},
		function(err, result) {
			if (err) {
				console.log('err4');
				throw err;
			}

			host = result[0].host;

			connection.query('SELECT * FROM linkes WHERE site = ' + siteId + ' AND statusCode = 0', {},
				function(err, result) {
					if (err) {
						console.log('err5');
						throw err;
					}

					for (var i = 0; i < result.length; i++) {
						links.push(result[i]);
					}

					if (links.length == 0) {
						links.push({
							link: host,
							site: siteId,
							statusCode: 0,
							parent: host
						});
					}

					connection.query('SELECT * FROM ignoredLinks WHERE site = ' + siteId, {},
						function(err, result) {
							if (err) {
								console.log('err6');
								throw err;
							}

							for (var i = 0; i < result.length; i++) {
								if (!result.hasOwnProperty(i)) continue;

								ignoredLinks.push(result[i].link);
							}

							connection.query('SELECT * FROM linkes WHERE site = {site} AND statusCode = {statusCode}', {
									site: siteId,
									statusCode: -1
								},
								function(err, result) {
									if (err) {
										console.log('err7');
										throw err;
									}

									for (var i = 0; i < result.length; i++) {
										if (!result.hasOwnProperty(i)) continue;

										ignoredLinks.push(result[i].link);
									}

									parserInit();
								});
						});
				});

		});
});
