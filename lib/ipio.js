var telnet = require('./telnet.js');
var log = require('npmlog');

var IPIO = function (options, cb) {
  this.telnet = new telnet.Telnet({
    host: options.host
  });
  this.telnet.login(options.username, options.password, function () {
    log.info('ipio', 'Board initialized');
    cb();
  });
};

IPIO.prototype.singleOut = function (output, state, cb) {
  log.info('ipio', 'Turning ' + (state ? 'on ' : 'off ') + 'output ' + output);
  this.telnet.write((state ? 'on ' : 'off ') + output, cb);
};

IPIO.prototype.check = function (inout, cb) {
  var self = this;
  var ffFired = false;
  var ffId = this.telnet.waitForFF(function () {
    ffFired = true;
    var output = [];
    for (var j = 0; j < 8; j++) {
      output.push({id: j + 1, state: true});
    }
    cb(output);
  });

  this.telnet.waitFor('\r\nIPIO88>', function (data) {
    if (ffFired) return;
    self.telnet.ffListeners.splice(ffId, 1);
    var binary = (((data.split('')[data.indexOf('\r\nIPIO88>') - 1]).charCodeAt(0)) >>> 0).toString(2).split('').reverse();
    for (var i = 0; i < (8 - binary.length); i++) {
      binary.push('0');
    }
    var output = [];
    for (var j = 0; j < 8; j++) {
      output.push({id: j + 1, state: binary[j] === '1'});
    }
    cb(output);
  });
  this.telnet.write(inout ? 'A' : 'E', function() {});
};

IPIO.prototype.getInputs = function (cb) {
  this.check(false, cb);
};

IPIO.prototype.getOutputs = function (cb) {
  this.check(true, cb);
};

module.exports.IPIO = IPIO;
