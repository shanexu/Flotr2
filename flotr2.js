/*!
  * bean.js - copyright Jacob Thornton 2011
  * https://github.com/fat/bean
  * MIT License
  * special thanks to:
  * dean edwards: http://dean.edwards.name/
  * dperini: https://github.com/dperini/nwevents
  * the entire mootools team: github.com/mootools/mootools-core
  */
/*global module:true, define:true*/
!function (name, context, definition) {
  if (typeof module !== 'undefined') module.exports = definition(name, context);
  else if (typeof define === 'function' && typeof define.amd  === 'object') define(definition);
  else context[name] = definition(name, context);
}('bean', this, function (name, context) {
  var win = window
    , old = context[name]
    , overOut = /over|out/
    , namespaceRegex = /[^\.]*(?=\..*)\.|.*/
    , nameRegex = /\..*/
    , addEvent = 'addEventListener'
    , attachEvent = 'attachEvent'
    , removeEvent = 'removeEventListener'
    , detachEvent = 'detachEvent'
    , doc = document || {}
    , root = doc.documentElement || {}
    , W3C_MODEL = root[addEvent]
    , eventSupport = W3C_MODEL ? addEvent : attachEvent
    , slice = Array.prototype.slice
    , mouseTypeRegex = /click|mouse|menu|drag|drop/i
    , touchTypeRegex = /^touch|^gesture/i
    , ONE = { one: 1 } // singleton for quick matching making add() do one()

    , nativeEvents = (function (hash, events, i) {
        for (i = 0; i < events.length; i++)
          hash[events[i]] = 1
        return hash
      })({}, (
          'click dblclick mouseup mousedown contextmenu ' +                  // mouse buttons
          'mousewheel DOMMouseScroll ' +                                     // mouse wheel
          'mouseover mouseout mousemove selectstart selectend ' +            // mouse movement
          'keydown keypress keyup ' +                                        // keyboard
          'orientationchange ' +                                             // mobile
          'focus blur change reset select submit ' +                         // form elements
          'load unload beforeunload resize move DOMContentLoaded readystatechange ' + // window
          'error abort scroll ' +                                            // misc
          (W3C_MODEL ? // element.fireEvent('onXYZ'... is not forgiving if we try to fire an event
                       // that doesn't actually exist, so make sure we only do these on newer browsers
            'show ' +                                                          // mouse buttons
            'input invalid ' +                                                 // form elements
            'touchstart touchmove touchend touchcancel ' +                     // touch
            'gesturestart gesturechange gestureend ' +                         // gesture
            'message readystatechange pageshow pagehide popstate ' +           // window
            'hashchange offline online ' +                                     // window
            'afterprint beforeprint ' +                                        // printing
            'dragstart dragenter dragover dragleave drag drop dragend ' +      // dnd
            'loadstart progress suspend emptied stalled loadmetadata ' +       // media
            'loadeddata canplay canplaythrough playing waiting seeking ' +     // media
            'seeked ended durationchange timeupdate play pause ratechange ' +  // media
            'volumechange cuechange ' +                                        // media
            'checking noupdate downloading cached updateready obsolete ' +     // appcache
            '' : '')
        ).split(' ')
      )

    , customEvents = (function () {
        function isDescendant(parent, node) {
          while ((node = node.parentNode) !== null) {
            if (node === parent) return true
          }
          return false
        }

        function check(event) {
          var related = event.relatedTarget
          if (!related) return related === null
          return (related !== this && related.prefix !== 'xul' && !/document/.test(this.toString()) && !isDescendant(this, related))
        }

        return {
            mouseenter: { base: 'mouseover', condition: check }
          , mouseleave: { base: 'mouseout', condition: check }
          , mousewheel: { base: /Firefox/.test(navigator.userAgent) ? 'DOMMouseScroll' : 'mousewheel' }
        }
      })()

    , fixEvent = (function () {
        var commonProps = 'altKey attrChange attrName bubbles cancelable ctrlKey currentTarget detail eventPhase getModifierState isTrusted metaKey relatedNode relatedTarget shiftKey srcElement target timeStamp type view which'.split(' ')
          , mouseProps = commonProps.concat('button buttons clientX clientY dataTransfer fromElement offsetX offsetY pageX pageY screenX screenY toElement'.split(' '))
          , keyProps = commonProps.concat('char charCode key keyCode'.split(' '))
          , touchProps = commonProps.concat('touches targetTouches changedTouches scale rotation'.split(' '))
          , preventDefault = 'preventDefault'
          , createPreventDefault = function (event) {
              return function () {
                if (event[preventDefault])
                  event[preventDefault]()
                else
                  event.returnValue = false
              }
            }
          , stopPropagation = 'stopPropagation'
          , createStopPropagation = function (event) {
              return function () {
                if (event[stopPropagation])
                  event[stopPropagation]()
                else
                  event.cancelBubble = true
              }
            }
          , createStop = function (synEvent) {
              return function () {
                synEvent[preventDefault]()
                synEvent[stopPropagation]()
                synEvent.stopped = true
              }
            }
          , copyProps = function (event, result, props) {
              var i, p
              for (i = props.length; i--;) {
                p = props[i]
                if (!(p in result) && p in event) result[p] = event[p]
              }
            }

        return function (event, isNative) {
          var result = { originalEvent: event, isNative: isNative }
          if (!event)
            return result

          var props
            , type = event.type
            , target = event.target || event.srcElement

          result[preventDefault] = createPreventDefault(event)
          result[stopPropagation] = createStopPropagation(event)
          result.stop = createStop(result)
          result.target = target && target.nodeType === 3 ? target.parentNode : target

          if (isNative) { // we only need basic augmentation on custom events, the rest is too expensive
            if (type.indexOf('key') !== -1) {
              props = keyProps
              result.keyCode = event.which || event.keyCode
            } else if (mouseTypeRegex.test(type)) {
              props = mouseProps
              result.rightClick = event.which === 3 || event.button === 2
              result.pos = { x: 0, y: 0 }
              if (event.pageX || event.pageY) {
                result.clientX = event.pageX
                result.clientY = event.pageY
              } else if (event.clientX || event.clientY) {
                result.clientX = event.clientX + doc.body.scrollLeft + root.scrollLeft
                result.clientY = event.clientY + doc.body.scrollTop + root.scrollTop
              }
              if (overOut.test(type))
                result.relatedTarget = event.relatedTarget || event[(type === 'mouseover' ? 'from' : 'to') + 'Element']
            } else if (touchTypeRegex.test(type)) {
              props = touchProps
            }
            copyProps(event, result, props || commonProps)
          }
          return result
        }
      })()

      // if we're in old IE we can't do onpropertychange on doc or win so we use doc.documentElement for both
    , targetElement = function (element, isNative) {
        return !W3C_MODEL && !isNative && (element === doc || element === win) ? root : element
      }

      // we use one of these per listener, of any type
    , RegEntry = (function () {
        function entry(element, type, handler, original, namespaces) {
          this.element = element
          this.type = type
          this.handler = handler
          this.original = original
          this.namespaces = namespaces
          this.custom = customEvents[type]
          this.isNative = nativeEvents[type] && element[eventSupport]
          this.eventType = W3C_MODEL || this.isNative ? type : 'propertychange'
          this.customType = !W3C_MODEL && !this.isNative && type
          this.target = targetElement(element, this.isNative)
          this.eventSupport = this.target[eventSupport]
        }

        entry.prototype = {
            // given a list of namespaces, is our entry in any of them?
            inNamespaces: function (checkNamespaces) {
              var i, j
              if (!checkNamespaces)
                return true
              if (!this.namespaces)
                return false
              for (i = checkNamespaces.length; i--;) {
                for (j = this.namespaces.length; j--;) {
                  if (checkNamespaces[i] === this.namespaces[j])
                    return true
                }
              }
              return false
            }

            // match by element, original fn (opt), handler fn (opt)
          , matches: function (checkElement, checkOriginal, checkHandler) {
              return this.element === checkElement &&
                (!checkOriginal || this.original === checkOriginal) &&
                (!checkHandler || this.handler === checkHandler)
            }
        }

        return entry
      })()

    , registry = (function () {
        // our map stores arrays by event type, just because it's better than storing
        // everything in a single array. uses '$' as a prefix for the keys for safety
        var map = {}

          // generic functional search of our registry for matching listeners,
          // `fn` returns false to break out of the loop
          , forAll = function (element, type, original, handler, fn) {
              if (!type || type === '*') {
                // search the whole registry
                for (var t in map) {
                  if (t.charAt(0) === '$')
                    forAll(element, t.substr(1), original, handler, fn)
                }
              } else {
                var i = 0, l, list = map['$' + type], all = element === '*'
                if (!list)
                  return
                for (l = list.length; i < l; i++) {
                  if (all || list[i].matches(element, original, handler))
                    if (!fn(list[i], list, i, type))
                      return
                }
              }
            }

          , has = function (element, type, original) {
              // we're not using forAll here simply because it's a bit slower and this
              // needs to be fast
              var i, list = map['$' + type]
              if (list) {
                for (i = list.length; i--;) {
                  if (list[i].matches(element, original, null))
                    return true
                }
              }
              return false
            }

          , get = function (element, type, original) {
              var entries = []
              forAll(element, type, original, null, function (entry) { return entries.push(entry) })
              return entries
            }

          , put = function (entry) {
              (map['$' + entry.type] || (map['$' + entry.type] = [])).push(entry)
              return entry
            }

          , del = function (entry) {
              forAll(entry.element, entry.type, null, entry.handler, function (entry, list, i) {
                list.splice(i, 1)
                if (list.length === 0)
                  delete map['$' + entry.type]
                return false
              })
            }

            // dump all entries, used for onunload
          , entries = function () {
              var t, entries = []
              for (t in map) {
                if (t.charAt(0) === '$')
                  entries = entries.concat(map[t])
              }
              return entries
            }

        return { has: has, get: get, put: put, del: del, entries: entries }
      })()

      // add and remove listeners to DOM elements
    , listener = W3C_MODEL ? function (element, type, fn, add) {
        element[add ? addEvent : removeEvent](type, fn, false)
      } : function (element, type, fn, add, custom) {
        if (custom && add && element['_on' + custom] === null)
          element['_on' + custom] = 0
        element[add ? attachEvent : detachEvent]('on' + type, fn)
      }

    , nativeHandler = function (element, fn, args) {
        return function (event) {
          event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, true)
          return fn.apply(element, [event].concat(args))
        }
      }

    , customHandler = function (element, fn, type, condition, args, isNative) {
        return function (event) {
          if (condition ? condition.apply(this, arguments) : W3C_MODEL ? true : event && event.propertyName === '_on' + type || !event) {
            if (event)
              event = fixEvent(event || ((this.ownerDocument || this.document || this).parentWindow || win).event, isNative)
            fn.apply(element, event && (!args || args.length === 0) ? arguments : slice.call(arguments, event ? 0 : 1).concat(args))
          }
        }
      }

    , once = function (rm, element, type, fn, originalFn) {
        // wrap the handler in a handler that does a remove as well
        return function () {
          rm(element, type, originalFn)
          fn.apply(this, arguments)
        }
      }

    , removeListener = function (element, orgType, handler, namespaces) {
        var i, l, entry
          , type = (orgType && orgType.replace(nameRegex, ''))
          , handlers = registry.get(element, type, handler)

        for (i = 0, l = handlers.length; i < l; i++) {
          if (handlers[i].inNamespaces(namespaces)) {
            if ((entry = handlers[i]).eventSupport)
              listener(entry.target, entry.eventType, entry.handler, false, entry.type)
            // TODO: this is problematic, we have a registry.get() and registry.del() that
            // both do registry searches so we waste cycles doing this. Needs to be rolled into
            // a single registry.forAll(fn) that removes while finding, but the catch is that
            // we'll be splicing the arrays that we're iterating over. Needs extra tests to
            // make sure we don't screw it up. @rvagg
            registry.del(entry)
          }
        }
      }

    , addListener = function (element, orgType, fn, originalFn, args) {
        var entry
          , type = orgType.replace(nameRegex, '')
          , namespaces = orgType.replace(namespaceRegex, '').split('.')

        if (registry.has(element, type, fn))
          return element // no dupe
        if (type === 'unload')
          fn = once(removeListener, element, type, fn, originalFn) // self clean-up
        if (customEvents[type]) {
          if (customEvents[type].condition)
            fn = customHandler(element, fn, type, customEvents[type].condition, true)
          type = customEvents[type].base || type
        }
        entry = registry.put(new RegEntry(element, type, fn, originalFn, namespaces[0] && namespaces))
        entry.handler = entry.isNative ?
          nativeHandler(element, entry.handler, args) :
          customHandler(element, entry.handler, type, false, args, false)
        if (entry.eventSupport)
          listener(entry.target, entry.eventType, entry.handler, true, entry.customType)
      }

    , del = function (selector, fn, $) {
        return function (e) {
          var target, i, array = typeof selector === 'string' ? $(selector, this) : selector
          for (target = e.target; target && target !== this; target = target.parentNode) {
            for (i = array.length; i--;) {
              if (array[i] === target) {
                return fn.apply(target, arguments)
              }
            }
          }
        }
      }

    , remove = function (element, typeSpec, fn) {
        var k, m, type, namespaces, i
          , rm = removeListener
          , isString = typeSpec && typeof typeSpec === 'string'

        if (isString && typeSpec.indexOf(' ') > 0) {
          // remove(el, 't1 t2 t3', fn) or remove(el, 't1 t2 t3')
          typeSpec = typeSpec.split(' ')
          for (i = typeSpec.length; i--;)
            remove(element, typeSpec[i], fn)
          return element
        }
        type = isString && typeSpec.replace(nameRegex, '')
        if (type && customEvents[type])
          type = customEvents[type].type
        if (!typeSpec || isString) {
          // remove(el) or remove(el, t1.ns) or remove(el, .ns) or remove(el, .ns1.ns2.ns3)
          if (namespaces = isString && typeSpec.replace(namespaceRegex, ''))
            namespaces = namespaces.split('.')
          rm(element, type, fn, namespaces)
        } else if (typeof typeSpec === 'function') {
          // remove(el, fn)
          rm(element, null, typeSpec)
        } else {
          // remove(el, { t1: fn1, t2, fn2 })
          for (k in typeSpec) {
            if (typeSpec.hasOwnProperty(k))
              remove(element, k, typeSpec[k])
          }
        }
        return element
      }

    , add = function (element, events, fn, delfn, $) {
        var type, types, i, args
          , originalFn = fn
          , isDel = fn && typeof fn === 'string'

        if (events && !fn && typeof events === 'object') {
          for (type in events) {
            if (events.hasOwnProperty(type))
              add.apply(this, [ element, type, events[type] ])
          }
        } else {
          args = arguments.length > 3 ? slice.call(arguments, 3) : []
          types = (isDel ? fn : events).split(' ')
          isDel && (fn = del(events, (originalFn = delfn), $)) && (args = slice.call(args, 1))
          // special case for one()
          this === ONE && (fn = once(remove, element, events, fn, originalFn))
          for (i = types.length; i--;) addListener(element, types[i], fn, originalFn, args)
        }
        return element
      }

    , one = function () {
        return add.apply(ONE, arguments)
      }

    , fireListener = W3C_MODEL ? function (isNative, type, element) {
        var evt = doc.createEvent(isNative ? 'HTMLEvents' : 'UIEvents')
        evt[isNative ? 'initEvent' : 'initUIEvent'](type, true, true, win, 1)
        element.dispatchEvent(evt)
      } : function (isNative, type, element) {
        element = targetElement(element, isNative)
        // if not-native then we're using onpropertychange so we just increment a custom property
        isNative ? element.fireEvent('on' + type, doc.createEventObject()) : element['_on' + type]++
      }

    , fire = function (element, type, args) {
        var i, j, l, names, handlers
          , types = type.split(' ')

        for (i = types.length; i--;) {
          type = types[i].replace(nameRegex, '')
          if (names = types[i].replace(namespaceRegex, ''))
            names = names.split('.')
          if (!names && !args && element[eventSupport]) {
            fireListener(nativeEvents[type], type, element)
          } else {
            // non-native event, either because of a namespace, arguments or a non DOM element
            // iterate over all listeners and manually 'fire'
            handlers = registry.get(element, type)
            args = [false].concat(args)
            for (j = 0, l = handlers.length; j < l; j++) {
              if (handlers[j].inNamespaces(names))
                handlers[j].handler.apply(element, args)
            }
          }
        }
        return element
      }

    , clone = function (element, from, type) {
        var i = 0
          , handlers = registry.get(from, type)
          , l = handlers.length

        for (;i < l; i++)
          handlers[i].original && add(element, handlers[i].type, handlers[i].original)
        return element
      }

    , bean = {
          add: add
        , one: one
        , remove: remove
        , clone: clone
        , fire: fire
        , noConflict: function () {
            context[name] = old
            return this
          }
      }

  if (win[attachEvent]) {
    // for IE, clean up on unload to avoid leaks
    var cleanup = function () {
      var i, entries = registry.entries()
      for (i in entries) {
        if (entries[i].type && entries[i].type !== 'unload')
          remove(entries[i].element, entries[i].type)
      }
      win[detachEvent]('onunload', cleanup)
      win.CollectGarbage && win.CollectGarbage()
    }
    win[attachEvent]('onunload', cleanup)
  }

  return bean
});
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);
/**
 * Flotr2 (c) 2012 Carl Sutherland
 * MIT License
 * Special thanks to:
 * Flotr: http://code.google.com/p/flotr/ (fork)
 * Flot: https://github.com/flot/flot (original fork)
 */
(function () {

var
  global = this,
  previousFlotr = this.Flotr,
  Flotr;

Flotr = {
  _: _,
  bean: bean,
  hammer: Hammer,
  isIphone: /iphone/i.test(navigator.userAgent),
  isIE: (navigator.appVersion.indexOf("MSIE") != -1 ? parseFloat(navigator.appVersion.split("MSIE")[1]) : false),
  
  /**
   * An object of the registered graph types. Use Flotr.addType(type, object)
   * to add your own type.
   */
  graphTypes: {},
  
  /**
   * The list of the registered plugins
   */
  plugins: {},
  
  /**
   * Can be used to add your own chart type. 
   * @param {String} name - Type of chart, like 'pies', 'bars' etc.
   * @param {String} graphType - The object containing the basic drawing functions (draw, etc)
   */
  addType: function(name, graphType){
    Flotr.graphTypes[name] = graphType;
    Flotr.defaultOptions[name] = graphType.options || {};
    Flotr.defaultOptions.defaultType = Flotr.defaultOptions.defaultType || name;
  },
  
  /**
   * Can be used to add a plugin
   * @param {String} name - The name of the plugin
   * @param {String} plugin - The object containing the plugin's data (callbacks, options, function1, function2, ...)
   */
  addPlugin: function(name, plugin){
    Flotr.plugins[name] = plugin;
    Flotr.defaultOptions[name] = plugin.options || {};
  },
  
  /**
   * Draws the graph. This function is here for backwards compatibility with Flotr version 0.1.0alpha.
   * You could also draw graphs by directly calling Flotr.Graph(element, data, options).
   * @param {Element} el - element to insert the graph into
   * @param {Object} data - an array or object of dataseries
   * @param {Object} options - an object containing options
   * @param {Class} _GraphKlass_ - (optional) Class to pass the arguments to, defaults to Flotr.Graph
   * @return {Object} returns a new graph object and of course draws the graph.
   */
  draw: function(el, data, options, GraphKlass){  
    GraphKlass = GraphKlass || Flotr.Graph;
    return new GraphKlass(el, data, options);
  },
  
  /**
   * Recursively merges two objects.
   * @param {Object} src - source object (likely the object with the least properties)
   * @param {Object} dest - destination object (optional, object with the most properties)
   * @return {Object} recursively merged Object
   * @TODO See if we can't remove this.
   */
  merge: function(src, dest){
    var i, v, result = dest || {};

    for (i in src) {
      v = src[i];
      if (v && typeof(v) === 'object') {
        if (v.constructor === Array) {
          result[i] = this._.clone(v);
        } else if (
            v.constructor !== RegExp &&
            !this._.isElement(v) &&
            !v.jquery
        ) {
          result[i] = Flotr.merge(v, (dest ? dest[i] : undefined));
        } else {
          result[i] = v;
        }
      } else {
        result[i] = v;
      }
    }

    return result;
  },
  
  /**
   * Recursively clones an object.
   * @param {Object} object - The object to clone
   * @return {Object} the clone
   * @TODO See if we can't remove this.
   */
  clone: function(object){
    return Flotr.merge(object, {});
  },
  
  /**
   * Function calculates the ticksize and returns it.
   * @param {Integer} noTicks - number of ticks
   * @param {Integer} min - lower bound integer value for the current axis
   * @param {Integer} max - upper bound integer value for the current axis
   * @param {Integer} decimals - number of decimals for the ticks
   * @return {Integer} returns the ticksize in pixels
   */
  getTickSize: function(noTicks, min, max, decimals){
    var delta = (max - min) / noTicks,
        magn = Flotr.getMagnitude(delta),
        tickSize = 10,
        norm = delta / magn; // Norm is between 1.0 and 10.0.
        
    if(norm < 1.5) tickSize = 1;
    else if(norm < 2.25) tickSize = 2;
    else if(norm < 3) tickSize = ((decimals === 0) ? 2 : 2.5);
    else if(norm < 7.5) tickSize = 5;
    
    return tickSize * magn;
  },
  
  /**
   * Default tick formatter.
   * @param {String, Integer} val - tick value integer
   * @param {Object} axisOpts - the axis' options
   * @return {String} formatted tick string
   */
  defaultTickFormatter: function(val, axisOpts){
    return val+'';
  },
  
  /**
   * Formats the mouse tracker values.
   * @param {Object} obj - Track value Object {x:..,y:..}
   * @return {String} Formatted track string
   */
  defaultTrackFormatter: function(obj){
    return '('+obj.x+', '+obj.y+')';
  }, 
  
  /**
   * Utility function to convert file size values in bytes to kB, MB, ...
   * @param value {Number} - The value to convert
   * @param precision {Number} - The number of digits after the comma (default: 2)
   * @param base {Number} - The base (default: 1000)
   */
  engineeringNotation: function(value, precision, base){
    var sizes =         ['Y','Z','E','P','T','G','M','k',''],
        fractionSizes = ['y','z','a','f','p','n','µ','m',''],
        total = sizes.length;

    base = base || 1000;
    precision = Math.pow(10, precision || 2);

    if (value === 0) return 0;

    if (value > 1) {
      while (total-- && (value >= base)) value /= base;
    }
    else {
      sizes = fractionSizes;
      total = sizes.length;
      while (total-- && (value < 1)) value *= base;
    }

    return (Math.round(value * precision) / precision) + sizes[total];
  },
  
  /**
   * Returns the magnitude of the input value.
   * @param {Integer, Float} x - integer or float value
   * @return {Integer, Float} returns the magnitude of the input value
   */
  getMagnitude: function(x){
    return Math.pow(10, Math.floor(Math.log(x) / Math.LN10));
  },
  toPixel: function(val){
    return Math.floor(val)+0.5;//((val-Math.round(val) < 0.4) ? (Math.floor(val)-0.5) : val);
  },
  toRad: function(angle){
    return -angle * (Math.PI/180);
  },
  floorInBase: function(n, base) {
    return base * Math.floor(n / base);
  },
  drawText: function(ctx, text, x, y, style) {
    if (!ctx.fillText) {
      ctx.drawText(text, x, y, style);
      return;
    }
    
    style = this._.extend({
      size: Flotr.defaultOptions.fontSize,
      color: '#000000',
      textAlign: 'left',
      textBaseline: 'bottom',
      weight: 1,
      angle: 0
    }, style);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(style.angle);
    ctx.fillStyle = style.color;
    ctx.font = (style.weight > 1 ? "bold " : "") + (style.size*1.3) + "px sans-serif";
    ctx.textAlign = style.textAlign;
    ctx.textBaseline = style.textBaseline;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },
  getBestTextAlign: function(angle, style) {
    style = style || {textAlign: 'center', textBaseline: 'middle'};
    angle += Flotr.getTextAngleFromAlign(style);
    
    if (Math.abs(Math.cos(angle)) > 10e-3) 
      style.textAlign    = (Math.cos(angle) > 0 ? 'right' : 'left');
    
    if (Math.abs(Math.sin(angle)) > 10e-3) 
      style.textBaseline = (Math.sin(angle) > 0 ? 'top' : 'bottom');
    
    return style;
  },
  alignTable: {
    'right middle' : 0,
    'right top'    : Math.PI/4,
    'center top'   : Math.PI/2,
    'left top'     : 3*(Math.PI/4),
    'left middle'  : Math.PI,
    'left bottom'  : -3*(Math.PI/4),
    'center bottom': -Math.PI/2,
    'right bottom' : -Math.PI/4,
    'center middle': 0
  },
  getTextAngleFromAlign: function(style) {
    return Flotr.alignTable[style.textAlign+' '+style.textBaseline] || 0;
  },
  noConflict : function () {
    global.Flotr = previousFlotr;
    return this;
  }
};

global.Flotr = Flotr;

})();

/**
 * Flotr Defaults
 */
Flotr.defaultOptions = {
  colors: ['#00A8F0', '#C0D800', '#CB4B4B', '#4DA74D', '#9440ED'], //=> The default colorscheme. When there are > 5 series, additional colors are generated.
  ieBackgroundColor: '#FFFFFF', // Background color for excanvas clipping
  title: null,             // => The graph's title
  subtitle: null,          // => The graph's subtitle
  shadowSize: 4,           // => size of the 'fake' shadow
  defaultType: null,       // => default series type
  HtmlText: true,          // => wether to draw the text using HTML or on the canvas
  fontColor: '#545454',    // => default font color
  fontSize: 7.5,           // => canvas' text font size
  resolution: 1,           // => resolution of the graph, to have printer-friendly graphs !
  parseFloat: true,        // => whether to preprocess data for floats (ie. if input is string)
  preventDefault: true,    // => preventDefault by default for mobile events.  Turn off to enable scroll.
  rotate: 0,               // => 0不旋转，1旋转90度
  xaxis: {
    ticks: null,           // => format: either [1, 3] or [[1, 'a'], 3]
    minorTicks: null,      // => format: either [1, 3] or [[1, 'a'], 3]
    showLabels: true,      // => setting to true will show the axis ticks labels, hide otherwise
    showMinorLabels: false,// => true to show the axis minor ticks labels, false to hide
    labelsAngle: 0,        // => labels' angle, in degrees
    title: null,           // => axis title
    titleAngle: 0,         // => axis title's angle, in degrees
    noTicks: 5,            // => number of ticks for automagically generated ticks
    minorTickFreq: null,   // => number of minor ticks between major ticks for autogenerated ticks
    tickFormatter: Flotr.defaultTickFormatter, // => fn: number, Object -> string
    tickDecimals: null,    // => no. of decimals, null means auto
    min: null,             // => min. value to show, null means set automatically
    max: null,             // => max. value to show, null means set automatically
    autoscale: false,      // => Turns autoscaling on with true
    autoscaleMargin: 0,    // => margin in % to add if auto-setting min/max
    color: null,           // => color of the ticks
    mode: 'normal',        // => can be 'time' or 'normal'
    timeFormat: null,
    timeMode:'UTC',        // => For UTC time ('local' for local time).
    timeUnit:'millisecond',// => Unit for time (millisecond, second, minute, hour, day, month, year)
    scaling: 'linear',     // => Scaling, can be 'linear' or 'logarithmic'
    base: Math.E,
    titleAlign: 'center',
    margin: true           // => Turn off margins with false
  },
  x2axis: {},
  yaxis: {
    ticks: null,           // => format: either [1, 3] or [[1, 'a'], 3]
    minorTicks: null,      // => format: either [1, 3] or [[1, 'a'], 3]
    showLabels: true,      // => setting to true will show the axis ticks labels, hide otherwise
    showMinorLabels: false,// => true to show the axis minor ticks labels, false to hide
    labelsAngle: 0,        // => labels' angle, in degrees
    title: null,           // => axis title
    titleAngle: 90,        // => axis title's angle, in degrees
    noTicks: 5,            // => number of ticks for automagically generated ticks
    minorTickFreq: null,   // => number of minor ticks between major ticks for autogenerated ticks
    tickFormatter: Flotr.defaultTickFormatter, // => fn: number, Object -> string
    tickDecimals: null,    // => no. of decimals, null means auto
    tickInside: false,     // => tick inside
    min: null,             // => min. value to show, null means set automatically
    max: null,             // => max. value to show, null means set automatically
    autoscale: false,      // => Turns autoscaling on with true
    autoscaleMargin: 0,    // => margin in % to add if auto-setting min/max
    color: null,           // => The color of the ticks
    scaling: 'linear',     // => Scaling, can be 'linear' or 'logarithmic'
    base: Math.E,
    titleAlign: 'center',
    margin: true           // => Turn off margins with false
  },
  y2axis: {
    titleAngle: 270,
    tickInside: false      // => tick inside
  },
  labels: {
  },
  grid: {
    color: '#545454',      // => primary color used for outline and labels
    backgroundColor: null, // => null for transparent, else color
    backgroundImage: null, // => background image. String or object with src, left and top
    watermarkAlpha: 0.4,   // => 
    tickColor: '#DDDDDD',  // => color used for the ticks
    labelMargin: 3,        // => margin in pixels
    verticalLines: true,   // => whether to show gridlines in vertical direction
    minorVerticalLines: null, // => whether to show gridlines for minor ticks in vertical dir.
    horizontalLines: true, // => whether to show gridlines in horizontal direction
    minorHorizontalLines: null, // => whether to show gridlines for minor ticks in horizontal dir.
    outlineWidth: 1,       // => width of the grid outline/border in pixels
    outline : 'nsew',      // => walls of the outline to display
    circular: false,        // => if set to true, the grid will be circular, must be used when radars are drawn,
    specialColor: '#7d9979',
    specialLineDash: [5,5]
  },
  mouse: {
    track: false,          // => true to track the mouse, no tracking otherwise
    trackAll: false,
    position: 'se',        // => position of the value box (default south-east).  False disables.
    relative: false,       // => next to the mouse cursor
    trackFormatter: Flotr.defaultTrackFormatter, // => formats the values in the value box
    margin: 5,             // => margin in pixels of the valuebox
    lineColor: '#FF3F19',  // => line color of points that are drawn when mouse comes near a value of a series
    trackDecimals: 1,      // => decimals for the track values
    sensibility: 2,        // => the lower this number, the more precise you have to aim to show a value
    trackY: true,          // => whether or not to track the mouse in the y axis
    radius: 3,             // => radius of the track point
    fillColor: null,       // => color to fill our select bar with only applies to bar and similar graphs (only bars for now)
    fillOpacity: 0.4       // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill 
  }
};

