var rrs = require('request-retry-stream');
var from2 = require('from2');
var pump = require('pump');
var concatStream = require('concat-stream');

module.exports = function (apiKey, queryUrl) {
	var defaultRequestOpts = {
		headers: { 'x-api-key': apiKey },
		json: true
	};
	queryUrl = queryUrl || 'https://rest.logentries.com/query/logs';

	return function(opts, callback) {
		if(!opts.logId) { throw new Error('logId must be defined'); }
		if(!opts.from) { throw new Error('from must be defined'); }

		var leqlQuery = opts.leqlQuery || 'where()';
		var perPage = opts.perPage || 50;
		defaultRequestOpts.timeout = opts.timeout || 30000;
		var pollInterval = opts.pollInterval || 5000;

		var currentBatch = [];
		var nextPageUrl = `${queryUrl}/${opts.logId}`;
		var requestOpts = Object.assign({}, defaultRequestOpts, {
			qs: {
				query: leqlQuery,
				from: new Date(opts.from).getTime(),
				to: new Date(opts.to).getTime(),
				per_page: perPage
			}
		});
		var stream = from2.obj(function (size, next) {
			if (currentBatch.length > 0) {
				return next(null, currentBatch.shift());
			}
			if (nextPageUrl) {
				requestOpts.url = nextPageUrl;
				return requestQuery(requestOpts, (err, newBatch, pageUrl) => {
					if (err) {
						return next(err);
					}
					currentBatch = newBatch;
					nextPageUrl = pageUrl;
					next(null, currentBatch.shift());
				});
			}
			next(null, null);
		});

		if (!callback) {
			return stream;
		}

		function returnResult(result) { return callback(null, result); }
		pump(stream, concatStream(returnResult), err => {
			if (err) {
				return callback(err);
			}
		});

		function requestQuery(reqOpts, cb) {
			rrs.get(reqOpts, function(err, res, body) {
				if (err) {
					return cb(err);
				}
				if (res.statusCode === 202 && hasLink(body)) {
					return waitForResult(body.links[0].href);
				}
				cb(null, extractMessages(body));
			});

			function waitForResult(pollUrl) {
				var pollOpts = Object.assign({}, defaultRequestOpts, {
					url: pollUrl
				});
				poll();

				function poll() {
					rrs.get(pollOpts, function(err, res, body) {
						if (err) {
							return cb(err);
						}
						if (body.progress !== undefined && body.progress < 100) {
							return setTimeout(poll, pollInterval);
						}
						if (res.statusCode === 200 && hasLink(body) && body.links[0].rel === 'Next') {
							return cb(null, extractMessages(body), body.links[0].href);
						}
						cb(null, extractMessages(body));
					});
				}
			}
		}
	};
};

function hasLink(body) {
	return Array.isArray(body.links) && body.links[0];
}

function extractMessages(body) {
	if (!body.events) {
		return [];
	}
	return body.events.map(function(event) {
		return JSON.parse(event.message);
	});
}
