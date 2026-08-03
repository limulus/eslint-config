#!/usr/bin/env node
import { run } from './format-command.ts'
import { selectRunner } from '../lib/eslint-runner.ts'
import { installedVersion, readStream, runCommand } from '../lib/io.ts'

const cwd = process.cwd()

// `process.exitCode` rather than `process.exit()`: stdout and stderr are asynchronous when they
// are pipes, which is exactly how a hook runs this, and exiting outright can discard writes that
// have not drained — including the diagnostics this bin exists to surface.
try {
  process.exitCode = await run(process.argv.slice(2), {
    readStdin: () => readStream(process.stdin),
    stdinIsInteractive: Boolean(process.stdin.isTTY),
    runner: () => selectRunner((specifier) => installedVersion(specifier, cwd)),
    run: (command, args) => runCommand(command, args, cwd),
    writeOut: (message) => process.stdout.write(message),
    writeError: (message) => process.stderr.write(message),
  })
} catch (error) {
  // A stack trace fed back to an agent is noise it cannot act on. One line, and a non-zero exit.
  process.stderr.write(`limulus-format: ${(error as Error).message}\n`)
  process.exitCode = 1
}