/**
 * Flotr Color
 */

(function () {

var
  _ = Flotr._;

// Constructor
function Color (r, g, b, a) {
  this.rgba = ['r','g','b','a'];
  var x = 4;
  while(-1<--x){
    this[this.rgba[x]] = arguments[x] || ((x==3) ? 1.0 : 0);
  }
  this.normalize();
}

// Constants
var COLOR_NAMES = {
  aqua:[0,255,255],azure:[240,255,255],beige:[245,245,220],black:[0,0,0],blue:[0,0,255],
  brown:[165,42,42],cyan:[0,255,255],darkblue:[0,0,139],darkcyan:[0,139,139],darkgrey:[169,169,169],
  darkgreen:[0,100,0],darkkhaki:[189,183,107],darkmagenta:[139,0,139],darkolivegreen:[85,107,47],
  darkorange:[255,140,0],darkorchid:[153,50,204],darkred:[139,0,0],darksalmon:[233,150,122],
  darkviolet:[148,0,211],fuchsia:[255,0,255],gold:[255,215,0],green:[0,128,0],indigo:[75,0,130],
  khaki:[240,230,140],lightblue:[173,216,230],lightcyan:[224,255,255],lightgreen:[144,238,144],
  lightgrey:[211,211,211],lightpink:[255,182,193],lightyellow:[255,255,224],lime:[0,255,0],magenta:[255,0,255],
  maroon:[128,0,0],navy:[0,0,128],olive:[128,128,0],orange:[255,165,0],pink:[255,192,203],purple:[128,0,128],
  violet:[128,0,128],red:[255,0,0],silver:[192,192,192],white:[255,255,255],yellow:[255,255,0]
};

Color.prototype = {
  scale: function(rf, gf, bf, af){
    var x = 4;
    while (-1 < --x) {
      if (!_.isUndefined(arguments[x])) this[this.rgba[x]] *= arguments[x];
    }
    return this.normalize();
  },
  alpha: function(alpha) {
    if (!_.isUndefined(alpha) && !_.isNull(alpha)) {
      this.a = alpha;
    }
    return this.normalize();
  },
  clone: function(){
    return new Color(this.r, this.b, this.g, this.a);
  },
  limit: function(val,minVal,maxVal){
    return Math.max(Math.min(val, maxVal), minVal);
  },
  normalize: function(){
    var limit = this.limit;
    this.r = limit(parseInt(this.r, 10), 0, 255);
    this.g = limit(parseInt(this.g, 10), 0, 255);
    this.b = limit(parseInt(this.b, 10), 0, 255);
    this.a = limit(this.a, 0, 1);
    return this;
  },
  distance: function(color){
    if (!color) return;
    color = new Color.parse(color);
    var dist = 0, x = 3;
    while(-1<--x){
      dist += Math.abs(this[this.rgba[x]] - color[this.rgba[x]]);
    }
    return dist;
  },
  toString: function(){
    return (this.a >= 1.0) ? 'rgb('+[this.r,this.g,this.b].join(',')+')' : 'rgba('+[this.r,this.g,this.b,this.a].join(',')+')';
  },
  contrast: function () {
    var
      test = 1 - ( 0.299 * this.r + 0.587 * this.g + 0.114 * this.b) / 255;
    return (test < 0.5 ? '#000000' : '#ffffff');
  }
};

_.extend(Color, {
  /**
   * Parses a color string and returns a corresponding Color.
   * The different tests are in order of probability to improve speed.
   * @param {String, Color} str - string thats representing a color
   * @return {Color} returns a Color object or false
   */
  parse: function(color){
    if (color instanceof Color) return color;

    var result;

    // #a0b1c2
    if((result = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/.exec(color)))
      return new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16));

    // rgb(num,num,num)
    if((result = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color)))
      return new Color(parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10));
  
    // #fff
    if((result = /#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/.exec(color)))
      return new Color(parseInt(result[1]+result[1],16), parseInt(result[2]+result[2],16), parseInt(result[3]+result[3],16));
  
    // rgba(num,num,num,num)
    if((result = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(color)))
      return new Color(parseInt(result[1], 10), parseInt(result[2], 10), parseInt(result[3], 10), parseFloat(result[4]));
      
    // rgb(num%,num%,num%)
    if((result = /rgb\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*\)/.exec(color)))
      return new Color(parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55);
  
    // rgba(num%,num%,num%,num)
    if((result = /rgba\(\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\%\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*\)/.exec(color)))
      return new Color(parseFloat(result[1])*2.55, parseFloat(result[2])*2.55, parseFloat(result[3])*2.55, parseFloat(result[4]));

    // Otherwise, we're most likely dealing with a named color.
    var name = (color+'').replace(/^\s*([\S\s]*?)\s*$/, '$1').toLowerCase();
    if(name == 'transparent'){
      return new Color(255, 255, 255, 0);
    }
    return (result = COLOR_NAMES[name]) ? new Color(result[0], result[1], result[2]) : new Color(0, 0, 0, 0);
  },

  /**
   * Process color and options into color style.
   */
  processColor: function(color, options) {

    var opacity = options.opacity;
    if (!color) return 'rgba(0, 0, 0, 0)';
    if (color instanceof Color) return color.alpha(opacity).toString();
    if (_.isString(color)) return Color.parse(color).alpha(opacity).toString();
    
    var grad = color.colors ? color : {colors: color};
    
    if (!options.ctx) {
      if (!_.isArray(grad.colors)) return 'rgba(0, 0, 0, 0)';
      return Color.parse(_.isArray(grad.colors[0]) ? grad.colors[0][1] : grad.colors[0]).alpha(opacity).toString();
    }
    grad = _.extend({start: 'top', end: 'bottom'}, grad); 
    
    if (/top/i.test(grad.start))  options.x1 = 0;
    if (/left/i.test(grad.start)) options.y1 = 0;
    if (/bottom/i.test(grad.end)) options.x2 = 0;
    if (/right/i.test(grad.end))  options.y2 = 0;

    var i, c, stop, gradient = options.ctx.createLinearGradient(options.x1, options.y1, options.x2, options.y2);
    for (i = 0; i < grad.colors.length; i++) {
      c = grad.colors[i];
      if (_.isArray(c)) {
        stop = c[0];
        c = c[1];
      }
      else stop = i / (grad.colors.length-1);
      gradient.addColorStop(stop, Color.parse(c).alpha(opacity));
    }
    return gradient;
  }
});

Flotr.Color = Color;

})();

/**
 * Flotr Date
 */
Flotr.Date = {

  set : function (date, name, mode, value) {
    mode = mode || 'UTC';
    name = 'set' + (mode === 'UTC' ? 'UTC' : '') + name;
    date[name](value);
  },

  get : function (date, name, mode) {
    mode = mode || 'UTC';
    name = 'get' + (mode === 'UTC' ? 'UTC' : '') + name;
    return date[name]();
  },

  format: function(d, format, mode) {
    if (!d) return;

    // We should maybe use an "official" date format spec, like PHP date() or ColdFusion 
    // http://fr.php.net/manual/en/function.date.php
    // http://livedocs.adobe.com/coldfusion/8/htmldocs/help.html?content=functions_c-d_29.html
    var
      get = this.get,
      tokens = {
        h: get(d, 'Hours', mode).toString(),
        H: leftPad(get(d, 'Hours', mode)),
        M: leftPad(get(d, 'Minutes', mode)),
        S: leftPad(get(d, 'Seconds', mode)),
        s: get(d, 'Milliseconds', mode),
        d: get(d, 'Date', mode).toString(),
        m: (get(d, 'Month', mode) + 1).toString(),
        y: get(d, 'FullYear', mode).toString(),
        b: Flotr.Date.monthNames[get(d, 'Month', mode)]
      };

    function leftPad(n){
      n += '';
      return n.length == 1 ? "0" + n : n;
    }
    
    var r = [], c,
        escape = false;
    
    for (var i = 0; i < format.length; ++i) {
      c = format.charAt(i);
      
      if (escape) {
        r.push(tokens[c] || c);
        escape = false;
      }
      else if (c == "%")
        escape = true;
      else
        r.push(c);
    }
    return r.join('');
  },
  getFormat: function(time, span) {
    var tu = Flotr.Date.timeUnits;
         if (time < tu.second) return "%h:%M:%S.%s";
    else if (time < tu.minute) return "%h:%M:%S";
    else if (time < tu.day)    return (span < 2 * tu.day) ? "%h:%M" : "%b %d %h:%M";
    else if (time < tu.month)  return "%b %d";
    else if (time < tu.year)   return (span < tu.year) ? "%b" : "%b %y";
    else                       return "%y";
  },
  formatter: function (v, axis) {
    var
      options = axis.options,
      scale = Flotr.Date.timeUnits[options.timeUnit],
      d = new Date(v * scale);

    // first check global format
    if (axis.options.timeFormat)
      return Flotr.Date.format(d, options.timeFormat, options.timeMode);
    
    var span = (axis.max - axis.min) * scale,
        t = axis.tickSize * Flotr.Date.timeUnits[axis.tickUnit];

    return Flotr.Date.format(d, Flotr.Date.getFormat(t, span), options.timeMode);
  },
  generator: function(axis) {

     var
      set       = this.set,
      get       = this.get,
      timeUnits = this.timeUnits,
      spec      = this.spec,
      options   = axis.options,
      mode      = options.timeMode,
      scale     = timeUnits[options.timeUnit],
      min       = axis.min * scale,
      max       = axis.max * scale,
      delta     = (max - min) / options.noTicks,
      ticks     = [],
      tickSize  = axis.tickSize,
      tickUnit,
      formatter, i, d;

    // Use custom formatter or time tick formatter
    formatter = (options.tickFormatter === Flotr.defaultTickFormatter ?
      this.formatter : options.tickFormatter
    );

    for (i = 0; i < spec.length - 1; ++i) {
      d = spec[i][0] * timeUnits[spec[i][1]];
      if (delta < (d + spec[i+1][0] * timeUnits[spec[i+1][1]]) / 2 && d >= tickSize)
        break;
    }
    tickSize = spec[i][0];
    tickUnit = spec[i][1];

    // special-case the possibility of several years
    if (tickUnit == "year") {
      tickSize = Flotr.getTickSize(options.noTicks*timeUnits.year, min, max, 0);

      // Fix for 0.5 year case
      if (tickSize == 0.5) {
        tickUnit = "month";
        tickSize = 6;
      }
    }

    axis.tickUnit = tickUnit;
    axis.tickSize = tickSize;

    var step = tickSize * timeUnits[tickUnit];
    d = new Date(min);

    function setTick (name) {
      set(d, name, mode, Flotr.floorInBase(
        get(d, name, mode), tickSize
      ));
    }

    switch (tickUnit) {
      case "millisecond": setTick('Milliseconds'); break;
      case "second": setTick('Seconds'); break;
      case "minute": setTick('Minutes'); break;
      case "hour": setTick('Hours'); break;
      case "month": setTick('Month'); break;
      case "year": setTick('FullYear'); break;
    }
    
    // reset smaller components
    if (step >= timeUnits.second)  set(d, 'Milliseconds', mode, 0);
    if (step >= timeUnits.minute)  set(d, 'Seconds', mode, 0);
    if (step >= timeUnits.hour)    set(d, 'Minutes', mode, 0);
    if (step >= timeUnits.day)     set(d, 'Hours', mode, 0);
    if (step >= timeUnits.day * 4) set(d, 'Date', mode, 1);
    if (step >= timeUnits.year)    set(d, 'Month', mode, 0);

    var carry = 0, v = NaN, prev;
    do {
      prev = v;
      v = d.getTime();
      ticks.push({ v: v / scale, label: formatter(v / scale, axis) });
      if (tickUnit == "month") {
        if (tickSize < 1) {
          /* a bit complicated - we'll divide the month up but we need to take care of fractions
           so we don't end up in the middle of a day */
          set(d, 'Date', mode, 1);
          var start = d.getTime();
          set(d, 'Month', mode, get(d, 'Month', mode) + 1);
          var end = d.getTime();
          d.setTime(v + carry * timeUnits.hour + (end - start) * tickSize);
          carry = get(d, 'Hours', mode);
          set(d, 'Hours', mode, 0);
        }
        else
          set(d, 'Month', mode, get(d, 'Month', mode) + tickSize);
      }
      else if (tickUnit == "year") {
        set(d, 'FullYear', mode, get(d, 'FullYear', mode) + tickSize);
      }
      else
        d.setTime(v + step);

    } while (v < max && v != prev);

    return ticks;
  },
  timeUnits: {
    millisecond: 1,
    second: 1000,
    minute: 1000 * 60,
    hour:   1000 * 60 * 60,
    day:    1000 * 60 * 60 * 24,
    month:  1000 * 60 * 60 * 24 * 30,
    year:   1000 * 60 * 60 * 24 * 365.2425
  },
  // the allowed tick sizes, after 1 year we use an integer algorithm
  spec: [
    [1, "millisecond"], [20, "millisecond"], [50, "millisecond"], [100, "millisecond"], [200, "millisecond"], [500, "millisecond"], 
    [1, "second"],   [2, "second"],  [5, "second"], [10, "second"], [30, "second"], 
    [1, "minute"],   [2, "minute"],  [5, "minute"], [10, "minute"], [30, "minute"], 
    [1, "hour"],     [2, "hour"],    [4, "hour"],   [8, "hour"],    [12, "hour"],
    [1, "day"],      [2, "day"],     [3, "day"],
    [0.25, "month"], [0.5, "month"], [1, "month"],  [2, "month"],   [3, "month"], [6, "month"],
    [1, "year"]
  ],
  monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
};

(function () {

var _ = Flotr._;

function getEl (el) {
  return (el && el.jquery) ? el[0] : el;
}

Flotr.DOM = {
  addClass: function(element, name){
    element = getEl(element);
    var classList = (element.className ? element.className : '');
      if (_.include(classList.split(/\s+/g), name)) return;
    element.className = (classList ? classList + ' ' : '') + name;
  },
  /**
   * Create an element.
   */
  create: function(tag){
    return document.createElement(tag);
  },
  node: function(html) {
    var div = Flotr.DOM.create('div'), n;
    div.innerHTML = html;
    n = div.children[0];
    div.innerHTML = '';
    return n;
  },
  /**
   * Remove all children.
   */
  empty: function(element){
    element = getEl(element);
    element.innerHTML = '';
    /*
    if (!element) return;
    _.each(element.childNodes, function (e) {
      Flotr.DOM.empty(e);
      element.removeChild(e);
    });
    */
  },
  remove: function (element) {
    element = getEl(element);
    element.parentNode.removeChild(element);
  },
  hide: function(element){
    element = getEl(element);
    Flotr.DOM.setStyles(element, {display:'none'});
  },
  /**
   * Insert a child.
   * @param {Element} element
   * @param {Element|String} Element or string to be appended.
   */
  insert: function(element, child){
    element = getEl(element);
    if(_.isString(child))
      element.innerHTML += child;
    else if (_.isElement(child))
      element.appendChild(child);
  },
  // @TODO find xbrowser implementation
  opacity: function(element, opacity) {
    element = getEl(element);
    element.style.opacity = opacity;
  },
  position: function(element, p){
    element = getEl(element);
    if (!element.offsetParent)
      return {left: (element.offsetLeft || 0), top: (element.offsetTop || 0)};

    p = this.position(element.offsetParent);
    p.left  += element.offsetLeft;
    p.top   += element.offsetTop;
    return p;
  },
  removeClass: function(element, name) {
    var classList = (element.className ? element.className : '');
    element = getEl(element);
    element.className = _.filter(classList.split(/\s+/g), function (c) {
      if (c != name) return true; }
    ).join(' ');
  },
  setStyles: function(element, o) {
    element = getEl(element);
    _.each(o, function (value, key) {
      element.style[key] = value;
    });
  },
  show: function(element){
    element = getEl(element);
    Flotr.DOM.setStyles(element, {display:''});
  },
  /**
   * Return element size.
   */
  size: function(element){
    element = getEl(element);
    return {
      height : element.offsetHeight,
      width : element.offsetWidth };
  }
};

})();

/**
 * Flotr Event Adapter
 */
(function () {
var
  F = Flotr,
  bean = F.bean;
F.EventAdapter = {
  observe: function(object, name, callback) {
    bean.add(object, name, callback);
    return this;
  },
  fire: function(object, name, args) {
    bean.fire(object, name, args);
    if (typeof(Prototype) != 'undefined')
      Event.fire(object, name, args);
    // @TODO Someone who uses mootools, add mootools adapter for existing applciations.
    return this;
  },
  stopObserving: function(object, name, callback) {
    bean.remove(object, name, callback);
    return this;
  },
  eventPointer: function(e) {
    if (!F._.isUndefined(e.touches) && e.touches.length > 0) {
      return {
        x : e.touches[0].pageX,
        y : e.touches[0].pageY
      };
    } else if (!F._.isUndefined(e.changedTouches) && e.changedTouches.length > 0) {
      return {
        x : e.changedTouches[0].pageX,
        y : e.changedTouches[0].pageY
      };
    } else if (e.pageX || e.pageY) {
      return {
        x : e.pageX,
        y : e.pageY
      };
    } else if (e.clientX || e.clientY) {
      var
        d = document,
        b = d.body,
        de = d.documentElement;
      return {
        x: e.clientX + b.scrollLeft + de.scrollLeft,
        y: e.clientY + b.scrollTop + de.scrollTop
      };
    }
  }
};
})();

/**
 * Text Utilities
 */
(function () {

var
  F = Flotr,
  D = F.DOM,
  _ = F._,

Text = function (o) {
  this.o = o;
};

Text.prototype = {

  dimensions : function (text, canvasStyle, htmlStyle, className) {

    if (!text) return { width : 0, height : 0 };
    
    return (this.o.html) ?
      this.html(text, this.o.element, htmlStyle, className) : 
      this.canvas(text, canvasStyle);
  },

  canvas : function (text, style) {

    if (!this.o.textEnabled) return;
    style = style || {};

    var
      metrics = this.measureText(text, style),
      width = metrics.width,
      height = style.size || F.defaultOptions.fontSize,
      angle = style.angle || 0,
      cosAngle = Math.cos(angle),
      sinAngle = Math.sin(angle),
      widthPadding = 2,
      heightPadding = 6,
      bounds;

    bounds = {
      width: Math.abs(cosAngle * width) + Math.abs(sinAngle * height) + widthPadding,
      height: Math.abs(sinAngle * width) + Math.abs(cosAngle * height) + heightPadding
    };

    return bounds;
  },

  html : function (text, element, style, className) {

    var div = D.create('div');

    D.setStyles(div, { 'position' : 'absolute', 'top' : '-10000px' });
    D.insert(div, '<div style="'+style+'" class="'+className+' flotr-dummy-div">' + text + '</div>');
    D.insert(this.o.element, div);

    return D.size(div);
  },

  measureText : function (text, style) {

    var
      context = this.o.ctx,
      metrics;

    if (!context.fillText || (F.isIphone && context.measure)) {
      return { width : context.measure(text, style)};
    }

    style = _.extend({
      size: F.defaultOptions.fontSize,
      weight: 1,
      angle: 0
    }, style);

    context.save();
    context.font = (style.weight > 1 ? "bold " : "") + (style.size*1.3) + "px sans-serif";
    metrics = context.measureText(text);
    context.restore();

    return metrics;
  }
};

Flotr.Text = Text;

})();

/**
 * Flotr Graph class that plots a graph on creation.
 */
