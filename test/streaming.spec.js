var queryLogentriesFactory = require('../index.js');
var nockLogEntriesFactory = require('./nockLogEntries');
var pump = require('pump');
var through2 = require('through2');

var apiKey = '6971aef7-998f-4cb2-9613-ddb42b9697b8';
var logId = '0b6f9b87-f2c8-4f6e-bbb3-c0860f7c280a';

var baseOpts = {
	logId,
	from: '2017-01-01T00:00:00.000',
	to: '2017-01-02T23:59:59.999',
	query: 'where(method=GET)',
	perPage: 2,
	timeout: 3000,
	pollInterval: 500
};

describe('when using streaming', () => {
	var queryLogentries = queryLogentriesFactory(apiKey);
	var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');

	describe('when result is returned after first poll', () => {
		var queryEndpointNock, pollEndpointNock, queryResult;

		before(() => {
			var expectedParams = {
				query: 'where(method=GET)',
				from: new Date(baseOpts.from).getTime(),
				to: new Date(baseOpts.to).getTime(),
				per_page: baseOpts.perPage
			};
			var pollId = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
			var queryStatus = {
				links: [{
					rel: 'self',
					href: `https://rest.logentries.com/query/${pollId}`
				}]
			};
			queryEndpointNock = nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);
			var realResult = {
				progress: 100,
				events: [
					{ message: '{"p1": "A1", "p2": 12}' },
					{ message: '{"p1": "A2", "p2": 22}' }
				]
			};
			pollEndpointNock = nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
		});

		before(done => {
			var logEntriesStream = queryLogentries(baseOpts);

			var result = [];
			var concatStream = through2.obj(function(message, enc, cb) {
				result.push(message);
				cb();
			});
			pump(logEntriesStream, concatStream, err => {
				queryResult = result;
				done(err);
			});
		});

		it('should call query endpoint', () => {
			expect(queryEndpointNock.isDone(), queryEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should call poll endpoint', () => {
			expect(pollEndpointNock.isDone(), pollEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return the expected result', () => {
			expect(queryResult).to.eql([
				{p1: 'A1', p2: 12},
				{p1: 'A2', p2: 22}
			]);
		});
	});

});
