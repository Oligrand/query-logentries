module.exports = {
	rules: {
		'camelcase': 0,
		'consistent-return': 0,
		'curly': [2, 'all'],
		'dot-notation': 0,
		'eol-last': 0,
		'eqeqeq': [2, 'always', {'null': 'ignore'}],
		'handle-callback-err': 0,
		'key-spacing': [2, { "mode": "strict" }],
		'indent': [2, 'tab', {'SwitchCase': 1}],
		'object-shorthand': 0,
		'one-var': 0,
		'quotes': [2, 'single'],
		'semi': [2, 'always'],
		'strict': [2, 'never'],
		'wrap-iife': 0,
		'new-cap': [2, {'capIsNew': false}],
		'no-alert': 0,
		'no-caller': 2,
		'no-bitwise': 2,
		'no-debugger': 2,
		'no-empty': 2,
		'no-eval': 2,
		'no-extra-semi': 2,
		'no-irregular-whitespace': 0,
		'no-multi-spaces': 0,
		'no-new': 2,
		'no-plusplus': 0,
		'no-process-exit': 0,
		'no-redeclare': 2,
		'no-shadow': 0,
		'no-trailing-spaces':  [2, { 'skipBlankLines': true }],
		'no-underscore-dangle': 0,
		'no-undef': 2,
		'no-unused-vars': [2, { 'vars': 'local', 'args': 'none' }],
		'no-use-before-define': 0
	},
	'env': {
		'node': true,
		'es6': true
	},
	'parserOptions': {
		'ecmaVersion': 6,
		'sourceType': 'module'
	}
};
