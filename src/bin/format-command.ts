import { type Runner } from '../lib/eslint-runner.ts'
import { formatFile, type RunResult } from '../lib/format.ts'
import { resolveTargetFile, type StdinReader } from '../lib/hook-input.ts'

/** Everything the command touches outside itself. */
export interface CommandDeps {
  readStdin: StdinReader
  runner: () => Runner
  run: (command: string, args: readonly string[]) => RunResult
  writeFile: (file: string, contents: string) => void
  writeError: (message: string) => void
}

/**
 * Formats the file named in argv or on stdin, and returns a process exit code.
 *
 * Exit 0 covers formatted, unchanged, and "no file to format" alike — a PostToolUse hook fires
 * on every Write and Edit, and a non-zero exit is fed back to Claude as an error. Only a
 * formatter that genuinely could not run earns exit 1.
 */
export async function run(argv: readonly string[], deps: CommandDeps): Promise<number> {
  const file = await resolveTargetFile(argv, deps.readStdin)
  if (!file) return 0

  const result = formatFile(file, deps)
  if (result.outcome === 'failed') {
    deps.writeError(`limulus-format: could not format ${file}: ${result.message}\n`)
    return 1
  }

  return 0
}
