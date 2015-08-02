var ipio = require('./lib/ipio.js');
var express = require('express');
var log = require('npmlog');
var bodyParser = require('body-parser');
var async = require('async');

var app = express();
app.use(bodyParser.json());
var router = express.Router();

var board = new ipio.IPIO({
  host: "10.0.0.21",
  username: "admin",
  password: ""
}, function () {
  app.listen(2000, function () {
    log.info('http', 'Server listening on port 2000');
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

app.use('/api', router);