(function () {

var
  D     = Flotr.DOM,
  E     = Flotr.EventAdapter,
  _     = Flotr._,
  flotr = Flotr;
/**
 * Flotr Graph constructor.
 * @param {Element} el - element to insert the graph into
 * @param {Object} data - an array or object of dataseries
 * @param {Object} options - an object containing options
 */
Graph = function(el, data, options){
// Let's see if we can get away with out this [JS]
//  try {
    this._setEl(el);
    this._initMembers();
    this._initPlugins();

    E.fire(this.el, 'flotr:beforeinit', [this]);

    this.data = data;
    this.series = flotr.Series.getSeries(data);
    this._initOptions(options);
    this._initGraphTypes();
    this._initCanvas();
    this._text = new flotr.Text({
      element : this.el,
      ctx : this.ctx,
      html : this.options.HtmlText,
      textEnabled : this.textEnabled
    });
    E.fire(this.el, 'flotr:afterconstruct', [this]);
    this._initEvents();

    this.findDataRanges();
    this.calculateSpacing();

    this.draw(_.bind(function() {
      E.fire(this.el, 'flotr:afterinit', [this]);
    }, this));
/*
    try {
  } catch (e) {
    try {
      console.error(e);
    } catch (e2) {}
  }*/
};

function observe (object, name, callback) {
  E.observe.apply(this, arguments);
  this._handles.push(arguments);
  return this;
}

Graph.prototype = {
  getDataIndexValue: function(dataIndex){
    if(_.isFunction(this.options.getDataIndexValue)){
      return this.options.getDataIndexValue.apply(this, [dataIndex]);
    }
    return this.data[0].data[dataIndex][1];
  },

  destroy: function () {
    E.fire(this.el, 'flotr:destroy');
    _.each(this._handles, function (handle) {
      E.stopObserving.apply(this, handle);
    });
    this._handles = [];
    this.el.graph = null;
  },

  observe : observe,

  /**
   * @deprecated
   */
  _observe : observe,

  processColor: function(color, options){
    var o = { x1: 0, y1: 0, x2: this.plotWidth, y2: this.plotHeight, opacity: 1, ctx: this.ctx };
    _.extend(o, options);
    return flotr.Color.processColor(color, o);
  },
  /**
   * Function determines the min and max values for the xaxis and yaxis.
   *
   * TODO logarithmic range validation (consideration of 0)
   */
  findDataRanges: function(){
    var a = this.axes,
      xaxis, yaxis, range;

    _.each(this.series, function (series) {
      range = series.getRange();
      if (range) {
        xaxis = series.xaxis;
        yaxis = series.yaxis;
        xaxis.datamin = Math.min(range.xmin, xaxis.datamin);
        xaxis.datamax = Math.max(range.xmax, xaxis.datamax);
        yaxis.datamin = Math.min(range.ymin, yaxis.datamin);
        yaxis.datamax = Math.max(range.ymax, yaxis.datamax);
        xaxis.used = (xaxis.used || range.xused);
        yaxis.used = (yaxis.used || range.yused);
      }
    }, this);

    // Check for empty data, no data case (none used)
    if (!a.x.used && !a.x2.used) a.x.used = true;
    if (!a.y.used && !a.y2.used) a.y.used = true;

    _.each(a, function (axis) {
      axis.calculateRange();
    });

    var
      types = _.keys(flotr.graphTypes),
      drawn = false;

    _.each(this.series, function (series) {
      if (series.hide) return;
      _.each(types, function (type) {
        if (series[type] && series[type].show) {
          this.extendRange(type, series);
          drawn = true;
        }
      }, this);
      if (!drawn) {
        this.extendRange(this.options.defaultType, series);
      }
    }, this);
  },

  extendRange : function (type, series) {
    if (this[type].extendRange) this[type].extendRange(series, series.data, series[type], this[type]);
    if (this[type].extendYRange) this[type].extendYRange(series.yaxis, series.data, series[type], this[type], series);
    if (this[type].extendXRange) this[type].extendXRange(series.xaxis, series.data, series[type], this[type], series);
  },

  /**
   * Calculates axis label sizes.
   */
  calculateSpacing: function(){

    var a = this.axes,
        options = this.options,
        series = this.series,
        margin = options.grid.labelMargin,
        T = this._text,
        x = a.x,
        x2 = a.x2,
        y = a.y,
        y2 = a.y2,
        maxOutset = options.grid.outlineWidth,
        i, j, l, dim, hh;

    // TODO post refactor, fix this
    _.each(a, function (axis) {
      axis.calculateTicks();
      axis.calculateTextDimensions(T, options);
    });

    // Title height
    dim = T.dimensions(
      options.title,
      {size: options.fontSize*1.5},
      'font-size:1em;font-weight:bold;',
      'flotr-title'
    );
    this.titleHeight = dim.height;

    // Subtitle height
    dim = T.dimensions(
      options.subtitle,
      {size: options.fontSize},
      'font-size:smaller;',
      'flotr-subtitle'
    );
    this.subtitleHeight = dim.height;

    for(j = 0; j < options.length; ++j){
      if (series[j].points.show){
        maxOutset = Math.max(maxOutset, series[j].points.radius + series[j].points.lineWidth/2);
      }
    }

    var p = this.plotOffset;
    if (x.options.margin === false) {
      p.bottom = 0;
      p.top    = 0;
    } else
    if (x.options.margin === true) {
      p.bottom += (options.grid.circular ? 0 : (x.used && x.options.showLabels ?  (x.maxLabel.height + margin) : 0)) +
                  (x.used && x.options.title ? (x.titleSize.height + margin) : 0) + maxOutset;

      p.top    += (options.grid.circular ? 0 : (x2.used && x2.options.showLabels ? (x2.maxLabel.height + margin) : 0)) +
                  (x2.used && x2.options.title ? (x2.titleSize.height + margin) : 0) + this.subtitleHeight + this.titleHeight + maxOutset;
      hh = y.maxLabel.height / 2;
      p.top = p.top < hh ? hh : p.top;
      p.bottom = p.bottom < hh ? hh : p.bottom;
    } else {
      p.bottom = x.options.margin;
      p.top = x.options.margin;
    }
    if (y.options.margin === false) {
      p.left  = 0;
      p.right = 0;
    } else
    if (y.options.margin === true && !y.options.tickInside) {
      p.left   += (options.grid.circular ? 0 : Math.max((y.used && y.options.showLabels ?  (y.maxLabel.width + margin) : 0), (y2.used &&  y2.options.stack && y2.options.showLabels ? (y2.maxLabel.width + margin) : 0))) +
                  (y.used && y.options.title ? (y.titleSize.width + margin) : 0) + maxOutset;
      p.right  += (options.grid.circular ? 0 : (y2.used && !y2.options.stack && y2.options.showLabels ? (y2.maxLabel.width + margin) : 0)) +
                  (y2.used && y2.options.title ? (y2.titleSize.width + margin) : 0) + maxOutset;
    } else {
      p.left = y.options.margin;
      p.right = y.options.margin;
    }

    p.top = Math.floor(p.top); // In order the outline not to be blured

	if(y.options.left) { p.left = Math.max(p.left, y.options.left);}
    if(y.options.right) { p.right = Math.max(p.right, y.options.right);}
	if(y2.options.left) { p.left = Math.max(p.left, y2.options.left);}
    if(y2.options.right) { p.right = Math.max(p.right, y2.options.right);}

    this.plotWidth  = this.canvasWidth - p.left - p.right;
	y.canvasHeight = y.options.height ? this.canvasHeight * y.options.height : this.canvasHeight;
    this.plotHeight = y.canvasHeight - p.bottom - p.top;

    // TODO post refactor, fix this
    x.length = x2.length = this.plotWidth;
    y.length = y2.length = this.plotHeight;
    if(y2.options.stack) {
      y2.canvasHeight = this.canvasHeight - y.canvasHeight;
      // TODO -2
      y2.length = y2.canvasHeight - 2;
    }
    y.offset = y2.offset = this.plotHeight;
    x.setScale();
    x2.setScale();
    y.setScale();
    y2.setScale();
  },
  /**
   * Draws grid, labels, series and outline.
   */
  draw: function(after) {

    var
      context = this.ctx,
      i;

    E.fire(this.el, 'flotr:beforedraw', [this.series, this]);

    if (this.series.length) {

      context.save();
      context.translate(this.plotOffset.left, this.plotOffset.top);
      this.series.sort(function(a,b){return a.yaxis.options.stack - a.yaxis.options.stack;});
      var ss = _.partition(this.series, function(s){return !s.yaxis.options.stack;});
      _.each(ss[0], function(serie){
        if (!serie.hide) {
          this.drawSeries(serie);
        }
      }, this);
      context.restore();
      this.clip();
      context.restore();
      context.save();
      context.translate(this.plotOffset.left, this.canvasHeight - this.plotHeight - 2);
      _.each(ss[1], function(serie){
        if (!serie.hide) {
          E.fire(this.el, 'flotr:beforedrawy2axis', [this.series, this]);
          this.drawSeries(serie);
        }
      }, this);
      context.restore();
      this.clip2();
      context.save();
      context.translate(this.plotOffset.left, this.plotOffset.top);
      context.restore();
    }

    E.fire(this.el, 'flotr:afterdraw', [this.series, this]);
    if (after) after();
  },
  /**
   * Actually draws the graph.
   * @param {Object} series - series to draw
   */
  drawSeries: function(series){

    function drawChart (series, typeKey) {
      var options = this.getOptions(series, typeKey);
      this[typeKey].draw(options);
    }

    var drawn = false;
    series = series || this.series;

    _.each(flotr.graphTypes, function (type, typeKey) {
      if (series[typeKey] && series[typeKey].show && this[typeKey]) {
        drawn = true;
        drawChart.call(this, series, typeKey);
      }
    }, this);

    if (!drawn) drawChart.call(this, series, this.options.defaultType);
  },

  getOptions : function (series, typeKey) {
    var
      type = series[typeKey],
      graphType = this[typeKey],
      xaxis = series.xaxis,
      yaxis = series.yaxis,
      options = {
        context     : this.ctx,
        width       : this.plotWidth,
        height      : this.plotHeight,
        fontSize    : this.options.fontSize,
        fontColor   : this.options.fontColor,
        textEnabled : this.textEnabled,
        htmlText    : this.options.HtmlText,
        text        : this._text, // TODO Is this necessary?
        element     : this.el,
        data        : series.data,
        color       : series.color,
        shadowSize  : series.shadowSize,
        xScale      : xaxis.d2p,
        yScale      : yaxis.d2p,
        xInverse    : xaxis.p2d,
        yInverse    : yaxis.p2d,
        yi          : series.yi,
        xi          : series.xi
      };

    options = flotr.merge(type, options);

    // Fill
    options.fillStyle = this.processColor(
      type.fillColor || series.color,
      {opacity: type.fillOpacity}
    );

    return options;
  },
  /**
   * Calculates the coordinates from a mouse event object.
   * @param {Event} event - Mouse Event object.
   * @return {Object} Object with coordinates of the mouse.
   */
  getEventPosition: function (e){

    var
      d = document,
      b = d.body,
      de = d.documentElement,
      axes = this.axes,
      plotOffset = this.plotOffset,
      lastMousePos = this.lastMousePos,
      pointer = E.eventPointer(e);
    if(_.isFunction(this.options.adjustPosition))
      this.options.adjustPosition.call(this, pointer);
    var
      dx = pointer.x - lastMousePos.pageX,
      dy = pointer.y - lastMousePos.pageY,
      r, rx, ry, rrx, rry;

    if ('ontouchstart' in this.el) {
      r = D.position(this.overlay);
      rx = pointer.x - r.left - plotOffset.left;
      ry = pointer.y - r.top - plotOffset.top;
      rrx = rx;
      rry = ry;
      if(this.options.rotate){
        rrx = pointer.y - r.top - plotOffset.left;
        rry = this.canvasHeight - plotOffset.top - (pointer.x - r.left - plotOffset.left);
      }
    } else {
      r = this.overlay.getBoundingClientRect();
      rx = e.clientX - r.left - plotOffset.left - b.scrollLeft - de.scrollLeft;
      ry = e.clientY - r.top - plotOffset.top - b.scrollTop - de.scrollTop;
      rrx = rx;
      rry = ry;
      if(this.options.rotate){
        rrx = e.clientY - r.top - plotOffset.left - b.scrollTop - de.scrollTop;
        rry = this.canvasHeight - plotOffset.top - (e.clientX - r.left - b.scrollLeft - de.scrollLeft);
      }
    }

    return {
      x:  axes.x.p2d(rx),
      x2: axes.x2.p2d(rx),
      y:  axes.y.p2d(ry),
      y2: axes.y2.p2d(ry),
      relX: rx,
      relY: ry,
      dX: dx,
      dY: dy,
      absX: pointer.x,
      absY: pointer.y,
      pageX: pointer.x,
      pageY: pointer.y,
      rotatedRelX: rrx,
      rotatedRelY: rry
    };
  },
  /**
   * Observes the 'click' event and fires the 'flotr:click' event.
   * @param {Event} event - 'click' Event object.
   */
  clickHandler: function(event){
    if(this.ignoreClick){
      this.ignoreClick = false;
      return this.ignoreClick;
    }
    E.fire(this.el, 'flotr:click', [this.getEventPosition(event), this]);
  },
  /**
   * Observes mouse movement over the graph area. Fires the 'flotr:mousemove' event.
   * @param {Event} event - 'mousemove' Event object.
   */
  mouseMoveHandler: function(event){
    if (this.mouseDownMoveHandler) return;
    var pos = this.getEventPosition(event);
    E.fire(this.el, 'flotr:mousemove', [event, pos, this]);
    this.lastMousePos = pos;
  },
  /**
   * Observes the 'mousedown' event.
   * @param {Event} event - 'mousedown' Event object.
   */
  mouseDownHandler: function (event){

    /*
    // @TODO Context menu?
    if(event.isRightClick()) {
      event.stop();

      var overlay = this.overlay;
      overlay.hide();

      function cancelContextMenu () {
        overlay.show();
        E.stopObserving(document, 'mousemove', cancelContextMenu);
      }
      E.observe(document, 'mousemove', cancelContextMenu);
      return;
    }
    */

    if (this.mouseUpHandler) return;
    this.mouseUpHandler = _.bind(function (e) {
      E.stopObserving(document, 'mouseup', this.mouseUpHandler);
      E.stopObserving(document, 'mousemove', this.mouseDownMoveHandler);
      this.mouseDownMoveHandler = null;
      this.mouseUpHandler = null;
      // @TODO why?
      //e.stop();
      E.fire(this.el, 'flotr:mouseup', [e, this]);
    }, this);
    this.mouseDownMoveHandler = _.bind(function (e) {
        var pos = this.getEventPosition(e);
        E.fire(this.el, 'flotr:mousemove', [event, pos, this]);
        this.lastMousePos = pos;
    }, this);
    E.observe(document, 'mouseup', this.mouseUpHandler);
    E.observe(document, 'mousemove', this.mouseDownMoveHandler);
    E.fire(this.el, 'flotr:mousedown', [event, this.getEventPosition(event), this]);
    this.ignoreClick = false;
  },
  drawTooltip: function(content, x, y, options) {
    var mt = this.getMouseTrack(),
        style = 'opacity:0.7;background-color:#000;color:#fff;display:none;position:absolute;padding:2px 8px;-moz-border-radius:4px;border-radius:4px;white-space:nowrap;',
        p = options.position,
        m = options.margin,
        plotOffset = this.plotOffset;

    if(x !== null && y !== null){
      if (!options.relative) { // absolute to the canvas
             if(p.charAt(0) == 'n') style += 'top:' + (m + plotOffset.top) + 'px;bottom:auto;';
        else if(p.charAt(0) == 's') style += 'bottom:' + (m + plotOffset.bottom) + 'px;top:auto;';
             if(p.charAt(1) == 'e') style += 'right:' + (m + plotOffset.right) + 'px;left:auto;';
        else if(p.charAt(1) == 'w') style += 'left:' + (m + plotOffset.left) + 'px;right:auto;';
      }
      else { // relative to the mouse
             if(p.charAt(0) == 'n') style += 'bottom:' + (m - plotOffset.top - y + this.canvasHeight) + 'px;top:auto;';
        else if(p.charAt(0) == 's') style += 'top:' + (m + plotOffset.top + y) + 'px;bottom:auto;';
             if(p.charAt(1) == 'e') style += 'left:' + (m + plotOffset.left + x) + 'px;right:auto;';
        else if(p.charAt(1) == 'w') style += 'right:' + (m - plotOffset.left - x + this.canvasWidth) + 'px;left:auto;';
      }

      mt.style.cssText = style;
      D.empty(mt);
      D.insert(mt, content);
      D.show(mt);
    }
    else {
      D.hide(mt);
    }
  },

  clip2: function (ctx) {

    var
      o   = this.plotOffset,
      w   = this.canvasWidth,
      h   = this.canvasHeight;

    ctx = ctx || this.ctx;

    if (
      flotr.isIE && flotr.isIE < 9 && // IE w/o canvas
      !flotr.isFlashCanvas // But not flash canvas
    ) {

      // Do not clip excanvas on overlay context
      // Allow hits to overflow.
      if (ctx === this.octx) {
        return;
      }

      // Clipping for excanvas :-(
      ctx.save();
      ctx.fillStyle = this.processColor(this.options.ieBackgroundColor);
      ctx.fillRect(0, this.axes.y.canvasHeight, o.left, h);
      ctx.fillRect(0, h - o.bottom, w, o.bottom);
      ctx.fillRect(w - o.right, this.axes.y.canvasHeight, o.right,h);
      ctx.restore();
    } else {
      ctx.clearRect(0, this.axes.y.canvasHeight, o.left, h);
      ctx.clearRect(0, h - 1, w, 1);
      ctx.clearRect(w - o.right, this.axes.y.canvasHeight, o.right,h);
    }

  },

  clip: function (ctx) {

    var
      o   = this.plotOffset,
      w   = this.canvasWidth,
      h   = this.axes.y.canvasHeight;

    ctx = ctx || this.ctx;

    if (
      flotr.isIE && flotr.isIE < 9 && // IE w/o canvas
      !flotr.isFlashCanvas // But not flash canvas
    ) {

      // Do not clip excanvas on overlay context
      // Allow hits to overflow.
      if (ctx === this.octx) {
        return;
      }

      // Clipping for excanvas :-(
      ctx.save();
      ctx.fillStyle = this.processColor(this.options.ieBackgroundColor);
      ctx.fillRect(0, 0, w, o.top);
      ctx.fillRect(0, 0, o.left, h);
      ctx.fillRect(0, h - o.bottom, w, h + o.bottom);
      ctx.fillRect(w - o.right, 0, o.right,h);
      ctx.restore();
    } else {
      ctx.clearRect(0, 0, w, o.top);
      ctx.clearRect(0, 0, o.left, h);
      ctx.clearRect(0, h - o.bottom, w, h + o.bottom);
      ctx.clearRect(w - o.right, 0, o.right,h);
    }
  },

  _initMembers: function() {
    this._handles = [];
    this.lastMousePos = {pageX: null, pageY: null };
    this.plotOffset = {left: 0, right: 0, top: 0, bottom: 0};
    this.ignoreClick = true;
    this.prevHit = null;
  },

  _initGraphTypes: function() {
    _.each(flotr.graphTypes, function(handler, graphType){
      this[graphType] = flotr.clone(handler);
    }, this);
  },

  _initEvents: function () {

    var
      el = this.el,
      touchendHandler, movement, touchend;

    if ('ontouchstart' in el) {

      touchendHandler = _.bind(function (e) {
        touchend = true;
        E.stopObserving(document, 'touchend', touchendHandler);
        E.fire(el, 'flotr:mouseup', [event, this]);
        this.multitouches = null;

        if (!movement) {
          this.clickHandler(e);
        }
        E.fire(el, 'flotr:touchend', [event, this]);
      }, this);

      this.observe(this.overlay, 'touchstart', _.bind(function (e) {
        movement = false;
        touchend = false;
        this.ignoreClick = false;

        if (e.touches && e.touches.length > 1) {
          this.multitouches = e.touches;
        }

        E.fire(el, 'flotr:mousedown', [event, this.getEventPosition(e), this]);
        E.fire(el, 'flotr:touchstart', [event, this]);
        this.observe(document, 'touchend', touchendHandler);
      }, this));

      this.observe(this.overlay, 'touchmove', _.bind(function (e) {

        var pos = this.getEventPosition(e);

        if (this.options.preventDefault) {
          e.preventDefault();
        }

        movement = true;

        if (this.multitouches || (e.touches && e.touches.length > 1)) {
          this.multitouches = e.touches;
        } else {
          if (!touchend) {
            E.fire(el, 'flotr:mousemove', [event, pos, this]);
          }
        }
        this.lastMousePos = pos;
        E.fire(el, 'flotr:touchmove', [event, this]);
      }, this));

    } else {
      this.
        observe(this.overlay, 'mousedown', _.bind(this.mouseDownHandler, this)).
        observe(el, 'mousemove', _.bind(this.mouseMoveHandler, this)).
        observe(this.overlay, 'click', _.bind(this.clickHandler, this)).
        observe(el, 'mouseout', function (e) {
          E.fire(el, 'flotr:mouseout', e);
        });
    }
  },

  /**
   * Initializes the canvas and it's overlay canvas element. When the browser is IE, this makes use
   * of excanvas. The overlay canvas is inserted for displaying interactions. After the canvas elements
   * are created, the elements are inserted into the container element.
   */
  _initCanvas: function(){
    var el = this.el,
      o = this.options,
      children = el.children,
      removedChildren = [],
      child, i,
      size, style;

    // Empty the el
    for (i = children.length; i--;) {
      child = children[i];
      if (!this.canvas && child.className === 'flotr-canvas') {
        this.canvas = child;
      } else if (!this.overlay && child.className === 'flotr-overlay') {
        this.overlay = child;
      } else {
        removedChildren.push(child);
      }
    }
    for (i = removedChildren.length; i--;) {
      el.removeChild(removedChildren[i]);
    }

    D.setStyles(el, {position: 'relative'}); // For positioning labels and overlay.
    size = {};
    size.width = el.clientWidth;
    size.height = el.clientHeight;

    if(size.width <= 0 || size.height <= 0 || o.resolution <= 0){
      throw 'Invalid dimensions for plot, width = ' + size.width + ', height = ' + size.height + ', resolution = ' + o.resolution;
    }

    // Main canvas for drawing graph types
    this.canvas = getCanvas(this.canvas, 'canvas');
    // Overlay canvas for interactive features
    this.overlay = getCanvas(this.overlay, 'overlay');
    this.ctx = getContext(this.canvas);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.octx = getContext(this.overlay);
    this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.canvasHeight = size.height;
    this.canvasWidth = size.width;
    this.textEnabled = !!this.ctx.drawText || !!this.ctx.fillText; // Enable text functions
    if(this.options.rotate){
      this.canvasHeight = size.width;
      this.canvasWidth = size.height;
      this.ctx.transform(0, 1, -1, 0, size.width, 0);
      this.octx.transform(0, 1, -1, 0, size.width, 0);
    }

    function getCanvas(canvas, name){
      if(!canvas){
        canvas = D.create('canvas');
        if (typeof FlashCanvas != "undefined" && typeof canvas.getContext === 'function') {
          FlashCanvas.initElement(canvas);
          this.isFlashCanvas = true;
        }
        canvas.className = 'flotr-'+name;
        canvas.style.cssText = 'position:absolute;left:0px;top:0px;';
        D.insert(el, canvas);
      }
      _.each(size, function(size, attribute){
        D.show(canvas);
        if (name == 'canvas' && canvas.getAttribute(attribute) === size) {
          return;
        }
        canvas.setAttribute(attribute, size * o.resolution);
        canvas.style[attribute] = size + 'px';
      });
      canvas.context_ = null; // Reset the ExCanvas context
      return canvas;
    }

    function getContext(canvas){
      if(window.G_vmlCanvasManager) window.G_vmlCanvasManager.initElement(canvas); // For ExCanvas
      var context = canvas.getContext('2d');
      if(!window.G_vmlCanvasManager) context.scale(o.resolution, o.resolution);
      return context;
    }
  },

  _initPlugins: function(){
    // TODO Should be moved to flotr and mixed in.
    _.each(flotr.plugins, function(plugin, name){
      _.each(plugin.callbacks, function(fn, c){
        this.observe(this.el, c, _.bind(fn, this));
      }, this);
      this[name] = flotr.clone(plugin);
      _.each(this[name], function(fn, p){
        if (_.isFunction(fn))
          this[name][p] = _.bind(fn, this);
      }, this);
    }, this);
  },

  /**
   * Sets options and initializes some variables and color specific values, used by the constructor.
   * @param {Object} opts - options object
   */
  _initOptions: function(opts){
    var options = flotr.clone(flotr.defaultOptions);
    this.originalOptions = opts;
    options.x2axis = _.extend(_.clone(options.xaxis), options.x2axis);
    options.y2axis = _.extend(_.clone(options.yaxis), options.y2axis);
    this.options = flotr.merge(opts || {}, options);

    if (this.options.grid.minorVerticalLines === null &&
      this.options.xaxis.scaling === 'logarithmic') {
      this.options.grid.minorVerticalLines = true;
    }
    if (this.options.grid.minorHorizontalLines === null &&
      this.options.yaxis.scaling === 'logarithmic') {
      this.options.grid.minorHorizontalLines = true;
    }

    E.fire(this.el, 'flotr:afterinitoptions', [this]);

    this.axes = flotr.Axis.getAxes(this.options);

    // Initialize some variables used throughout this function.
    var assignedColors = [],
        colors = [],
        ln = this.series.length,
        neededColors = this.series.length,
        oc = this.options.colors,
        usedColors = [],
        variation = 0,
        c, i, j, s;

    // Collect user-defined colors from series.
    for(i = neededColors - 1; i > -1; --i){
      c = this.series[i].color;
      if(c){
        --neededColors;
        if(_.isNumber(c)) assignedColors.push(c);
        else usedColors.push(flotr.Color.parse(c));
      }
    }

    // Calculate the number of colors that need to be generated.
    for(i = assignedColors.length - 1; i > -1; --i)
      neededColors = Math.max(neededColors, assignedColors[i] + 1);

    // Generate needed number of colors.
    for(i = 0; colors.length < neededColors;){
      c = (oc.length == i) ? new flotr.Color(100, 100, 100) : flotr.Color.parse(oc[i]);

      // Make sure each serie gets a different color.
      var sign = variation % 2 == 1 ? -1 : 1,
          factor = 1 + sign * Math.ceil(variation / 2) * 0.2;
      c.scale(factor, factor, factor);

      /**
       * @todo if we're getting too close to something else, we should probably skip this one
       */
      colors.push(c);

      if(++i >= oc.length){
        i = 0;
        ++variation;
      }
    }

    // Fill the options with the generated colors.
    for(i = 0, j = 0; i < ln; ++i){
      s = this.series[i];

      // Assign the color.
      if (!s.color){
        s.color = colors[j++].toString();
      }else if(_.isNumber(s.color)){
        s.color = colors[s.color].toString();
      }

      // Every series needs an axis
      if (!s.xaxis) s.xaxis = this.axes.x;
           if (s.xaxis == 1) s.xaxis = this.axes.x;
      else if (s.xaxis == 2) s.xaxis = this.axes.x2;

      if (!s.yaxis) s.yaxis = this.axes.y;
           if (s.yaxis == 1) s.yaxis = this.axes.y;
      else if (s.yaxis == 2) s.yaxis = this.axes.y2;

      // Apply missing options to the series.
      for (var t in flotr.graphTypes){
        s[t] = _.extend(_.clone(this.options[t]), s[t]);
      }
      s.mouse = _.extend(_.clone(this.options.mouse), s.mouse);

      if (_.isUndefined(s.shadowSize)) s.shadowSize = this.options.shadowSize;
    }
  },

  _setEl: function(el) {
    if (!el) throw 'The target container doesn\'t exist';
    else if (el.graph instanceof Graph) el.graph.destroy();
    else if (!el.clientWidth) throw 'The target container must be visible';

    el.graph = this;
    this.el = el;
  }
};

Flotr.Graph = Graph;

})();

/**
 * Flotr Axis Library
 */

(function () {

var
  _ = Flotr._,
  LOGARITHMIC = 'logarithmic';

function Axis (o) {

  this.orientation = 1;
  this.offset = 0;
  this.datamin = Number.MAX_VALUE;
  this.datamax = -Number.MAX_VALUE;

  _.extend(this, o);
}


// Prototype
Axis.prototype = {

  setScale : function () {
    var
      length = this.length,
      max = this.max,
      min = this.min,
      offset = this.offset,
      orientation = this.orientation,
      options = this.options,
      logarithmic = options.scaling === LOGARITHMIC,
      scale;

    if (logarithmic) {
      scale = length / (log(max, options.base) - log(min, options.base));
    } else {
      scale = length / (max - min);
    }
    this.scale = scale;

    // Logarithmic?
    if (logarithmic) {
      this.d2p = function (dataValue) {
        return offset + orientation * (log(dataValue, options.base) - log(min, options.base)) * scale;
      };
      this.p2d = function (pointValue) {
        return exp((offset + orientation * pointValue) / scale + log(min, options.base), options.base);
      };
    } else {
      this.d2p = function (dataValue) {
        return offset + orientation * (dataValue - min) * scale;
      };
      this.p2d = function (pointValue) {
        return (offset + orientation * pointValue) / scale + min;
      };
    }
  },

  calculateTicks : function () {
    var options = this.options;

    this.ticks = [];
    this.minorTicks = [];
    this.specialTicks = [];
    
    // User Ticks
    if(options.ticks){
      this._cleanUserTicks(options.ticks, this.ticks);
      this._cleanUserTicks(options.minorTicks || [], this.minorTicks);
    }
    else {
      if (options.mode == 'time') {
        this._calculateTimeTicks();
      } else if (options.scaling === 'logarithmic') {
        this._calculateLogTicks();
      } else {
        this._calculateTicks();
      }
    }

    if(options.specialTicks){
      this._cleanUserTicks(options.specialTicks, this.specialTicks);
    }

    // Ticks to strings
    _.each(this.ticks, function (tick) { tick.label += ''; });
    _.each(this.minorTicks, function (tick) { tick.label += ''; });
    _.each(this.specialTicks, function (tick) { tick.label += ''; });
  },

  /**
   * Calculates the range of an axis to apply autoscaling.
   */
  calculateRange: function () {

    if (!this.used) return;

    var axis  = this,
      o       = axis.options,
      min     = o.min !== null ? o.min : axis.datamin,
      max     = o.max !== null ? o.max : axis.datamax,
      margin  = o.autoscaleMargin;
        
    if (o.scaling == 'logarithmic') {
      if (min <= 0) min = axis.datamin;

      // Let it widen later on
      if (max <= 0) max = min;
    }

    if (max == min) {
      var widen = max ? 0.01 : 1.00;
      if (o.min === null) min -= widen;
      if (o.max === null) max += widen;
    }

    if (o.scaling === 'logarithmic') {
      if (min < 0) min = max / o.base;  // Could be the result of widening

      var maxexp = Math.log(max);
      if (o.base != Math.E) maxexp /= Math.log(o.base);
      maxexp = Math.ceil(maxexp);

      var minexp = Math.log(min);
      if (o.base != Math.E) minexp /= Math.log(o.base);
      minexp = Math.ceil(minexp);
      
      axis.tickSize = Flotr.getTickSize(o.noTicks, minexp, maxexp, o.tickDecimals === null ? 0 : o.tickDecimals);
                        
      // Try to determine a suitable amount of miniticks based on the length of a decade
      if (o.minorTickFreq === null) {
        if (maxexp - minexp > 10)
          o.minorTickFreq = 0;
        else if (maxexp - minexp > 5)
          o.minorTickFreq = 2;
        else
          o.minorTickFreq = 5;
      }
    } else {
      axis.tickSize = Flotr.getTickSize(o.noTicks, min, max, o.tickDecimals);
    }

    axis.min = min;
    axis.max = max; //extendRange may use axis.min or axis.max, so it should be set before it is caled

    // Autoscaling. @todo This probably fails with log scale. Find a testcase and fix it
    if(o.min === null && o.autoscale){
      axis.min -= axis.tickSize * margin;
      // Make sure we don't go below zero if all values are positive.
      if(axis.min < 0 && axis.datamin >= 0) axis.min = 0;
      axis.min = axis.tickSize * Math.floor(axis.min / axis.tickSize);
    }
    
    if(o.max === null && o.autoscale){
      axis.max += axis.tickSize * margin;
      if(axis.max > 0 && axis.datamax <= 0 && axis.datamax != axis.datamin) axis.max = 0;        
      axis.max = axis.tickSize * Math.ceil(axis.max / axis.tickSize);
    }

    if (axis.min == axis.max) axis.max = axis.min + 1;
  },

  calculateTextDimensions : function (T, options) {

    var maxLabel = '',
      length,
      i;

    if (this.options.showLabels) {
      for (i = 0; i < this.ticks.length; ++i) {
        length = this.ticks[i].label.length;
        if (length > maxLabel.length){
          maxLabel = this.ticks[i].label;
        }
      }
    }

    this.maxLabel = T.dimensions(
      maxLabel,
      {size:options.fontSize, angle: Flotr.toRad(this.options.labelsAngle)},
      'font-size:smaller;',
      'flotr-grid-label'
    );

    this.titleSize = T.dimensions(
      this.options.title, 
      {size:options.fontSize*1.2, angle: Flotr.toRad(this.options.titleAngle)},
      'font-weight:bold;',
      'flotr-axis-title'
    );
  },

  _cleanUserTicks : function (ticks, axisTicks) {

    var axis = this, options = this.options,
      v, i, label, tick;

    if(_.isFunction(ticks)) ticks = ticks({min : axis.min, max : axis.max});

    for(i = 0; i < ticks.length; ++i){
      tick = ticks[i];
      if(typeof(tick) === 'object'){
        v = tick[0];
        label = (tick.length > 1) ? tick[1] : options.tickFormatter(v, {min : axis.min, max : axis.max});
      } else {
        v = tick;
        label = options.tickFormatter(v, {min : this.min, max : this.max});
      }
      axisTicks[i] = { v: v, label: label };
    }
  },

  _calculateTimeTicks : function () {
    this.ticks = Flotr.Date.generator(this);
  },

  _calculateLogTicks : function () {

    var axis = this,
      o = axis.options,
      v,
      decadeStart;

    var max = Math.log(axis.max);
    if (o.base != Math.E) max /= Math.log(o.base);
    max = Math.ceil(max);

    var min = Math.log(axis.min);
    if (o.base != Math.E) min /= Math.log(o.base);
    min = Math.ceil(min);
    
    for (i = min; i < max; i += axis.tickSize) {
      decadeStart = (o.base == Math.E) ? Math.exp(i) : Math.pow(o.base, i);
      // Next decade begins here:
      var decadeEnd = decadeStart * ((o.base == Math.E) ? Math.exp(axis.tickSize) : Math.pow(o.base, axis.tickSize));
      var stepSize = (decadeEnd - decadeStart) / o.minorTickFreq;
      
      axis.ticks.push({v: decadeStart, label: o.tickFormatter(decadeStart, {min : axis.min, max : axis.max})});
      for (v = decadeStart + stepSize; v < decadeEnd; v += stepSize)
        axis.minorTicks.push({v: v, label: o.tickFormatter(v, {min : axis.min, max : axis.max})});
    }
    
    // Always show the value at the would-be start of next decade (end of this decade)
    decadeStart = (o.base == Math.E) ? Math.exp(i) : Math.pow(o.base, i);
    axis.ticks.push({v: decadeStart, label: o.tickFormatter(decadeStart, {min : axis.min, max : axis.max})});
  },

  _calculateTicks : function () {

    var axis      = this,
        o         = axis.options,
        tickSize  = axis.tickSize,
        min       = axis.min,
        max       = axis.max,
        start     = tickSize * Math.ceil(min / tickSize), // Round to nearest multiple of tick size.
        decimals,
        minorTickSize,
        v, v2,
        i, j;
    
    if (o.minorTickFreq)
      minorTickSize = tickSize / o.minorTickFreq;
                      
    // Then store all possible ticks.
    for (i = 0; (v = v2 = start + i * tickSize) <= max; ++i){
      
      // Round (this is always needed to fix numerical instability).
      decimals = o.tickDecimals;
      if (decimals === null) decimals = 1 - Math.floor(Math.log(tickSize) / Math.LN10);
      if (decimals < 0) decimals = 0;
      
      v = v.toFixed(decimals);
      axis.ticks.push({ v: v, label: o.tickFormatter(v, {min : axis.min, max : axis.max}) });

      if (o.minorTickFreq) {
        for (j = 0; j < o.minorTickFreq && (i * tickSize + j * minorTickSize) < max; ++j) {
          v = v2 + j * minorTickSize;
          axis.minorTicks.push({ v: v, label: o.tickFormatter(v, {min : axis.min, max : axis.max}) });
        }
      }
    }

  }
};


// Static Methods
_.extend(Axis, {
  getAxes : function (options) {
    return {
      x:  new Axis({options: options.xaxis,  n: 1, length: this.plotWidth}),
      x2: new Axis({options: options.x2axis, n: 2, length: this.plotWidth}),
      y:  new Axis({options: options.yaxis,  n: 1, length: this.plotHeight, offset: this.plotHeight, orientation: -1}),
      y2: new Axis({options: options.y2axis, n: 2, length: this.plotHeight, offset: this.plotHeight, orientation: -1})
    };
  }
});


// Helper Methods


function log (value, base) {
  value = Math.log(Math.max(value, Number.MIN_VALUE));
  if (base !== Math.E) 
    value /= Math.log(base);
  return value;
}

function exp (value, base) {
  return (base === Math.E) ? Math.exp(value) : Math.pow(base, value);
}

Flotr.Axis = Axis;

})();

/**
 * Flotr Series Library
 */

