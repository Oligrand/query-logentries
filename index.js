var rrs = require('request-retry-stream');
var from2 = require('from2');
var pump = require('pump');
var through2 = require('through2');

module.exports = function (apiKey, queryUrl) {
	if(!apiKey) { throw new Error('"apiKey" must be defined'); }

	var defaultRequestOpts = {
		headers: { 'x-api-key': apiKey },
		json: true
	};
	queryUrl = queryUrl || 'https://rest.logentries.com/query/logs';

	return function(opts, callback) {
		if(!opts.logId) { throw new Error('"logId" must be defined'); }
		if(!opts.from) { throw new Error('"from" must be defined'); }

		var to = opts.to || Date.now();
		var query = opts.query || 'where()';
		var perPage = opts.perPage || 50;
		defaultRequestOpts.timeout = opts.timeout || 30000;
		var pollInterval = opts.pollInterval || 3000;

		var currentBatch = [];
		var nextPageUrl = `${queryUrl}/${opts.logId}`;
		var requestOpts = Object.assign({}, defaultRequestOpts, {
			qs: {
				query,
				from: new Date(opts.from).getTime(),
				to: new Date(to).getTime(),
				per_page: perPage
			}
		});
		var stream = from2.obj(function (size, next) {
			if (currentBatch.length > 0) {
				return next(null, currentBatch.shift());
			}
			if (nextPageUrl) {
				requestOpts.url = nextPageUrl;
				return requestQuery(requestOpts, function (err, newBatch, pageUrl) {
					if (err) {
						return next(err);
					}
					if (newBatch.length < 1) {
						return next(null, null);
					}
					currentBatch = newBatch;
					nextPageUrl = pageUrl;
					delete requestOpts.qs; //remove query as it is not needed in case of paging
					next(null, currentBatch.shift());
				});
			}
			next(null, null);
		});

		if (!callback) {
			return stream;
		}

		var result = [];
		var concatStream = through2.obj(function (message, enc, cb) {
			result.push(message);
			cb();
		});
		pump(stream, concatStream, function (err) {
			if (err) {
				return callback(err);
			}
			callback(null, result);
		});

		function requestQuery(reqOpts, cb) {
			rrs.get(reqOpts, function (err, res, body) {
				if (err) {
					return cb(err);
				}
				if (res.statusCode === 202 && hasLink(body)) {
					return waitForResult(body.links[0].href);
				}
				cb(new Error('did not receive poll endpoint from logEntries'));
			});

			function waitForResult(pollUrl) {
				var pollOpts = Object.assign({}, defaultRequestOpts, {
					url: pollUrl
				});
				poll();

				function poll() {
					rrs.get(pollOpts, function (err, res, pollBody) {
						if (err) {
							return cb(err);
						}
						if (pollBody.progress !== undefined && pollBody.progress < 100) {
							return setTimeout(poll, pollInterval);
						}
						if (res.statusCode === 200 && hasLink(pollBody) && pollBody.links[0].rel === 'Next') {
							return extractMessages(pollBody, opts, function (err, messages) {
								if (err) {
									return cb(err);
								}
								cb(null, messages, pollBody.links[0].href);
							});
						}

						extractMessages(pollBody, opts, cb);
					});
				}
			}
		}
	};
};

function hasLink(body) {
	return Array.isArray(body.links) && body.links[0];
}

function extractMessages(body, opts, cb) {
	if (!body.events) {
		return cb(null, []);
	}

	try {
		var messages = body.events.map(function (event) {
			if (!event.message) {
				return null;
			}
			try {
				return JSON.parse(event.message);
			} catch (e) {
				if (opts.ignoreInvalidJson) {
					return null;
				}
				if (typeof opts.onInvalidJson === 'function') {
					return opts.onInvalidJson(event.message);
				}
				throw e;
			}
		}).filter(Boolean);

		return cb(null, messages);
	} catch (e) {
		return cb(e);
	}
}
