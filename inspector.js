var fs = require('fs'),
	request = require('request'),
	argv = require('yargs').argv,
	db = require('./lib/db'),
	config = require('./config.json');

if (argv.site == undefined) {
	console.log('Укажите id сайта');
	process.exit();
}

var siteId = argv.site,
	saveQueue = [],
	visited = [],
	host = '',
	links = [];


function parser(i) {
	if (i >= links.length) {
		console.log('End');
		return;
	}

	var data = links[i];

	console.log('Check ' + data.link);

	var link = encodeURI(data.link);

	if (visited.indexOf(link) != -1) {
		parser(i + 1);
		return;
	}

	request(link, function(error, response, body) {
		if (error) {
			if (error.code != 'ENOTFOUND') {
				throw error;
			}

			data.statusCode = 2; // ENOTFOUND
		} else {
			data.statusCode = response.statusCode;
		}

		addToSaveQueue(data);

		parser(i + 1);
	});

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

	connection.query('UPDATE linkes SET ' +
		'statusCode = {statusCode}' +
		' WHERE link = {link}', {
			link: data.link,
			statusCode: data.statusCode,
		},
		function(err, result) {
			if (err) {
				throw err;
			}

			saveQueue.splice(0, 1);

			updateLink();
		});
}

var connection = db.init(function() {
	connection.query('SELECT host FROM sites WHERE id = ' + siteId + ' LIMIT 1', {},
		function(err, result) {
			if (err) throw err;

			console.log('Site ' + result[0].host);

			host = result[0].host;

			connection.query('SELECT * FROM linkes WHERE site = ' + siteId + ' AND (statusCode = -1 OR statusCode != 200)', {},
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

					parser(0);
				});
		});
});
