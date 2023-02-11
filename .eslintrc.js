module.exports = {
	'root': true,
	'env': {
		'browser': true,
		'commonjs': true,
		'es2021': true,
		'node': true
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'ecmaVersion': 'latest',
		'sourceType': 'module'
	},
	'rules': {
		'indent': [
			'error',
			'tab',
			{ SwitchCase: 1 }
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'space-in-parens': [ 'error', 'never' ],
		'array-bracket-spacing': [ 'error', 'always' ],
		'object-curly-spacing': [ 'error', 'always' ],
		'yoda': [ 'error', 'always' ],
		'comma-dangle': [ 'error', 'never' ],
		'arrow-parens': [ 'error', 'as-needed' ]
	}
};
