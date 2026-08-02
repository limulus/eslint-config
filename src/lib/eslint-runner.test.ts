import { describe, expect, it } from 'vitest'

import { selectRunner, type VersionLookup } from './eslint-runner.ts'

const lookup = (versions: Record<string, string | null>): VersionLookup => {
  return (specifier) => versions[specifier] ?? null
}

describe('selectRunner', () => {
  it('prefers eslint_d when its eslint major matches the project', () => {
    const runner = selectRunner(lookup({ eslint: '10.8.0', 'eslint_d/eslint': '10.8.0' }))

    expect(runner).toBe('eslint_d')
  })

  it('falls back to eslint when eslint_d is not installed', () => {
    expect(selectRunner(lookup({ eslint: '10.8.0' }))).toBe('eslint')
  })

  it('matches on major only, ignoring minor and patch drift', () => {
    // eslint_d depends on eslint ^10.0.3, so a project pinned below that legitimately
    // resolves a slightly newer nested copy. Same major means same rule behavior.
    const runner = selectRunner(lookup({ eslint: '10.0.1', 'eslint_d/eslint': '10.8.0' }))

    expect(runner).toBe('eslint_d')
  })

  it('refuses eslint_d when its eslint major differs from the project', () => {
    // The dangerous case: eslint_d bundles a nested eslint of another major and would
    // silently lint with different rule behavior than the project's own eslint.
    const runner = selectRunner(lookup({ eslint: '9.39.5', 'eslint_d/eslint': '10.8.0' }))

    expect(runner).toBe('eslint')
  })

  it('falls back to eslint when the project eslint cannot be resolved', () => {
    expect(selectRunner(lookup({ 'eslint_d/eslint': '10.8.0' }))).toBe('eslint')
  })
})
