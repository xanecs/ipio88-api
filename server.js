var ipio = require('./lib/ipio.js');
var express = require('express');
var log = require('npmlog');
var bodyParser = require('body-parser');
var async = require('async');
var fs = require('fs');
var basicAuth = require('basic-auth');
var cors = require('cors');

var config = require(fs.existsSync('./config/config.js') ? './config/config.js' : './config/config.default.js');

var app = express();
app.use(bodyParser.json());
app.use(cors());
var router = express.Router();

var auth = function (req, res, next) {
  function unauthorized(res) {
    res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
    return res.sendStatus(401);
  }

  var user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    return unauthorized(res);
  }

  if (user.name === config.api.authentication.username && user.pass === config.api.authentication.password) {
    return next();
  } else {
    return unauthorized(res);
  }
};

router.use(auth);

var board = new ipio.IPIO(config.device, function () {
  app.listen(config.api.port, function () {
    log.info('http', 'Server listening on port ' + config.api.port);
  });
});

router.post('/output/:id', function (req, res, next) {
  board.singleOut(req.params.id, req.body.state, function () {
    res.send({result: "ok"});
  });
});

router.get('/inputs', function (req, res, next) {
  board.getInputs(function (output) {
    res.send(output);
  });
});

router.post('/outputs', function (req, res, next) {
  async.eachSeries(req.body, function iterator(item, callback) {
    board.singleOut(item.id, item.state, callback);
  }, function () {
    res.send({result: "ok"});
  });
});

router.get('/outputs', function (req, res, next) {
  board.getOutputs(function (output) {
    res.send(output);
  });
});

router.post('/schedule', function (req, res, next) {
  board.schedule(req.body, function () {
    res.send({result: "ok"});
  });
})

app.use('/api', router);
