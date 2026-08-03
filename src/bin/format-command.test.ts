import { describe, expect, it } from 'vitest'

import { run, type CommandDeps } from './format-command.ts'

const deps = (overrides: Partial<CommandDeps> = {}): CommandDeps & { errors: string[] } => {
  const errors: string[] = []
  return {
    errors,
    readStdin: async () => '',
    runner: () => 'eslint',
    run: () => ({ stdout: '[]', stderr: '', status: 0, failed: false }),
    writeFile: () => {},
    writeError: (message: string) => errors.push(message),
    ...overrides,
  } as CommandDeps & { errors: string[] }
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
})
