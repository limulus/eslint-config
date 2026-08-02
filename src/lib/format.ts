import { strategyFor } from './dispatch.ts'
import { type Runner } from './eslint-runner.ts'

/** The result of spawning a formatter. `failed` means the binary itself did not run. */
export interface RunResult {
  stdout: string
  status: number
  failed: boolean
}

/** The ambient effects formatFile needs. Injected so tests never spawn or touch disk. */
export interface FormatDeps {
  runner: () => Runner
  run: (command: string, args: readonly string[]) => RunResult
  writeFile: (file: string, contents: string) => void
}

/** Failure always carries a reason, so callers never have to invent one. */
export type FormatResult =
  | { outcome: 'formatted' | 'unchanged' }
  | { outcome: 'failed'; message: string }

/** The subset of ESLint's JSON report this cares about. */
interface ESLintReport {
  fatalErrorCount?: number
  output?: string
}

const runPrettier = (file: string, deps: FormatDeps): FormatResult => {
  const result = deps.run('prettier', ['--write', '--ignore-unknown', file])
  return result.failed || result.status !== 0
    ? { outcome: 'failed', message: `prettier exited ${result.status}` }
    : { outcome: 'formatted' }
}

/**
 * Formats one file in place.
 *
 * ESLint runs with `--fix-dry-run --format json` rather than `--fix` so its verdict can be read
 * before anything is written. That is what makes the parse-error fallback possible: a `.ts`
 * outside the tsconfig `include` fails fatally and would otherwise be skipped in silence, but
 * Prettier formats it happily without type information.
 */
export function formatFile(file: string, deps: FormatDeps): FormatResult {
  if (strategyFor(file) === 'prettier') return runPrettier(file, deps)

  const command = deps.runner()
  const result = deps.run(command, ['--fix-dry-run', '--format', 'json', file])
  if (result.failed) {
    return { outcome: 'failed', message: `${command} could not be run` }
  }

  let reports: ESLintReport[]
  try {
    reports = JSON.parse(result.stdout) as ESLintReport[]
  } catch {
    return { outcome: 'failed', message: `${command} produced unreadable output` }
  }

  const [report] = reports
  if (!report) return { outcome: 'unchanged' }

  // A fatal error means ESLint could not parse the file at all, so it produced no fix.
  if (report.fatalErrorCount) return runPrettier(file, deps)

  // A non-zero status with no fatal error is just unfixable lint left over, which is not a
  // formatting failure — the file is still correctly formatted.
  if (report.output === undefined) return { outcome: 'unchanged' }

  deps.writeFile(file, report.output)
  return { outcome: 'formatted' }
}
