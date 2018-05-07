require('chromedriver');
var webdriver = require('selenium-webdriver');
var fs = require('fs');
var kinopoisk = require('./lib/kinopoiskParser');
var db = require('./lib/db');
var driver;
var ProgressBar = require('progress');

var movies = [],
    bar;

async function getHtml() {
  var el = await driver.findElement(webdriver.By.css('html'));
  return await el.getAttribute("innerHTML");
}


async function parser(i, callback) {
  var url = movies[i];

  if (url == '') {
    console.log('End');
    return;
  }

  await driver.get(url)

  var title = await driver.getTitle();

  console.log(title);

  if (title == '500 - Внутренняя ошибка сервера') {
    setTimeout(function() {
      parser(i);
    }, 2000);
    return;
  }

  var html = await getHtml();

  kinopoisk.movieInfo(html, url, function(result) {
    // console.log(result);

    fs.writeFile('files/' + result.id + '.json', JSON.stringify(result), function(err) {
      if (err) throw err;
      console.log("success " + result.id);

      parser(i + 1);
    });

  });

  // await element.sendKeys('webdriver', webdriver.Key.RETURN)
  // await driver.quit()

}

function parserInit() {
  driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();
  movies = fs.readFileSync('l3.txt', "utf8").split('\n');
}

function getCountriesIds() {

}

function getGenresIds() {

}

function saveCountries() {

}

function saveGenres() {

}

function saveData(i) {
  if (i == movies.length) {
    console.log('End');
    return;
  }

  var movie = movies[i];

  // console.log(movie.id);

  // console.log(movie);

  connection.query('SELECT kinopoisk_id FROM movies WHERE kinopoisk_id = {kinopoisk_id}', {
      kinopoisk_id: movie.id
    },
    function(err, result) {
      if (err) throw err;

      if (result.length == 0) {
        // insert
        // console.log('insert');

        connection.query('INSERT INTO movies (kinopoisk_link, ' +
          'poster, ' +
          'type, ' +
          'title,' +
          'alternativeTitle, ' +
          'year, ' +
          'countries, ' +
          'director, ' +
          'artist, ' +
          'genres, ' +
          'kinopoisk_rating, ' +
          'description' +
          ') VALUES (' +
          '{kinopoisk_link},' +
          '{poster},' +
          '{type},' +
          '{title},' +
          '{alternativeTitle},' +
          '{year},' +
          '{countries},' +
          '{director},' +
          '{artist},' +
          '{genres},' +
          '{kinopoisk_rating},' +
          '{description}' +
          ')', {
            kinopoisk_id: movie.id,
            kinopoisk_link: movie.link,
            poster: movie.poster,
            type: movie.type,
            title: movie.russian_title,
            alternativeTitle: movie.original_title,
            year: movie.year.substring(0, 4),
            countries: movie.country,
            director: movie.director,
            artist: movie.artist,
            genres: movie.genre,
            kinopoisk_rating: movie.rating,
            description: movie.description
          },
          function(err, result) {
            if (err) {
              console.log(movie);
              throw err;
            }

            bar.tick();
            saveData(i + 1);
          });
      } else {
        // update
        // console.log('update');

        connection.query('UPDATE movies SET kinopoisk_link = {kinopoisk_link}, ' +
          'poster = {poster},' +
          'type = {type},' +
          'title = {title},' +
          'alternativeTitle = {alternativeTitle},' +
          'year = {year},' +
          'countries = {countries},' +
          'director = {director},' +
          'artist = {artist},' +
          'genres = {genres},' +
          'kinopoisk_rating = {kinopoisk_rating},' +
          'description = {description}' +
          ' WHERE kinopoisk_id = {kinopoisk_id}', {
            kinopoisk_id: movie.id,
            kinopoisk_link: movie.link,
            poster: movie.poster,
            type: movie.type,
            title: movie.russian_title,
            alternativeTitle: movie.original_title,
            year: movie.year.substring(0, 4),
            countries: movie.country,
            director: movie.director,
            artist: movie.artist,
            genres: movie.genre,
            kinopoisk_rating: movie.rating,
            description: movie.description
          },
          function(err, result) {
            if (err) {
              console.log(movie);
              throw err;
            }

            bar.tick();
            saveData(i + 1);
          });
      }
    });
}

// parserInit();
// parser(0);

function prserJsons() {
  var dirname = 'filsesTest/'
  fs.readdir(dirname, function(err, filenames) {
    if (err) throw err;

    var ctr = 0;
    filenames.forEach(function(filename) {
      ctr++;
      if (filename.indexOf('.DS_Store') != -1) return;

      var content = fs.readFileSync(dirname + filename, 'utf-8');
      // console.log(content);
      movies.push(JSON.parse(content));

      if (ctr >= filenames.length) {

        bar = new ProgressBar('Saving [:bar] :rate/bps :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: filenames.length
          });

        saveData(0);
      }
    });
  });
}



var connection = db.init(function() {
  connection.query('SELECT kinopoisk_id FROM movies', {},
    function(err, result) {
      if (err) throw err;

      console.log('В базе ' + result.length);

      prserJsons();
    });
});