(function () {

var
  _ = Flotr._;

function Series (o) {
  _.extend(this, o);
  this.xi = this.xi || 0;
  this.yi = this.yi || 1;
}

Series.prototype = {

  getRange: function () {

    var
      data = this.data,
      length = data.length,
      xmin = Number.MAX_VALUE,
      ymin = Number.MAX_VALUE,
      xmax = -Number.MAX_VALUE,
      ymax = -Number.MAX_VALUE,
      xused = false,
      yused = false,
      xi = this.xi,
      yi = this.yi,
      x, y, i;

    if (length < 0 || this.hide) return false;

    for (i = 0; i < length; i++) {

      x = data[i][xi];
      y = data[i][yi];
      if (x !== null) {
        if (x < xmin) { xmin = x; xused = true; }
        if (x > xmax) { xmax = x; xused = true; }
      }
      if (y !== null) {
        if (y < ymin) { ymin = y; yused = true; }
        if (y > ymax) { ymax = y; yused = true; }
      }
    }

    return {
      xmin : xmin,
      xmax : xmax,
      ymin : ymin,
      ymax : ymax,
      xused : xused,
      yused : yused
    };
  }
};

_.extend(Series, {
  /**
   * Collects dataseries from input and parses the series into the right format. It returns an Array 
   * of Objects each having at least the 'data' key set.
   * @param {Array, Object} data - Object or array of dataseries
   * @return {Array} Array of Objects parsed into the right format ({(...,) data: [[x1,y1], [x2,y2], ...] (, ...)})
   */
  getSeries: function(data){
    return _.map(data, function(s){
      var series;
      if (s.data) {
        series = new Series();
        _.extend(series, s);
      } else {
        series = new Series({data:s});
      }
      return series;
    });
  }
});

Flotr.Series = Series;

})();

/**
 * Flotr Graph class that plots a graph on creation.
 */
(function () {
  var
  _     = Flotr._;

  var init = function(options){
    Flotr.merge(options, this);
    this.maxSampleSize = this.maxSampleSize ? this.maxSampleSize : this.length * 2;
    this.minSampleSize = this.minSampleSize ? this.minSampleSize : this.length / 2;
  };

  var sampleSize = function(s){
    if (arguments.length > 0) {
      var min = this.minSampleSize,
          max = this.maxSampleSize;
      s = s < min ? min : (s > max ? max : s);
      this.length = s;
    }
    return this.length;
  };

  /**
   * DataSource.
   * @param {RawDataSource} ds - raw data source
   * @param {int} ss - sample size
   */
  DataSource = function(options){
    this.sampleSize = sampleSize; 
    this.init = init;
    this.init(options);
  };

  DataSource.prototype = [];

  ArrayDataSource = function(array, opts){
    this.cursor = 0;
    this.data = array;
    this.init(opts||{});
    this.move(0);
  };

  ArrayDataSource.prototype = new DataSource({
    move: function(step, callback){
      var
      length = this.data.length,
      s,e;
      step = step || 0;
      s = this.cursor + step;
      e = this.cursor + step + this.length;

      if(s < 0){
        s = 0;
        e = s + this.length;
      }
      if(e > length) {
        e = length;
        s = length - this.length;
      }
      if (s < 0) {
        s = 0;
      }
      this.length = e - s;

      if(s !== this.cursor || _.isNull(this[this.length - 1]) || _.isUndefined(this[this.length - 1])){
        this.cursor = s;
        var data = this.data.slice(s, e);
        for(var i = s ; i<e; i++){
          var d = this.data[i];
          d[0] = i-s;
          this[i-s] = d;
        }
      } 
      if(_.isFunction(callback)) callback(this);
      return this;
    }
  });
  Flotr.DataSource = DataSource;
  Flotr.ArrayDataSource = ArrayDataSource;
})();



(function(){
  var
  D     = Flotr.DOM,
  E     = Flotr.EventAdapter,
  _     = Flotr._,
  H     = Flotr.hammer,
  flotr = Flotr;
  /*
   opts = {
     el: el,
     data: data,
     options: options,
     dataSource: dataSource,
     move: move,
     pinch: pinch
   }
  */
  Chart = function(opts){
    var el = opts.el,
        data = opts.data,
        options = opts.options,
        dataSource = opts.dataSource,
        graph = null,
        rid = null,
        move = opts.move || false,
        pinch = opts.pinch || false;
    
    this.move = function(value){
      if(!_.isUndefined(value)){
        move = value;
      }
      return move;
    };
    var drawGraph = function(){
      graph = Flotr.draw(el, data, options);
      
      graph.observe(el, 'flotr:datacursor', function(dx){
        if(!move) return;
        dataSource.move(dx, function(){
          if(rid){
            cancelAnimationFrame(rid);
          }
          rid = requestAnimationFrame(function(){
            graph = drawGraph();
          });
        });
      });
    };

    this.pinch = function(value){
      if(!_.isUndefined(value)){
        pinch = value;
      }
      return pinch;
    };

    H(el).on('pinch', function(event) {
      if(!pinch) return;
      var sc = Math.abs(Math.log(event.gesture.scale));
      if (sc > 0.2 && sc < 0.4){
        var s = Math.round(1 / event.gesture.scale * dataSource.sampleSize());
        var os = dataSource.sampleSize();
        dataSource.sampleSize(s);
        if(os != dataSource.sampleSize()){
          dataSource.move(0, function(){
            if(rid){
              cancelAnimationFrame(rid);
            }
            rid = requestAnimationFrame(function(){
              graph = drawGraph();
            });
          });
        }
      }
    });

    drawGraph();
    
    this.getGraph = function(){
      return graph;
    };

    this.redraw = function(){
      drawGraph();
    };

  };
  flotr.Chart = Chart;
})();


/** Lines **/
Flotr.addType('lines', {
  options: {
    show: false,           // => setting to true will show lines, false will hide
    lineWidth: 2,          // => line width in pixels
    fill: false,           // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillBorder: false,     // => draw a border around the fill
    fillColor: null,       // => fill color
    fillOpacity: 0.4,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    steps: false,          // => draw steps
    stacked: false         // => setting to true will show stacked lines, false will show normal lines
  },

  stack : {
    values : []
  },

  /**
   * Draws lines series in the canvas element.
   * @param {Object} options
   */
  draw : function (options) {

    var
      context     = options.context,
      lineWidth   = options.lineWidth,
      shadowSize  = options.shadowSize,
      offset;

    context.save();
    context.lineJoin = 'round';

    if (shadowSize) {

      context.lineWidth = shadowSize / 2;
      offset = lineWidth / 2 + context.lineWidth / 2;
      
      // @TODO do this instead with a linear gradient
      context.strokeStyle = "rgba(0,0,0,0.1)";
      this.plot(options, offset + shadowSize / 2, false);

      context.strokeStyle = "rgba(0,0,0,0.2)";
      this.plot(options, offset, false);
    }

    context.lineWidth = lineWidth;
    context.strokeStyle = options.color;

    this.plot(options, 0, true);

    context.restore();
  },

  plot : function (options, shadowOffset, incStack) {

    var
      context   = options.context,
      width     = options.width, 
      height    = options.height,
      xScale    = options.xScale,
      yScale    = options.yScale,
      data      = options.data, 
      stack     = options.stacked ? this.stack : false,
      length    = data.length - 1,
      prevx     = null,
      prevy     = null,
      zero      = yScale(0),
      start     = null,
      x1, x2, y1, y2, stack1, stack2, i;
      
    if (length < 1) return;

    context.beginPath();

    for (i = 0; i < length; ++i) {

      // To allow empty values
      if (data[i][options.yi] === null || data[i+1][options.yi] === null) {
        if (options.fill) {
          if (i > 0 && data[i][options.yi] !== null) {
            context.stroke();
            fill();
            start = null;
            context.closePath();
            context.beginPath();
          }
        }
        continue;
      }

      // Zero is infinity for log scales
      // TODO handle zero for logarithmic
      // if (xa.options.scaling === 'logarithmic' && (data[i][0] <= 0 || data[i+1][0] <= 0)) continue;
      // if (ya.options.scaling === 'logarithmic' && (data[i][1] <= 0 || data[i+1][1] <= 0)) continue;
      
      x1 = xScale(data[i][options.xi]);
      x2 = xScale(data[i+1][options.xi]);

      if (start === null) start = data[i];
      
      if (stack) {
        stack1 = stack.values[data[i][options.xi]] || 0;
        stack2 = stack.values[data[i+1][options.xi]] || stack.values[data[i][options.xi]] || 0;
        y1 = yScale(data[i][options.yi] + stack1);
        y2 = yScale(data[i+1][options.yi] + stack2);
        if (incStack) {
          data[i].y0 = stack1;
          stack.values[data[i][options.xi]] = data[i][options.yi] + stack1;
          if (i == length-1) {
            data[i+1].y0 = stack2;
            stack.values[data[i+1][options.xi]] = data[i+1][options.yi] + stack2;
          }
        }
      } else {
        y1 = yScale(data[i][options.yi]);
        y2 = yScale(data[i+1][options.yi]);
      }

      if (
        (y1 > height && y2 > height) ||
        (y1 < 0 && y2 < 0) ||
        (x1 < 0 && x2 < 0) ||
        (x1 > width && x2 > width)
      ) continue;

      if ((prevx != x1) || (prevy != y1 + shadowOffset)) {
        context.moveTo(x1, y1 + shadowOffset);
      }
      
      prevx = x2;
      prevy = y2 + shadowOffset;
      if (options.steps) {
        context.lineTo(prevx + shadowOffset / 2, y1 + shadowOffset);
        context.lineTo(prevx + shadowOffset / 2, prevy);
      } else {
        context.lineTo(prevx, prevy);
      }
    }
    
    if (!options.fill || options.fill && !options.fillBorder) context.stroke();

    fill();

    function fill () {
      // TODO stacked lines
      if(!shadowOffset && options.fill && start){
        x1 = xScale(start[0]);
        context.fillStyle = options.fillStyle;
        context.lineTo(x2, zero);
        context.lineTo(x1, zero);
        context.lineTo(x1, yScale(start[1]));
        context.fill();
        if (options.fillBorder) {
          context.stroke();
        }
      }
    }

    context.closePath();
  },

  // Perform any pre-render precalculations (this should be run on data first)
  // - Pie chart total for calculating measures
  // - Stacks for lines and bars
  // precalculate : function () {
  // }
  //
  //
  // Get any bounds after pre calculation (axis can fetch this if does not have explicit min/max)
  // getBounds : function () {
  // }
  // getMin : function () {
  // }
  // getMax : function () {
  // }
  //
  //
  // Padding around rendered elements
  // getPadding : function () {
  // }

  extendYRange : function (axis, data, options, lines) {

    var o = axis.options;

    // If stacked and auto-min
    if (options.stacked && ((!o.max && o.max !== 0) || (!o.min && o.min !== 0))) {

      var
        newmax = axis.max,
        newmin = axis.min,
        positiveSums = lines.positiveSums || {},
        negativeSums = lines.negativeSums || {},
        x, j;

      for (j = 0; j < data.length; j++) {

        x = data[j][options.xi] + '';

        // Positive
        if (data[j][options.yi] > 0) {
          positiveSums[x] = (positiveSums[x] || 0) + data[j][options.yi];
          newmax = Math.max(newmax, positiveSums[x]);
        }

        // Negative
        else {
          negativeSums[x] = (negativeSums[x] || 0) + data[j][options.yi];
          newmin = Math.min(newmin, negativeSums[x]);
        }
      }

      lines.negativeSums = negativeSums;
      lines.positiveSums = positiveSums;

      axis.max = newmax;
      axis.min = newmin;
    }

    if (options.steps) {

      this.hit = function (options) {
        var
          data = options.data,
          args = options.args,
          yScale = options.yScale,
          mouse = args[0],
          length = data.length,
          n = args[1],
          x = options.xInverse(mouse.relX),
          relY = mouse.relY,
          i;

        for (i = 0; i < length - 1; i++) {
          if (x >= data[i][options.xi] && x <= data[i+1][options.xi]) {
            if (Math.abs(yScale(data[i][options.yi]) - relY) < 8) {
              n.x = data[i][options.xi];
              n.y = data[i][options.yi];
              n.index = i;
              n.seriesIndex = options.index;
            }
            break;
          }
        }
      };

      this.drawHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][0]);
          context.save();
          context.strokeStyle = options.color;
          context.lineWidth = options.lineWidth;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x2, y);
          context.stroke();
          context.closePath();
          context.restore();
        }
      };

      this.clearHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          width   = options.lineWidth,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][options.xi]);
          context.clearRect(x - width, y - width, x2 - x + 2 * width, 2 * width);
        }
      };
    }
  }

});

/** Bars **/
Flotr.addType('bars', {

  options: {
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 2,          // => in pixels
    barWidth: 1,           // => in units of the x axis
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillColor: null,       // => fill color
    fillOpacity: 0.4,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    horizontal: false,     // => horizontal bars (x and y inverted)
    stacked: false,        // => stacked bar charts
    centered: true,        // => center the bars to their x axis value
    topPadding: 0.1,       // => top padding in percent
    grouped: false         // => groups bars together which share x value, hit not supported.
  },

  stack : { 
    positive : [],
    negative : [],
    _positive : [], // Shadow
    _negative : []  // Shadow
  },

  draw : function (options) {
    var
      context = options.context;

    this.current += 1;

    context.save();
    context.lineJoin = 'miter';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.lineWidth;
    context.strokeStyle = options.color;
    if (options.fill) context.fillStyle = options.fillStyle;
    
    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data            = options.data,
      context         = options.context,
      shadowSize      = options.shadowSize,
      i, geometry, left, top, width, height;

    if (data.length < 1) return;

    this.translate(context, options.horizontal);

    for (i = 0; i < data.length; i++) {

      geometry = this.getBarGeometry(data[i][options.xi], data[i][options.yi], options);
      if (geometry === null) continue;

      left    = geometry.left;
      top     = geometry.top;
      width   = geometry.width;
      height  = geometry.height;

      if (options.fill) context.fillRect(left, top, width, height);
      if (shadowSize) {
        context.save();
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top + shadowSize, width, height);
        context.restore();
      }
      if (options.lineWidth) {
        context.strokeRect(left, top, width, height);
      }
    }
  },

  translate : function (context, horizontal) {
    if (horizontal) {
      context.rotate(-Math.PI / 2);
      context.scale(-1, 1);
    }
  },

  getBarGeometry : function (x, y, options) {

    var
      horizontal    = options.horizontal,
      barWidth      = options.barWidth,
      centered      = options.centered,
      stack         = options.stacked ? this.stack : false,
      lineWidth     = options.lineWidth,
      bisection     = centered ? barWidth / 2 : 0,
      xScale        = horizontal ? options.yScale : options.xScale,
      yScale        = horizontal ? options.xScale : options.yScale,
      xValue        = horizontal ? y : x,
      yValue        = horizontal ? x : y,
      stackOffset   = 0,
      stackValue, left, right, top, bottom;

    if (options.grouped) {
      this.current / this.groups;
      xValue = xValue - bisection;
      barWidth = barWidth / this.groups;
      bisection = barWidth / 2;
      xValue = xValue + barWidth * this.current - bisection;
    }

    // Stacked bars
    if (stack) {
      stackValue          = yValue > 0 ? stack.positive : stack.negative;
      stackOffset         = stackValue[xValue] || stackOffset;
      stackValue[xValue]  = stackOffset + yValue;
    }

    left    = xScale(xValue - bisection);
    right   = xScale(xValue + barWidth - bisection);
    top     = yScale(yValue + stackOffset);
    bottom  = yScale(stackOffset);

    // TODO for test passing... probably looks better without this
    if (bottom < 0) bottom = 0;

    // TODO Skipping...
    // if (right < xa.min || left > xa.max || top < ya.min || bottom > ya.max) continue;

    return (x === null || y === null) ? null : {
      x         : xValue,
      y         : yValue,
      xScale    : xScale,
      yScale    : yScale,
      top       : top,
      left      : Math.min(left, right) - lineWidth / 2,
      width     : Math.abs(right - left) - lineWidth,
      height    : bottom - top
    };
  },

  hit : function (options) {
    var
      data = options.data,
      args = options.args,
      mouse = args[0],
      n = args[1],
      x = options.xInverse(mouse.relX),
      y = options.yInverse(mouse.relY),
      hitGeometry = this.getBarGeometry(x, y, options),
      width = hitGeometry.width / 2,
      left = hitGeometry.left,
      height = hitGeometry.y,
      geometry, i;

    for (i = data.length; i--;) {
      geometry = this.getBarGeometry(data[i][options.xi], data[i][options.yi], options);
      if (
        // Height:
        (
          // Positive Bars:
          (height > 0 && height < geometry.y) ||
          // Negative Bars:
          (height < 0 && height > geometry.y)
        ) &&
        // Width:
        (Math.abs(left - geometry.left) < width)
      ) {
        n.x = data[i][options.xi];
        n.y = data[i][options.yi];
        n.index = i;
        n.seriesIndex = options.index;
      }
    }
  },

  drawHit : function (options) {
    // TODO hits for stacked bars; implement using calculateStack option?
    var
      context     = options.context,
      args        = options.args,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      top         = geometry.top,
      width       = geometry.width,
      height      = geometry.height;

    context.save();
    context.strokeStyle = options.color;
    context.lineWidth = options.lineWidth;
    this.translate(context, options.horizontal);

    // Draw highlight
    context.beginPath();
    context.moveTo(left, top + height);
    context.lineTo(left, top);
    context.lineTo(left + width, top);
    context.lineTo(left + width, top + height);
    if (options.fill) {
      context.fillStyle = options.fillStyle;
      context.fill();
    }
    context.stroke();
    context.closePath();

    context.restore();
  },

  clearHit: function (options) {
    var
      context     = options.context,
      args        = options.args,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      width       = geometry.width,
      top         = geometry.top,
      height      = geometry.height,
      lineWidth   = 2 * options.lineWidth;

    context.save();
    this.translate(context, options.horizontal);
    context.clearRect(
      left - lineWidth,
      Math.min(top, top + height) - lineWidth,
      width + 2 * lineWidth,
      Math.abs(height) + 2 * lineWidth
    );
    context.restore();
  },

  extendXRange : function (axis, data, options, bars) {
    this._extendRange(axis, data, options, bars);
    this.groups = (this.groups + 1) || 1;
    this.current = 0;
  },

  extendYRange : function (axis, data, options, bars) {
    this._extendRange(axis, data, options, bars);
  },
  _extendRange: function (axis, data, options, bars) {

    var
      max = axis.options.max;

    if (_.isNumber(max) || _.isString(max)) return; 

    var
      newmin = axis.min,
      newmax = axis.max,
      horizontal = options.horizontal,
      orientation = axis.orientation,
      positiveSums = this.positiveSums || {},
      negativeSums = this.negativeSums || {},
      value, datum, index, j;

    // Sides of bars
    if ((orientation == 1 && !horizontal) || (orientation == -1 && horizontal)) {
      if (options.centered) {
        newmax = Math.max(axis.datamax + options.barWidth, newmax);
        newmin = Math.min(axis.datamin - options.barWidth, newmin);
      }
    }

    if (options.stacked && 
        ((orientation == 1 && horizontal) || (orientation == -1 && !horizontal))){

      for (j = data.length; j--;) {
        value = data[j][(orientation == 1 ? 1 : 0)]+'';
        datum = data[j][(orientation == 1 ? 0 : 1)];

        // Positive
        if (datum > 0) {
          positiveSums[value] = (positiveSums[value] || 0) + datum;
          newmax = Math.max(newmax, positiveSums[value]);
        }

        // Negative
        else {
          negativeSums[value] = (negativeSums[value] || 0) + datum;
          newmin = Math.min(newmin, negativeSums[value]);
        }
      }
    }

    // End of bars
    if ((orientation == 1 && horizontal) || (orientation == -1 && !horizontal)) {
      if (options.topPadding && (axis.max === axis.datamax || (options.stacked && this.stackMax !== newmax))) {
        newmax += options.topPadding * (newmax - newmin);
      }
    }

    this.stackMin = newmin;
    this.stackMax = newmax;
    this.negativeSums = negativeSums;
    this.positiveSums = positiveSums;

    axis.max = newmax;
    axis.min = newmin;
  }

});

/** Bubbles **/
Flotr.addType('bubbles', {
  options: {
    show: false,      // => setting to true will show radar chart, false will hide
    lineWidth: 2,     // => line width in pixels
    fill: true,       // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillOpacity: 0.4, // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    baseRadius: 2     // => ratio of the radar, against the plot size
  },
  draw : function (options) {
    var
      context     = options.context,
      shadowSize  = options.shadowSize;

    context.save();
    context.lineWidth = options.lineWidth;
    
    // Shadows
    context.fillStyle = 'rgba(0,0,0,0.05)';
    context.strokeStyle = 'rgba(0,0,0,0.05)';
    this.plot(options, shadowSize / 2);
    context.strokeStyle = 'rgba(0,0,0,0.1)';
    this.plot(options, shadowSize / 4);

    // Chart
    context.strokeStyle = options.color;
    context.fillStyle = options.fillStyle;
    this.plot(options);
    
    context.restore();
  },
  plot : function (options, offset) {

    var
      data    = options.data,
      context = options.context,
      geometry,
      i, x, y, z;

    offset = offset || 0;
    
    for (i = 0; i < data.length; ++i){

      geometry = this.getGeometry(data[i], options);

      context.beginPath();
      context.arc(geometry.x + offset, geometry.y + offset, geometry.z, 0, 2 * Math.PI, true);
      context.stroke();
      if (options.fill) context.fill();
      context.closePath();
    }
  },
  getGeometry : function (point, options) {
    return {
      x : options.xScale(point[0]),
      y : options.yScale(point[1]),
      z : point[2] * options.baseRadius
    };
  },
  hit : function (options) {
    var
      data = options.data,
      args = options.args,
      mouse = args[0],
      n = args[1],
      relX = mouse.relX,
      relY = mouse.relY,
      distance,
      geometry,
      dx, dy;

    n.best = n.best || Number.MAX_VALUE;

    for (i = data.length; i--;) {
      geometry = this.getGeometry(data[i], options);

      dx = geometry.x - relX;
      dy = geometry.y - relY;
      distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < geometry.z && geometry.z < n.best) {
        n.x = data[i][0];
        n.y = data[i][1];
        n.index = i;
        n.seriesIndex = options.index;
        n.best = geometry.z;
      }
    }
  },
  drawHit : function (options) {

    var
      context = options.context,
      geometry = this.getGeometry(options.data[options.args.index], options);

    context.save();
    context.lineWidth = options.lineWidth;
    context.fillStyle = options.fillStyle;
    context.strokeStyle = options.color;
    context.beginPath();
    context.arc(geometry.x, geometry.y, geometry.z, 0, 2 * Math.PI, true);
    context.fill();
    context.stroke();
    context.closePath();
    context.restore();
  },
  clearHit : function (options) {

    var
      context = options.context,
      geometry = this.getGeometry(options.data[options.args.index], options),
      offset = geometry.z + options.lineWidth;

    context.save();
    context.clearRect(
      geometry.x - offset, 
      geometry.y - offset,
      2 * offset,
      2 * offset
    );
    context.restore();
  }
  // TODO Add a hit calculation method (like pie)
});

/** Candles **/
Flotr.addType('candles', {
  options: {
    show: false,           // => setting to true will show candle sticks, false will hide
    lineWidth: 1,          // => in pixels
    wickLineWidth: 1,      // => in pixels
    candleWidth: 0.6,      // => in units of the x axis
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    upFillColor: '#00A8F0',// => up sticks fill color
    downFillColor: '#CB4B4B',// => down sticks fill color
    fillOpacity: 0.5,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    barcharts: false       // => draw as barcharts (not standard bars but financial barcharts)
  },

  draw : function (options) {

    var
      context = options.context;

    context.save();
    context.lineJoin = 'miter';
    context.lineCap = 'butt';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.wickLineWidth || options.lineWidth;

    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data          = options.data,
      context       = options.context,
      xScale        = options.xScale,
      yScale        = options.yScale,
      width         = options.candleWidth / 2,
      shadowSize    = options.shadowSize,
      lineWidth     = options.lineWidth,
      wickLineWidth = options.wickLineWidth,
      pixelOffset   = (wickLineWidth % 2) / 2,
      color,
      datum, x, y,
      open, high, low, close,
      left, right, bottom, top, bottom2, top2, reverseLines,
      i;

    if (data.length < 1) return;

    for (i = 0; i < data.length; i++) {
      datum   = data[i];
      x       = datum[0];
      open    = datum[1];
      high    = datum[2];
      low     = datum[3];
      close   = datum[4];
      left    = xScale(x - width);
      right   = xScale(x + width);
      bottom  = yScale(low);
      top     = yScale(high);
      bottom2 = yScale(Math.min(open, close));
      top2    = yScale(Math.max(open, close));

      /*
      // TODO skipping
      if(right < xa.min || left > xa.max || top < ya.min || bottom > ya.max)
        continue;
      */

      color = options[open > close ? 'downFillColor' : 'upFillColor'];

      // Fill the candle.
      if (options.fill && !options.barcharts) {
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top2 + shadowSize, right - left, bottom2 - top2);
        context.save();
        context.globalAlpha = options.fillOpacity;
        context.fillStyle = color;
        context.fillRect(left, top2 + lineWidth, right - left, bottom2 - top2);
        context.restore();
      }

      // Draw candle outline/border, high, low.
      if (lineWidth || wickLineWidth) {

        x = Math.floor((left + right) / 2) + pixelOffset;

        context.strokeStyle = color;
        context.beginPath();

        if (options.barcharts) {
          context.moveTo(x, Math.floor(top + lineWidth));
          context.lineTo(x, Math.floor(bottom + lineWidth));

          reverseLines = open < close;
          context.moveTo(reverseLines ? right : left, Math.floor(top2 + lineWidth));
          context.lineTo(x, Math.floor(top2 + lineWidth));
          context.moveTo(x, Math.floor(bottom2 + lineWidth));
          context.lineTo(reverseLines ? left : right, Math.floor(bottom2 + lineWidth));
        } else {
          context.strokeRect(left, top2 + lineWidth, right - left, bottom2 - top2);
          context.moveTo(x, Math.floor(top2 + lineWidth));
          context.lineTo(x, Math.floor(top + lineWidth));
          context.moveTo(x, Math.floor(bottom2 + lineWidth));
          context.lineTo(x, Math.floor(bottom + lineWidth));
        }
        
        context.closePath();
        context.stroke();
      }
    }
  },

  hit : function (options) {
    var
      xScale = options.xScale,
      yScale = options.yScale,
      data = options.data,
      args = options.args,
      mouse = args[0],
      width = options.candleWidth / 2,
      n = args[1],
      x = mouse.relX,
      y = mouse.relY,
      length = data.length,
      i, datum,
      high, low,
      left, right, top, bottom;

    for (i = 0; i < length; i++) {
      datum   = data[i],
      high    = datum[2];
      low     = datum[3];
      left    = xScale(datum[0] - width);
      right   = xScale(datum[0] + width);
      bottom  = yScale(low);
      top     = yScale(high);

      if (x > left && x < right && y > top && y < bottom) {
        n.x = datum[0];
        n.index = i;
        n.seriesIndex = options.index;
        return;
      }
    }
  },

  drawHit : function (options) {
    var
      context = options.context;
    context.save();
    this.plot(
      _.defaults({
        fill : !!options.fillColor,
        upFillColor : options.color,
        downFillColor : options.color,
        data : [options.data[options.args.index]]
      }, options)
    );
    context.restore();
  },

  clearHit : function (options) {
    var
      args = options.args,
      context = options.context,
      xScale = options.xScale,
      yScale = options.yScale,
      lineWidth = options.lineWidth,
      width = options.candleWidth / 2,
      bar = options.data[args.index],
      left = xScale(bar[0] - width) - lineWidth,
      right = xScale(bar[0] + width) + lineWidth,
      top = yScale(bar[2]),
      bottom = yScale(bar[3]) + lineWidth;
    context.clearRect(left, top, right - left, bottom - top);
  },

  extendXRange: function (axis, data, options) {
    if (axis.options.max === null) {
      axis.max = Math.max(axis.datamax + 0.5, axis.max);
      axis.min = Math.min(axis.datamin - 0.5, axis.min);
    }
  }
});

/** Gantt
 * Base on data in form [s,y,d] where:
 * y - executor or simply y value
 * s - task start value
 * d - task duration
 * **/
