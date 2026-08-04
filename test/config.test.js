const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const { FIXTURES_DIR, lintFixture } = require('./helpers.js')

describe('lint behavior', () => {
  it('lints without the consumer supplying a react version', async () => {
    // universe sets `react.version: 'detect'`, whose lookup calls the `context.getFilename()`
    // that ESLint 10 removed. That throws at rule-load time for every file the React rules
    // match -- plain .js included, React installed or not -- so the config must resolve the
    // version itself. The peer range permits ESLint 10, so this has to hold there.
    await assert.doesNotReject(() => lintFixture('core.js'))
  })

  it('reports the rules this package adds on top of universe', async () => {
    const reported = await lintFixture('core.js')

    assert.ok(reported.has('no-nested-ternary'), 'expected no-nested-ternary to report')
    assert.ok(reported.has('no-void'), 'expected no-void to report')
  })

  it('reports the React Compiler rules from eslint-plugin-react-hooks', async () => {
    const reported = await lintFixture('react-compiler.jsx')

    for (const rule of [
      'react-hooks/set-state-in-effect',
      'react-hooks/refs',
      'react-hooks/purity',
    ]) {
      assert.ok(reported.has(rule), `expected ${rule} to report`)
    }
  })

  it('reports type-aware rules when a project is configured', async () => {
    const reported = await lintFixture('type-aware.ts', [
      {
        languageOptions: {
          parserOptions: { projectService: true, tsconfigRootDir: FIXTURES_DIR },
        },
      },
    ])

    assert.ok(
      reported.has('@typescript-eslint/prefer-readonly'),
      'expected @typescript-eslint/prefer-readonly to report'
    )
  })
})
