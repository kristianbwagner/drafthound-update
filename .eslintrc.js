module.exports = {
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 7
  },
  "env" : {
    "node" : true,
    "jquery" : true,
		"browser" : true,
    "es6": true
  },
  "rules": {
		// Only allow one semi colon
    "no-extra-semi": 2,
		// Functions must be declared to avoid hoisting issues
    "func-style": ["error", "declaration", { "allowArrowFunctions": true }],
		// Semi colons must be used
    "semi": 2,
		// Const is always preferred to let and var
    "prefer-const": "error",
		// There must be space between function names and other keywords
    "keyword-spacing": 2,
		// Do no allow white space in parens
    "space-in-parens": ["error", "never"],
		// Always place commas at the end, not beginning
    "comma-style": ["error", "last"],
		// Indent using tab
    "indent": ["error", "tab"],
		// Maximum one empty line
    "no-multiple-empty-lines": ["error", { "max": 2, "maxEOF": 1 }],
		// Allow console.log()
    "no-console": 0,
		// Arrow callbacks are always preferred
		"prefer-arrow-callback": "error"
  }
}
