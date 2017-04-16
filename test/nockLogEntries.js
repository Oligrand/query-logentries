var nock = require('nock');
var qs = require('querystring');

module.exports = function(apiKey, baseUrl) {
	function baseNock() {
		return nock(baseUrl, {
			reqHeaders: {
				'x-api-key': apiKey
			}
		});
	}

	function createQueryEndpointNock(logId, expectedParams, statusCode, body) {
		return baseNock()
			.get(`/logs/${logId}?${qsStringify(expectedParams)}`)
			.reply(statusCode, body);
	}

	function createPollEndpointNock(pollId, statusCode, body) {
		return baseNock()
			.get(`/${pollId}`)
			.reply(statusCode, body);
	}

	return {
		createQueryEndpointNock,
		createPollEndpointNock
	};
};

function qsStringify(params) {
	return qs.stringify(params).replace(/\(/g, '%28').replace(/\)/g, '%29');
}
