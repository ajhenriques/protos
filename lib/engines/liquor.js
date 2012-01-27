
/* Liquor */

var liquor = require('liquor'),
    util = require('util');

// https://github.com/chjj/liquor

function Liquor(app) {
  this.app = app;
  this.options = {
    pretty: true
  }
  this.module = liquor;
  this.multiPart = true;
  this.extensions = ['liquor', 'liquor.html', 'lq.html'];
}

util.inherits(Liquor, framework.lib.engine);

Liquor.prototype.render = function(data) {
  data = this.app.applyFilters('liquor_template', data);
  var func = this.getCachedFunction(arguments);
  if (func === null) {
    func = liquor.compile(data, this.options);
    this.cacheFunction(func, arguments);
  }
  return this.evaluate(func, arguments);
}
  
module.exports = Liquor;
