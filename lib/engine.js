/* Engine */

var _ = require('underscore'),
    fs = require('fs'),
    isArray = require('util').isArray,
    isTypeOf = corejs.util.isTypeOf;

var startWs = /^\s+/,
    endWs = /\s+$/;

/*jshint evil:true */

function Engine() {

}


// Engine's compilation options
Engine.prototype.options = {};

// Node module of the template engine
Engine.prototype.module = null;

// Whether or not this is an asynchronous template engine
Engine.prototype.async = false;

// Whether or not the template engine allows multiple parts
Engine.prototype.multiPart = true;

// Extensions to register for the template engine
Engine.prototype.extensions = [];

// Used for partials caching purposes
Engine.prototype.cache = {};


/**
  Wrapper for _getCachedFunction

  @param {object} args
  @private
*/

Engine.prototype.getCachedFunction = function(args) {
  if (this.app.viewCaching) {
    return _getCachedFunction.apply(this, args);
  } else {
    return null;
  }
}

/** 
  Wrapper for _cacheFunction

  @param {function} func
  @param {object} args
  @private
*/

Engine.prototype.cacheFunction = function(func, args) {
 if (!this.app.viewCaching) return;
 var argsArray = [func].concat(Array.prototype.slice.call(args, 0));
 _cacheFunction.apply(this, argsArray);
}

/**
  Wrapper for _eval

  @param {function} func
  @param {object} args
  @param {boolean} addPartials
  @private
*/

Engine.prototype.evaluate = function(func, args, addPartials) {
  var argsArray = [func].concat(Array.prototype.slice.call(args, 0));
  if (addPartials === true) argsArray.push(true);
  return _eval.apply(this, argsArray);
}

/**
  Gets the template engine from extension

  @param {string} file
  @returns {object} engine
  @private
*/

Engine.prototype.getEngineByExtension = function(file) {
  if (typeof file == 'undefined') return null;
  var ext = file.slice(file.indexOf('.') + 1);
  return this.app.enginesByExtension[ext];
}

/**
  Renders a view partial

  @param {string} data
  @param {string} relPath
  @private
*/

Engine.prototype.renderPartial = function(path) {
  var app = this.app,
      data = fs.readFileSync(path, 'utf-8'),
      func = this.render(data, null, app.relPath(path, app.mvcpath + 'views'));
  if (typeof func == 'function') {
    func.engine = this.className;
    func.async = this.async;
  }
  return func;
}

/**
  Returns a cached partial or generates/caches a new one
  
  @param {function} func
  @returns {function}
  @private
 */

Engine.prototype.makePartialAsync = function(func) {
  var cachedPartial = this.cache[func.id];
  if (cachedPartial instanceof Function) return cachedPartial;
  else {
    return _makePartialAsync.call(this, func, this.asyncPartial(func), this.syncPartial(func));
  }
}

/**
  Generates an async partial from an async template engine.
  
  This serves a default for engines that expect [err, buffer]
  
  If the (async) template engine does not expect the parameters
  outlined above, then these methods should be overridden.
  
  @param {function} func
  @returns {function}
  @private
 */
 
Engine.prototype.asyncPartial = function(func) {
 return function(arg, callback) {
   func(arg, function(buf) {
     callback(null, buf);
   });
 }
}

/**
  Generates an async partial from a sync template engine.
  
  This serves a default for engines that expect [err, buffer]
  
  If the (async) template engine does not expect the parameters
  outlined above, then these methods should be overridden.
  
  @param {function} func
  @returns {function}
  @private
 */

Engine.prototype.syncPartial = function(func) {
 return function(arg, callback) {
   callback(null, func(arg));
 }
}

/**
  Returns available view partials
  
  @returns {object}
 */

Engine.prototype.returnPartials = function() {
  return this.app.views.partials;
}

/**
  Returns the start/end whitespace of a template
  
  @param {string} data
  @private
 */
 
Engine.prototype.getBoundaryWhitespace = function(data) {
  var sw = data.match(startWs),
      ew = data.match(endWs);
  sw = (sw && sw[0]) || '';
  ew = (ew && ew[0]) || '';
  return [sw, ew];
}

/**
  Makes functions asynchronous, following a specific pattern

  @param {string} data
  @param {object} vars
  @param {string} relPath
  @private
*/

function _makePartialAsync(func, asyncFn, syncFn) {
  // Return from cache
  var cached = this.cache[func.id];
  if (typeof cached == 'function') return cached;

  if (func.async) {
    // Async function
    return this.cache[func.relPath] = asyncFn;
  } else {
    // Sync function
    return this.cache[func.relPath] = syncFn;
  }
}

/** 
  Gets a view from the cache

  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
  @private
*/

function _getCachedFunction(data, vars, relPath) {
  var func, app = this.app;
  if (app.viewCaching) {
      func = app.views.callbacks[relPath];
      if (isTypeOf(func, 'function')) { return func; }
      else { return null; }
  } else { return null; }
}

/** 
  Caches a function into the view cache

  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
  @private
*/

function _cacheFunction(func, data, vars, relPath) {
  func.engine = this.className;
  if (vars) this.app.views.callbacks[relPath] = func;
}

/**
  Renders the evaluated template buffer.

  If there's an error, an exception will be returned otherwise.

  @param {function} func
  @param {string} data
  @param {object} vars
  @param {string} relPath
  @private
*/

function _eval(func, data, vars, relPath, partial) {
  if (vars) {
    
    var app = this.app, 
        appPartials = app.views.partials, 
        async = this.async,
        partials;
    
    // Add partials as helpers for all engines
    for (var f in appPartials) {
      if (async) {
        // Async engines need to make the helpers compatible with their asynchronous model
        vars[f] = this.makePartialAsync(appPartials[f]);
      } else {
        f = appPartials[f];
        if (f.async) {
          // Ignore async partials for sync engines
          // app.debug('Ignoring ' + f.id + ' partial on ' + vars.res.engine.constructor.name 
          //   + ' engine (not asynchronous)');
        } else {
          // Sync engines only support sync partials
          vars[f.id] = f;
        }
      }
    }
    
    // Rendering a template
    var res = vars.res;
    try {
      if (res.engine.async) {
        // Render asynchronous template
        func(vars, function(buffer) {
          res.emit('__async_template_done', buffer);
        });
      } else {
        // Render normal template
        if (typeof func == 'function') {
          // Specify extra partial arguments for the engines that need it
          if (partial) {
            // call rendering function with partials
            var args = this.returnPartials();
            if (isArray(args)) {
              return func.apply(null, [vars].concat(args));
            } else {
              return func(vars, args);
            }
            
          } else {
            // call rendering function normally
            return func(vars); 
          }
        } else {
          return func;
        }
      }
    } catch (e) {
      return e;
    }
  } else {
    // Rendering a partial, just return the function
    return func;
  }
}

module.exports = Engine;
