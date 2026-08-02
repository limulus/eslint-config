import { describe, expect, it } from 'vitest'

import { strategyFor } from './dispatch.ts'

describe('strategyFor', () => {
  it.each(['a.js', 'a.jsx', 'a.mjs', 'a.cjs', 'a.ts', 'a.tsx', 'a.mts', 'a.cts'])(
    'routes %s to eslint, because prettier runs inside it as a rule',
    (file) => {
      expect(strategyFor(file)).toBe('eslint')
    }
  )

  it.each(['a.md', 'a.yml', 'a.yaml', 'a.json', 'a.css', 'a.html', 'LICENSE', 'a.tsx.bak'])(
    'routes %s to prettier, because eslint will not format it',
    (file) => {
      expect(strategyFor(file)).toBe('prettier')
    }
  )

  it('matches the extension case-insensitively', () => {
    expect(strategyFor('Component.TSX')).toBe('eslint')
  })

  it('uses the basename, not a directory that looks like an extension', () => {
    expect(strategyFor('/repo/src.ts/notes.md')).toBe('prettier')
  })
})
