#!/usr/bin/env node
import { selectRunner } from '../lib/eslint-runner.ts'
import { installedVersion, readStream, runCommand } from '../lib/io.ts'
import { run } from './format-command.ts'

const cwd = process.cwd()

process.exit(
  await run(process.argv.slice(2), {
    readStdin: () => readStream(process.stdin),
    stdinIsInteractive: Boolean(process.stdin.isTTY),
    runner: () => selectRunner((specifier) => installedVersion(specifier, cwd)),
    run: (command, args) => runCommand(command, args, cwd),
    writeOut: (message) => process.stdout.write(message),
    writeError: (message) => process.stderr.write(message),
  })
)
