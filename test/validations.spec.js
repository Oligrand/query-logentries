var queryLogentriesFactory = require('../index.js');
var nockLogEntriesFactory = require('./nockLogEntries');

var apiKey = '6971aef7-998f-4cb2-9613-ddb42b9697b8';
var logId = '0b6f9b87-f2c8-4f6e-bbb3-c0860f7c280a';

var baseOpts = {
	logId,
	from: '2017-01-01T00:00:00.000'
};

describe('validations and defaults', () => {
	var queryLogentries = queryLogentriesFactory(apiKey);

	describe('when apiKey is missing', () => {
		it('should throw an error', () => {
			expect(queryLogentriesFactory).to.throw(Error, '"apiKey" must be defined');
		});
	});

	describe('when logId is missing in opts', () => {
		it('should throw an error', () => {
			expect(queryLogentries.bind(null, {})).to.throw(Error, '"logId" must be defined');
		});
	});

	describe('when from is missing in opts', () => {
		it('should throw an error', () => {
			expect(queryLogentries.bind(null, { logId })).to.throw(Error, '"from" must be defined');
		});
	});

	describe('when optional properties are missing in opts', () => {
		var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');
		var queryEndpointNock, pollEndpointNock, queryResult;

		var dateNowBackup;
		var dateNowValue = new Date('2017-01-02T23:59:59.999').getTime();
		before(() => {
			dateNowBackup = Date.now;
			Date.now = () => dateNowValue;
		});
		after(() => {
			Date.now = dateNowBackup;
		});

		before(() => {
			var expectedParams = {
				query: 'where()',
				from: new Date(baseOpts.from).getTime(),
				to: dateNowValue,
				per_page: 50
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

		it('should call query endpoint with defaults set', () => {
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

	describe('when json is not valid', () => {

		describe('with default options', () => {
			var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');

			var dateNowBackup;
			var dateNowValue = new Date('2017-01-02T23:59:59.999').getTime();
			before(() => {
				dateNowBackup = Date.now;
				Date.now = () => dateNowValue;
			});
			after(() => {
				Date.now = dateNowBackup;
			});

			before(() => {
				var expectedParams = {
					query: 'where()',
					from: new Date(baseOpts.from).getTime(),
					to: dateNowValue,
					per_page: 50
				};
				var pollId = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
				var queryStatus = {
					links: [{
						rel: 'self',
						href: `https://rest.logentries.com/query/${pollId}`
					}]
				};
				nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);
				var realResult = {
					progress: 100,
					events: [
						{ message: '"p1": "A1", "p2": 12}' },
						{ message: '{"p1": "A2", "p2": 22}' }
					]
				};
				nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
			});

			it('should throw exception', (done) => {
				queryLogentries(baseOpts, (err) => {
					expect(err).to.be.an('error');
					done();
				});
			});
		});

		describe('and results are paged with default options', () => {
			var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');
			var queryError;

			before(() => {
				var expectedParams = {
					query: 'where(method=GET)',
					from: new Date(baseOpts.from).getTime(),
					to: new Date(baseOpts.to).getTime(),
					per_page: baseOpts.perPage
				};
				var pollId1 = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-2';
				var queryStatus = {
					links: [{
						rel: 'self',
						href: `https://rest.logentries.com/query/${pollId1}`
					}]
				};
				nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);

				var page1 = {
					progress: 100,
					events: [
						{ message: '"p1": "A1", "p2": 12}' },
						{ message: '{"p1": "A2", "p2": 22}' }
					],
					links: [{
						rel: 'Next',
						href: `https://rest.logentries.com/query/logs/${logId}?sequence_number=1`
					}]
				};
				nockLogEntries.createPollEndpointNock(pollId1, 200, page1);
			});

			before(done => {
				queryLogentries(baseOpts, (err) => {
					queryError = err;
					done();
				});
			});

			it('should return error', () => {
				expect(queryError).to.be.an('error');
			});
		});

		describe('with ignore option', () => {
			var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');
			var queryResult;

			var dateNowBackup;
			var dateNowValue = new Date('2017-01-02T23:59:59.999').getTime();
			before(() => {
				dateNowBackup = Date.now;
				Date.now = () => dateNowValue;
			});
			after(() => {
				Date.now = dateNowBackup;
			});

			before(() => {
				var expectedParams = {
					query: 'where()',
					from: new Date(baseOpts.from).getTime(),
					to: dateNowValue,
					per_page: 50
				};
				var pollId = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
				var queryStatus = {
					links: [{
						rel: 'self',
						href: `https://rest.logentries.com/query/${pollId}`
					}]
				};
				nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);
				var realResult = {
					progress: 100,
					events: [
						{ message: '"p1": "A1", "p2": 12}' },
						{ message: '{"p1": "A2", "p2": 22}' }
					]
				};
				nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
			});

			before((done) => {
				queryLogentries(Object.assign({ignoreInvalidJson: true}, baseOpts), (err, messages) => {
					queryResult = messages;
					done(err);
				});
			});

			it('should ignore first message', () => {
				expect(queryResult).to.eql([
					{p1: 'A2', p2: 22}
				]);
			});
		});

		describe('with onInvalidJson callback option', () => {
			var nockLogEntries = nockLogEntriesFactory(apiKey, 'https://rest.logentries.com/query/');
			var queryResult;

			var dateNowBackup;
			var dateNowValue = new Date('2017-01-02T23:59:59.999').getTime();
			before(() => {
				dateNowBackup = Date.now;
				Date.now = () => dateNowValue;
			});
			after(() => {
				Date.now = dateNowBackup;
			});

			before(() => {
				var expectedParams = {
					query: 'where()',
					from: new Date(baseOpts.from).getTime(),
					to: dateNowValue,
					per_page: 50
				};
				var pollId = 'deace1fd-e605-41cd-a45c-5bf1ff0c3402-1';
				var queryStatus = {
					links: [{
						rel: 'self',
						href: `https://rest.logentries.com/query/${pollId}`
					}]
				};
				nockLogEntries.createQueryEndpointNock(logId, expectedParams, 202, queryStatus);
				var realResult = {
					progress: 100,
					events: [
						{ message: '"p1": "A1", "p2": 12}' },
						{ message: '{"p1": "A2", "p2": 22}' }
					]
				};
				nockLogEntries.createPollEndpointNock(pollId, 200, realResult);
			});

			before((done) => {
				queryLogentries(Object.assign({onInvalidJson: (message) => ({invalidJson: message})}, baseOpts), (err, messages) => {
					queryResult = messages;
					done(err);
				});
			});

			it('should transform first message', () => {
				expect(queryResult).to.eql([
					{invalidJson: '"p1": "A1", "p2": 12}'},
					{p1: 'A2', p2: 22}
				]);
			});
		});

	});

});
