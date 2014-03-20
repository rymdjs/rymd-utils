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
			evt.callback.apply(evt.ctx, args);
		});
	}

	// Public

	var Utils = {

		Events: {

			on: function(name, callback, context) {
				this._events || (this._events = {});
      	var events = this._events[name] || (this._events[name] = []);
      	events.push({callback: callback, context: context, ctx: context || this});
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

					this.trigger.apply(this, args);

				}, this);

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
				if(evt.target.readyState === 4 && evt.target.status === 200) {
					var result = (options.responseType === "application/json")
						? JSON.parse(xhr.response) : xhr.response;
					defer.resolve(result);
				}
			}
			xhr.ontimeout = xhr.onerror = function(evt) {
				defer.reject(evt);
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
				}
			});

			return obj;
		},

		/**
		 * Generate a pseudo-random GUID.
		 *
		 * Ex: 343165fe-25cb-bb5b-4504-76c1995f971b
		 *
		 * @return {String} A GUID
		 */
		guid: function() {
			return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
		},

		/**
		 * Takes a database connection with callbacks and returns
		 * the corresponding promise.
		 *
		 * @param  {Request} connection	The connection or request
																			(**must** have `onerror` and `onsuccess` callbacks).
		 * @param	{Object} options			An object with success and error callbacks. Takes
		 *																two parameters: evt and the deferred object
		 * @return {Promise}            The promise
		 */
		toPromise: function(connection, options) {
			var defer = Q.defer();

			if(connection.onerror === undefined || connection.onsuccess === undefined) {
				throw new Error('Object must implement onerror and onsuccess methods');
			}

			connection.onerror = function(evt) {
				if(options && options.error) {
					options.error(evt, defer);
				}
				else {
					defer.reject(evt.target.error);
				}
			}

			connection.onsuccess = function(evt) {
				if(options && options.success) {
					options.success(evt, defer);
				}
				else {
					defer.resolve(evt.target.result);
				}
			}

			return defer.promise;
		},

		/**
		*  Convert a `Blob` to an `ArrayBuffer`.
		*
		*	@returns `Promise`
		*/
		blobToArrayBuffer: function(blob) {
			// Ensure that the blob is actually a blob:
			blob = new Blob([blob], blob.type ? { type: blob.type } : {} );

			var fr = new FileReader();
			var defer = Q.defer();

			fr.onload = function(evt) {
				defer.resolve(evt.target.result);
			}
			fr.onerror = function(err) {
				defer.reject(err);
			}

			fr.readAsArrayBuffer(blob);

			return defer.promise;
		},

		/**
		*  Convert an `ArrayBuffer` to a `String`.
		*
		*	@returns `Promise`
		*/
		arrayBufferToBinaryString: function(buffer) {
			var fr = new FileReader(),
				defer = Q.defer();

			fr.onload = function(evt) {
				var result = evt.target.result;
				var containsNull = result.indexOf('\0') !== -1;

				result = containsNull ? result.slice(0, result.indexOf('\0')) : result;

				defer.resolve(result);
			}

			fr.onerror = function(err) {
				defer.reject(err);
			}

			var uInt8Array = new Uint8Array(buffer);
			fr.readAsBinaryString(new Blob([uInt8Array]));

			return defer.promise;
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