Flotr.addType('gantt', {
  options: {
    show: false,           // => setting to true will show gantt, false will hide
    lineWidth: 2,          // => in pixels
    barWidth: 1,           // => in units of the x axis
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillColor: null,       // => fill color
    fillOpacity: 0.4,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    centered: true         // => center the bars to their x axis value
  },
  /**
   * Draws gantt series in the canvas element.
   * @param {Object} series - Series with options.gantt.show = true.
   */
  draw: function(series) {
    var ctx = this.ctx,
      bw = series.gantt.barWidth,
      lw = Math.min(series.gantt.lineWidth, bw);
    
    ctx.save();
    ctx.translate(this.plotOffset.left, this.plotOffset.top);
    ctx.lineJoin = 'miter';

    /**
     * @todo linewidth not interpreted the right way.
     */
    ctx.lineWidth = lw;
    ctx.strokeStyle = series.color;
    
    ctx.save();
    this.gantt.plotShadows(series, bw, 0, series.gantt.fill);
    ctx.restore();
    
    if(series.gantt.fill){
      var color = series.gantt.fillColor || series.color;
      ctx.fillStyle = this.processColor(color, {opacity: series.gantt.fillOpacity});
    }
    
    this.gantt.plot(series, bw, 0, series.gantt.fill);
    ctx.restore();
  },
  plot: function(series, barWidth, offset, fill){
    var data = series.data;
    if(data.length < 1) return;
    
    var xa = series.xaxis,
        ya = series.yaxis,
        ctx = this.ctx, i;

    for(i = 0; i < data.length; i++){
      var y = data[i][0],
          s = data[i][1],
          d = data[i][2],
          drawLeft = true, drawTop = true, drawRight = true;
      
      if (s === null || d === null) continue;

      var left = s, 
          right = s + d,
          bottom = y - (series.gantt.centered ? barWidth/2 : 0), 
          top = y + barWidth - (series.gantt.centered ? barWidth/2 : 0);
      
      if(right < xa.min || left > xa.max || top < ya.min || bottom > ya.max)
        continue;

      if(left < xa.min){
        left = xa.min;
        drawLeft = false;
      }

      if(right > xa.max){
        right = xa.max;
        if (xa.lastSerie != series)
          drawTop = false;
      }

      if(bottom < ya.min)
        bottom = ya.min;

      if(top > ya.max){
        top = ya.max;
        if (ya.lastSerie != series)
          drawTop = false;
      }
      
      /**
       * Fill the bar.
       */
      if(fill){
        ctx.beginPath();
        ctx.moveTo(xa.d2p(left), ya.d2p(bottom) + offset);
        ctx.lineTo(xa.d2p(left), ya.d2p(top) + offset);
        ctx.lineTo(xa.d2p(right), ya.d2p(top) + offset);
        ctx.lineTo(xa.d2p(right), ya.d2p(bottom) + offset);
        ctx.fill();
        ctx.closePath();
      }

      /**
       * Draw bar outline/border.
       */
      if(series.gantt.lineWidth && (drawLeft || drawRight || drawTop)){
        ctx.beginPath();
        ctx.moveTo(xa.d2p(left), ya.d2p(bottom) + offset);
        
        ctx[drawLeft ?'lineTo':'moveTo'](xa.d2p(left), ya.d2p(top) + offset);
        ctx[drawTop  ?'lineTo':'moveTo'](xa.d2p(right), ya.d2p(top) + offset);
        ctx[drawRight?'lineTo':'moveTo'](xa.d2p(right), ya.d2p(bottom) + offset);
                 
        ctx.stroke();
        ctx.closePath();
      }
    }
  },
  plotShadows: function(series, barWidth, offset){
    var data = series.data;
    if(data.length < 1) return;
    
    var i, y, s, d,
        xa = series.xaxis,
        ya = series.yaxis,
        ctx = this.ctx,
        sw = this.options.shadowSize;
    
    for(i = 0; i < data.length; i++){
      y = data[i][0];
      s = data[i][1];
      d = data[i][2];
        
      if (s === null || d === null) continue;
            
      var left = s, 
          right = s + d,
          bottom = y - (series.gantt.centered ? barWidth/2 : 0), 
          top = y + barWidth - (series.gantt.centered ? barWidth/2 : 0);
 
      if(right < xa.min || left > xa.max || top < ya.min || bottom > ya.max)
        continue;
      
      if(left < xa.min)   left = xa.min;
      if(right > xa.max)  right = xa.max;
      if(bottom < ya.min) bottom = ya.min;
      if(top > ya.max)    top = ya.max;
      
      var width =  xa.d2p(right)-xa.d2p(left)-((xa.d2p(right)+sw <= this.plotWidth) ? 0 : sw);
      var height = ya.d2p(bottom)-ya.d2p(top)-((ya.d2p(bottom)+sw <= this.plotHeight) ? 0 : sw );
      
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(Math.min(xa.d2p(left)+sw, this.plotWidth), Math.min(ya.d2p(top)+sw, this.plotHeight), width, height);
    }
  },
  extendXRange: function(axis) {
    if(axis.options.max === null){
      var newmin = axis.min,
          newmax = axis.max,
          i, j, x, s, g,
          stackedSumsPos = {},
          stackedSumsNeg = {},
          lastSerie = null;

      for(i = 0; i < this.series.length; ++i){
        s = this.series[i];
        g = s.gantt;
        
        if(g.show && s.xaxis == axis) {
            for (j = 0; j < s.data.length; j++) {
              if (g.show) {
                y = s.data[j][0]+'';
                stackedSumsPos[y] = Math.max((stackedSumsPos[y] || 0), s.data[j][1]+s.data[j][2]);
                lastSerie = s;
              }
            }
            for (j in stackedSumsPos) {
              newmax = Math.max(stackedSumsPos[j], newmax);
            }
        }
      }
      axis.lastSerie = lastSerie;
      axis.max = newmax;
      axis.min = newmin;
    }
  },
  extendYRange: function(axis){
    if(axis.options.max === null){
      var newmax = Number.MIN_VALUE,
          newmin = Number.MAX_VALUE,
          i, j, s, g,
          stackedSumsPos = {},
          stackedSumsNeg = {},
          lastSerie = null;
                  
      for(i = 0; i < this.series.length; ++i){
        s = this.series[i];
        g = s.gantt;
        
        if (g.show && !s.hide && s.yaxis == axis) {
          var datamax = Number.MIN_VALUE, datamin = Number.MAX_VALUE;
          for(j=0; j < s.data.length; j++){
            datamax = Math.max(datamax,s.data[j][0]);
            datamin = Math.min(datamin,s.data[j][0]);
          }
            
          if (g.centered) {
            newmax = Math.max(datamax + 0.5, newmax);
            newmin = Math.min(datamin - 0.5, newmin);
          }
        else {
          newmax = Math.max(datamax + 1, newmax);
            newmin = Math.min(datamin, newmin);
          }
          // For normal horizontal bars
          if (g.barWidth + datamax > newmax){
            newmax = axis.max + g.barWidth;
          }
        }
      }
      axis.lastSerie = lastSerie;
      axis.max = newmax;
      axis.min = newmin;
      axis.tickSize = Flotr.getTickSize(axis.options.noTicks, newmin, newmax, axis.options.tickDecimals);
    }
  }
});

/** Markers **/
/**
 * Formats the marker labels.
 * @param {Object} obj - Marker value Object {x:..,y:..}
 * @return {String} Formatted marker string
 */
(function () {

Flotr.defaultMarkerFormatter = function(obj){
  return (Math.round(obj.y*100)/100)+'';
};

Flotr.addType('markers', {
  options: {
    show: false,           // => setting to true will show markers, false will hide
    lineWidth: 1,          // => line width of the rectangle around the marker
    color: '#000000',      // => text color
    fill: false,           // => fill or not the marekers' rectangles
    fillColor: "#FFFFFF",  // => fill color
    fillOpacity: 0.4,      // => fill opacity
    stroke: false,         // => draw the rectangle around the markers
    position: 'ct',        // => the markers position (vertical align: b, m, t, horizontal align: l, c, r)
    verticalMargin: 0,     // => the margin between the point and the text.
    labelFormatter: Flotr.defaultMarkerFormatter,
    fontSize: Flotr.defaultOptions.fontSize,
    stacked: false,        // => true if markers should be stacked
    stackingType: 'b',     // => define staching behavior, (b- bars like, a - area like) (see Issue 125 for details)
    horizontal: false      // => true if markers should be horizontal (For now only in a case on horizontal stacked bars, stacks should be calculated horizontaly)
  },

  // TODO test stacked markers.
  stack : {
      positive : [],
      negative : [],
      values : []
  },

  draw : function (options) {

    var
      data            = options.data,
      context         = options.context,
      stack           = options.stacked ? options.stack : false,
      stackType       = options.stackingType,
      stackOffsetNeg,
      stackOffsetPos,
      stackOffset,
      i, x, y, label;

    context.save();
    context.lineJoin = 'round';
    context.lineWidth = options.lineWidth;
    context.strokeStyle = 'rgba(0,0,0,0.5)';
    context.fillStyle = options.fillStyle;

    function stackPos (a, b) {
      stackOffsetPos = stack.negative[a] || 0;
      stackOffsetNeg = stack.positive[a] || 0;
      if (b > 0) {
        stack.positive[a] = stackOffsetPos + b;
        return stackOffsetPos + b;
      } else {
        stack.negative[a] = stackOffsetNeg + b;
        return stackOffsetNeg + b;
      }
    }

    for (i = 0; i < data.length; ++i) {
    
      x = data[i][0];
      y = data[i][1];
        
      if (stack) {
        if (stackType == 'b') {
          if (options.horizontal) y = stackPos(y, x);
          else x = stackPos(x, y);
        } else if (stackType == 'a') {
          stackOffset = stack.values[x] || 0;
          stack.values[x] = stackOffset + y;
          y = stackOffset + y;
        }
      }

      label = options.labelFormatter({x: x, y: y, index: i, data : data});
      this.plot(options.xScale(x), options.yScale(y), label, options);
    }
    context.restore();
  },
  plot: function(x, y, label, options) {
    var context = options.context;
    if (isImage(label) && !label.complete) {
      throw 'Marker image not loaded.';
    } else {
      this._plot(x, y, label, options);
    }
  },

  _plot: function(x, y, label, options) {
    var context = options.context,
        margin = 2,
        left = x,
        top = y,
        dim;

    if (isImage(label))
      dim = {height : label.height, width: label.width};
    else
      dim = options.text.canvas(label);

    dim.width = Math.floor(dim.width+margin*2);
    dim.height = Math.floor(dim.height+margin*2);

         if (options.position.indexOf('c') != -1) left -= dim.width/2 + margin;
    else if (options.position.indexOf('l') != -1) left -= dim.width;
    
         if (options.position.indexOf('m') != -1) top -= dim.height/2 + margin;
    else if (options.position.indexOf('t') != -1) top -= dim.height + options.verticalMargin;
    else top += options.verticalMargin;
    
    left = Math.floor(left)+0.5;
    top = Math.floor(top)+0.5;
    
    if(options.fill)
      context.fillRect(left, top, dim.width, dim.height);
      
    if(options.stroke)
      context.strokeRect(left, top, dim.width, dim.height);
    
    if (isImage(label))
      context.drawImage(label, parseInt(left+margin, 10), parseInt(top+margin, 10));
    else
      Flotr.drawText(context, label, left+margin, top+margin, {textBaseline: 'top', textAlign: 'left', size: options.fontSize, color: options.color});
  }
});

function isImage (i) {
  return typeof i === 'object' && i.constructor && (Image ? true : i.constructor === Image);
}

})();

/**
 * Pie
 *
 * Formats the pies labels.
 * @param {Object} slice - Slice object
 * @return {String} Formatted pie label string
 */
(function () {

var
  _ = Flotr._;

Flotr.defaultPieLabelFormatter = function (total, value) {
  return (100 * value / total).toFixed(2)+'%';
};

Flotr.addType('pie', {
  options: {
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 1,          // => in pixels
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillColor: null,       // => fill color
    fillOpacity: 0.6,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    explode: 6,            // => the number of pixels the splices will be far from the center
    sizeRatio: 0.6,        // => the size ratio of the pie relative to the plot 
    startAngle: Math.PI/4, // => the first slice start angle
    labelFormatter: Flotr.defaultPieLabelFormatter,
    pie3D: false,          // => whether to draw the pie in 3 dimenstions or not (ineffective) 
    pie3DviewAngle: (Math.PI/2 * 0.8),
    pie3DspliceThickness: 20,
    epsilon: 0.1           // => how close do you have to get to hit empty slice
  },

  draw : function (options) {

    // TODO 3D charts what?
    var
      data          = options.data,
      context       = options.context,
      lineWidth     = options.lineWidth,
      shadowSize    = options.shadowSize,
      sizeRatio     = options.sizeRatio,
      height        = options.height,
      width         = options.width,
      explode       = options.explode,
      color         = options.color,
      fill          = options.fill,
      fillStyle     = options.fillStyle,
      radius        = Math.min(width, height) * sizeRatio / 2,
      value         = data[0][1],
      html          = [],
      vScale        = 1,//Math.cos(series.pie.viewAngle);
      measure       = Math.PI * 2 * value / this.total,
      startAngle    = this.startAngle || (2 * Math.PI * options.startAngle), // TODO: this initial startAngle is already in radians (fixing will be test-unstable)
      endAngle      = startAngle + measure,
      bisection     = startAngle + measure / 2,
      label         = options.labelFormatter(this.total, value),
      //plotTickness  = Math.sin(series.pie.viewAngle)*series.pie.spliceThickness / vScale;
      explodeCoeff  = explode + radius + 4,
      distX         = Math.cos(bisection) * explodeCoeff,
      distY         = Math.sin(bisection) * explodeCoeff,
      textAlign     = distX < 0 ? 'right' : 'left',
      textBaseline  = distY > 0 ? 'top' : 'bottom',
      style,
      x, y;
    
    context.save();
    context.translate(width / 2, height / 2);
    context.scale(1, vScale);

    x = Math.cos(bisection) * explode;
    y = Math.sin(bisection) * explode;

    // Shadows
    if (shadowSize > 0) {
      this.plotSlice(x + shadowSize, y + shadowSize, radius, startAngle, endAngle, context);
      if (fill) {
        context.fillStyle = 'rgba(0,0,0,0.1)';
        context.fill();
      }
    }

    this.plotSlice(x, y, radius, startAngle, endAngle, context);
    if (fill) {
      context.fillStyle = fillStyle;
      context.fill();
    }
    context.lineWidth = lineWidth;
    context.strokeStyle = color;
    context.stroke();

    style = {
      size : options.fontSize * 1.2,
      color : options.fontColor,
      weight : 1.5
    };

    if (label) {
      if (options.htmlText || !options.textEnabled) {
        divStyle = 'position:absolute;' + textBaseline + ':' + (height / 2 + (textBaseline === 'top' ? distY : -distY)) + 'px;';
        divStyle += textAlign + ':' + (width / 2 + (textAlign === 'right' ? -distX : distX)) + 'px;';
        html.push('<div style="', divStyle, '" class="flotr-grid-label">', label, '</div>');
      }
      else {
        style.textAlign = textAlign;
        style.textBaseline = textBaseline;
        Flotr.drawText(context, label, distX, distY, style);
      }
    }
    
    if (options.htmlText || !options.textEnabled) {
      var div = Flotr.DOM.node('<div style="color:' + options.fontColor + '" class="flotr-labels"></div>');
      Flotr.DOM.insert(div, html.join(''));
      Flotr.DOM.insert(options.element, div);
    }
    
    context.restore();

    // New start angle
    this.startAngle = endAngle;
    this.slices = this.slices || [];
    this.slices.push({
      radius : radius,
      x : x,
      y : y,
      explode : explode,
      start : startAngle,
      end : endAngle
    });
  },
  plotSlice : function (x, y, radius, startAngle, endAngle, context) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, radius, startAngle, endAngle, false);
    context.lineTo(x, y);
    context.closePath();
  },
  hit : function (options) {

    var
      data      = options.data[0],
      args      = options.args,
      index     = options.index,
      mouse     = args[0],
      n         = args[1],
      slice     = this.slices[index],
      x         = mouse.relX - options.width / 2,
      y         = mouse.relY - options.height / 2,
      r         = Math.sqrt(x * x + y * y),
      theta     = Math.atan(y / x),
      circle    = Math.PI * 2,
      explode   = slice.explode || options.explode,
      start     = slice.start % circle,
      end       = slice.end % circle,
      epsilon   = options.epsilon;

    if (x < 0) {
      theta += Math.PI;
    } else if (x > 0 && y < 0) {
      theta += circle;
    }

    if (r < slice.radius + explode && r > explode) {
      if (
          (theta > start && theta < end) || // Normal Slice
          (start > end && (theta < end || theta > start)) || // First slice
          // TODO: Document the two cases at the end:
          (start === end && ((slice.start === slice.end && Math.abs(theta - start) < epsilon) || (slice.start !== slice.end && Math.abs(theta-start) > epsilon)))
         ) {
          
          // TODO Decouple this from hit plugin (chart shouldn't know what n means)
         n.x = data[0];
         n.y = data[1];
         n.sAngle = start;
         n.eAngle = end;
         n.index = 0;
         n.seriesIndex = index;
         n.fraction = data[1] / this.total;
      }
    }
  },
  drawHit: function (options) {
    var
      context = options.context,
      slice = this.slices[options.args.seriesIndex];

    context.save();
    context.translate(options.width / 2, options.height / 2);
    this.plotSlice(slice.x, slice.y, slice.radius, slice.start, slice.end, context);
    context.stroke();
    context.restore();
  },
  clearHit : function (options) {
    var
      context = options.context,
      slice = this.slices[options.args.seriesIndex],
      padding = 2 * options.lineWidth,
      radius = slice.radius + padding;

    context.save();
    context.translate(options.width / 2, options.height / 2);
    context.clearRect(
      slice.x - radius,
      slice.y - radius,
      2 * radius + padding,
      2 * radius + padding 
    );
    context.restore();
  },
  extendYRange : function (axis, data) {
    this.total = (this.total || 0) + data[0][1];
  }
});
})();

/** Points **/
Flotr.addType('points', {
  options: {
    show: false,           // => setting to true will show points, false will hide
    radius: 3,             // => point radius (pixels)
    lineWidth: 2,          // => line width in pixels
    fill: true,            // => true to fill the points with a color, false for (transparent) no fill
    fillColor: '#FFFFFF',  // => fill color.  Null to use series color.
    fillOpacity: 1,        // => opacity of color inside the points
    hitRadius: null        // => override for points hit radius
  },

  draw : function (options) {
    var
      context     = options.context,
      lineWidth   = options.lineWidth,
      shadowSize  = options.shadowSize;

    context.save();

    if (shadowSize > 0) {
      context.lineWidth = shadowSize / 2;
      
      context.strokeStyle = 'rgba(0,0,0,0.1)';
      this.plot(options, shadowSize / 2 + context.lineWidth / 2);

      context.strokeStyle = 'rgba(0,0,0,0.2)';
      this.plot(options, context.lineWidth / 2);
    }

    context.lineWidth = options.lineWidth;
    context.strokeStyle = options.color;
    if (options.fill) context.fillStyle = options.fillStyle;

    this.plot(options);
    context.restore();
  },

  plot : function (options, offset) {
    var
      data    = options.data,
      context = options.context,
      xScale  = options.xScale,
      yScale  = options.yScale,
      i, x, y;
      
    for (i = data.length - 1; i > -1; --i) {
      y = data[i][1];
      if (y === null) continue;

      x = xScale(data[i][0]);
      y = yScale(y);

      if (x < 0 || x > options.width || y < 0 || y > options.height) continue;
      
      context.beginPath();
      if (offset) {
        context.arc(x, y + offset, options.radius, 0, Math.PI, false);
      } else {
        context.arc(x, y, options.radius, 0, 2 * Math.PI, true);
        if (options.fill) context.fill();
      }
      context.stroke();
      context.closePath();
    }
  }
});

/** Radar **/
Flotr.addType('radar', {
  options: {
    show: false,           // => setting to true will show radar chart, false will hide
    lineWidth: 2,          // => line width in pixels
    fill: true,            // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillOpacity: 0.4,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    radiusRatio: 0.90,      // => ratio of the radar, against the plot size
    sensibility: 2         // => the lower this number, the more precise you have to aim to show a value.
  },
  draw : function (options) {
    var
      context = options.context,
      shadowSize = options.shadowSize;

    context.save();
    context.translate(options.width / 2, options.height / 2);
    context.lineWidth = options.lineWidth;
    
    // Shadow
    context.fillStyle = 'rgba(0,0,0,0.05)';
    context.strokeStyle = 'rgba(0,0,0,0.05)';
    this.plot(options, shadowSize / 2);
    context.strokeStyle = 'rgba(0,0,0,0.1)';
    this.plot(options, shadowSize / 4);

    // Chart
    context.strokeStyle = options.color;
    context.fillStyle = options.fillStyle;
    this.plot(options);
    
    context.restore();
  },
  plot : function (options, offset) {
    var
      data    = options.data,
      context = options.context,
      radius  = Math.min(options.height, options.width) * options.radiusRatio / 2,
      step    = 2 * Math.PI / data.length,
      angle   = -Math.PI / 2,
      i, ratio;

    offset = offset || 0;

    context.beginPath();
    for (i = 0; i < data.length; ++i) {
      ratio = data[i][1] / this.max;

      context[i === 0 ? 'moveTo' : 'lineTo'](
        Math.cos(i * step + angle) * radius * ratio + offset,
        Math.sin(i * step + angle) * radius * ratio + offset
      );
    }
    context.closePath();
    if (options.fill) context.fill();
    context.stroke();
  },
  getGeometry : function (point, options) {
    var
      radius  = Math.min(options.height, options.width) * options.radiusRatio / 2,
      step    = 2 * Math.PI / options.data.length,
      angle   = -Math.PI / 2,
      ratio = point[1] / this.max;

    return {
      x : (Math.cos(point[0] * step + angle) * radius * ratio) + options.width / 2,
      y : (Math.sin(point[0] * step + angle) * radius * ratio) + options.height / 2
    };
  },
  hit : function (options) {
    var
      args = options.args,
      mouse = args[0],
      n = args[1],
      relX = mouse.relX,
      relY = mouse.relY,
      distance,
      geometry,
      dx, dy;

      for (var i = 0; i < n.series.length; i++) {
        var serie = n.series[i];
        var data = serie.data;

        for (var j = data.length; j--;) {
          geometry = this.getGeometry(data[j], options);

          dx = geometry.x - relX;
          dy = geometry.y - relY;
          distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <  options.sensibility*2) {
            n.x = data[j][0];
            n.y = data[j][1];
            n.index = j;
            n.seriesIndex = i;
            return n;
          }
        }
      }
    },
  drawHit : function (options) {
    var step = 2 * Math.PI / options.data.length;
    var angle   = -Math.PI / 2;
    var radius  = Math.min(options.height, options.width) * options.radiusRatio / 2;

    var s = options.args.series;
    var point_radius = s.points.hitRadius || s.points.radius || s.mouse.radius;

    var context = options.context;

    context.translate(options.width / 2, options.height / 2);

    var j = options.args.index;
    var ratio = options.data[j][1] / this.max;
    var x = Math.cos(j * step + angle) * radius * ratio;
    var y = Math.sin(j * step + angle) * radius * ratio;
    context.beginPath();
    context.arc(x, y, point_radius , 0, 2 * Math.PI, true);
    context.closePath();
    context.stroke();
  },
  clearHit : function (options) {
    var step = 2 * Math.PI / options.data.length;
    var angle   = -Math.PI / 2;
    var radius  = Math.min(options.height, options.width) * options.radiusRatio / 2;

    var context = options.context;

    var
        s = options.args.series,
        lw = (s.points ? s.points.lineWidth : 1);
        offset = (s.points.hitRadius || s.points.radius || s.mouse.radius) + lw;

    context.translate(options.width / 2, options.height / 2);

    var j = options.args.index;
    var ratio = options.data[j][1] / this.max;
    var x = Math.cos(j * step + angle) * radius * ratio;
    var y = Math.sin(j * step + angle) * radius * ratio;
    context.clearRect(x-offset,y-offset,offset*2,offset*2);
  },
  extendYRange : function (axis, data) {
    this.max = Math.max(axis.max, this.max || -Number.MAX_VALUE);
  }
});

Flotr.addType('timeline', {
  options: {
    show: false,
    lineWidth: 1,
    barWidth: 0.2,
    fill: true,
    fillColor: null,
    fillOpacity: 0.4,
    centered: true
  },

  draw : function (options) {

    var
      context = options.context;

    context.save();
    context.lineJoin    = 'miter';
    context.lineWidth   = options.lineWidth;
    context.strokeStyle = options.color;
    context.fillStyle   = options.fillStyle;

    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data      = options.data,
      context   = options.context,
      xScale    = options.xScale,
      yScale    = options.yScale,
      barWidth  = options.barWidth,
      lineWidth = options.lineWidth,
      i;

    Flotr._.each(data, function (timeline) {

      var 
        x   = timeline[0],
        y   = timeline[1],
        w   = timeline[2],
        h   = barWidth,

        xt  = Math.ceil(xScale(x)),
        wt  = Math.ceil(xScale(x + w)) - xt,
        yt  = Math.round(yScale(y)),
        ht  = Math.round(yScale(y - h)) - yt,

        x0  = xt - lineWidth / 2,
        y0  = Math.round(yt - ht / 2) - lineWidth / 2;

      context.strokeRect(x0, y0, wt, ht);
      context.fillRect(x0, y0, wt, ht);

    });
  },

  extendRange : function (series) {

    var
      data  = series.data,
      xa    = series.xaxis,
      ya    = series.yaxis,
      w     = series.timeline.barWidth;

    if (xa.options.min === null)
      xa.min = xa.datamin - w / 2;

    if (xa.options.max === null) {

      var
        max = xa.max;

      Flotr._.each(data, function (timeline) {
        max = Math.max(max, timeline[0] + timeline[2]);
      }, this);

      xa.max = max + w / 2;
    }

    if (ya.options.min === null)
      ya.min = ya.datamin - w;
    if (ya.options.min === null)
      ya.max = ya.datamax + w;
  }

});

/* vim: set et sw=2: */
Flotr.addType('stock_candles', {
/** Stock_Candles **/
  options: {
    shadowSize: 0,
    show: false,           // => setting to true will show candle sticks, false will hide
    lineWidth: 1,          // => in pixels
    wickLineWidth: 1,      // => in pixels
    candleWidth: 0.6,      // => in units of the x axis
    upFillColor: '#ff413a',// => up sticks fill color
    downFillColor: '#15a645',// => down sticks fill color
    fillOpacity: 1.0      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
  },

  draw : function (options) {

    var
      context = options.context;

    context.save();
    context.lineJoin = 'miter';
    context.lineCap = 'butt';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.wickLineWidth || options.lineWidth;

    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data          = options.data,
      context       = options.context,
      xScale        = options.xScale,
      yScale        = options.yScale,
      width         = options.candleWidth / 2,
      shadowSize    = options.shadowSize,
      lineWidth     = options.lineWidth,
      wickLineWidth = options.wickLineWidth,
      pixelOffset   = (wickLineWidth % 2) / 2,
      color,
      datum, x, y,
      open, high, low, close,
      left, right, bottom, top, bottom2, top2, reverseLines,
      i,fill, datum0, open0, close0;

    if (data.length < 1) return;

    for (i = 0; i < data.length; i++) {
      datum   = data[i];
      x       = datum[0];
      open    = datum[1];
      high    = datum[2];
      low     = datum[3];
      close   = datum[4];
      left    = xScale(x - width);
      right   = xScale(x + width);
      bottom  = yScale(low);
      top     = yScale(high);
      bottom2 = yScale(Math.min(open, close));
      top2    = yScale(Math.max(open, close));
      datum0  = data[i-1];
      
      /*
      // TODO skipping
      if(right < xa.min || left > xa.max || top < ya.min || bottom > ya.max)
        continue;
      */

      color = options[open > close ? 'downFillColor' : 'upFillColor'];
      if(datum0){
        open0 = datum0[1];
        close0 = datum0[4];
        fill = open > close ? ( close <= close0 && close <= open0 ) : (close >= close0 && close >= open0);
      }
      // Fill the candle.
      if (fill) {
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top2 + shadowSize, right - left, bottom2 - top2);
        context.save();
        context.globalAlpha = options.fillOpacity;
        context.fillStyle = color;
        context.fillRect(left, top2 + lineWidth, right - left, bottom2 - top2);
        context.restore();
      }

      // Draw candle outline/border, high, low.
      if (lineWidth || wickLineWidth) {

        x = Math.floor((left + right) / 2) + pixelOffset;

        context.strokeStyle = color;
        context.beginPath();

        context.strokeRect(left, top2 + lineWidth, right - left, bottom2 - top2);
        context.moveTo(x, Math.floor(top2 + lineWidth));
        context.lineTo(x, Math.floor(top + lineWidth));
        context.moveTo(x, Math.floor(bottom2 + lineWidth));
        context.lineTo(x, Math.floor(bottom + lineWidth));

        context.closePath();
        context.stroke();
      }
    }
  },

  hit : function (options) {
    var
      xScale = options.xScale,
      yScale = options.yScale,
      data = options.data,
      args = options.args,
      mouse = args[0],
      width = options.candleWidth / 2,
      n = args[1],
      x = mouse.relX,
      y = mouse.relY,
      length = data.length,
      i, datum,
      high, low,
      left, right, top, bottom;

    for (i = 0; i < length; i++) {
      datum   = data[i],
      high    = datum[2];
      low     = datum[3];
      left    = xScale(datum[0] - width);
      right   = xScale(datum[0] + width);
      bottom  = yScale(low);
      top     = yScale(high);

      if (x > left && x < right && y > top && y < bottom) {
        n.x = datum[0];
        n.index = i;
        n.seriesIndex = options.index;
        return;
      }
    }
  },

  drawHit : function (options) {
    var
      context = options.context;
    context.save();
    this.plot(
      _.defaults({
        fill : !!options.fillColor,
        upFillColor : options.color,
        downFillColor : options.color,
        data : [options.data[options.args.index]]
      }, options)
    );
    context.restore();
  },

  clearHit : function (options) {
    var
      args = options.args,
      context = options.context,
      xScale = options.xScale,
      yScale = options.yScale,
      lineWidth = options.lineWidth,
      width = options.candleWidth / 2,
      bar = options.data[args.index],
      left = xScale(bar[0] - width) - lineWidth,
      right = xScale(bar[0] + width) + lineWidth,
      top = yScale(bar[2]),
      bottom = yScale(bar[3]) + lineWidth;
    context.clearRect(left, top, right - left, bottom - top);
  },

  extendXRange: function (axis, data, options) {
    if (!_.isNumber(axis.options.max)) {
      axis.max = Math.max(axis.datamax + 0.5, axis.max);
      axis.min = Math.min(axis.datamin - 0.5, axis.min);
    }
  },

  extendYRange: function (axis, data, options) {
    if (!_.isNumber(axis.options.max)) {
      var
      length = data.length,
      ymin = Number.MAX_VALUE,
      ymax = Number.MIN_VALUE,
      o = axis.options,
      y, i, j;
      for (i = 0; i < length; i++) {
        for(j = 1; j<5; j++){
          y = data[i][j];
          if (y < ymin) { ymin = y; }
          if (y > ymax) { ymax = y; }
        }
        if(!data[i][7]) return;
        for(j = 6; j<9; j++){
          y = data[i][j];
          if (y < ymin) { ymin = y; }
          if (y > ymax) { ymax = y; }
        }
      }
      axis.max = Math.ceil(ymax * 2)/2.0;
      axis.min = Math.floor(ymin * 2)/2.0;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
  }
  
});


