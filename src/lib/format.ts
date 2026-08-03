import { strategyFor } from './dispatch.ts'
import { type Runner } from './eslint-runner.ts'

/** The result of spawning a formatter. `failed` means the binary itself did not run. */
export interface RunResult {
  stdout: string
  stderr: string
  status: number
  failed: boolean
}

/** The ambient effects formatFile needs. Injected so tests never spawn or touch disk. */
export interface FormatDeps {
  runner: () => Runner
  run: (command: string, args: readonly string[]) => RunResult
  writeFile: (file: string, contents: string) => void
  writeError: (message: string) => void
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

/** The first few meaningful lines of a tool's stderr — enough to diagnose, not enough to flood. */
const excerpt = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('\n')

const runPrettier = (file: string, deps: FormatDeps): FormatResult => {
  const result = deps.run('prettier', ['--write', '--ignore-unknown', '--', file])
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
  // `--` so a path beginning with a dash reaches the formatter as a path, not an option.
  const result = deps.run(command, ['--fix-dry-run', '--format', 'json', '--', file])
  if (result.failed) {
    return { outcome: 'failed', message: `${command} could not be run` }
  }

  let reports: ESLintReport[]
  try {
    reports = JSON.parse(result.stdout) as ESLintReport[]
  } catch {
    // ESLint ran but produced no report: it bailed out at rule-load time with a plain-text
    // message. Nothing here is file-specific — a plugin incompatible with the installed ESLint,
    // or an eslint.config.js that throws, fails this way on every file alike. Falling back keeps
    // the file formatted, but silently doing so forever would hide the lint half of this tool
    // going dark, so the reason ESLint gave is passed through. The exit code stays 0: the file
    // did get formatted, and a hook that fails a write over this would be worse than useless.
    const reason = excerpt(result.stderr) || `exited ${result.status} without a report`
    deps.writeError(
      `limulus-format: ${command} could not lint ${file}, so prettier formatted it instead:\n` +
        `${reason}\n`
    )
    return runPrettier(file, deps)
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
