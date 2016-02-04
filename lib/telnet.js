var telnet = require('telnet-stream');
var net = require('net');
var log = require('npmlog');

var Telnet = function Telnet (options) {
  this.listeners = [];
  this.ffListeners = [];
  var self = this;
  this.input = new telnet.TelnetInput();
  this.output = new telnet.TelnetOutput();
  this.writing = false;


  var socket = net.createConnection({
    host: options.host,
    port: options.port || 23,
    family: options.family || 4
  }, function () {
    socket.pipe(self.input);
    self.output.pipe(socket);

    self.input.on('do', function (option) {
      if (option == 3) self.output.writeWill(3);
    });

    self.input.on('will', function (option) {
      if (option == 1) self.output.writeDo(1);
    });

    self.input.on('command', function(command) {
      if (command == 13) {
        for (var i = 0; i < self.ffListeners.length; i++) {
          var listener = self.ffListeners[i];
          self.ffListeners.splice(i, 1);
          listener();
        }
      }
    });

    log.info('socket', 'Connected to device');
  });

  var buffer = '';
  this.input.on('data', function (chunk) {
    buffer += chunk;
    for (var i = 0; i < self.listeners.length; i++) {
      var listener = self.listeners[i];
      if (buffer.indexOf(listener.match) !== -1) {
        self.listeners.splice(i, 1);
        listener.callback(buffer);
      }
    }
    if (self.listeners.length === 0) {
      buffer = '';
    }
  });
};

Telnet.prototype.waitFor = function (key, cb) {
  this.listeners.push({
    match: key,
    callback: cb
  });
};

Telnet.prototype.write = function (cmd, cb) {
  this.writing = true;
  var self = this;
  this.writeArray(cmd.split(''), function () {
    self.writing = false;
    cb();
  });
};
Telnet.prototype.writeByte = function (char, cb) {
  this.output.write(char);
  this.waitFor(char, cb);
};
Telnet.prototype.writeArray = function (cmd, cb) {
  if (cmd.length === 0) {
    this.output.write('\r\n');
    return cb();
  }
  var self = this;
  var char = cmd.shift();
  this.writeByte(char, function () {
    self.writeArray(cmd, cb);
  });
};

Telnet.prototype.ping = function (cb) {
  if (this.listeners.length > 0 || this.writing)
    return cb();
  this.writeArray([], function () {
    this.waitFor('IPIO88>', function() {
      log.info('socket', 'ping sent');
      cb();
    });
  }.bind(this));
}

Telnet.prototype.login = function (username, password, callback) {
  var self = this;
  self.waitFor('Username: ', function () {
    self.write(username, function () {
      self.waitFor('Password: ', function () {
        self.output.write(password + '\r\n');
        self.waitFor('IPIO88>', function () {
          setInterval(function() {
            self.ping(function () {});
          }, 5000);
          log.info('socket', 'Logged in as ' + username);
          callback();
        });
      });
    });
  });
};

Telnet.prototype.waitForFF = function (cb) {
  return this.ffListeners.push(cb) - 1;
};

exports.Telnet = Telnet;