/* vim: set et sw=2: */
Flotr.addType('stock_volumes', {
/** Stock_Volumes **/
  options: {
    shadowSize: 0,
    show: false,           // => setting to true will show bars, false will hide
    lineWidth: 1,          // => in pixels
    barWidth: 0.6,           // => in units of the x axis
	upFillColor: '#ff413a',// => up sticks fill color
    downFillColor: '#15a645',// => down sticks fill color
    fillOpacity: 1.0,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill,
    forceFill: false,
    inTrend: false
  },

  draw : function (options) {
    var
      context = options.context;

    this.current += 1;

    context.save();
    context.lineJoin = 'miter';
    // @TODO linewidth not interpreted the right way.
    context.lineWidth = options.lineWidth;
    context.strokeStyle = options.color;
    
    this.plot(options);

    context.restore();
  },

  plot : function (options) {

    var
      data            = options.data,
      context         = options.context,
      shadowSize      = options.shadowSize,
      lineWidth       = options.lineWidth,
      forceFill       = options.forceFill,
      yi              = options.yi,
      prevClose       = options.prevClose,
      inTrend         = options.inTrend,
      i, geometry, left, top, width, height,
      datum, open, close, color, datum0, open0, close0, fill;

    if (data.length < 1) return;

    for (i = 0; i < data.length; i++) {

      geometry = this.getBarGeometry(data[i][0], data[i][yi], options);
      if (geometry === null) continue;

      left    = geometry.left;
      top     = geometry.top;
      width   = geometry.width;
      height  = geometry.height;
      datum   = data[i];
      open    = datum[1];
      close   = datum[4];
      datum0  = data[i-1];

      if(inTrend){
        var prev = datum0 ? datum0[1] : prevClose;
        color = options[prev > datum[1] ? 'downFillColor' : 'upFillColor'];
        
      } else {
        color = options[open > close ? 'downFillColor' : 'upFillColor'];
      }

      if (shadowSize) {
        context.save();
        context.fillStyle = 'rgba(0,0,0,0.05)';
        context.fillRect(left + shadowSize, top + shadowSize, width, height);
        context.restore();
      }
      if(datum0 && !inTrend){
        open0 = datum0[1];
        close0 = datum0[4];
        fill = open > close ? ( close <= close0 && close <= open0 ) : (close >= close0 && close >= open0);
      }
      if (forceFill || fill) {
        context.save();
        context.globalAlpha = options.fillOpacity;
        context.fillStyle = color;
        context.fillRect(left, top + lineWidth, width, height);
        context.restore();
      }
      if (options.lineWidth) {
        context.save();
        context.strokeStyle = color;
        context.strokeRect(left, top + lineWidth, width, height);
        context.restore();
      }
    }
  },

  getBarGeometry : function (x, y, options) {

    var
      barWidth      = options.barWidth,
      lineWidth     = options.lineWidth,
      bisection     = barWidth / 2,
      xScale        = options.xScale,
      yScale        = options.yScale,
      xValue        = x,
      yValue        = y,
      left, right, top, bottom;

    left    = xScale(xValue - bisection);
    right   = xScale(xValue + bisection);
    top     = yScale(yValue);
    bottom  = yScale(0);

    // TODO for test passing... probably looks better without this
    if (bottom < 0) bottom = 0;

    // TODO Skipping...
    // if (right < xa.min || left > xa.max || top < ya.min || bottom > ya.max) continue;

    return (x === null || y === null) ? null : {
      x         : xValue,
      y         : yValue,
      xScale    : xScale,
      yScale    : yScale,
      top       : top,
      left      : Math.min(left, right) ,
      width     : Math.abs(right - left),
      height    : bottom - top
    };
  },

  hit : function (options) {
    var
      data = options.data,
      args = options.args,
      mouse = args[0],
      n = args[1],
      x = options.xInverse(mouse.relX),
      y = options.yInverse(mouse.relY),
      hitGeometry = this.getBarGeometry(x, y, options),
      width = hitGeometry.width / 2,
      left = hitGeometry.left,
      height = hitGeometry.y,
      yi = options.yi,
      geometry, i;

    for (i = data.length; i--;) {
      geometry = this.getBarGeometry(data[i][0], data[i][yi], options);
      if (
        // Height:
        (
          // Positive Bars:
          (height > 0 && height < geometry.y) ||
          // Negative Bars:
          (height < 0 && height > geometry.y)
        ) &&
        // Width:
        (Math.abs(left - geometry.left) < width)
      ) {
        n.x = data[i][0];
        n.y = data[i][yi];
        n.index = i;
        n.seriesIndex = options.index;
      }
    }
  },

  drawHit : function (options) {

    var
      context     = options.context,
      args        = options.args,
      lineWidth   = options.lineWidth,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      top         = geometry.top,
      width       = geometry.width,
      height      = geometry.height;

    context.save();
    context.strokeStyle = options.color;
    context.lineWidth = lineWidth * 2,

    // Draw highlight
    context.beginPath();
    
    context.moveTo(left, top + height);
    context.lineTo(left, top);
    context.lineTo(left + width, top);
    context.lineTo(left + width, top + height);

    context.stroke();
    
    context.closePath();

    context.restore();
  },

  clearHit: function (options) {
    var
      context     = options.context,
      args        = options.args,
      geometry    = this.getBarGeometry(args.x, args.y, options),
      left        = geometry.left,
      width       = geometry.width,
      top         = geometry.top,
      height      = geometry.height,
      lineWidth   = 2 * options.lineWidth;

    context.save();
    context.clearRect(
      left - lineWidth,
      Math.min(top, top + height) - lineWidth,
      width + 2 * lineWidth,
      Math.abs(height) + 2 * lineWidth
    );
    context.restore();
  },

  // extendXRange : function (axis, data, options, bars) {
  //   if (!_.isNumber(axis.options.max)) {
  //     axis.max = Math.max(axis.datamax + 0.5, axis.max);
  //     axis.min = Math.min(axis.datamin - 0.5, axis.min);
  //   }
  // },

  extendYRange : function (axis, data, options, bars, series) {
    if (!_.isNumber(axis.options.max)) {
      var
      length = data.length,
      ymin = Number.MAX_VALUE,
      ymax = Number.MIN_VALUE,
      o = axis.options,
      yi = series.yi,
      y, i;

      for (i = 0; i < length; i++){
        y = data[i][yi];
        ymin = y < ymin ? y : ymin;
        ymax = y > ymax ? y : ymax;
      }
      axis.datamin = ymin;
      axis.datamax = ymax;
      axis.min = ymin*0.95;
      axis.max = ymax*1.05;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
  }

});


/** trends **/
Flotr.addType('stock_trends', {
  options: {
    show: false,           // => setting to true will show lines, false will hide
    lineWidth: 1.5,          // => line width in pixels
    fill: false,           // => true to fill the area from the line to the x axis, false for (transparent) no fill
    fillBorder: false,     // => draw a border around the fill
    fillColor: null,       // => fill color
    fillOpacity: 0.7,      // => opacity of the fill color, set to 1 for a solid fill, 0 hides the fill
    steps: false           // => draw steps
  },

  /**
   * Draws lines series in the canvas element.
   * @param {Object} options
   */
  draw : function (options) {

    var
      context     = options.context,
      lineWidth   = options.lineWidth,
      shadowSize  = options.shadowSize,
      offset;

    context.save();
    context.lineJoin = 'round';

    if (shadowSize) {

      context.lineWidth = shadowSize / 2;
      offset = lineWidth / 2 + context.lineWidth / 2;
      
      // @TODO do this instead with a linear gradient
      context.strokeStyle = "rgba(0,0,0,0.1)";
      this.plot(options, offset + shadowSize / 2);

      context.strokeStyle = "rgba(0,0,0,0.2)";
      this.plot(options, offset);
    }

    context.lineWidth = lineWidth;
    context.strokeStyle = options.color;

    this.plot(options, 0);

    context.restore();
  },

  plot : function (options, shadowOffset) {

    var
      context   = options.context,
      width     = options.width, 
      height    = options.height,
      xScale    = options.xScale,
      yScale    = options.yScale,
      data      = options.data, 
      length    = data.length - 1,
      prevx     = null,
      prevy     = null,
      zero      = yScale(0),
      start     = null,
      x1, x2, y1, y2, i;
      
    if (length < 1) return;

    context.beginPath();

    for (i = 0; i < length; ++i) {

      // To allow empty values
      if (data[i][1] === null || data[i+1][1] === null) {
        if (options.fill) {
          if (i > 0 && data[i][1] !== null) {
            context.stroke();
            fill();
            start = null;
            context.closePath();
            context.beginPath();
          }
        }
        continue;
      }

      // Zero is infinity for log scales
      // TODO handle zero for logarithmic
      // if (xa.options.scaling === 'logarithmic' && (data[i][0] <= 0 || data[i+1][0] <= 0)) continue;
      // if (ya.options.scaling === 'logarithmic' && (data[i][1] <= 0 || data[i+1][1] <= 0)) continue;
      
      x1 = xScale(data[i][0]);
      x2 = xScale(data[i+1][0]);

      if (start === null) start = data[i];

      y1 = yScale(data[i][1]);
      y2 = yScale(data[i+1][1]);

      if (
        (y1 > height && y2 > height) ||
        (y1 < 0 && y2 < 0) ||
        (x1 < 0 && x2 < 0) ||
        (x1 > width && x2 > width)
      ) continue;

      if ((prevx != x1) || (prevy != y1 + shadowOffset)) {
        context.moveTo(x1, y1 + shadowOffset);
      }
      
      prevx = x2;
      prevy = y2 + shadowOffset;
      if (options.steps) {
        context.lineTo(prevx + shadowOffset / 2, y1 + shadowOffset);
        context.lineTo(prevx + shadowOffset / 2, prevy);
      } else {
        context.lineTo(prevx, prevy);
      }
    }
    
    if (!options.fill || options.fill && !options.fillBorder) context.stroke();

    fill();

    function fill () {
      if(!shadowOffset && options.fill && start){
        x1 = xScale(start[0]);
        context.fillStyle = options.fillStyle;
        context.lineTo(x2, zero);
        context.lineTo(x1, zero);
        context.lineTo(x1, yScale(start[1]));
        context.fill();
        if (options.fillBorder) {
          context.stroke();
        }
      }
    }

    context.closePath();
  },

  extendYRange : function (axis, data, options, lines) {

    var o = axis.options;

    if(o.prevClose){
      var abs =  Math.max(Math.abs(axis.min - o.prevClose), Math.abs(axis.max - o.prevClose)) * 1.05;
      axis.min = o.prevClose - abs;
      axis.max = o.prevClose + abs;
      axis.tickSize = Flotr.getTickSize(o.noTicks, axis.min, axis.max, o.tickDecimals);
    }
    
    if (options.steps) {

      this.hit = function (options) {
        var
          data = options.data,
          args = options.args,
          yScale = options.yScale,
          mouse = args[0],
          length = data.length,
          n = args[1],
          x = options.xInverse(mouse.relX),
          relY = mouse.relY,
          i;

        for (i = 0; i < length - 1; i++) {
          if (x >= data[i][0] && x <= data[i+1][0]) {
            if (Math.abs(yScale(data[i][1]) - relY) < 8) {
              n.x = data[i][0];
              n.y = data[i][1];
              n.index = i;
              n.seriesIndex = options.index;
            }
            break;
          }
        }
      };

      this.drawHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][0]);
          context.save();
          context.strokeStyle = options.color;
          context.lineWidth = options.lineWidth;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x2, y);
          context.stroke();
          context.closePath();
          context.restore();
        }
      };

      this.clearHit = function (options) {
        var
          context = options.context,
          args    = options.args,
          data    = options.data,
          xScale  = options.xScale,
          width   = options.lineWidth,
          index   = args.index,
          x       = xScale(args.x),
          y       = options.yScale(args.y),
          x2;

        if (data.length - 1 > index) {
          x2 = options.xScale(data[index + 1][0]);
          context.clearRect(x - width, y - width, x2 - x + 2 * width, 2 * width);
        }
      };
    }
  }

});

(function () {

var D = Flotr.DOM;

Flotr.addPlugin('crosshair', {
  options: {
    mode: null,            // => one of null, 'x', 'y' or 'xy'
    color: '#FF0000',      // => crosshair color
    hideCursor: true       // => hide the cursor when the crosshair is shown
  },
  callbacks: {
    'flotr:mousemove': function(e, pos) {
      if (this.options.crosshair.mode) {
        this.crosshair.clearCrosshair();
        this.crosshair.drawCrosshair(pos);
      }
    }
  },
  /**   
   * Draws the selection box.
   */
  drawCrosshair: function(pos) {
    var octx = this.octx,
      options = this.options.crosshair,
      plotOffset = this.plotOffset,
      x = plotOffset.left + Math.round(pos.relX) + 0.5,
      y = plotOffset.top + Math.round(pos.relY) + 0.5;

    if (!this.options.rotate && (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) ||
        // TODO refined condition
        this.options.rotate && (pos.relY < this.plotOffset.left )) {     
      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-crosshair');
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-crosshair');
    }
    
    octx.save();
    octx.strokeStyle = options.color;
    octx.lineWidth = 1;
    octx.beginPath();
    
    if (options.mode.indexOf('x') != -1) {
      if(this.options.rotate){
        octx.moveTo(y, plotOffset.top);
        octx.lineTo(y, plotOffset.top + this.axes.y2.options.stack ? this.canvasHeight : this.plotHeight);
      } else {
        octx.moveTo(x, plotOffset.top);
        octx.lineTo(x, plotOffset.top + this.axes.y2.options.stack ? this.canvasHeight : this.plotHeight);
      }
    }
    
    if (options.mode.indexOf('y') != -1) {
      if(this.options.rotate){
        octx.moveTo(plotOffset.left, this.canvasHeight - x);
        octx.lineTo(plotOffset.left + this.plotWidth, this.canvasHeight - x);
      } else {
        octx.moveTo(plotOffset.left, y);
        octx.lineTo(plotOffset.left + this.plotWidth, y);
      }
    }
    
    octx.stroke();
    octx.restore();
  },
  /**
   * Removes the selection box from the overlay canvas.
   */
  clearCrosshair: function() {

    var
      plotOffset = this.plotOffset,
      position = this.lastMousePos,
      context = this.octx,
      x = plotOffset.left + Math.round(position.relX) + 0.5,
      y = plotOffset.top + Math.round(position.relY) + 0.5;

    if (position) {
      context.clearRect(
        this.options.rotate ? y - 2.5 : x - 2.5,
        plotOffset.top,
        5,
        this.axes.y2.options.stack ? this.canvasHeight - plotOffset.top : this.plotHeight + 1
      );
      context.clearRect(
        plotOffset.left,
        this.options.rotate ? this.canvasHeight - x - 2.5 : y - 2.5,
        this.plotWidth + 1,
        5
      );
    }
  }
});
})();

(function() {

var
  D = Flotr.DOM,
  _ = Flotr._;

function getImage (type, canvas, context, width, height, background) {

  // TODO add scaling for w / h
  var
    mime = 'image/'+type,
    data = context.getImageData(0, 0, width, height),
    image = new Image();

  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  image.src = canvas.toDataURL(mime);
  context.restore();

  context.clearRect(0, 0, width, height);
  context.putImageData(data, 0, 0);

  return image;
}

Flotr.addPlugin('download', {

  saveImage: function (type, width, height, replaceCanvas) {
    var
      grid = this.options.grid,
      image;

    if (Flotr.isIE && Flotr.isIE < 9) {
      image = '<html><body>'+this.canvas.firstChild.innerHTML+'</body></html>';
      return window.open().document.write(image);
    }

    if (type !== 'jpeg' && type !== 'png') return;

    image = getImage(
      type, this.canvas, this.ctx,
      this.canvasWidth, this.canvasHeight,
      grid && grid.backgroundColor || '#ffffff'
    );

    if (_.isElement(image) && replaceCanvas) {
      this.download.restoreCanvas();
      D.hide(this.canvas);
      D.hide(this.overlay);
      D.setStyles({position: 'absolute'});
      D.insert(this.el, image);
      this.saveImageElement = image;
    } else {
      return window.open(image.src);
    }
  },

  restoreCanvas: function() {
    D.show(this.canvas);
    D.show(this.overlay);
    if (this.saveImageElement) this.el.removeChild(this.saveImageElement);
    this.saveImageElement = null;
  }
});

})();

(function () {

var E = Flotr.EventAdapter,
    _ = Flotr._;

Flotr.addPlugin('graphGrid', {

  callbacks: {
    'flotr:beforedraw' : function () {
      this.graphGrid.drawGrid();
    },
    'flotr:afterdraw' : function () {
      this.graphGrid.drawOutline();
    },
    'flotr:beforedrawy2axis' : function () {
      this.graphGrid.drawGridY2Axis();
    }
  },

  drawGrid: function(){

    var
      ctx = this.ctx,
      options = this.options,
      grid = options.grid,
      verticalLines = grid.verticalLines,
      horizontalLines = grid.horizontalLines,
      minorVerticalLines = grid.minorVerticalLines,
      minorHorizontalLines = grid.minorHorizontalLines,
      plotHeight = this.plotHeight,
      plotWidth = this.plotWidth,
      scope = {ctx:ctx, plotWidth: plotWidth, plotHeight: plotHeight, top: 0},
      a, v, i, j;
        
    if(verticalLines || minorVerticalLines || 
           horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:beforegrid', [this.axes.x, this.axes.y, options, this]);
    }
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid.tickColor;
    
    var circularHorizontalTicks = function(ticks) {
      for(i = 0; i < ticks.length; ++i){
        var ratio = ticks[i].v / a.max;
        for(j = 0; j <= sides; ++j){
          ctx[j === 0 ? 'moveTo' : 'lineTo'](
            Math.cos(j*coeff+angle)*radius*ratio,
            Math.sin(j*coeff+angle)*radius*ratio
          );
        }
      }
    };

    if (grid.circular) {
      ctx.translate(this.plotOffset.left+plotWidth/2, this.plotOffset.top+plotHeight/2);
      var radius = Math.min(plotHeight, plotWidth)*options.radar.radiusRatio/2,
          sides = this.axes.x.ticks.length,
          coeff = 2*(Math.PI/sides),
          angle = -Math.PI/2;
      
      // Draw grid lines in vertical direction.
      ctx.beginPath();
      
      a = this.axes.y;

      if(horizontalLines){
        circularHorizontalTicks(a.ticks);
      }
      if(minorHorizontalLines){
        circularHorizontalTicks(a.minorTicks);
      }
      
      if(verticalLines){
        _.times(sides, function(i){
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i*coeff+angle)*radius, Math.sin(i*coeff+angle)*radius);
        });
      }
      ctx.stroke();
    }
    else {
      ctx.translate(this.plotOffset.left, this.plotOffset.top);
  
      // Draw grid background, if present in options.
      if(grid.backgroundColor){
        ctx.fillStyle = this.processColor(grid.backgroundColor, {x1: 0, y1: 0, x2: plotWidth, y2: plotHeight});
        ctx.fillRect(0, 0, plotWidth, plotHeight);
      }
      
      ctx.beginPath();

      a = this.axes.x;
      if (verticalLines)        this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawVerticalLines(scope));
      if (minorVerticalLines)   this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawVerticalLines(scope));      
      
      a = this.axes.y;
      if (horizontalLines)      this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawHorizontalLines(scope));
      if (minorHorizontalLines) this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
      
      ctx.stroke();
      ctx.strokeStyle = grid.specialColor;
      if(ctx.setLineDash){
        ctx.setLineDash(grid.specialLineDash);
      }
      ctx.beginPath();
      a = this.axes.x;
      this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawVerticalLines(scope));
      a = this.axes.y;
      this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
      ctx.stroke();
    }
    
    ctx.restore();
    if(verticalLines || minorVerticalLines ||
       horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:aftergrid', [this.axes.x, this.axes.y, options, this]);
    }
  },

  drawGridY2Axis: function(){

    var
      ctx = this.ctx,
      options = this.options,
      grid = options.grid,
      verticalLines = grid.verticalLines,
      horizontalLines = grid.horizontalLines,
      minorVerticalLines = grid.minorVerticalLines,
      minorHorizontalLines = grid.minorHorizontalLines,
      plotHeight = this.plotHeight,
      plotWidth = this.plotWidth,
      scope = {ctx:ctx, plotWidth: plotWidth, plotHeight: plotHeight, top: this.plotHeight - this.axes.y2.canvasHeight + 2},
      a, v, i, j;
        
    if(verticalLines || minorVerticalLines || 
           horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:beforegridy2axis', [this.axes.x, this.axes.y2, options, this]);
    }
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = grid.tickColor;
    
    ctx.beginPath();

    a = this.axes.x;
    if (verticalLines)        this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawVerticalLines(scope));
    if (minorVerticalLines)   this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawVerticalLines(scope));

    a = this.axes.y2;
    if(a.options.stack){
      if (horizontalLines)      this.graphGrid.drawGridLines(a, grid, a.ticks, ctx, this.graphGrid.drawHorizontalLines(scope));
      if (minorHorizontalLines) this.graphGrid.drawGridLines(a, grid, a.minorTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
    }
    
    ctx.stroke();
    
    ctx.strokeStyle = grid.specialColor;
    if(ctx.setLineDash){
      ctx.setLineDash(grid.specialLineDash);
    }
    ctx.beginPath();
    a = this.axes.x;
    this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawVerticalLines(scope));
    a = this.axes.y2;
    this.graphGrid.drawGridLines(a, grid, a.specialTicks, ctx, this.graphGrid.drawHorizontalLines(scope));
    ctx.stroke();
    
    ctx.restore();
    if(verticalLines || minorVerticalLines ||
       horizontalLines || minorHorizontalLines){
      E.fire(this.el, 'flotr:aftergridy2axis', [this.axes.x, this.axes.y2, options, this]);
    }
  },

  drawGridLines: function(axis, grid, ticks, ctx, callback) {
    _.each(_.pluck(ticks, 'v'), function(v){
      // Don't show lines on upper and lower bounds.
      if ((v <= axis.min || v >= axis.max) || 
          (v == axis.min || v == axis.max) && grid.outlineWidth)
        return;
      callback(Math.floor(axis.d2p(v)) + ctx.lineWidth/2);
    });
  },

  drawVerticalLines: function(scope) {
    var
      ctx = scope.ctx,
      top = scope.top,
      plotHeight = scope.plotHeight;
    return function(x){
      ctx.moveTo(x, top);
      ctx.lineTo(x, plotHeight);
    };
  },

  drawHorizontalLines: function(scope) {
    var
      ctx = scope.ctx,
      plotWidth = scope.plotWidth;
    return function(y){
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
    };
  },

  drawOutline: function(){
    var
      that = this,
      options = that.options,
      grid = options.grid,
      outline = grid.outline,
      ctx = that.ctx,
      backgroundImage = grid.backgroundImage,
      plotOffset = that.plotOffset,
      leftOffset = plotOffset.left,
      topOffset = plotOffset.top,
      plotWidth = that.plotWidth,
      plotHeight = that.plotHeight,
      v, img, src, left, top, globalAlpha;
    
    if (!grid.outlineWidth) return;
    
    ctx.save();
    
    if (grid.circular) {
      ctx.translate(leftOffset + plotWidth / 2, topOffset + plotHeight / 2);
      var radius = Math.min(plotHeight, plotWidth) * options.radar.radiusRatio / 2,
          sides = this.axes.x.ticks.length,
          coeff = 2*(Math.PI/sides),
          angle = -Math.PI/2;
      
      // Draw axis/grid border.
      ctx.beginPath();
      ctx.lineWidth = grid.outlineWidth;
      ctx.strokeStyle = grid.color;
      ctx.lineJoin = 'round';
      
      for(i = 0; i <= sides; ++i){
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(i*coeff+angle)*radius, Math.sin(i*coeff+angle)*radius);
      }
      //ctx.arc(0, 0, radius, 0, Math.PI*2, true);

      ctx.stroke();
    }
    else {
      ctx.translate(leftOffset, topOffset);
      
      // Draw axis/grid border.
      var lw = grid.outlineWidth,
          orig = 0.5-lw+((lw+1)%2/2),
          lineTo = 'lineTo',
          moveTo = 'moveTo';
      ctx.lineWidth = lw;
      ctx.strokeStyle = grid.color;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(orig, orig);
      plotWidth = plotWidth - (lw / 2) % 1;
      plotHeight = plotHeight + lw / 2;
      ctx[outline.indexOf('n') !== -1 ? lineTo : moveTo](plotWidth, orig);
      ctx[outline.indexOf('e') !== -1 ? lineTo : moveTo](plotWidth, plotHeight);
      ctx[outline.indexOf('s') !== -1 ? lineTo : moveTo](orig, plotHeight);
      ctx[outline.indexOf('w') !== -1 ? lineTo : moveTo](orig, orig);

      if(this.axes.y2.options.stack){
        ctx.translate(-leftOffset, -topOffset);
        ctx.translate(leftOffset, this.canvasHeight - this.axes.y2.canvasHeight);
        plotHeight = this.axes.y2.length + lw / 2;
        ctx.moveTo(orig, orig);
        ctx[outline.indexOf('n') !== -1 ? lineTo : moveTo](plotWidth, orig);
        ctx[outline.indexOf('e') !== -1 ? lineTo : moveTo](plotWidth, plotHeight);
        ctx[outline.indexOf('s') !== -1 ? lineTo : moveTo](orig, plotHeight);
        ctx[outline.indexOf('w') !== -1 ? lineTo : moveTo](orig, orig);
        ctx.translate(-leftOffset, -this.canvasHeight + this.axes.y2.canvasHeight);
        ctx.translate(leftOffset, topOffset);
      }
      ctx.stroke();
      ctx.closePath();
    }
    
    ctx.restore();

    if (backgroundImage) {

      src = backgroundImage.src || backgroundImage;
      left = (parseInt(backgroundImage.left, 10) || 0) + plotOffset.left;
      top = (parseInt(backgroundImage.top, 10) || 0) + plotOffset.top;
      img = new Image();

      img.onload = function() {
        ctx.save();
        if (backgroundImage.alpha) ctx.globalAlpha = backgroundImage.alpha;
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(img, 0, 0, img.width, img.height, left, top, plotWidth, plotHeight);
        ctx.restore();
      };

      img.src = src;
    }
  }
});

})();

