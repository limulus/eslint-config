import { type Runner } from '../lib/eslint-runner.ts'
import { formatFile, type RunResult } from '../lib/format.ts'
import {
  filePathFromHookPayload,
  parseInvocation,
  USAGE,
  type StdinReader,
} from '../lib/hook-input.ts'

/** Everything the command touches outside itself. */
export interface CommandDeps {
  readStdin: StdinReader
  /** True when stdin is a terminal, i.e. nobody piped a payload in. */
  stdinIsInteractive: boolean
  runner: () => Runner
  run: (command: string, args: readonly string[]) => RunResult
  writeOut: (message: string) => void
  writeError: (message: string) => void
}

/**
 * Formats the file named in argv or on stdin, and returns a process exit code.
 *
 * Exit 0 covers formatted, unchanged, and "no file to format" alike — a PostToolUse hook fires
 * on every Write and Edit, and a non-zero exit is fed back to Claude as an error. Only a
 * formatter that genuinely could not run, or a command line that cannot be honoured, earns 1.
 */
export async function run(argv: readonly string[], deps: CommandDeps): Promise<number> {
  const invocation = parseInvocation(argv)

  if (invocation.kind === 'error') {
    deps.writeError(`limulus-format: ${invocation.message}\n\n${USAGE}`)
    return 1
  }

  if (invocation.kind === 'help') {
    deps.writeOut(USAGE)
    return 0
  }

  // No file named and nothing piped in, so someone ran the bin bare at a prompt. Reading stdin
  // would block on the terminal with no indication of why.
  if (invocation.kind === 'stdin' && deps.stdinIsInteractive) {
    deps.writeOut(USAGE)
    return 0
  }

  const file =
    invocation.kind === 'file'
      ? invocation.file
      : filePathFromHookPayload(await deps.readStdin())

  if (!file) return 0

  const result = formatFile(file, deps)
  if (result.outcome === 'failed') {
    deps.writeError(`limulus-format: could not format ${file}: ${result.message}\n`)
    return 1
  }

  return 0
}
