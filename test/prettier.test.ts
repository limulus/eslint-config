import path from 'node:path'
import { fileURLToPath } from 'node:url'

import prettier from 'prettier'
import { describe, expect, it } from 'vitest'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Options are resolved through prettier.config.js rather than by importing ../prettier.js
// directly. That config only spreads ours, so this exercises the same overrides merge a
// consumer gets -- which is the only way the `*.md` glob is actually proven to match.
const longestLine = (source: string): number =>
  Math.max(...source.split('\n').map((line) => line.length))

describe('prettier config', () => {
  it('hard-wraps markdown prose at the print width', async () => {
    const options = await prettier.resolveConfig(path.join(ROOT, 'README.md'))
    expect(options?.proseWrap).toBe('always')

    const source = `A paragraph ${'that runs on and on '.repeat(10)}and then ends.\n`
    const formatted = await prettier.format(source, { ...options, parser: 'markdown' })

    expect(longestLine(formatted)).toBeLessThanOrEqual(options?.printWidth as number)
    expect(formatted.trim()).toContain('\n')
  })

  it('leaves yaml scalars alone', async () => {
    // proseWrap applies to YAML as well as markdown, so the override has to stay scoped.
    // Reflowing a long scalar into a folded block would rewrite consumers' workflow files.
    const options = await prettier.resolveConfig(
      path.join(ROOT, '.github', 'workflows', 'publish.yml')
    )

    const source = `key: ${'a long scalar value '.repeat(10)}end\n`
    const formatted = await prettier.format(source, { ...options, parser: 'yaml' })

    expect(longestLine(formatted)).toBeGreaterThan(options?.printWidth as number)
  })
})
