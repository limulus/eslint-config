const path = require('node:path')

const { ESLint } = require('eslint')

const config = require('../index.js')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

function createESLint(overrides = []) {
  return new ESLint({
    cwd: __dirname,
    overrideConfigFile: true,
    overrideConfig: [
      ...config,
      // universe sets `react: { version: 'detect' }`, which warns on every run because React is
      // not a dependency here. Pinning a version keeps the output clean.
      { settings: { react: { version: '19.0' } } },
      ...overrides,
    ],
  })
}

// Lints a single fixture and returns the set of rule IDs that reported against it.
async function lintFixture(fixture, overrides = []) {
  const eslint = createESLint(overrides)
  const [result] = await eslint.lintFiles([path.join(FIXTURES_DIR, fixture)])
  return new Set(result.messages.map((message) => message.ruleId))
}

module.exports = { FIXTURES_DIR, createESLint, lintFixture }
