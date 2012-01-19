
/* Whiskers */

var whiskers = require('whiskers'),
    util = require('util');

// https://github.com/gsf/whiskers.js/tree

function Whiskers(app) {
  this.app = app;
  this.module = whiskers;
  this.multiPart = true;
  this.extensions = ['whiskers', 'whiskers.html', 'wk.html'];
}

util.inherits(Whiskers, framework.lib.engine);

Whiskers.prototype.render = function(data) {
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = whiskers.compile(data);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}

module.exports = Whiskers;
