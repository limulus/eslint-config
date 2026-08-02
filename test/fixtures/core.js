// Intentional lint violations, exercised by test/config.test.js.
// These cover the two rules this package adds on top of eslint-config-universe.

const label = (n) => (n === 0 ? 'zero' : n === 1 ? 'one' : 'many')

const nothing = void 0

module.exports = { label, nothing }
