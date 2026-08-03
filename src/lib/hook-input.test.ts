import { describe, expect, it } from 'vitest'

import { filePathFromHookPayload, parseInvocation } from './hook-input.ts'

describe('parseInvocation', () => {
  it('takes the first positional argument as the file', () => {
    expect(parseInvocation(['src/thing.ts'])).toEqual({
      kind: 'file',
      file: 'src/thing.ts',
    })
  })

  it('asks for stdin when no file is named', () => {
    expect(parseInvocation([])).toEqual({ kind: 'stdin' })
  })

  it('treats a path after -- as a path, however it starts', () => {
    // Without the separator a leading dash makes the path look like an option, both here and
    // to the formatter this eventually spawns.
    expect(parseInvocation(['--', '-weird-name.ts'])).toEqual({
      kind: 'file',
      file: '-weird-name.ts',
    })
  })

  it('recognises --help and -h', () => {
    expect(parseInvocation(['--help'])).toEqual({ kind: 'help' })
    expect(parseInvocation(['-h'])).toEqual({ kind: 'help' })
  })

  it('rejects more than one file rather than silently dropping the rest', () => {
    const invocation = parseInvocation(['a.ts', 'b.ts'])

    expect(invocation.kind).toBe('error')
  })

  it('rejects an unknown option instead of formatting a file named after it', () => {
    const invocation = parseInvocation(['--fix-everything', 'a.ts'])

    expect(invocation.kind).toBe('error')
    expect((invocation as Extract<typeof invocation, { kind: 'error' }>).message).toMatch(
      /fix-everything/
    )
  })
})

describe('filePathFromHookPayload', () => {
  it('reads tool_input.file_path', () => {
    const payload = JSON.stringify({
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/repo/README.md', content: '# hi' },
    })

    expect(filePathFromHookPayload(payload)).toBe('/repo/README.md')
  })

  it('returns null for JSON without a file path', () => {
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } })

    expect(filePathFromHookPayload(payload)).toBeNull()
  })

  it('returns null for a non-string file path', () => {
    expect(filePathFromHookPayload('{"tool_input":{"file_path":42}}')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(filePathFromHookPayload('')).toBeNull()
  })

  it('returns null for JSON that is not an object', () => {
    // JSON.parse succeeds on these, so the try/catch never sees them.
    expect(filePathFromHookPayload('null')).toBeNull()
    expect(filePathFromHookPayload('42')).toBeNull()
    expect(filePathFromHookPayload('"a string"')).toBeNull()
  })

  it('returns null for input that is not JSON', () => {
    expect(filePathFromHookPayload('not json at all')).toBeNull()
  })
})
