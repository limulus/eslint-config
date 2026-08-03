import { parseArgs } from 'node:util'

/** Reads the whole of stdin. Injectable so tests never touch the real process stream. */
export type StdinReader = () => Promise<string>

export const USAGE = `Usage: limulus-format [--] <file>
       limulus-format            (reads a hook payload on stdin)

Formats one file the way @limulus/eslint-config wants it. JavaScript and
TypeScript go through ESLint, which applies Prettier as a rule and fixes lint on
the same pass; everything else goes through Prettier directly.

Given no file, it reads a Claude Code hook payload on stdin and formats the path
at tool_input.file_path.

Options:
  -h, --help  Show this message
`

/** What the command line asked for. `stdin` means "no file named — go read the payload". */
export type Invocation =
  | { kind: 'file'; file: string }
  | { kind: 'stdin' }
  | { kind: 'help' }
  | { kind: 'error'; message: string }

/**
 * Interprets argv.
 *
 * Uses node's own parser rather than reading argv[0] directly, so that `--` works: a path
 * beginning with a dash is otherwise indistinguishable from an option, and would be silently
 * swallowed here and then again by the formatter that gets spawned.
 */
export function parseInvocation(argv: readonly string[]): Invocation {
  try {
    const { values, positionals } = parseArgs({
      args: [...argv],
      options: { help: { type: 'boolean', short: 'h' } },
      allowPositionals: true,
    })

    if (values.help) return { kind: 'help' }

    // Refusing extra paths rather than formatting the first and dropping the rest in silence.
    // One file per invocation is the hook's shape; anything else is a misunderstanding worth
    // saying out loud.
    if (positionals.length > 1) {
      return { kind: 'error', message: 'expected one file, got ' + positionals.length }
    }

    const [file] = positionals
    return file ? { kind: 'file', file } : { kind: 'stdin' }
  } catch (error) {
    return { kind: 'error', message: (error as Error).message }
  }
}

interface HookPayload {
  tool_input?: { file_path?: unknown }
}

/**
 * The path a Claude Code hook payload names, or null when it names none.
 *
 * Every unusable shape collapses to null rather than an error: a PostToolUse hook fires on tool
 * calls that touch no file at all, so "nothing to do" is the common case, not a fault.
 */
export function filePathFromHookPayload(raw: string): string | null {
  if (!raw.trim()) return null

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return null
  }

  // `null` and bare scalars all parse successfully, so the shape has to be checked rather than
  // assumed — reaching into them throws, and a hook crashing on a surprising payload is the
  // worst available outcome.
  if (typeof payload !== 'object' || payload === null) return null

  const filePath = (payload as HookPayload).tool_input?.file_path
  return typeof filePath === 'string' && filePath ? filePath : null
}
