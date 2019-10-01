var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var request = require('request');
var https = require('https');
var fs = require('fs');
var path = require('path');
var helmet = require('helmet');
var bunyanLogger = require('express-bunyan-logger');
var bodyParser = require('body-parser');
var expressSanitized = require('express-sanitized');
var sanitizer = require('sanitizer');
var cors = require('cors');

var config = {};

config.cors = {
  origin: '*'
};

config.app = {
  name: 'redox-up-and-running'
};

config.https = {
  port: 3080,
  name: 'Redox',
  key_path: '/home/admin/certs/arpower.key',
  cert_path: '/home/admin/certs/arpower.crt',
  bundle_path: '/home/admin/certs/arpower.ca-bundle',
  options: {
    ciphers: [
      'ECDHE-RSA-AES256-SHA384',
      'DHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES256-SHA256',
      'DHE-RSA-AES256-SHA256',
      'ECDHE-RSA-AES128-SHA256',
      'DHE-RSA-AES128-SHA256',
      'HIGH',
      '!aNULL',
      '!eNULL',
      '!EXPORT',
      '!DES',
      '!RC4',
      '!MD5',
      '!PSK',
      '!SRP',
      '!CAMELLIA'
    ].join(':')
  }
};

var lowdb = require('lowdb');
var db = lowdb('db.json');

db.defaults({ appointments: [] })
	.write();



function loadSslCerts(httpsConfig) {
  try {
    httpsConfig.options.key = fs.readFileSync(httpsConfig.key_path);
    httpsConfig.options.cert = fs.readFileSync(httpsConfig.cert_path);
    httpsConfig.options.ca = fs.readFileSync(httpsConfig.bundle_path);
  } catch (e) {
    console.log('ERROR: Unable to read SSL Certs, check your config settings.');
    process.exit(1);
  }
}

var app = function (basePath, controllers) {
  var basePath = basePath || '/';
  var controllers = controllers || require('./redox-api/');

  var app = express();

  app.use(helmet.frameguard());
  app.use(helmet.hsts({
    maxAge: 31536000000, // ONE YEAR
    includeSubdomains: true,
    force: true
  }));
  app.use(helmet.hidePoweredBy());
  app.use(helmet.xssFilter());
  app.use(helmet.noSniff());
  app.use(helmet.ieNoOpen());
  app.use(bunyanLogger.errorLogger());
  app.use(bodyParser.json({
    limit: '5mb'
  }));
  app.use(bodyParser.urlencoded({
    limit: '5mb',
    extended: true
  }));
  app.use(cors(config.cors));

  app.use(basePath, controllers);

  // Handle 404
  app.use(function (req, res) {
    res.status(404);
    return res.json({
      message: 'Resource not found!',
      url: sanitizer.sanitize(req.url)
    });
  });

  app.use(function (err, req, res, next) {
    if (err.name === "UnauthorizedError") {
      res.status(401);
      res.json({
        type: 'error',
        message: 'Invalid credentials provided'
      });
    } else {
      res.status(500);
      res.json({
        'type': 'error',
        'message': err.message
      });
    }
  });

  return app;
};

function main() {
  loadSslCerts(config.https);
  var server = https.createServer(config.https.options, app());
  server.listen(config.https.port, function() {
    console.log('%s listening on port %s.', config.app.name, config.https.port);
  });
}

//if (require.main == module) {
  main();
//}
















