import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

// cli.ts is excluded from coverage as a process entry point, so it is proven by spawning it
// for real rather than by importing it.
const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cli.ts')
const workDir = mkdtempSync(path.join(tmpdir(), 'limulus-cli-'))

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const spawnCli = (args: string[], input = '') =>
  spawnSync(process.execPath, [BIN, ...args], { cwd: workDir, input, encoding: 'utf8' })

describe('cli', () => {
  it('formats a file named as an argument', () => {
    const target = path.join(workDir, 'notes.md')
    writeFileSync(target, '#    Heading\n\n*   item\n')

    const result = spawnCli([target])

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe('# Heading\n\n- item\n')
  })

  it('formats the file named in a hook payload on stdin', () => {
    const target = path.join(workDir, 'from-hook.md')
    writeFileSync(target, '#    Hook\n')
    const payload = JSON.stringify({
      hook_event_name: 'PostToolUse',
      tool_input: { file_path: target },
    })

    const result = spawnCli([], payload)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe('# Hook\n')
  })

  it('exits 0 without output when the payload names no file', () => {
    const result = spawnCli([], '{"tool_input":{"command":"ls"}}')

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
  })
})
