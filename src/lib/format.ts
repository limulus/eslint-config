import { strategyFor } from './dispatch.ts'
import { type Runner } from './eslint-runner.ts'

/** The result of spawning a formatter. `failed` means the binary itself did not run. */
export interface RunResult {
  stdout: string
  stderr: string
  status: number
  failed: boolean
}

/** The ambient effects formatFile needs. Injected so tests never spawn a process. */
export interface FormatDeps {
  runner: () => Runner
  run: (command: string, args: readonly string[]) => RunResult
  writeError: (message: string) => void
}

/** Failure always carries a reason, so callers never have to invent one. */
export type FormatResult = { outcome: 'formatted' } | { outcome: 'failed'; message: string }

/** eslint's exit code for "I could not run", as opposed to 1 for "I found problems". */
const ESLINT_COULD_NOT_RUN = 2

/** The first few meaningful lines of a tool's stderr — enough to diagnose, not enough to flood. */
const excerpt = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('\n')

/**
 * Lints a file if it is the sort of file ESLint handles, reporting rather than failing when
 * ESLint cannot run. Prettier is left to format it either way.
 */
function lint(file: string, deps: FormatDeps): void {
  const command = deps.runner()
  const result = deps.run(command, ['--fix', '--', file])

  // Exit 1 means unfixable lint problems remain, which is the normal state of most files and
  // says nothing about formatting. Only a failure to run at all is worth a word.
  if (!result.failed && result.status !== ESLINT_COULD_NOT_RUN) return

  const reason = result.failed
    ? 'could not be spawned'
    : excerpt(result.stderr) || `exited ${result.status}`

  deps.writeError(
    `limulus-format: ${command} could not lint ${file}, so it was only formatted:\n${reason}\n`
  )
}

/**
 * Formats one file in place.
 *
 * JavaScript and TypeScript get `eslint --fix` first, because universe enables
 * `prettier/prettier` — so that single pass applies Prettier and fixes lint together. Prettier
 * then runs over everything regardless. On a file ESLint already handled it is a ~50ms no-op; on
 * one ESLint could not parse or was not configured for, it is what keeps the file from being
 * silently skipped. Cheaper than working out which case applies, and it cannot guess wrong.
 */
export function formatFile(file: string, deps: FormatDeps): FormatResult {
  if (strategyFor(file) === 'eslint') lint(file, deps)

  const result = deps.run('prettier', ['--write', '--ignore-unknown', '--', file])
  return result.failed || result.status !== 0
    ? { outcome: 'failed', message: `prettier exited ${result.status}` }
    : { outcome: 'formatted' }
}
