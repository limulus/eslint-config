import { describe, expect, it } from 'vitest'

import { run, type CommandDeps } from './format-command.ts'

interface Recorded {
  errors: string[]
  out: string[]
}

const deps = (overrides: Partial<CommandDeps> = {}): CommandDeps & Recorded => {
  const errors: string[] = []
  const out: string[] = []
  return {
    errors,
    out,
    readStdin: async () => '',
    stdinIsInteractive: false,
    runner: () => 'eslint',
    run: () => ({ stdout: '[]', stderr: '', status: 0, failed: false }),
    writeFile: () => {},
    writeOut: (message: string) => out.push(message),
    writeError: (message: string) => errors.push(message),
    ...overrides,
  }
}

describe('run', () => {
  it('exits 0 after formatting a file named on the command line', async () => {
    const d = deps({
      run: () => ({
        stdout: JSON.stringify([{ fatalErrorCount: 0, output: 'fixed\n' }]),
        stderr: '',
        status: 0,
        failed: false,
      }),
    })

    expect(await run(['a.ts'], d)).toBe(0)
    expect(d.errors).toEqual([])
  })

  it('exits 0 and stays silent when no file can be determined', async () => {
    // A hook fires on every Write and Edit, including tool calls with no file at all.
    const d = deps({ readStdin: async () => '{"tool_input":{"command":"ls"}}' })

    expect(await run([], d)).toBe(0)
    expect(d.errors).toEqual([])
  })

  it('exits 1 and explains itself when the formatter fails', async () => {
    const d = deps({ run: () => ({ stdout: '', stderr: '', status: -1, failed: true }) })

    expect(await run(['a.ts'], d)).toBe(1)
    expect(d.errors).toHaveLength(1)
    expect(d.errors[0]).toMatch(/a\.ts/)
  })

  it('exits 0 when the file needed no changes', async () => {
    expect(await run(['a.ts'], deps())).toBe(0)
  })

  it('prints usage for --help without reading stdin', async () => {
    const d = deps({
      readStdin: async () => {
        throw new Error('stdin should not be read')
      },
    })

    expect(await run(['--help'], d)).toBe(0)
    expect(d.out.join('')).toMatch(/Usage: limulus-format/)
  })

  it('prints usage rather than blocking when run bare at a terminal', async () => {
    // Nothing is piped in, so reading stdin would hang on the tty with nothing explaining why.
    const d = deps({
      stdinIsInteractive: true,
      readStdin: async () => {
        throw new Error('stdin should not be read')
      },
    })

    expect(await run([], d)).toBe(0)
    expect(d.out.join('')).toMatch(/Usage: limulus-format/)
  })

  it('exits 1 on an unknown option instead of formatting something unintended', async () => {
    const d = deps()

    expect(await run(['--fix-everything', 'a.ts'], d)).toBe(1)
    expect(d.errors.join('')).toMatch(/fix-everything/)
  })
})
