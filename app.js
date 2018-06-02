require('chromedriver');
var webdriver = require('selenium-webdriver'),
	fs = require('fs'),
	ls = require('./lib/linkSearcher'),
	db = require('./lib/db');

var driver;

/*var pref = new webdriver.logging.Preferences();
pref.setLevel('browser', webdriver.logging.Level.ALL);
pref.setLevel('driver', webdriver.logging.Level.ALL); */

var links = [],
	ignoredLinks = [],
	siteId = 2,
	host = '',
	saveQueue = [];

async function getHtml() {
	var el = await driver.findElement(webdriver.By.css('html'));
	return await el.getAttribute("innerHTML");
}

async function parser(i) {
	if (i >= links.length) {
		console.log('End');
		return;
	}

	var data = links[i];

	await driver.get(data.link);

	var html = await getHtml();

	data.statusCode = -1;

	addToSaveQueue(data);

	ls.search(html, host, ignoredLinks, function(resultLinks) {
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

	console.log('updateLink. Left ' + saveQueue.length);

	var data = saveQueue[0];

	if (data.hasOwnProperty('id')) {
		// update by id
		connection.query('UPDATE linkes SET ' +
			'statusCode = {statusCode}' +
			' WHERE id = {id}', {
				id: data.id,
				statusCode: data.statusCode,
			},
			function(err, result) {
				if (err) {
					throw err;
				}

				saveQueue.splice(0, 1);

				updateLink();
			});
	} else {
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
					throw err;
				}

				saveQueue.splice(0, 1);

				updateLink();
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
			if (err) throw err;

			host = result[0].host;

			connection.query('SELECT * FROM linkes WHERE site = ' + siteId + ' AND statusCode = 0', {},
				function(err, result) {
					if (err) throw err;

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
							if (err) throw err;

							for (var index in result) {
								if (!result.hasOwnProperty(index)) continue;

								ignoredLinks.push(result[index].link);
							}

							parserInit();
						});
				});

		});
});
