import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

import { type RunResult } from './format.ts'

/** Ceiling on a formatter's captured output. Generous: it is a per-file report, not a stream. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024

/**
 * The version of an installed package, or null when it cannot be resolved from `fromDir`.
 *
 * `'eslint_d/eslint'` is spelled specially: it asks which ESLint the daemon itself would load,
 * which is not necessarily the project's.
 */
export function installedVersion(
  specifier: 'eslint' | 'eslint_d/eslint',
  fromDir: string
): string | null {
  const requireFrom = createRequire(path.join(fromDir, 'noop.js'))
  try {
    if (specifier === 'eslint') {
      return (requireFrom('eslint/package.json') as { version: string }).version
    }
    const daemon = requireFrom.resolve('eslint_d/package.json')
    const requireFromDaemon = createRequire(daemon)
    return (requireFromDaemon('eslint/package.json') as { version: string }).version
  } catch {
    return null
  }
}

/**
 * Spawns a formatter and captures its output. `failed` distinguishes "the binary would not run"
 * from "the binary ran and was unhappy", which the caller treats very differently.
 *
 * node_modules/.bin is prepended to PATH because the formatters are spawned by bare name and
 * are project-local — npm does the same for lifecycle scripts.
 */
export function runCommand(
  command: string,
  args: readonly string[],
  fromDir: string
): RunResult {
  const binDir = path.join(fromDir, 'node_modules', '.bin')
  const result = spawnSync(command, [...args], {
    cwd: fromDir,
    encoding: 'utf8',
    env: { ...process.env, PATH: [binDir, process.env.PATH].join(path.delimiter) },
    // ESLint's JSON report embeds the entire fixed source, so it scales with the file being
    // formatted. Node's 1 MiB default would turn a large file into ENOBUFS, which surfaces as
    // `failed` and reads as "the binary would not run" — a false report of a real success.
    maxBuffer: MAX_OUTPUT_BYTES,
  })

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? -1,
    failed: Boolean(result.error) || result.status === null,
  }
}

/** Drains an async iterable of chunks into a string. */
export async function readStream(stream: AsyncIterable<Buffer | string>): Promise<string> {
  let text = ''
  for await (const chunk of stream) text += chunk
  return text
}
