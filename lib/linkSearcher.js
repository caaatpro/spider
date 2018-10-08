var cheerio = require('cheerio'),
	url = require('url');

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g, '').replace('\n', '').replace('...', '');
};

module.exports = {
	search: function(body, host, parent, ignoredLinks, callback) {
		var $ = cheerio.load(body);
		var links = $('a');

		var result = [];

		for (var link in links) {
			if (!links.hasOwnProperty(link)) continue;

			var href = $(links[link]).attr('href');

			if (href == undefined) continue;

			href = url.resolve(parent, href);

			var indexHash = href.indexOf('#');
			if (indexHash > 0) {
				href = href.substr(0, indexHash);
			}

			if (ignoredLinks.indexOf(href) != -1) {
				continue;
			}

			if (href.indexOf(host) == 0 || href.indexOf('/') == 0) {
				result.push(href);
			}
		}

		callback.call(this, result);
	}
};
