var Promise = require('bluebird'),
  mysql = require('mysql'),
  config = require('../config.json');

Promise.promisifyAll(require('mysql/lib/Connection').prototype);
Promise.promisifyAll(require('mysql/lib/Pool').prototype);

module.exports.init = function(callback) {

  console.log('DB Connecting...');

  var database = mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });


  database.connect(function(err) {
    if (err) {
      throw err;
      process.exit();
    }
    console.log('DB Connected!');

    database.config.queryFormat = function(query, values) {
      query = query.replace(/\{(\w+)\}/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));

      // console.log(query);

      return query;
    };

    callback();
  });

  return Promise.promisifyAll(database);
};
