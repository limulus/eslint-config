import { describe, expect, it } from 'vitest'

import { formatFile, type FormatDeps, type FormatResult } from './format.ts'

interface Invocation {
  command: string
  args: readonly string[]
}

/** Records what was spawned and replays canned results, keyed by the command. */
const deps = (
  results: Record<
    string,
    { stdout?: string; stderr?: string; status: number; failed?: boolean }
  >,
  calls: Invocation[] = [],
  errors: string[] = []
): FormatDeps & { calls: Invocation[]; errors: string[] } => ({
  calls,
  errors,
  runner: () => 'eslint_d',
  run: (command, args) => {
    calls.push({ command, args })
    const result = results[command]
    if (!result) throw new Error(`unexpected command: ${command}`)
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status,
      failed: result.failed ?? false,
    }
  },
  writeError: (message) => {
    errors.push(message)
  },
})

const failure = (result: FormatResult) =>
  result as Extract<FormatResult, { outcome: 'failed' }>

describe('formatFile', () => {
  it('runs eslint --fix and then prettier for javascript and typescript', () => {
    // Both, unconditionally. Deciding whether Prettier is needed would cost more than the ~50ms
    // of running it: ESLint applies it as a rule anyway, so the second pass is a no-op when the
    // first one worked and a rescue when it did not.
    const d = deps({ eslint_d: { status: 0 }, prettier: { status: 0 } })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.calls.map((call) => call.command)).toEqual(['eslint_d', 'prettier'])
  })

  it('puts -- before the path so a leading dash is still a path', () => {
    const d = deps({ eslint_d: { status: 0 }, prettier: { status: 0 } })

    formatFile('-dash.ts', d)

    for (const call of d.calls) {
      expect(call.args.at(-2)).toBe('--')
      expect(call.args.at(-1)).toBe('-dash.ts')
    }
  })

  it('sends files eslint does not handle straight to prettier', () => {
    const d = deps({ prettier: { status: 0 } })

    const result = formatFile('README.md', d)

    expect(result.outcome).toBe('formatted')
    expect(d.calls.map((call) => call.command)).toEqual(['prettier'])
  })

  it('does not treat leftover lint problems as a failure', () => {
    // eslint exits 1 whenever anything unfixable remains, which is most of the time. The file is
    // still correctly formatted, and a hook that cried wolf on every write would be turned off.
    const d = deps({ eslint_d: { status: 1 }, prettier: { status: 0 } })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.errors).toEqual([])
  })

  it('says why lint was skipped when eslint could not run at all', () => {
    // Exit 2 is eslint failing to run rather than finding fault: a config that throws, or a
    // plugin incompatible with the installed eslint. Prettier still formats the file, so this
    // would otherwise be indistinguishable from success while every lint fix silently stopped.
    const d = deps({
      eslint_d: {
        status: 2,
        stderr: "TypeError: Error while loading rule 'react/no-did-mount-set-state'\n",
      },
      prettier: { status: 0 },
    })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.errors.join('')).toMatch(/eslint_d/)
    expect(d.errors.join('')).toMatch(/Error while loading rule/)
  })

  it('still says something when eslint fails without explaining itself', () => {
    const d = deps({ eslint_d: { status: 2 }, prettier: { status: 0 } })

    formatFile('src/a.ts', d)

    expect(d.errors.join('')).toMatch(/exited 2/)
  })

  it('says so but still formats when the eslint binary is missing', () => {
    const d = deps({ eslint_d: { status: -1, failed: true }, prettier: { status: 0 } })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('formatted')
    expect(d.errors.join('')).toMatch(/eslint_d/)
  })

  it('fails only when prettier itself fails, since that means nothing was formatted', () => {
    const d = deps({ eslint_d: { status: 0 }, prettier: { status: 2, failed: true } })

    const result = formatFile('src/a.ts', d)

    expect(result.outcome).toBe('failed')
    expect(failure(result).message).toMatch(/prettier/)
  })

  it('fails when prettier reports a non-zero status', () => {
    const d = deps({ prettier: { status: 2 } })

    expect(formatFile('README.md', d).outcome).toBe('failed')
  })
})