(function () {

var
  D = Flotr.DOM,
  _ = Flotr._,
  flotr = Flotr,
  S_MOUSETRACK = 'opacity:0.7;background-color:#000;color:#fff;position:absolute;padding:2px 8px;-moz-border-radius:4px;border-radius:4px;white-space:nowrap;';

Flotr.addPlugin('hit', {
  callbacks: {
    'flotr:mousemove': function(e, pos) {
      this.hit.track(pos);
    },
    'flotr:click': function(pos) {
      var
        hit = this.hit.track(pos);
      if (hit && !_.isUndefined(hit.index)) pos.hit = hit;
    },
    'flotr:mouseout': function(e) {
      if (e.relatedTarget !== this.mouseTrack) {
        this.hit.clearHit();
      }
    },
    'flotr:destroy': function() {
      if (this.options.mouse.container) {
        D.remove(this.mouseTrack);
      }
      this.mouseTrack = null;
    }
  },
  track : function (pos) {
    if (this.options.mouse.track || _.any(this.series, function(s){return s.mouse && s.mouse.track;})) {
      return this.hit.hit(pos);
    }
  },
  /**
   * Try a method on a graph type.  If the method exists, execute it.
   * @param {Object} series
   * @param {String} method  Method name.
   * @param {Array} args  Arguments applied to method.
   * @return executed successfully or failed.
   */
  executeOnType: function(s, method, args){
    var
      success = false,
      options, mouse;

    if (!_.isArray(s)) s = [s];

    function e(s, index) {
      _.each(_.keys(flotr.graphTypes), function (type) {
        if (s[type] && s[type].show && !s.hide && this[type][method]) {
          options = this.getOptions(s, type);

          options.fill = !!s.mouse.fillColor;
          options.fillStyle = this.processColor(s.mouse.fillColor || '#ffffff', {opacity: s.mouse.fillOpacity});
          options.color = s.mouse.lineColor;
          options.context = this.octx;
          options.index = index;

          if (args) options.args = args;
          if (args && args[0] && s.yaxis.options.stack){
            mouse = _.clone(args[0]);
            mouse.relY -= (s.yaxis.canvasHeight + this.plotOffset.bottom);
            options.args = [mouse, args[1]];
          }
          this[type][method].call(this[type], options);
          success = true;
        }
      }, this);
    }
    _.each(s, e, this);

    return success;
  },
  /**
   * Updates the mouse tracking point on the overlay.
   */
  drawHit: function(n){
    var octx = this.octx,
      s = n.series;

    if (s.mouse.lineColor) {
      octx.save();
      octx.lineWidth = (s.points ? s.points.lineWidth : 1);
      octx.strokeStyle = s.mouse.lineColor;
      octx.fillStyle = this.processColor(s.mouse.fillColor || '#ffffff', {opacity: s.mouse.fillOpacity});

      if(s.yaxis.options.stack){
        octx.translate(this.plotOffset.left, s.yaxis.canvasHeight + this.plotOffset.bottom);
      } else {
        octx.translate(this.plotOffset.left, this.plotOffset.top);
      }

      if (!this.hit.executeOnType(s, 'drawHit', n)) {
        var
          xa = n.xaxis,
          ya = n.yaxis;

        octx.beginPath();
          // TODO fix this (points) should move to general testable graph mixin
          octx.arc(xa.d2p(n.x), ya.d2p(n.y), s.points.hitRadius || s.points.radius || s.mouse.radius, 0, 2 * Math.PI, true);
          octx.fill();
          octx.stroke();
        octx.closePath();
      }
      octx.restore();

      if(s.yaxis.options.stack){
        this.clip2(octx);
      } else {
        this.clip(octx);
      }

    }
    this.prevHit = n;
  },
  /**
   * Removes the mouse tracking point from the overlay.
   */
  clearHit: function(){
    var prev = this.prevHit,
        octx = this.octx,
        plotOffset = this.plotOffset,
        s;

    octx.save();

    if (prev && prev.series.yaxis.options.stack){
      s = prev.series;
      octx.translate(this.plotOffset.left, s.yaxis.canvasHeight + this.plotOffset.bottom);
    } else {
      octx.translate(plotOffset.left, plotOffset.top);
    }

    if (prev) {
      if (!this.hit.executeOnType(prev.series, 'clearHit', this.prevHit)) {
        // TODO fix this (points) should move to general testable graph mixin
        s = prev.series;
        var
          lw = (s.points ? s.points.lineWidth : 1);
          offset = (s.points.hitRadius || s.points.radius || s.mouse.radius) + lw;
        octx.clearRect(
          prev.xaxis.d2p(prev.x) - offset,
          prev.yaxis.d2p(prev.y) - offset,
          offset*2,
          offset*2
        );
      }
      D.hide(this.mouseTrack);
      this.prevHit = null;
    }
    octx.restore();
  },
  /**
   * Retrieves the nearest data point from the mouse cursor. If it's within
   * a certain range, draw a point on the overlay canvas and display the x and y
   * value of the data.
   * @param {Object} mouse - Object that holds the relative x and y coordinates of the cursor.
   */
  hit : function (mouse) {

    var
      options = this.options,
      prevHit = this.prevHit,
      closest, sensibility, dataIndex, seriesIndex, series, value, xaxis, yaxis, n;

    if (this.series.length === 0) return;

    // Nearest data element.
    // dist, x, y, relX, relY, absX, absY, sAngle, eAngle, fraction, mouse,
    // xaxis, yaxis, series, index, seriesIndex
    n = {
      relX : mouse.relX,
      relY : mouse.relY,
      absX : mouse.absX,
      absY : mouse.absY,
      series: this.series
    };

    if (options.mouse.trackY &&
        !options.mouse.trackAll &&
        this.hit.executeOnType(this.series, 'hit', [mouse, n]) &&
        !_.isUndefined(n.seriesIndex))
      {
      series    = this.series[n.seriesIndex];
      n.series  = series;
      n.mouse   = series.mouse;
      n.xaxis   = series.xaxis;
      n.yaxis   = series.yaxis;
    } else {

      closest = this.hit.closest(mouse);

      if (closest) {

        closest     = options.mouse.trackY ? closest.point : closest.x;
        seriesIndex = closest.seriesIndex;
        series      = this.series[seriesIndex];
        xaxis       = series.xaxis;
        yaxis       = series.yaxis;
        sensibility = 2 * series.mouse.sensibility;

        if
          (options.mouse.trackAll ||
          (closest.distanceX < sensibility / xaxis.scale &&
          (!options.mouse.trackY || closest.distanceY < sensibility / yaxis.scale)))
        {
          n.series      = series;
          n.xaxis       = series.xaxis;
          n.yaxis       = series.yaxis;
          n.mouse       = series.mouse;
          n.x           = closest.x;
          n.y           = closest.y;
          n.dist        = closest.distance;
          n.index       = closest.dataIndex;
          n.seriesIndex = seriesIndex;
        }
      }
    }

    if (!prevHit || (prevHit.index !== n.index || prevHit.seriesIndex !== n.seriesIndex)) {
      this.hit.clearHit();
      if (n.series && n.mouse && n.mouse.track) {
        this.hit.drawMouseTrack(n);
        this.hit.drawHit(n);
        Flotr.EventAdapter.fire(this.el, 'flotr:hit', [n, this]);
      }
    }

    return n;
  },

  closest : function (mouse) {

    var
      series    = this.series,
      options   = this.options,
      // relX      = mouse.relX,
      // relY      = mouse.relY,
      relX      = mouse.rotatedRelX,
      relY      = mouse.rotatedRelY,
      compare   = Number.MAX_VALUE,
      compareX  = Number.MAX_VALUE,
      closest   = {},
      closestX  = {},
      check     = false,
      serie, data,
      distance, distanceX, distanceY,
      mouseX, mouseY,
      x, y, i, j;

    function setClosest (o) {
      o.distance = distance;
      o.distanceX = distanceX;
      o.distanceY = distanceY;
      o.seriesIndex = i;
      o.dataIndex = j;
      o.x = x;
      o.y = y;
      check = true;
    }

    for (i = 0; i < series.length; i++) {

      serie = series[i];
      data = serie.data;
//      debugger;
      mouseX = serie.xaxis.p2d(relX);
      mouseY = serie.yaxis.p2d(relY);

      if (serie.hide) continue;

      for (j = data.length; j--;) {

        x = data[j][0];
        y = data[j][1];
        // Add stack offset if exists
        if (data[j].y0) y += data[j].y0;

        if (x === null || y === null) continue;

        // don't check if the point isn't visible in the current range
        if (x < serie.xaxis.min || x > serie.xaxis.max) continue;

        distanceX = Math.abs(x - mouseX);
        distanceY = Math.abs(y - mouseY);

        // Skip square root for speed
        distance = distanceX * distanceX + distanceY * distanceY;

        if (distance < compare) {
          compare = distance;
          setClosest(closest);
        }

        if (distanceX < compareX) {
          compareX = distanceX;
          setClosest(closestX);
        }
      }
    }

    return check ? {
      point : closest,
      x : closestX
    } : false;
  },

  drawMouseTrack : function (n) {

    var
      pos         = '', 
      s           = n.series,
      p           = n.mouse.position, 
      m           = n.mouse.margin,
      x           = n.x,
      y           = n.y,
      elStyle     = S_MOUSETRACK,
      mouseTrack  = this.mouseTrack,
      plotOffset  = this.plotOffset,
      left        = plotOffset.left,
      right       = plotOffset.right,
      bottom      = plotOffset.bottom,
      top         = plotOffset.top,
      decimals    = n.mouse.trackDecimals,
      options     = this.options,
      container   = options.mouse.container,
      oTop        = 0,
      oLeft       = 0,
      offset, size, content;

    // Create
    if (!mouseTrack) {
      mouseTrack = D.node('<div class="flotr-mouse-value" style="'+elStyle+'"></div>');
      this.mouseTrack = mouseTrack;
      D.insert(container || this.el, mouseTrack);
    }

    // Fill tracker:
    if (!decimals || decimals < 0) decimals = 0;
    if (x && x.toFixed) x = x.toFixed(decimals);
    if (y && y.toFixed) y = y.toFixed(decimals);
    content = n.mouse.trackFormatter({
      x: x,
      y: y,
      series: n.series,
      index: n.index,
      nearest: n,
      fraction: n.fraction
    });
    if (_.isNull(content) || _.isUndefined(content)) {
      D.hide(mouseTrack);
      return;
    } else {
      mouseTrack.innerHTML = content;
      D.show(mouseTrack);
    }

    // Positioning
    if (!p) {
      return;
    }
    size = D.size(mouseTrack);
    if (container) {
      offset = D.position(this.el);
      oTop = offset.top;
      oLeft = offset.left;
    }

    if (!n.mouse.relative) { // absolute to the canvas
      pos += 'top:';
      if      (p.charAt(0) == 'n') pos += (oTop + m + top);
      else if (p.charAt(0) == 's') pos += (oTop - m + top + (this.axes.y2.options.stack ? this.canvasHeight : this.plotHeight) - size.height);
      pos += 'px;bottom:auto;left:';
      if      (p.charAt(1) == 'e') pos += (oLeft - m + left + this.plotWidth - size.width);
      else if (p.charAt(1) == 'w') pos += (oLeft + m + left);
      pos += 'px;right:auto;';

    // Pie
    } else if (s.pie && s.pie.show) {
      var center = {
          x: (this.plotWidth)/2,
          y: (this.plotHeight)/2
        },
        radius = (Math.min(this.canvasWidth, this.canvasHeight) * s.pie.sizeRatio) / 2,
        bisection = n.sAngle<n.eAngle ? (n.sAngle + n.eAngle) / 2: (n.sAngle + n.eAngle + 2* Math.PI) / 2;

      pos += 'bottom:' + (m - top - center.y - Math.sin(bisection) * radius/2 + this.canvasHeight) + 'px;top:auto;';
      pos += 'left:' + (m + left + center.x + Math.cos(bisection) * radius/2) + 'px;right:auto;';

    // Default
    } else {
      pos += 'top:';
      if (/n/.test(p)) pos += (oTop - m + top + n.yaxis.d2p(n.y) - size.height);
      else             pos += (oTop + m + top + n.yaxis.d2p(n.y));
      pos += 'px;bottom:auto;left:';
      if (/w/.test(p)) pos += (oLeft - m + left + n.xaxis.d2p(n.x) - size.width);
      else             pos += (oLeft + m + left + n.xaxis.d2p(n.x));
      pos += 'px;right:auto;';
    }

    // Set position
    mouseTrack.style.cssText = elStyle + pos;

    if (n.mouse.relative) {
      if (!/[ew]/.test(p)) {
        // Center Horizontally
        mouseTrack.style.left =
          (oLeft + left + n.xaxis.d2p(n.x) - D.size(mouseTrack).width / 2) + 'px';
      } else
      if (!/[ns]/.test(p)) {
        // Center Vertically
        mouseTrack.style.top =
          (oTop + top + n.yaxis.d2p(n.y) - D.size(mouseTrack).height / 2) + 'px';
      }
    }
  }

});
})();

/** 
 * Selection Handles Plugin
 *
 *
 * Options
 *  show - True enables the handles plugin.
 *  drag - Left and Right drag handles
 *  scroll - Scrolling handle
 */
(function () {

function isLeftClick (e, type) {
  return (e.which ? (e.which === 1) : (e.button === 0 || e.button === 1));
}

function boundX(x, graph) {
  return Math.min(Math.max(0, x), graph.plotWidth - 1);
}

function boundY(y, graph) {
  return Math.min(Math.max(0, y), graph.plotHeight);
}

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter,
  _ = Flotr._;


Flotr.addPlugin('selection', {

  options: {
    pinchOnly: null,       // Only select on pinch
    mode: null,            // => one of null, 'x', 'y' or 'xy'
    color: '#B6D9FF',      // => selection box color
    fps: 20                // => frames-per-second
  },

  callbacks: {
    'flotr:mouseup' : function (event) {

      var
        options = this.options.selection,
        selection = this.selection,
        pointer = this.getEventPosition(event);

      if (!options || !options.mode) return;
      if (selection.interval) clearInterval(selection.interval);

      if (this.multitouches) {
        selection.updateSelection();
      } else
      if (!options.pinchOnly) {
        selection.setSelectionPos(selection.selection.second, pointer);
      }
      selection.clearSelection();

      if(selection.selecting && selection.selectionIsSane()){
        selection.drawSelection();
        selection.fireSelectEvent();
        this.ignoreClick = true;
      }
    },
    'flotr:mousedown' : function (event) {

      var
        options = this.options.selection,
        selection = this.selection,
        pointer = this.getEventPosition(event);

      if (!options || !options.mode) return;
      if (!options.mode || (!isLeftClick(event) && _.isUndefined(event.touches))) return;
      if (!options.pinchOnly) selection.setSelectionPos(selection.selection.first, pointer);
      if (selection.interval) clearInterval(selection.interval);

      this.lastMousePos.pageX = null;
      selection.selecting = false;
      selection.interval = setInterval(
        _.bind(selection.updateSelection, this),
        1000 / options.fps
      );
    },
    'flotr:destroy' : function (event) {
      clearInterval(this.selection.interval);
    }
  },

  // TODO This isn't used.  Maybe it belongs in the draw area and fire select event methods?
  getArea: function() {

    var
      s = this.selection.selection,
      a = this.axes,
      first = s.first,
      second = s.second,
      x1, x2, y1, y2;

    x1 = a.x.p2d(s.first.x);
    x2 = a.x.p2d(s.second.x);
    y1 = a.y.p2d(s.first.y);
    y2 = a.y.p2d(s.second.y);

    return {
      x1 : Math.min(x1, x2),
      y1 : Math.min(y1, y2),
      x2 : Math.max(x1, x2),
      y2 : Math.max(y1, y2),
      xfirst : x1,
      xsecond : x2,
      yfirst : y1,
      ysecond : y2
    };
  },

  selection: {first: {x: -1, y: -1}, second: {x: -1, y: -1}},
  prevSelection: null,
  interval: null,

  /**
   * Fires the 'flotr:select' event when the user made a selection.
   */
  fireSelectEvent: function(name){
    var
      area = this.selection.getArea();
    name = name || 'select';
    area.selection = this.selection.selection;
    E.fire(this.el, 'flotr:'+name, [area, this]);
  },

  /**
   * Allows the user the manually select an area.
   * @param {Object} area - Object with coordinates to select.
   */
  setSelection: function(area, preventEvent){
    var options = this.options,
      xa = this.axes.x,
      ya = this.axes.y,
      vertScale = ya.scale,
      hozScale = xa.scale,
      selX = options.selection.mode.indexOf('x') != -1,
      selY = options.selection.mode.indexOf('y') != -1,
      s = this.selection.selection;
    
    this.selection.clearSelection();

    s.first.y  = boundY((selX && !selY) ? 0 : (ya.max - area.y1) * vertScale, this);
    s.second.y = boundY((selX && !selY) ? this.plotHeight - 1: (ya.max - area.y2) * vertScale, this);
    s.first.x  = boundX((selY && !selX) ? 0 : (area.x1 - xa.min) * hozScale, this);
    s.second.x = boundX((selY && !selX) ? this.plotWidth : (area.x2 - xa.min) * hozScale, this);
    
    this.selection.drawSelection();
    if (!preventEvent)
      this.selection.fireSelectEvent();
  },

  /**
   * Calculates the position of the selection.
   * @param {Object} pos - Position object.
   * @param {Event} event - Event object.
   */
  setSelectionPos: function(pos, pointer) {
    var mode = this.options.selection.mode,
        selection = this.selection.selection;

    if(mode.indexOf('x') == -1) {
      pos.x = (pos == selection.first) ? 0 : this.plotWidth;         
    }else{
      pos.x = boundX(pointer.relX, this);
    }

    if (mode.indexOf('y') == -1) {
      pos.y = (pos == selection.first) ? 0 : this.plotHeight - 1;
    }else{
      pos.y = boundY(pointer.relY, this);
    }
  },
  /**
   * Draws the selection box.
   */
  drawSelection: function() {

    this.selection.fireSelectEvent('selecting');

    var s = this.selection.selection,
      octx = this.octx,
      options = this.options,
      plotOffset = this.plotOffset,
      prevSelection = this.selection.prevSelection;
    
    if (prevSelection &&
      s.first.x == prevSelection.first.x &&
      s.first.y == prevSelection.first.y && 
      s.second.x == prevSelection.second.x &&
      s.second.y == prevSelection.second.y) {
      return;
    }

    octx.save();
    octx.strokeStyle = this.processColor(options.selection.color, {opacity: 0.8});
    octx.lineWidth = 1;
    octx.lineJoin = 'miter';
    octx.fillStyle = this.processColor(options.selection.color, {opacity: 0.4});

    this.selection.prevSelection = {
      first: { x: s.first.x, y: s.first.y },
      second: { x: s.second.x, y: s.second.y }
    };

    var x = Math.min(s.first.x, s.second.x),
        y = Math.min(s.first.y, s.second.y),
        w = Math.abs(s.second.x - s.first.x),
        h = Math.abs(s.second.y - s.first.y);

    octx.fillRect(x + plotOffset.left+0.5, y + plotOffset.top+0.5, w, h);
    octx.strokeRect(x + plotOffset.left+0.5, y + plotOffset.top+0.5, w, h);
    octx.restore();
  },

  /**
   * Updates (draws) the selection box.
   */
  updateSelection: function(){
    if (!this.lastMousePos.pageX) return;

    this.selection.selecting = true;

    if (this.multitouches) {
      this.selection.setSelectionPos(this.selection.selection.first,  this.getEventPosition(this.multitouches[0]));
      this.selection.setSelectionPos(this.selection.selection.second,  this.getEventPosition(this.multitouches[1]));
    } else
    if (this.options.selection.pinchOnly) {
      return;
    } else {
      this.selection.setSelectionPos(this.selection.selection.second, this.lastMousePos);
    }

    this.selection.clearSelection();
    
    if(this.selection.selectionIsSane()) {
      this.selection.drawSelection();
    }
  },

  /**
   * Removes the selection box from the overlay canvas.
   */
  clearSelection: function() {
    if (!this.selection.prevSelection) return;
      
    var prevSelection = this.selection.prevSelection,
      lw = 1,
      plotOffset = this.plotOffset,
      x = Math.min(prevSelection.first.x, prevSelection.second.x),
      y = Math.min(prevSelection.first.y, prevSelection.second.y),
      w = Math.abs(prevSelection.second.x - prevSelection.first.x),
      h = Math.abs(prevSelection.second.y - prevSelection.first.y);
    
    this.octx.clearRect(x + plotOffset.left - lw + 0.5,
                        y + plotOffset.top - lw,
                        w + 2 * lw + 0.5,
                        h + 2 * lw + 0.5);
    
    this.selection.prevSelection = null;
  },
  /**
   * Determines whether or not the selection is sane and should be drawn.
   * @return {Boolean} - True when sane, false otherwise.
   */
  selectionIsSane: function(){
    var s = this.selection.selection;
    return Math.abs(s.second.x - s.first.x) >= 5 || 
           Math.abs(s.second.y - s.first.y) >= 5;
  }

});

})();

(function () {

var D = Flotr.DOM;

Flotr.addPlugin('labels', {

  callbacks : {
    'flotr:afterdraw' : function () {
      this.labels.draw();
    }
  },

  draw: function(){
    // Construct fixed width label boxes, which can be styled easily.
    var
      axis, tick, left, top, xBoxWidth,
      radius, sides, coeff, angle,
      div, i, html = '',
      noLabels = 0,
      options  = this.options,
      ctx      = this.ctx,
      a        = this.axes,
      style    = { size: options.fontSize };

    for (i = 0; i < a.x.ticks.length; ++i){
      if (a.x.ticks[i].label) { ++noLabels; }
    }
    xBoxWidth = this.plotWidth / noLabels;

    if (options.grid.circular) {
      ctx.save();
      ctx.translate(this.plotOffset.left + this.plotWidth / 2,
          this.plotOffset.top + this.plotHeight / 2);

      radius = this.plotHeight * options.radar.radiusRatio / 2 + options.fontSize;
      sides  = this.axes.x.ticks.length;
      coeff  = 2 * (Math.PI / sides);
      angle  = -Math.PI / 2;

      drawLabelCircular(this, a.x, false);
      drawLabelCircular(this, a.x, true);
      drawLabelCircular(this, a.y, false);
      drawLabelCircular(this, a.y, true);
      ctx.restore();
    }

    if (!options.HtmlText && this.textEnabled) {
      drawLabelNoHtmlText(this, a.x, 'center', 'top');
      drawLabelNoHtmlText(this, a.x2, 'center', 'bottom');
      drawLabelNoHtmlText(this, a.y, ['right', 'left'][!!a.y.options.tickInside + 0], 'middle');
      if(a.y2.options.stack){
        ctx.restore();
        ctx.save();
        ctx.translate(0, this.canvasHeight - this.plotHeight - 2);
      }
      drawLabelNoHtmlText(this, a.y2, ['left', 'right'][(!!a.y2.options.tickInside ? !a.y2.options.stack : !!a.y2.options.stack) + 0], 'middle');
      if(a.y2.options.stack){
        ctx.restore();
        ctx.save();
      }

    } else if ((
        a.x.options.showLabels ||
        a.x2.options.showLabels ||
        a.y.options.showLabels ||
        a.y2.options.showLabels) &&
        !options.grid.circular
      ) {

      html = '';

      drawLabelHtml(this, a.x);
      drawLabelHtml(this, a.x2);
      drawLabelHtml(this, a.y);
      drawLabelHtml(this, a.y2);

      ctx.stroke();
      ctx.restore();
      div = D.create('div');
      D.setStyles(div, {
        fontSize: 'smaller',
        color: options.labels.color || options.grid.color
      });
      div.className = 'flotr-labels';
      if(this.options.rotate){
        div.style["-ms-transform-origin"] = div.style["-webkit-transform-origin"] = div.style.transformOrigin = "0 0";
        div.style["-ms-transform"] = div.style["-webkit-transform"] = div.style.transform = "matrix(0, 1, -1, 0, "+ this.canvasHeight +", 0)";
      }
      D.insert(this.el, div);
      D.insert(div, html);
    }

    function drawLabelCircular (graph, axis, minorTicks) {
      var
        ticks   = minorTicks ? axis.minorTicks : axis.ticks,
        isX     = axis.orientation === 1,
        isFirst = axis.n === 1,
        style, offset;

      style = {
        color        : axis.options.color || options.labels.color || options.grid.color,
        angle        : Flotr.toRad(axis.options.labelsAngle),
        textBaseline : 'middle'
      };

      for (i = 0; i < ticks.length &&
          (minorTicks ? axis.options.showMinorLabels : axis.options.showLabels); ++i){
        tick = ticks[i];
        tick.label += '';
        if (!tick.label || !tick.label.length) { continue; }

        x = Math.cos(i * coeff + angle) * radius;
        y = Math.sin(i * coeff + angle) * radius;

        style.textAlign = isX ? (Math.abs(x) < 0.1 ? 'center' : (x < 0 ? 'right' : 'left')) : 'left';

        Flotr.drawText(
          ctx, tick.label,
          isX ? x : 3,
          isX ? y : -(axis.ticks[i].v / axis.max) * (radius - options.fontSize),
          style
        );
      }
    }

    function drawLabelNoHtmlText (graph, axis, textAlign, textBaseline)  {
      var
        isX     = axis.orientation === 1,
        isFirst = axis.n === 1,
        style, offset;

      style = {
        color        : axis.options.color || options.labels.color ||options.grid.color,
        textAlign    : textAlign,
        textBaseline : textBaseline,
        angle : Flotr.toRad(axis.options.labelsAngle)
      };
      style = Flotr.getBestTextAlign(style.angle, style);

      for (i = 0; i < axis.ticks.length && continueShowingLabels(axis); ++i) {
        tick = axis.ticks[i];
        drawNoHtmlTick(tick);
      }

      for (i = 0; i < axis.specialTicks.length && continueShowingLabels(axis); ++i) {
        tick = axis.specialTicks[i];
        drawNoHtmlTick(tick);
      }

      function drawNoHtmlTick(tick){
        if (!tick.label || !tick.label.length) { return; }

        offset = axis.d2p(tick.v);
        if (offset < 0 ||
            offset > (isX ? graph.plotWidth : graph.plotHeight)) { return; }

        Flotr.drawText(
          ctx, tick.label,
          leftOffset(graph, isX, (!isX && !isFirst && axis.options.stack ? true : isFirst), offset),
          topOffset(graph, isX, isFirst, offset),
          style
        );

        // Only draw on axis y2
        if (!isX && !isFirst && !axis.options.stack) {
          ctx.save();
          ctx.strokeStyle = style.color;
          ctx.beginPath();
          ctx.moveTo(graph.plotOffset.left + graph.plotWidth - 8, graph.plotOffset.top + axis.d2p(tick.v));
          ctx.lineTo(graph.plotOffset.left + graph.plotWidth, graph.plotOffset.top + axis.d2p(tick.v));
          ctx.stroke();
          ctx.restore();
        }
      }

      function continueShowingLabels (axis) {
        return axis.options.showLabels && axis.used;
      }
      function leftOffset (graph, isX, isFirst, offset) {
        return graph.plotOffset.left +
          (isX ? offset :
            (isFirst ?
              -options.grid.labelMargin :
              options.grid.labelMargin + graph.plotWidth));
      }
      function topOffset (graph, isX, isFirst, offset) {
        return graph.plotOffset.top +
          (isX ? options.grid.labelMargin : offset) +
          ((isX && isFirst) ? graph.plotHeight : 0);
      }
    }

    function drawLabelHtml (graph, axis) {
      var
        isX     = axis.orientation === 1,
        isFirst = axis.n === 1,
        isStack = axis.options.stack,
        name = '',
        left, style, top,
        offset = graph.plotOffset;

      if (!isX && !isFirst) {
        ctx.save();
        ctx.strokeStyle = axis.options.color || options.grid.color;
        ctx.beginPath();
      }

      if (axis.options.showLabels && (isFirst ? true : axis.used)) {
        for (i = 0; i < axis.ticks.length; ++i) {
          tick = axis.ticks[i];
          drawHtmlTick(tick);
        }

        for (i = 0; i < axis.specialTicks.length; ++i) {
          tick = axis.specialTicks[i];
          drawHtmlTick(tick);
        }
      }

      function drawHtmlTick(tick) {
          if (!tick.label || !tick.label.length ||
              ((isX ? offset.left : offset.top) + axis.d2p(tick.v) < 0) ||
              ((isX ? offset.left : offset.top) + axis.d2p(tick.v) > (isX ? graph.canvasWidth : graph.canvasHeight))) {
            return;
          }
          top = offset.top +
            (isX ?
              ((isFirst ? 1 : -1 ) * (graph.plotHeight + options.grid.labelMargin)) :
              axis.d2p(tick.v) - axis.maxLabel.height / 2);
          top = isStack ? top + graph.canvasHeight - graph.plotHeight - 2 : top;
          left = isX ? (offset.left + axis.d2p(tick.v) - xBoxWidth / 2) : 0;

          name = '';
          if (i === 0) {
            name = ' first';
          } else if (i === axis.ticks.length - 1) {
            name = ' last';
          }
          name += isX ? ' flotr-grid-label-x' : ' flotr-grid-label-y';

          html += [
            '<div style="position:absolute; text-align:' + (isX ? 'center' : 'right') + '; ',
            'top:' + top + 'px; ',
            ((!isX && !isFirst && !isStack) ? 'right:' : 'left:') + left + 'px; ',
            'width:' + (isX ? xBoxWidth : ((isFirst || (!isFirst && isStack) ? offset.left : offset.right) - options.grid.labelMargin)) + 'px; ',
            axis.options.color ? ('color:' + axis.options.color + '; ') : ' ',
            '" class="flotr-grid-label' + name + '">' + tick.label + '</div>'
          ].join(' ');
          
          if (!isX && !isFirst && !isStack) {
            ctx.moveTo(offset.left + graph.plotWidth - 8, offset.top + axis.d2p(tick.v));
            ctx.lineTo(offset.left + graph.plotWidth, offset.top + axis.d2p(tick.v));
          }
        }
    }
  }

});
})();

