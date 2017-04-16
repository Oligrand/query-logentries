var queryLogentriesFactory = require('../index.js');
var nockLogEntriesFactory = require('./nockLogEntries');

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

describe('when using callback', () => {
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
			expect(queryResult).to.eql([
				{p1: 'A1', p2: 12},
				{p1: 'A2', p2: 22}
			]);
		});
	});

	describe('when result is returned after second poll', () => {
		var queryEndpointNock, poll1EndpointNock, poll2EndpointNock, queryResult;

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
			poll1EndpointNock = nockLogEntries.createPollEndpointNock(pollId, 200, {
				progress: 99
			});
			var realResult = {
				progress: 100,
				events: [
					{ message: '{"p1": "A1", "p2": 12}' },
					{ message: '{"p1": "A2", "p2": 22}' }
				]
			};
			poll2EndpointNock = nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
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

		it('should call poll 1 endpoint', () => {
			expect(poll1EndpointNock.isDone(), poll1EndpointNock.pendingMocks()).to.be.ok;
		});

		it('should call poll 2 endpoint', () => {
			expect(poll2EndpointNock.isDone(), poll2EndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return the expected result', () => {
			expect(queryResult).to.eql([
				{p1: 'A1', p2: 12},
				{p1: 'A2', p2: 22}
			]);
		});
	});

	describe('when result is paged', () => {
		var queryEndpointNock, pollPage1EndpointNock, queryPage2EndpointNock,
			pollPage2EndpointNock, queryResult;

		before(() => {
			var expectedParams = {
				query: 'where(method=GET)',
				from: new Date(baseOpts.from).getTime(),
				to: new Date(baseOpts.to).getTime(),
				per_page: baseOpts.perPage
			};
			var pollId1 = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
			var queryStatus = {
				links: [{
					rel: 'self',
					href: `https://rest.logentries.com/query/${pollId1}`
				}]
			};
			queryEndpointNock = nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);

			var page1 = {
				progress: 100,
				events: [
					{ message: '{"p1": "A1", "p2": 12}' },
					{ message: '{"p1": "A2", "p2": 22}' }
				],
				links: [{
					rel: 'Next',
					href: `https://rest.logentries.com/query/logs/${logId}?sequence_number=1`
				}]
			};
			pollPage1EndpointNock = nockLogEntries.createPollEndpointNock(pollId1, 200, page1);

			var pollId2 = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
			var queryPage2Status = {
				links: [{
					rel: 'self',
					href: `https://rest.logentries.com/query/${pollId2}`
				}]
			};
			var expectedParams2 = { sequence_number: 1 };
			queryPage2EndpointNock = nockLogEntries.createQueryEndpointNock(logId, expectedParams2, 202, queryPage2Status);

			var page2 = {
				progress: 100,
				events: [
					{ message: '{"p1": "A3", "p2": 32}' }
				]
			};
			pollPage2EndpointNock = nockLogEntries.createPollEndpointNock(pollId2, 200, page2);
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

		it('should call poll endpoint for the first page', () => {
			expect(pollPage1EndpointNock.isDone(), pollPage1EndpointNock.pendingMocks()).to.be.ok;
		});

		it('should call query endpoint for the second page', () => {
			expect(queryPage2EndpointNock.isDone(), queryPage2EndpointNock.pendingMocks()).to.be.ok;
		});

		it('should call poll endpoint for the second page', () => {
			expect(pollPage2EndpointNock.isDone(), pollPage2EndpointNock.pendingMocks()).to.be.ok;
		});

		it('should return the expected result', () => {
			expect(queryResult).to.eql([
				{p1: 'A1', p2: 12},
				{p1: 'A2', p2: 22},
				{p1: 'A3', p2: 32}
			]);
		});
	});

});
