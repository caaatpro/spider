const http = require('http'),
  https = require('https'),
  fs = require('fs-extra'),
  db = require('./lib/db'),
  ProgressBar = require('progress');

const uploadDir = 'posters/';

var files = [],
  bar;

function download(i) {
  if (i == files.length) {
    console.log('Всё');
    return;
  }

  var url = 'https://st.kp.yandex.net/images/film_big/' + files[i] + '.jpg';

  var array = url.split('/');
  var proto = array[0];
  var file = array[array.length - 1];

  if (proto == 'https:') {
    var request = https.get(url, function(response) {

      if (response.statusCode == 200 || response.statusCode == 302) {
        if (response.statusCode == 200) {
          var stream = fs.createWriteStream(uploadDir + file);
          response.pipe(stream);
        }
        download(i + 1);
      } else {
        console.log(url);
        console.log(response.statusCode);
      }
      bar.tick();
    });
  } else {
    var request = http.get(url, function(response) {
      if (response.statusCode == 200 || response.statusCode == 302) {
        if (response.statusCode == 200) {
          var stream = fs.createWriteStream(uploadDir + file);
          response.pipe(stream);
        }
        download(i + 1);
      } else {
        console.log(url);
        console.log(response.statusCode);
      }
      bar.tick();
    });
  }
}

function postersInDB(i) {
  if (i == files.length) {
    bar.end();
    return;
  }

  var file = 'posters/' + files[i] + '.jpg';

  var poster = 0;

  if (fs.existsSync(file)) {
    poster = 1;
  }

  connection.query('UPDATE movies SET poster = {poster} ' +
    ' WHERE kinopoisk_id = {kinopoisk_id}', {
      poster: poster,
      kinopoisk_id: files[i],
    },
    function(err, result) {
      if (err) {
        throw err;
      }

      bar.tick();
      postersInDB(i + 1);
    });
}

var connection = db.init(function() {
  connection.query('SELECT kinopoisk_id FROM movies', {},
    function(err, result) {
      if (err) throw err;

      console.log('В базе ' + result.length);

      for (var i = 0; i < result.length; i++) {
        files.push(result[i].kinopoisk_id)
      }

      console.log(files.length);

      bar = new ProgressBar('Saving [:bar] :rate/bps :percent :etas', {
        complete: '|',
        incomplete: '.',
        width: 100,
        total: files.length
      });

      bar.tick();

      // download(0);
      postersInDB(0);
    });
});
