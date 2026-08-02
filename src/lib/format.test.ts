import { describe, expect, it } from 'vitest'

import { formatFile, type FormatDeps, type FormatResult } from './format.ts'

interface Invocation {
  command: string
  args: readonly string[]
}

/** Records what was spawned and replays canned results, keyed by the command. */
const deps = (
  results: Record<string, { stdout?: string; status: number; failed?: boolean }>,
  written: string[] = [],
  calls: Invocation[] = []
): FormatDeps & { written: string[]; calls: Invocation[] } => ({
  written,
  calls,
  runner: () => 'eslint_d',
  run: (command, args) => {
    calls.push({ command, args })
    const result = results[command]
    if (!result) throw new Error(`unexpected command: ${command}`)
    return {
      stdout: result.stdout ?? '',
      status: result.status,
      failed: result.failed ?? false,
    }
  },
  writeFile: (file, contents) => {
    written.push(`${file}\n${contents}`)
  },
})

const eslintJson = (report: Record<string, unknown>) => JSON.stringify([report])

describe('formatFile', () => {
  it('writes eslint output back when fixes were produced', () => {
    const d = deps({
      eslint_d: {
        status: 0,
        stdout: eslintJson({ fatalErrorCount: 0, output: 'fixed source\n' }),
      },
    })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.written).toEqual(['src/a.ts\nfixed source\n'])
  })

  it('leaves the file alone when eslint reports no fixes', () => {
    const d = deps({ eslint_d: { status: 0, stdout: eslintJson({ fatalErrorCount: 0 }) } })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('unchanged')
    expect(d.written).toEqual([])
  })

  it('still succeeds when lint warnings remain after fixing', () => {
    // A file can be perfectly formatted and still carry unfixable warnings. That is not a
    // formatting failure, so the hook must not surface it as one.
    const d = deps({
      eslint_d: {
        status: 1,
        stdout: eslintJson({ fatalErrorCount: 0, warningCount: 3, output: 'fixed\n' }),
      },
    })

    expect(formatFile('src/a.ts', d).outcome).toBe('formatted')
  })

  it('falls back to prettier when eslint reports a parse error', () => {
    // A .ts file outside the tsconfig include parses fatally and is otherwise skipped
    // silently. Prettier formats it fine without type information.
    const d = deps({
      eslint_d: {
        status: 1,
        stdout: eslintJson({ fatalErrorCount: 1, messages: [{ fatal: true }] }),
      },
      prettier: { status: 0 },
    })

    const result = formatFile('stray.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.calls.map((call) => call.command)).toEqual(['eslint_d', 'prettier'])
    expect(d.written).toEqual([])
  })

  it('routes non-eslint files straight to prettier --write', () => {
    const d = deps({ prettier: { status: 0 } })

    const result = formatFile('README.md', d)

    expect(result.outcome).toBe('formatted')
    expect(d.calls).toHaveLength(1)
    expect(d.calls[0].command).toBe('prettier')
    expect(d.calls[0].args).toContain('--write')
    expect(d.calls[0].args).toContain('--ignore-unknown')
  })

  it('reports failure when the eslint binary cannot be spawned', () => {
    const d = deps({ eslint_d: { status: -1, failed: true } })

    const result = formatFile('src/a.ts', d) as Extract<FormatResult, { outcome: 'failed' }>

    expect(result.outcome).toBe('failed')
    expect(result.message).toMatch(/eslint_d/)
  })

  it('falls back to prettier when eslint bails out without a json report', () => {
    // ESLint crashes at rule-load time -- exit 2, a human-readable message on stderr, no
    // JSON at all -- when a file matches type-aware rules but has no parserOptions for it.
    // Different mechanism from a parse error, same conclusion: eslint cannot format this.
    const d = deps({
      eslint_d: { status: 2, stdout: 'Oops! Something went wrong :(' },
      prettier: { status: 0 },
    })

    const result = formatFile('stray.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.calls.map((call) => call.command)).toEqual(['eslint_d', 'prettier'])
  })

  it('reports failure when eslint bails out and prettier cannot save it either', () => {
    const d = deps({
      eslint_d: { status: 2, stdout: 'Oops!' },
      prettier: { status: 2, failed: true },
    })

    expect(formatFile('stray.ts', d).outcome).toBe('failed')
  })

  it('reports failure when prettier itself fails', () => {
    const d = deps({ prettier: { status: 2, failed: true } })

    expect(formatFile('README.md', d).outcome).toBe('failed')
  })

  it('treats an empty eslint report as nothing to do', () => {
    const d = deps({ eslint_d: { status: 0, stdout: '[]' } })

    expect(formatFile('src/a.ts', d).outcome).toBe('unchanged')
  })
})
