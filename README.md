# query-logentries

[![npm version](https://badge.fury.io/js/query-logentries.svg)](https://badge.fury.io/js/query-logentries) [![Build Status](https://travis-ci.org/Oligrand/query-logentries.svg?branch=master)](https://travis-ci.org/Oligrand/query-logentries) [![Dependency Status](https://david-dm.org/Oligrand/query-logentriess.svg)](https://david-dm.org/Oligrand/query-logentries) [![devDependency Status](https://david-dm.org/Oligrand/query-logentries/dev-status.svg)](https://david-dm.org/Oligrand/query-logentries#info=devDependencies) [![Coverage Status](https://coveralls.io/repos/github/Oligrand/query-logentries/badge.svg?branch=master)](https://coveralls.io/github/Oligrand/query-logentries?branch=master)

Query logentries.com via their REST API. Returns only the raw log messages you passed to logEntries at the time of logging. Uses [request-retry-stream](https://www.npmjs.com/package/request-retry-stream) in order to be more robust in case of network glitches.

	npm install --save query-logentries

## Usage

```javascript
const queryLogentriesFactory = require('query-logentries');

// Required. Replace with your API KEY
const apiKey = '6971aef7-998f-4cb2-9613-ddb42b9697b8';

// Optional. Defaults to https://rest.logentries.com/query/logs
const queryUrl = 'https://rest.logentries.com/query/logs';

const queryLogentries = queryLogentriesFactory(apiKey, queryUrl);
const opts = {
	// Required. Set it to the id of the log in logEntries you wish
	// to query
	logId: '7d9ff278-3a6d-4c7a-8e65-df89fd3f5a96',

	// Required. Set it to any valid value or stringDate that can
	//be passed to a javascript Date object
	from: '2017-01-01T00:00:00.000',

	// Optional. If empty will default to now. Set it to any valid
	// value or stringDate that can be passed to a javascript Date
	// object
	to: '2017-01-02T23:59:59.999',

	// Optional. Default to 'where()'. The leql query you wish to
	// query with. Please ensure it is a valid leql query or you
	// get statusCode 400 errors from logEntries.
	leqlQuery: 'where(method=GET)',

	// Optional. Defaults to 50. How many messages should retried
	// per paging request made to logEntries
	perPage: 50,

	// Optional. Defaults to 30000 (30 seconds). How long should
	//the request wait before it times out
	timeout: 30000,

	// Optional. Defaults to 5000 (5 seconds). How long should
	// this module wait when checking if a query response is
	// finished on logEntries
	pollInterval: 5000
};

//------------------------------------------------------

//Example with callback
queryLogentries(opts, (err, messages) => {
	if (err) {
		return; //TODO handle err
	}
	console.log('messages', messages);
});

//------------------------------------------------------

//Example with streaming
const pump = require('pump');
const through2 = require('through2');
const fs = require('fs');

const toStringStream = through2.obj(function(message, enc, callback) {
	this.push(JSON.stringify(message) + '\n');
	callback();
});
const toFileStream = fs.createWriteStream('./result.txt');

const logEntriesStream = queryLogentries(opts);
pump(logEntriesStream, toStringStream, toFileStream), err => {
	if (err) {
		//TODO handle err
	}
});

```

## License

[MIT](http://opensource.org/licenses/MIT)
