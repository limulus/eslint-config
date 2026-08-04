const path = require('node:path')

const { ESLint } = require('eslint')

const config = require('../index.js')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

function createESLint(overrides = []) {
  return new ESLint({
    cwd: __dirname,
    overrideConfigFile: true,
    // Deliberately no `settings.react.version` override. Pinning one here would mask the
    // detection crash the config has to handle itself — see the regression test in
    // config.test.js. Tests must lint the config exactly as consumers receive it.
    overrideConfig: [...config, ...overrides],
  })
}

// Lints a single fixture and returns the set of rule IDs that reported against it.
async function lintFixture(fixture, overrides = []) {
  const eslint = createESLint(overrides)
  const [result] = await eslint.lintFiles([path.join(FIXTURES_DIR, fixture)])
  return new Set(result.messages.map((message) => message.ruleId))
}

module.exports = { FIXTURES_DIR, createESLint, lintFixture }
