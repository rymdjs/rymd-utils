(function(root) {

  // Array#slice shortcut
  var slice = Array.prototype.slice;

  var Q = require("q"),
      URL = this.URL || this.webkitURL;

  // Private

  /**
  *  Generate pseudo-random string
  */
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }

  function triggerEvents(events, args) {
    events.forEach(function(evt) {
      try {
        var result = evt.callback.apply(evt.ctx, args);
        if(result && typeof result.catch === 'function') {
          result.catch(function(error) {
            evt.ctx.trigger(evt.name+'Error', error);
          });
        }
      } catch(error) {
        evt.ctx.trigger(evt.name+'Error', error);
      }
    });
  }

  // Public

  var Utils = {

    // Part of Event system derives from Backbone.js (http://backbonejs.org/)
    Events: {

      on: function(name, callback, context) {
        this._events || (this._events = {});
        var events = this._events[name] || (this._events[name] = []);
        events.push({name: name, callback: callback, context: context, ctx: context || this});
        return this;
      },

      trigger: function(name, data) {
        if (!this._events)
          return this;

        var args = slice.call(arguments, 1);

        var events = this._events[name],
            allEvents = this._events.all;

        if (events)
          triggerEvents(events, args);
        if (allEvents)
          triggerEvents(allEvents, arguments);

        return this;
      },

      bubble: function(event, context, callback) {
        context.on(event, function() {
          var args = slice.call(arguments);
          args.unshift(event);

          if(callback)
            args.push(callback.call(this));

          args.push(context);

          this.trigger.apply(this, args);

        }, this);
        context.on(event+'Error', function(error) {
          this.trigger(event+'Error', error);
        }.bind(this));

        return this;
      }
    },

    xhr: function(url, options) {
      var xhr = new XMLHttpRequest(),
          defer = Q.defer(),

        defaults = {
          type: 'GET',
          responseType: 'application/json'
        };

      options = Utils.extend(defaults, options);

      xhr.responseType = options.responseType;

      xhr.onreadystatechange = function(evt) {
        if(evt.target.readyState === 4) {
          var status = evt.target.status;

          if(status === 200) {
            var result = (options.responseType === "application/json")
              ? JSON.parse(xhr.response) : xhr.response;
            defer.resolve(result);
          }
          else if(status === 404 || status === 500) {
            defer.reject(evt.target);
          }
        }
      }
      xhr.ontimeout = xhr.onerror = function(evt) {
        defer.reject(evt.target);
      }

      xhr.open(options.type, url, true);
      xhr.send();

      return defer.promise;
    },

    /**
     * General object extend method.
     *
     * @param  {Object} obj The object to extend
     * @return {Object...}  Objects with extending properties
     */
    extend: function(obj) {
      slice.call(arguments, 1).forEach(function(source) {
        if (source) {
          for (var prop in source) {
            obj[prop] = source[prop];
          }
          fr.readAsArrayBuffer(blob);
          return defer.promise;
        },
        arraybufferToString: function (buf) { // very instable
          return String.fromCharCode.apply(null, new Uint16Array(buf));
        },

        base64ToUint8Array: function (s) {
          s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
          return new Uint8Array(Array.prototype.map.call(atob(s), function (c) { return c.charCodeAt(0) }));
        },

        uint8ArrayTobase64: function (a) {
      	return btoa(String.fromCharCode.apply(0, a));
    		},
		/**
		*  Convert an `ArrayBuffer` to a `Blob`.
		*
		*	@returns `Blob` with its `type` set if present, otherwise `undefined`
		*/
		arrayBufferToBlob: function(buffer, type) {
			var uInt8Array = new Uint8Array(buffer);
			return new Blob([uInt8Array], type ? {type: type} : {});
		},

		/**
		*  Create an `ObjectURL` for a `Blob` or an `ArrayBuffer`.
		*
		*	@returns `String`
		*/
		toObjectURL: function(data, type) {
			if(data instanceof Blob) {
				return URL.createObjectURL(data);
			}
			else if(data instanceof ArrayBuffer) {
				return URL.createObjectURL( this.arrayBufferToBlob(data, type) );
			}

			return URL.createObjectURL(new Blob([data], {type: type || {} }));
		},

		/**
		*  Create a `Blob` from a data URL.
		*
		*	@returns `Blob`
		*/
		dataURLToBlob: function(dataURL) {
			var BASE64_MARKER = ';base64,',
					parts = [],
					raw,
					contentType;

			if (dataURL.indexOf(BASE64_MARKER) === -1) {
					parts = dataURL.split(',');
					contentType = parts[0].split(':')[1];
					raw = parts[1];

				return new Blob([raw], {type: contentType});
			}

			parts = dataURL.split(BASE64_MARKER);
			contentType = parts[0].split(':')[1];
			raw = window.atob(parts[1]);

			var rawLength = raw.length,
					uInt8Array = new Uint8Array(rawLength);

			for (var i = 0; i < rawLength; ++i) {
				uInt8Array[i] = raw.charCodeAt(i);
			}

			return new Blob([uInt8Array], {type: contentType});
		},

		/**
		*  Create a JSON object from a `Blob` with the following properties:
		*
		*	{
		*		data: `ArrayBuffer`,
		*		type: `Blob.type`,
		*		name: `Blob.name`,
		*		date: `Blob.lastModifiedDate || new Date()`,
		*	}
		*
		*	@returns `Object`
		*/
		blobToJSON: function(blob) {
			return this.blobToArrayBuffer(blob).then(function(buffer) {
				return Q.fcall(function() {
					var date = (blob.lastModifiedDate) ? blob.lastModifiedDate : new Date();
					return {
						data: buffer,
						type: blob.type,
						name: blob.name || "",
						date: date.toJSON()
					};
				});
			});
		}
	};

	module.exports = root.RymdUtils = Utils;
})(window);
