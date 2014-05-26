var $ = require('NodObjC');
$.framework('Foundation');

/**
 * Expose `Spotlight`.
 */

exports = module.exports = Spotlight;

/**
 * Shared objects.
 */

// Maps `NotificationObserver` instances to their `Spotlight` counterpart.
var observers = {};

// Some core classes expect an `NSAutoreleasePool` on the stack.
var autoReleasePool = $.NSAutoreleasePool('alloc')('init');

/**
 * Registers a native `NotificationObserver` class.
 */

var NotificationObserver = $.NSObject.extend('NotificationObserver');

// Register listeners that delegate events back to the `Spotlight` instance.
['queryDidUpdate', 'queryDidFinishGathering'].forEach(function(event) {
  NotificationObserver.addMethod(
      event,
      { retval: 'v', args: ['@', ':', '@'] },
      function(self, selector, notification) {

    var spotlight = observers[self('self')];

    if (spotlight && typeof spotlight[event] == 'function') {
      spotlight[event](self, selector, notification);
    }
  });
});

NotificationObserver.register();

/**
 * Returns an `NSString` from a JavaScript string.
 */

function NSString(string) {
  return $.NSString('stringWithUTF8String', string);
}

/*
 * `Spotlight`.
 */

// Called for each search result.
Spotlight.searchResultCallback = null;

// Interval to tick the native event loop.
Spotlight.prototype.eventLoopInterval = null;

/*
 * Initialize a `Spotlight`.
 */

function Spotlight(searchResultCallback) {
  this.searchResultCallback = searchResultCallback;
  this.metadata = $.NSMetadataQuery('alloc')('init')('autorelease');

  // Create an `NotificationObserver`.
  this.observer = NotificationObserver('alloc')('init');
  // Map `NotificationObserver` back to this instance.
  observers[this.observer('self')] = this;

  // Set up observers.
  $.NSNotificationCenter('defaultCenter')(
    'addObserver', this.observer,
    'selector', $.NSSelectorFromString(NSString("queryDidUpdate")),
    'name', $.NSMetadataQueryDidUpdate,
    'object', this.metadata);

  $.NSNotificationCenter('defaultCenter')(
    'addObserver', this.observer,
    'selector', $.NSSelectorFromString(NSString("queryDidFinishGathering")),
    'name', $.NSMetadataQueryDidFinishGatheringNotification,
    'object', this.metadata);
}

/*
 * Starts ticking the native event loop every 50ms.
 */

Spotlight.prototype.startEventLoop = function() {
  if (this.eventLoopInterval != null) {
    return;
  }

  this.eventLoopInterval = setInterval(function() {
    do {
      var status = $.CFRunLoopRunInMode($.kCFRunLoopDefaultMode, 0, true);
    }
    while (status == $.kCFRunLoopRunHandledSource);
  }, 50);
};

/*
 * Stops ticking the native event loop.
 */

Spotlight.prototype.stopEventLoop = function() {
  clearInterval(this.eventLoopInterval);
  this.eventLoopInterval = null;
};

/*
 * Builds and sets an `NSPredicate` from `query`.
 * See:
 *   https://developer.apple.com/library/mac/documentation/Cocoa/Conceptual/Predicates/Articles/pCreating.html
 *   https://developer.apple.com/library/mac/documentation/carbon/Reference/MetadataAttributesRef/Reference/CommonAttrs.html
 */

Spotlight.prototype.setQuery = function(query) {
  var predicate = $.NSPredicate('predicateWithFormat', NSString(query));
  this.metadata('setPredicate', predicate);
};

/*
 * Starts a search.
 */

Spotlight.prototype.start = function() {
  this.metadata('startQuery');
};

/*
 * Stops a search.
 */

Spotlight.prototype.stop = function() {
  this.metadata('stopQuery');
};

/*
 * Searches using the given `query`. See `Spotlight.setQuery` for its format.
 */

Spotlight.prototype.search = function(query) {
  this.startEventLoop();
  this.setQuery(query);
  this.start();
};

/*
 * Handler for `NSQueryDidUpdate`.
 */

Spotlight.prototype.queryDidUpdate = function(ins, sel, notification) {};

/*
 * Handler for `NSQueryDidFinishGathering`.
 */

Spotlight.prototype.queryDidFinishGathering = function(ins, sel, notification) {
  this.stop();

  // Loop through results.
  var resultCount = this.metadata('resultCount');

  for (var i = 0; i < resultCount; i++) {
    var result = this.metadata('resultAtIndex', i);
    var displayName = result('valueForAttribute', NSString('kMDItemDisplayName'));

    // Call the callback with the result.
    if (typeof this.searchResultCallback == 'function') {
      this.searchResultCallback(displayName);
    }
  }

  this.stopEventLoop();
};