(function () {

var
  D = Flotr.DOM,
  _ = Flotr._;

Flotr.addPlugin('legend', {
  options: {
    show: true,            // => setting to true will show the legend, hide otherwise
    noColumns: 1,          // => number of colums in legend table // @todo: doesn't work for HtmlText = false
    labelFormatter: function(v){return v;}, // => fn: string -> string
    labelBoxBorderColor: '#CCCCCC', // => border color for the little label boxes
    labelBoxWidth: 14,
    labelBoxHeight: 10,
    labelBoxMargin: 5,
    container: null,       // => container (as jQuery object) to put legend in, null means default on top of graph
    position: 'nw',        // => position of default legend container within plot
    margin: 5,             // => distance from grid edge to default legend container within plot
    backgroundColor: '#F0F0F0', // => Legend background color.
    backgroundOpacity: 0.85// => set to 0 to avoid background, set to 1 for a solid background
  },
  callbacks: {
    'flotr:afterinit': function() {
      this.legend.insertLegend();
    },
    'flotr:destroy': function() {
      var markup = this.legend.markup;
      if (markup) {
        this.legend.markup = null;
        D.remove(markup);
      }
    }
  },
  /**
   * Adds a legend div to the canvas container or draws it on the canvas.
   */
  insertLegend: function(){

    if(!this.options.legend.show)
      return;

    var series      = this.series,
      plotOffset    = this.plotOffset,
      options       = this.options,
      legend        = options.legend,
      fragments     = [],
      rowStarted    = false, 
      ctx           = this.ctx,
      itemCount     = _.filter(series, function(s) {return (s.label && !s.hide);}).length,
      p             = legend.position, 
      m             = legend.margin,
      opacity       = legend.backgroundOpacity,
      i, label, color;

    if (itemCount) {

      var lbw = legend.labelBoxWidth,
          lbh = legend.labelBoxHeight,
          lbm = legend.labelBoxMargin,
          offsetX = plotOffset.left + m,
          offsetY = plotOffset.top + m,
          labelMaxWidth = 0,
          style = {
            size: options.fontSize*1.1,
            color: options.grid.color
          };

      // We calculate the labels' max width
      for(i = series.length - 1; i > -1; --i){
        if(!series[i].label || series[i].hide) continue;
        label = legend.labelFormatter(series[i].label);
        labelMaxWidth = Math.max(labelMaxWidth, this._text.measureText(label, style).width);
      }

      var legendWidth  = Math.round(lbw + lbm*3 + labelMaxWidth),
          legendHeight = Math.round(itemCount*(lbm+lbh) + lbm);

      // Default Opacity
      if (!opacity && opacity !== 0) {
        opacity = 0.1;
      }

      if (!options.HtmlText && this.textEnabled && !legend.container) {
        
        if(p.charAt(0) == 's') offsetY = plotOffset.top + this.plotHeight - (m + legendHeight);
        if(p.charAt(0) == 'c') offsetY = plotOffset.top + (this.plotHeight/2) - (m + (legendHeight/2));
        if(p.charAt(1) == 'e') offsetX = plotOffset.left + this.plotWidth - (m + legendWidth);
        
        // Legend box
        color = this.processColor(legend.backgroundColor, { opacity : opacity });

        ctx.fillStyle = color;
        ctx.fillRect(offsetX, offsetY, legendWidth, legendHeight);
        ctx.strokeStyle = legend.labelBoxBorderColor;
        ctx.strokeRect(Flotr.toPixel(offsetX), Flotr.toPixel(offsetY), legendWidth, legendHeight);
        
        // Legend labels
        var x = offsetX + lbm;
        var y = offsetY + lbm;
        for(i = 0; i < series.length; i++){
          if(!series[i].label || series[i].hide) continue;
          label = legend.labelFormatter(series[i].label);
          
          ctx.fillStyle = series[i].color;
          ctx.fillRect(x, y, lbw-1, lbh-1);
          
          ctx.strokeStyle = legend.labelBoxBorderColor;
          ctx.lineWidth = 1;
          ctx.strokeRect(Math.ceil(x)-1.5, Math.ceil(y)-1.5, lbw+2, lbh+2);
          
          // Legend text
          Flotr.drawText(ctx, label, x + lbw + lbm, y + lbh, style);
          
          y += lbh + lbm;
        }
      }
      else {
        for(i = 0; i < series.length; ++i){
          if(!series[i].label || series[i].hide) continue;
          
          if(i % legend.noColumns === 0){
            fragments.push(rowStarted ? '</tr><tr>' : '<tr>');
            rowStarted = true;
          }

          var s = series[i],
            boxWidth = legend.labelBoxWidth,
            boxHeight = legend.labelBoxHeight;

          label = legend.labelFormatter(s.label);
          color = 'background-color:' + ((s.bars && s.bars.show && s.bars.fillColor && s.bars.fill) ? s.bars.fillColor : s.color) + ';';
          
          fragments.push(
            '<td class="flotr-legend-color-box">',
              '<div style="border:1px solid ', legend.labelBoxBorderColor, ';padding:1px">',
                '<div style="width:', (boxWidth-1), 'px;height:', (boxHeight-1), 'px;border:1px solid ', series[i].color, '">', // Border
                  '<div style="width:', boxWidth, 'px;height:', boxHeight, 'px;', color, '"></div>', // Background
                '</div>',
              '</div>',
            '</td>',
            '<td class="flotr-legend-label">', label, '</td>'
          );
        }
        if(rowStarted) fragments.push('</tr>');
          
        if(fragments.length > 0){
          var table = '<table style="font-size:smaller;color:' + options.grid.color + '">' + fragments.join('') + '</table>';
          if(legend.container){
            table = D.node(table);
            this.legend.markup = table;
            D.insert(legend.container, table);
          }
          else {
            var styles = {position: 'absolute', 'zIndex': '2', 'border' : '1px solid ' + legend.labelBoxBorderColor};

                 if(p.charAt(0) == 'n') { styles.top = (m + plotOffset.top) + 'px'; styles.bottom = 'auto'; }
            else if(p.charAt(0) == 'c') { styles.top = (m + (this.plotHeight - legendHeight) / 2) + 'px'; styles.bottom = 'auto'; }
            else if(p.charAt(0) == 's') { styles.bottom = (m + plotOffset.bottom) + 'px'; styles.top = 'auto'; }
                 if(p.charAt(1) == 'e') { styles.right = (m + plotOffset.right) + 'px'; styles.left = 'auto'; }
            else if(p.charAt(1) == 'w') { styles.left = (m + plotOffset.left) + 'px'; styles.right = 'auto'; }

            var div = D.create('div'), size;
            div.className = 'flotr-legend';
            D.setStyles(div, styles);
            D.insert(div, table);
            D.insert(this.el, div);
            
            if (!opacity) return;

            var c = legend.backgroundColor || options.grid.backgroundColor || '#ffffff';

            _.extend(styles, D.size(div), {
              'backgroundColor': c,
              'zIndex' : '',
              'border' : ''
            });
            styles.width += 'px';
            styles.height += 'px';

             // Put in the transparent background separately to avoid blended labels and
            div = D.create('div');
            div.className = 'flotr-legend-bg';
            D.setStyles(div, styles);
            D.opacity(div, opacity);
            D.insert(div, ' ');
            D.insert(this.el, div);
          }
        }
      }
    }
  }
});
})();

/** Spreadsheet **/
(function() {

function getRowLabel(value){
  if (this.options.spreadsheet.tickFormatter){
    //TODO maybe pass the xaxis formatter to the custom tick formatter as an opt-out?
    return this.options.spreadsheet.tickFormatter(value);
  }
  else {
    var t = _.find(this.axes.x.ticks, function(t){return t.v == value;});
    if (t) {
      return t.label;
    }
    return value;
  }
}

var
  D = Flotr.DOM,
  _ = Flotr._;

Flotr.addPlugin('spreadsheet', {
  options: {
    show: false,           // => show the data grid using two tabs
    tabGraphLabel: 'Graph',
    tabDataLabel: 'Data',
    toolbarDownload: 'Download CSV', // @todo: add better language support
    toolbarSelectAll: 'Select all',
    csvFileSeparator: ',',
    decimalSeparator: '.',
    tickFormatter: null,
    initialTab: 'graph'
  },
  /**
   * Builds the tabs in the DOM
   */
  callbacks: {
    'flotr:afterconstruct': function(){
      // @TODO necessary?
      //this.el.select('.flotr-tabs-group,.flotr-datagrid-container').invoke('remove');
      
      if (!this.options.spreadsheet.show) return;
      
      var ss = this.spreadsheet,
        container = D.node('<div class="flotr-tabs-group" style="position:absolute;left:0px;width:'+this.canvasWidth+'px"></div>'),
        graph = D.node('<div style="float:left" class="flotr-tab selected">'+this.options.spreadsheet.tabGraphLabel+'</div>'),
        data = D.node('<div style="float:left" class="flotr-tab">'+this.options.spreadsheet.tabDataLabel+'</div>'),
        offset;

      ss.tabsContainer = container;
      ss.tabs = { graph : graph, data : data };

      D.insert(container, graph);
      D.insert(container, data);
      D.insert(this.el, container);

      offset = D.size(data).height + 2;
      this.plotOffset.bottom += offset;

      D.setStyles(container, {top: this.canvasHeight-offset+'px'});

      this.
        observe(graph, 'click',  function(){ss.showTab('graph');}).
        observe(data, 'click', function(){ss.showTab('data');});
      if (this.options.spreadsheet.initialTab !== 'graph'){
        ss.showTab(this.options.spreadsheet.initialTab);
      }
    }
  },
  /**
   * Builds a matrix of the data to make the correspondance between the x values and the y values :
   * X value => Y values from the axes
   * @return {Array} The data grid
   */
  loadDataGrid: function(){
    if (this.seriesData) return this.seriesData;

    var s = this.series,
        rows = {};

    /* The data grid is a 2 dimensions array. There is a row for each X value.
     * Each row contains the x value and the corresponding y value for each serie ('undefined' if there isn't one)
    **/
    _.each(s, function(serie, i){
      _.each(serie.data, function (v) {
        var x = v[0],
            y = v[1],
            r = rows[x];
        if (r) {
          r[i+1] = y;
        } else {
          var newRow = [];
          newRow[0] = x;
          newRow[i+1] = y;
          rows[x] = newRow;
        }
      });
    });

    // The data grid is sorted by x value
    this.seriesData = _.sortBy(rows, function(row, x){
      return parseInt(x, 10);
    });
    return this.seriesData;
  },
  /**
   * Constructs the data table for the spreadsheet
   * @todo make a spreadsheet manager (Flotr.Spreadsheet)
   * @return {Element} The resulting table element
   */
  constructDataGrid: function(){
    // If the data grid has already been built, nothing to do here
    if (this.spreadsheet.datagrid) return this.spreadsheet.datagrid;
    
    var s = this.series,
        datagrid = this.spreadsheet.loadDataGrid(),
        colgroup = ['<colgroup><col />'],
        buttonDownload, buttonSelect, t;
    
    // First row : series' labels
    var html = ['<table class="flotr-datagrid"><tr class="first-row">'];
    html.push('<th>&nbsp;</th>');
    _.each(s, function(serie,i){
      html.push('<th scope="col">'+(serie.label || String.fromCharCode(65+i))+'</th>');
      colgroup.push('<col />');
    });
    html.push('</tr>');
    // Data rows
    _.each(datagrid, function(row){
      html.push('<tr>');
      _.times(s.length+1, function(i){
        var tag = 'td',
            value = row[i],
            // TODO: do we really want to handle problems with floating point
            // precision here?
            content = (!_.isUndefined(value) ? Math.round(value*100000)/100000 : '');
        if (i === 0) {
          tag = 'th';
          var label = getRowLabel.call(this, content);
          if (label) content = label;
        }

        html.push('<'+tag+(tag=='th'?' scope="row"':'')+'>'+content+'</'+tag+'>');
      }, this);
      html.push('</tr>');
    }, this);
    colgroup.push('</colgroup>');
    t = D.node(html.join(''));

    /**
     * @TODO disabled this
    if (!Flotr.isIE || Flotr.isIE == 9) {
      function handleMouseout(){
        t.select('colgroup col.hover, th.hover').invoke('removeClassName', 'hover');
      }
      function handleMouseover(e){
        var td = e.element(),
          siblings = td.previousSiblings();
        t.select('th[scope=col]')[siblings.length-1].addClassName('hover');
        t.select('colgroup col')[siblings.length].addClassName('hover');
      }
      _.each(t.select('td'), function(td) {
        Flotr.EventAdapter.
          observe(td, 'mouseover', handleMouseover).
          observe(td, 'mouseout', handleMouseout);
      });
    }
    */

    buttonDownload = D.node(
      '<button type="button" class="flotr-datagrid-toolbar-button">' +
      this.options.spreadsheet.toolbarDownload +
      '</button>');

    buttonSelect = D.node(
      '<button type="button" class="flotr-datagrid-toolbar-button">' +
      this.options.spreadsheet.toolbarSelectAll+
      '</button>');

    this.
      observe(buttonDownload, 'click', _.bind(this.spreadsheet.downloadCSV, this)).
      observe(buttonSelect, 'click', _.bind(this.spreadsheet.selectAllData, this));

    var toolbar = D.node('<div class="flotr-datagrid-toolbar"></div>');
    D.insert(toolbar, buttonDownload);
    D.insert(toolbar, buttonSelect);

    var containerHeight =this.canvasHeight - D.size(this.spreadsheet.tabsContainer).height-2,
        container = D.node('<div class="flotr-datagrid-container" style="position:absolute;left:0px;top:0px;width:'+
          this.canvasWidth+'px;height:'+containerHeight+'px;overflow:auto;z-index:10"></div>');

    D.insert(container, toolbar);
    D.insert(container, t);
    D.insert(this.el, container);
    this.spreadsheet.datagrid = t;
    this.spreadsheet.container = container;

    return t;
  },  
  /**
   * Shows the specified tab, by its name
   * @todo make a tab manager (Flotr.Tabs)
   * @param {String} tabName - The tab name
   */
  showTab: function(tabName){
    if (this.spreadsheet.activeTab === tabName){
      return;
    }
    switch(tabName) {
      case 'graph':
        D.hide(this.spreadsheet.container);
        D.removeClass(this.spreadsheet.tabs.data, 'selected');
        D.addClass(this.spreadsheet.tabs.graph, 'selected');
      break;
      case 'data':
        if (!this.spreadsheet.datagrid)
          this.spreadsheet.constructDataGrid();
        D.show(this.spreadsheet.container);
        D.addClass(this.spreadsheet.tabs.data, 'selected');
        D.removeClass(this.spreadsheet.tabs.graph, 'selected');
      break;
      default:
        throw 'Illegal tab name: ' + tabName;
    }
    this.spreadsheet.activeTab = tabName;
  },
  /**
   * Selects the data table in the DOM for copy/paste
   */
  selectAllData: function(){
    if (this.spreadsheet.tabs) {
      var selection, range, doc, win, node = this.spreadsheet.constructDataGrid();

      this.spreadsheet.showTab('data');
      
      // deferred to be able to select the table
      setTimeout(function () {
        if ((doc = node.ownerDocument) && (win = doc.defaultView) && 
            win.getSelection && doc.createRange && 
            (selection = window.getSelection()) && 
            selection.removeAllRanges) {
            range = doc.createRange();
            range.selectNode(node);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        else if (document.body && document.body.createTextRange && 
                (range = document.body.createTextRange())) {
            range.moveToElementText(node);
            range.select();
        }
      }, 0);
      return true;
    }
    else return false;
  },
  /**
   * Converts the data into CSV in order to download a file
   */
  downloadCSV: function(){
    var csv = '',
        series = this.series,
        options = this.options,
        dg = this.spreadsheet.loadDataGrid(),
        separator = encodeURIComponent(options.spreadsheet.csvFileSeparator);
    
    if (options.spreadsheet.decimalSeparator === options.spreadsheet.csvFileSeparator) {
      throw "The decimal separator is the same as the column separator ("+options.spreadsheet.decimalSeparator+")";
    }
    
    // The first row
    _.each(series, function(serie, i){
      csv += separator+'"'+(serie.label || String.fromCharCode(65+i)).replace(/\"/g, '\\"')+'"';
    });

    csv += "%0D%0A"; // \r\n
    
    // For each row
    csv += _.reduce(dg, function(memo, row){
      var rowLabel = getRowLabel.call(this, row[0]) || '';
      rowLabel = '"'+(rowLabel+'').replace(/\"/g, '\\"')+'"';
      var numbers = row.slice(1).join(separator);
      if (options.spreadsheet.decimalSeparator !== '.') {
        numbers = numbers.replace(/\./g, options.spreadsheet.decimalSeparator);
      }
      return memo + rowLabel+separator+numbers+"%0D%0A"; // \t and \r\n
    }, '', this);

    if (Flotr.isIE && Flotr.isIE < 9) {
      csv = csv.replace(new RegExp(separator, 'g'), decodeURIComponent(separator)).replace(/%0A/g, '\n').replace(/%0D/g, '\r');
      window.open().document.write(csv);
    }
    else window.open('data:text/csv,'+csv);
  }
});
})();

(function () {

var D = Flotr.DOM;

Flotr.addPlugin('titles', {
  callbacks: {
    'flotr:afterdraw': function() {
      this.titles.drawTitles();
    }
  },
  /**
   * Draws the title and the subtitle
   */
  drawTitles : function () {
    var html,
        options = this.options,
        margin = options.grid.labelMargin,
        ctx = this.ctx,
        a = this.axes;
    
    if (!options.HtmlText && this.textEnabled) {
      var style = {
        size: options.fontSize,
        color: options.grid.color,
        textAlign: 'center'
      };
      
      // Add subtitle
      if (options.subtitle){
        Flotr.drawText(
          ctx, options.subtitle,
          this.plotOffset.left + this.plotWidth/2, 
          this.titleHeight + this.subtitleHeight - 2,
          style
        );
      }
      
      style.weight = 1.5;
      style.size *= 1.5;
      
      // Add title
      if (options.title){
        Flotr.drawText(
          ctx, options.title,
          this.plotOffset.left + this.plotWidth/2, 
          this.titleHeight - 2,
          style
        );
      }
      
      style.weight = 1.8;
      style.size *= 0.8;
      
      // Add x axis title
      if (a.x.options.title && a.x.used){
        style.textAlign = a.x.options.titleAlign || 'center';
        style.textBaseline = 'top';
        style.angle = Flotr.toRad(a.x.options.titleAngle);
        style = Flotr.getBestTextAlign(style.angle, style);
        Flotr.drawText(
          ctx, a.x.options.title,
          this.plotOffset.left + this.plotWidth/2, 
          this.plotOffset.top + a.x.maxLabel.height + this.plotHeight + 2 * margin,
          style
        );
      }
      
      // Add x2 axis title
      if (a.x2.options.title && a.x2.used){
        style.textAlign = a.x2.options.titleAlign || 'center';
        style.textBaseline = 'bottom';
        style.angle = Flotr.toRad(a.x2.options.titleAngle);
        style = Flotr.getBestTextAlign(style.angle, style);
        Flotr.drawText(
          ctx, a.x2.options.title,
          this.plotOffset.left + this.plotWidth/2, 
          this.plotOffset.top - a.x2.maxLabel.height - 2 * margin,
          style
        );
      }
      
      // Add y axis title
      if (a.y.options.title && a.y.used){
        style.textAlign = a.y.options.titleAlign || 'right';
        style.textBaseline = 'middle';
        style.angle = Flotr.toRad(a.y.options.titleAngle);
        style = Flotr.getBestTextAlign(style.angle, style);
        Flotr.drawText(
          ctx, a.y.options.title,
          this.plotOffset.left - a.y.maxLabel.width - 2 * margin, 
          this.plotOffset.top + this.plotHeight / 2,
          style
        );
      }
      
      // Add y2 axis title
      if (a.y2.options.title && a.y2.used){
        style.textAlign = a.y2.options.titleAlign || 'left';
        style.textBaseline = 'middle';
        style.angle = Flotr.toRad(a.y2.options.titleAngle);
        style = Flotr.getBestTextAlign(style.angle, style);
        Flotr.drawText(
          ctx, a.y2.options.title,
          this.plotOffset.left + this.plotWidth + a.y2.maxLabel.width + 2 * margin, 
          this.plotOffset.top + this.plotHeight / 2,
          style
        );
      }
    } 
    else {
      html = [];
      
      // Add title
      if (options.title)
        html.push(
          '<div style="position:absolute;top:0;left:', 
          this.plotOffset.left, 'px;font-size:1em;font-weight:bold;text-align:center;width:',
          this.plotWidth,'px;" class="flotr-title">', options.title, '</div>'
        );
      
      // Add subtitle
      if (options.subtitle)
        html.push(
          '<div style="position:absolute;top:', this.titleHeight, 'px;left:', 
          this.plotOffset.left, 'px;font-size:smaller;text-align:center;width:',
          this.plotWidth, 'px;" class="flotr-subtitle">', options.subtitle, '</div>'
        );

      html.push('</div>');
      
      html.push('<div class="flotr-axis-title" style="font-weight:bold;">');
      
      // Add x axis title
      if (a.x.options.title && a.x.used)
        html.push(
          '<div style="position:absolute;top:', 
          (this.plotOffset.top + this.plotHeight + options.grid.labelMargin + a.x.titleSize.height), 
          'px;left:', this.plotOffset.left, 'px;width:', this.plotWidth, 
          'px;text-align:', a.x.options.titleAlign, ';" class="flotr-axis-title flotr-axis-title-x1">', a.x.options.title, '</div>'
        );
      
      // Add x2 axis title
      if (a.x2.options.title && a.x2.used)
        html.push(
          '<div style="position:absolute;top:0;left:', this.plotOffset.left, 'px;width:', 
          this.plotWidth, 'px;text-align:', a.x2.options.titleAlign, ';" class="flotr-axis-title flotr-axis-title-x2">', a.x2.options.title, '</div>'
        );
      
      // Add y axis title
      if (a.y.options.title && a.y.used)
        html.push(
          '<div style="position:absolute;top:', 
          (this.plotOffset.top + this.plotHeight/2 - a.y.titleSize.height/2), 
          'px;left:0;text-align:', a.y.options.titleAlign, ';" class="flotr-axis-title flotr-axis-title-y1">', a.y.options.title, '</div>'
        );
      
      // Add y2 axis title
      if (a.y2.options.title && a.y2.used)
        html.push(
          '<div style="position:absolute;top:', 
          (this.plotOffset.top + this.plotHeight/2 - a.y.titleSize.height/2), 
          'px;right:0;text-align:', a.y2.options.titleAlign, ';" class="flotr-axis-title flotr-axis-title-y2">', a.y2.options.title, '</div>'
        );
      
      html = html.join('');

      var div = D.create('div');
      D.setStyles({
        color: options.grid.color 
      });
      div.className = 'flotr-titles';
      D.insert(this.el, div);
      D.insert(div, html);
    }
  }
});
})();

(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter,
  _ = Flotr._,
  x0, y0;

Flotr.addPlugin('datacursor', {
  options: {
  },
  callbacks: {
    'flotr:mousedown':function(e, pos){
      x0 = pos.absX;
      y0 = pos.absY;
    },
    
    'flotr:mousemove':function(e, pos){
      var
      oe = e.originalEvent || e,
      x1 = pos.absX,
      y1 = pos.absY,
      rotate = this.options.rotate,
      dx = Math.round((rotate ? (y1 - y0) : (x1 - x0))/this.axes.x.scale * 1.5),
      adx = Math.abs(dx);
      
      if(oe.type != "mousedown" && oe.type != "touchmove") return;

      if(adx >= 1 && this.datacross.state !== 'datacross'){
        x0 = x1;
        y0 = y1;
        E.fire(this.el, "flotr:datacursor", [-dx, this]);
      }
    }
  }
});
})();













(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('datacross', {
  options: {
    mode: '',            // => one of null, 'x', 'y' or 'xy'
    color: '#c1c1c1',      // => datacross color
    pointColor: '#00a8f0',
    hideCursor: false,       // => hide the cursor when the datacross is shown,
    drawPoint: false
  },
  callbacks: {
    'flotr:mousedown': function(e, pos){
      var self = this;
      self.datacross.state = 'mousedown';
      self.datacross.timeout = setTimeout(function(){
        self.datacross.state = 'datacross';
        if (self.options.datacross.mode) {
          self.datacross.clearDataCross(pos);
          self.datacross.drawDataCross(pos);
        }
      }, 500);
    },
    'flotr:mouseup': function(e, pos){
      this.datacross.state = 'mouseup';
      clearTimeout(this.datacross.timeout);
    },
    'flotr:mousemove': function(e, pos){
      if(this.datacross.state === 'datacross'){
        if (this.options.datacross.mode) {
          this.datacross.clearDataCross(pos);
          this.datacross.drawDataCross(pos);
        }
      } else {
        clearTimeout(this.datacross.timeout);
        this.datacross.state = null;
      }
    }
  },

  clearDataCross: function(pos){
    var x, y,
        context = this.octx;
    if(this.datacross.prevXY){
      x = this.datacross.prevXY.x;
      y = this.datacross.prevXY.y;
      context.clearRect(x - 5, y - 5, 10, 10);
    }
  },
  
  /**   
   * Draws the selection box.
   */
  drawDataCross: function(pos) {
    var octx = this.octx,
      options = this.options.datacross,
      plotOffset = this.plotOffset,
      vh = this.datacross.getVH(),
      v = vh.v,
      h = vh.h,
      stack = this.axes.y2.options.stack,
      c = this.hit.closest(pos),
      dataIndex = c.x.dataIndex,
      xvalue = this.data[0].data[dataIndex][0],
      yvalue = this.getDataIndexValue(dataIndex),
      rotate = this.options.rotate,
      x = plotOffset.left + Math.round(rotate ? pos.relX : (this.axes.x.d2p(xvalue) -1)),
      y = plotOffset.top + Math.round(rotate ? (this.axes.x.d2p(xvalue) + plotOffset.left - plotOffset.top) : pos.relY),
      p = Math.round(this.axes.y.d2p(this.getDataIndexValue(dataIndex)));
    if (!this.options.rotate && (pos.relX < 0 || pos.relY < 0 || pos.relX > this.plotWidth || (pos.relY > this.plotHeight && !this.axes.y2.options.stack)) ||
        this.options.rotate && (pos.relY < this.plotOffset.left || x > this.canvasHeight || pos.relX < -plotOffset.left + 1 || pos.relY + plotOffset.top > this.canvasWidth)) {

      this.el.style.cursor = null;
      D.removeClass(this.el, 'flotr-datacross');
      D.hide(v);
      D.hide(h);
      E.fire(this.el, 'flotr:dataIndex', [{dataIndex: -1}, this]);
      return; 
    }
    
    if (options.hideCursor) {
      this.el.style.cursor = 'none';
      D.addClass(this.el, 'flotr-datacross');
    }
    
    if (options.mode.indexOf('v') != -1) {
      if(this.options.rotate){
        v.style.top = y + 'px';
      } else {
        v.style.left = x + 'px';
        v.style.top = this.plotOffset.top + 'px';
      }
    }
    
    if (options.mode.indexOf('h') != -1) {
      if(this.options.rotate){
        h.style.left = (this.canvasHeight - plotOffset.top - 2  - p) + "px";
      } else {
        y = p + this.plotOffset.top + 1;
        h.style.top = y + "px";
      }
    }
    
    if(options.drawPoint){
      var x1 = rotate ? y : x;
      var y1 = rotate ? p + 2 : y;

      octx.save();
      octx.strokeStyle = options.pointColor || options.color;
      octx.lineWidth = 3;
      octx.beginPath();
      octx.arc(x1, y1, 3, 0, 2 * Math.PI, false);
      octx.stroke();
      octx.closePath();
      this.datacross.prevXY = {x:x1, y:y1};
    }

    this.datacross.hideShowVH();
    E.fire(this.el, 'flotr:dataIndex', [{dataIndex: dataIndex, x:x, y:y, xvalue: xvalue, yvalue: yvalue, datum: this.data[0].data[dataIndex], data: this.data[0]}, this]);
  },

  getVH: function(){
    if(!this.datacross.vh){
      var
      v = D.create("div"),
      h = D.create("div"),
      options = this.options.datacross,
      color = options.color,
      rotate = this.options.rotate,
      stack = this.axes.y2.options.stack;
      if(rotate){
        D.setStyles(v, {
          "borderTop": "1px solid "+ color,
          "position": "absolute",
          "width": (this.canvasHeight - this.plotOffset.top - (this.axes.y2.options.stack?1:this.plotOffset.bottom))+"px",
          "height": 0,
          "top": this.plotOffset.left + "px",
          "left": (stack ? 1 : this.plotOffset.bottom) + "px"
        });

        D.setStyles(h, {
          "borderLeft": "1px solid "+ color,
          "position": "absolute",
          "height": this.plotWidth+"px",
          "width": 0,
          "left": (stack ? 1 : this.plotOffset.bottom) + "px",
          "top": this.plotOffset.left + "px"
        });
      } else {
        D.setStyles(v, {
          "borderLeft": "1px solid "+ color,
          "position": "absolute",
          "width": 0,
          "height": (this.canvasHeight - this.plotOffset.top - (stack?1:this.plotOffset.bottom))+"px"
        });

        D.setStyles(h, {
          "borderTop": "1px solid "+ color,
          "position": "absolute",
          "height": 0,
          "width": this.plotWidth+"px",
          "left": this.plotOffset.left+"px"
        });
      }
      
      D.insert(this.el, v);
      D.insert(this.el, h);
      this.datacross.vh = {v: v,h: h};
      this.datacross.hideShowVH();
    }
    return this.datacross.vh;
  },

  hideShowVH: function(){
    var
    options = this.options.datacross,
    vh = this.datacross.vh,
    v = vh.v,
    h = vh.h;
    
    (options.mode.indexOf("v") == -1) ? D.hide(v) : D.show(v);
    (options.mode.indexOf("h") == -1) ? D.hide(h) : D.show(h);
  }
  
});
})();


(function () {

var
  D = Flotr.DOM,
  E = Flotr.EventAdapter;

Flotr.addPlugin('datacrosslabel', {
  options: {
    show:false
  },
  callbacks: {
    'flotr:dataIndex': function(map){
      var options = this.options.datacrosslabel;
      if (!options.show) return;
      var el = this.datacrosslabel.labelEl();
      if(map.dataIndex === -1){
        D.hide(el);
      } else {
        el.innerHTML = map.yvalue;
        el.style.top = (map.y - this.axes.y.maxLabel.height / 2) + 'px';
        D.show(el);
      }
    }
  },

  showLabel: function(){

  },

  hideLabel: function(){

  },

  labelEl: function(){
    if(!this.datacrosslabel.el){
      var
      el = D.create('div'),
      p = this.el.getElementsByClassName('flotr-labels')[0],
      w = parseInt(p.getElementsByClassName('flotr-grid-label-y')[0].style.width),
      width = this.axes.y.maxLabel.width;
      D.addClass(el, 'flotr-grid-label');
      D.addClass(el, 'flotr-grid-lable-y');
      D.addClass(el, 'datacrosslabel');
      D.setStyles(el, {
        position: 'absolute',
        textAlign: 'right',
        width: width + 'px',
        left: (w - width)+'px',
        fontSize: 'smaller'
      });
      this.datacrosslabel.el = el;
      D.insert(this.el, el);
      D.hide(el);
    }
    return this.datacrosslabel.el;
  }
});
})();

