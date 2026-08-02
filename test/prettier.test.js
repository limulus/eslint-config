const assert = require('node:assert/strict')
const path = require('node:path')
const { describe, it } = require('node:test')

const prettier = require('prettier')

const ROOT = path.join(__dirname, '..')

// Options are resolved through prettier.config.js rather than by requiring ../prettier.js
// directly. That config only spreads ours, so this exercises the same overrides merge a
// consumer gets -- which is the only way the `*.md` glob is actually proven to match.
const longestLine = (source) => Math.max(...source.split('\n').map((line) => line.length))

describe('prettier config', () => {
  it('hard-wraps markdown prose at the print width', async () => {
    const options = await prettier.resolveConfig(path.join(ROOT, 'README.md'))
    assert.equal(options.proseWrap, 'always')

    const source = `A paragraph ${'that runs on and on '.repeat(10)}and then ends.\n`
    const formatted = await prettier.format(source, { ...options, parser: 'markdown' })

    assert.ok(
      longestLine(formatted) <= options.printWidth,
      `expected every line within ${options.printWidth} columns, got ${longestLine(formatted)}`
    )
    assert.ok(
      formatted.trim().includes('\n'),
      'expected the paragraph to be wrapped onto multiple lines'
    )
  })

  it('leaves yaml scalars alone', async () => {
    // proseWrap applies to YAML as well as markdown, so the override has to stay scoped.
    // Reflowing a long scalar into a folded block would rewrite consumers' workflow files.
    const options = await prettier.resolveConfig(
      path.join(ROOT, '.github', 'workflows', 'publish.yml')
    )

    const source = `key: ${'a long scalar value '.repeat(10)}end\n`
    const formatted = await prettier.format(source, { ...options, parser: 'yaml' })

    assert.ok(
      longestLine(formatted) > options.printWidth,
      'expected the scalar to be left over-width rather than reflowed'
    )
  })
})
