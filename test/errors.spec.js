var queryLogentriesFactory = require('../index.js');
var nockLogEntriesFactory = require('./nockLogEntries');

var apiKey = '6971aef7-998f-4cb2-9613-ddb42b9697b8';
var logId = '0b6f9b87-f2c8-4f6e-bbb3-c0860f7c280a';

var baseOpts = {
	logId,
	from: '2017-01-01T00:00:00.000',
	to: '2017-01-02T23:59:59.999',
	leqlQuery: 'where(method=GET)',
	perPage: 2,
	timeout: 3000,
	pollInterval: 500
};

describe('handling of error and edge cases', () => {
	var queryLogentries = queryLogentriesFactory(apiKey);
	var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');

	describe('when query request returns error', () => {
		var queryEndpointNock, error;

		before(() => {
			var expectedParams = {
				query: 'where(method=GET)',
				from: new Date(baseOpts.from).getTime(),
				to: new Date(baseOpts.to).getTime(),
				per_page: baseOpts.perPage
			};
			queryEndpointNock = nockLogEntries.createQueryEndpointNock(logId, expectedParams, 400, {});
		});

		before(done => {
			queryLogentries(baseOpts, err => {
				error = err;
				done();
			});
		});

		it('should call query endpoint', () => {
			expect(queryEndpointNock.isDone(), queryEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return an error', () => {
			expect(error.message).to.eql('Error in request statusCode: 400');
		});
	});

	describe('when query request does not return poll endpoint', () => {
		var queryEndpointNock, error;

		before(() => {
			var expectedParams = {
				query: 'where(method=GET)',
				from: new Date(baseOpts.from).getTime(),
				to: new Date(baseOpts.to).getTime(),
				per_page: baseOpts.perPage
			};
			queryEndpointNock = nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, {});
		});

		before(done => {
			queryLogentries(baseOpts, err => {
				error = err;
				done();
			});
		});

		it('should call query endpoint', () => {
			expect(queryEndpointNock.isDone(), queryEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return an error', () => {
			expect(error.message).to.eql('did not receive poll endpoint from logEntries');
		});
	});

	describe('when poll request returns error', () => {
		var queryEndpointNock, pollEndpointNock, error;

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
			pollEndpointNock = nockLogEntries.createPollEndpointNock(pollId, 400, {});
		});

		before(done => {
			queryLogentries(baseOpts, err => {
				error = err;
				done();
			});
		});

		it('should call query endpoint', () => {
			expect(queryEndpointNock.isDone(), queryEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should call poll endpoint', () => {
			expect(pollEndpointNock.isDone(), pollEndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return an error', () => {
			expect(error.message).to.eql('Error in request statusCode: 400');
		});
	});

	describe('when result contains no "events" property', () => {
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
				progress: 100
			};
			pollEndpointNock = nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
		});

		before(done => {
			queryLogentries(baseOpts, (err, result) => {
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
			expect(queryResult).to.eql([]);
		});
	});

	describe('when an event contains no "message" property', () => {
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
					{ }
				]
			};
			pollEndpointNock = nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
		});

		before(done => {
			queryLogentries(baseOpts, (err, result) => {
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

		it('should return only the events with a "message" property', () => {
			expect(queryResult).to.eql([
				{p1: 'A1', p2: 12}
			]);
		});
	});

});
