var cheerio = require('cheerio');
String.prototype.trim = function() {
  return this.replace(/^\s+|\s+$/g, '').replace('\n', '').replace('...', '');
};

module.exports = {
  movieInfo: function(body, link, callback) {
    var $ = cheerio.load(body);
    var title = $('.moviename-big').first().text();

    if (!title) {
      callback.call(this, 'nothing found for id ' + id);
      return;
    }

    var result = {
      link: link,
      id: link.substr(link.lastIndexOf('-')+1).split('/')[0],
      poster: $('.popupBigImage img').attr('src'),
      type: $('#headerFilm .moviename-big span').text().indexOf('сериал') > -1 ? 'series' : 'film',
      russian_title: title,
      original_title: $('span[itemprop=alternativeHeadline]').text().trim(),
      year: $('.info td:contains(год) ~ td').text().trim(),
      country: $('.info td:contains(страна) ~ td').text().trim(),
      director: $('.info td:contains(режиссер) ~ td').text().trim(),
      writer: $('.info td:contains(сценарий) ~ td').text().trim(),
      producer: $('.info td:contains(продюсер) ~ td').text().trim(),
      operator: $('.info td:contains(оператор) ~ td').text().trim(),
      composer: $('.info td:contains(композитор) ~ td').text().trim(),
      artist: $('.info td:contains(художник) ~ td').text().trim(),
      installation: $('.info td:contains(монтаж) ~ td').text().trim(),
      genre: $('.info td:contains(жанр) ~ td span[itemprop="genre"]').text().trim(),
      budget: $('.info td:contains(бюджет) ~ td').find('a').first().text().trim(),
      usa_box_office: $('.info td:contains(сборы в США) ~ td a').first().text().trim(),
      worldwide_box_office: $('.info td:contains(сборы в мире) ~ td a').first().text().trim(),
      rating: $('.rating_ball').text().trim(),
      description: $('.news .brand_words').text().trim()
    };

    callback.call(this, result);
  }
};
