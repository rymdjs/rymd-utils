chai.should()

var Utils = window.RymdUtils

var URL_REGEX = /^blob.+\/[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}/,
		GUID_REGEX = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/

// Helpers

function getLocalFile(filename) {
	var xhr = new XMLHttpRequest(),
		defer = Q.defer()

	xhr.responseType = 'blob'

	xhr.onreadystatechange = function(evt) {
		if(evt.target.readyState === 4 && evt.target.status === 200) {
			defer.resolve(xhr.response)
		}
	}
	xhr.ontimeout = xhr.onerror = function(evt) {
		defer.reject(evt)
	}

	xhr.open("GET", "/test/"+filename, true)
	xhr.send()

	return defer.promise
}

describe("Utils", function() {

	describe("Events", function() {
		it("should listen to an event", function(done) {
			var obj = Utils.extend({}, Utils.Events)

			obj.on("event", function() {
				done()
			})

			obj.trigger("event")
		})

		it("should listen to an event with data", function(done) {
			var obj = Utils.extend({}, Utils.Events)

			obj.on("event", function(data) {
				data.should.equal("Test")
				done()
			})

			obj.trigger("event", "Test")
		})

		it("should listen to an events with several handlers", function(done) {
			var obj = Utils.extend({}, Utils.Events),
					obj2 = Utils.extend({}, Utils.Events)
					counter = 0

			obj.on("event", function(data) {
				data.should.equal("Test")
				counter += 1
				if(counter === 2) done()
			})

			obj2.on("event", function(data) {
				data.should.equal("Test")
				counter += 1
				if(counter === 2) done()
			})

			obj.trigger("event", "Test")
		})
	})

	describe("xhr", function() {

		it("should be able to fetch a file from disk", function() {
			var promise = Utils.xhr("/test/test-image.jpg", {
				responseType: "blob"
			})

			return promise.then(function(response) {
				(response instanceof Blob).should.be.true
				response.type.should.equal("image/jpeg")
			})
		})

	})

	describe("toObjectURL", function() {
		it("should convert a Blob to an ObjectURL", function() {
			var data = new Blob(["Test"]),
					url = Utils.toObjectURL(data)

			url.should.not.be.empty
			url.should.be.a("String")
			url.should.match(URL_REGEX)
		})

		it("should convert arbitrary data to an ObjectURL", function() {
			var data = "Test",
					url = Utils.toObjectURL(data)

			url.should.not.be.empty
			url.should.be.a("String")
			url.should.match(URL_REGEX)
		})

		it("should convert an ArrayBuffer to an ObjectURL", function() {
			// First create a buffer from existing util function
			return Utils.blobToArrayBuffer(new Blob(["Test"]))
				.then(Utils.toObjectURL.bind(Utils))
				.then(function(url) {
					url.should.not.be.empty
					url.should.be.a("String")
					url.should.match(URL_REGEX)
			})
		})
	})

	describe("toPromise", function() {

		var MockConnection = {
			onsuccess: function(evt) {},
			onerror: function(evt) {}
		};

		it("should throw an error if the object don't have onsuccess or onerror handlers", function() {
			var mock = {}
			return (function(){ return Utils.toPromise(mock) }).should.throw(Error)
		})

		it("should create a promise and fulfill a connection with an onsuccess handler", function() {
			var mock = MockConnection,
					promise = Utils.toPromise(mock)

			mock.onsuccess({target: {result: "test"}})

			return promise.should.be.fulfilled
		})

		it("should create a promise and reject a connection with an onerror handler", function() {
			var mock = MockConnection,
					promise = Utils.toPromise(mock)

			mock.onerror({target: {error: new Error()}})

			return promise.should.be.rejectedWith(Error)
		})

		it("should call a custom success handler if passed", function(done) {
			var mock = MockConnection,
					promise = Utils.toPromise(mock, {
						success: function(evt, defer) {
							evt.should.equal("Test")
							defer.should.exist
							done()
						}
					})

			mock.onsuccess("Test")
		})

	})

	describe("blobToArrayBuffer", function() {
		it("should convert a Blob to an ArrayBuffer", function(){
			var blob = new Blob(["Test"])
			return Utils.blobToArrayBuffer(blob).then(function(buffer) {
				(buffer instanceof ArrayBuffer).should.be.true
				buffer.byteLength.should.equal(4)
			})
		})
	})

	describe("arrayBufferToBlob", function() {
		it("should convert an ArrayBuffer to Blob", function() {
			var blob = new Blob(["Test"])
			return Utils.blobToArrayBuffer(blob).then(function(buffer) {
				var blob2 = Utils.arrayBufferToBlob(buffer)
				blob2.size.should.equal(blob.size)
			})
		})
	})

	describe("arrayBufferToBinaryString", function() {
		it("should convert an ArrayBuffer to a binary String", function() {
			var blob = new Blob(["Test"])
			return Utils.blobToArrayBuffer(blob)
				.then(Utils.arrayBufferToBinaryString)
				.should.eventually.equal("Test")
		})
	})

	describe("blobToJSON", function() {
		it("should return a JSON representation of a given Blob", function() {
			var blob = new Blob(["Test"])

			return Utils.blobToJSON(blob).then(function(json) {
				json.should.be.an("Object");
				(json.data instanceof ArrayBuffer).should.be.true
			})
		})

		it("should return a type key for a given Blob", function() {
			var blob = new Blob(["Test"], { type: "text/plain" })

			return Utils.blobToJSON(blob).then(function(json) {
				json.type.should.equal('text/plain')
			})
		})

		it("should return a type key for a given File", function() {
			return getLocalFile("test-image.jpg")
				.then(Utils.blobToJSON.bind(Utils))
				.then(function(json) {
					json.type.should.equal("image/jpeg")
				})
		})

		it("should return a name key for a given Blob", function() {
			var blob = new Blob(["Test"], { type: "text/plain" })

			return Utils.blobToJSON(blob).then(function(json) {
				json.name.should.equal('')
			})
		})

		it("should return a date key for a given Blob", function() {
			return getLocalFile("test-image.jpg")
				.then(Utils.blobToJSON.bind(Utils))
				.then(function(json) {
					json.date.should.not.be.undefined
					var parsedDate = new Date(json.date)
					parsedDate.toString().should.not.equal("Invalid Date")
				})
		})
	})


	describe("guid", function() {
		var guid

		beforeEach(function() {
			guid = Utils.guid()
		})

		it("should generate a GUID", function() {
			guid.should.exist
			guid.should.be.a("String")
		})

		it("should be on the form XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX", function() {
			guid.should.match(GUID_REGEX)
		})

		it("should be pseudo-unique", function() {
			var guid2 = Utils.guid()

			guid.should.not.equal(guid2)
		})
	})

	describe("extend", function() {
		it("should extend a given object", function() {
			var obj = {test: "Test", name: "Johan"}
			var extended = Utils.extend(obj, {test: "Test", name: "John"}, {foo: "bar"})

			extended.test.should.equal("Test")
			extended.name.should.equal("John")
			extended.foo.should.equal("bar")
		})
	})
})
