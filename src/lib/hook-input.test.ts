import { describe, expect, it } from 'vitest'

import { resolveTargetFile } from './hook-input.ts'

describe('resolveTargetFile', () => {
  it('takes the first positional argument when present', async () => {
    const file = await resolveTargetFile(['src/thing.ts'], async () => '')

    expect(file).toBe('src/thing.ts')
  })

  it('ignores stdin entirely when an argument is given', async () => {
    const file = await resolveTargetFile(['from-argv.ts'], async () => {
      throw new Error('stdin should not be read')
    })

    expect(file).toBe('from-argv.ts')
  })

  it('falls back to tool_input.file_path from hook JSON on stdin', async () => {
    const payload = JSON.stringify({
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/repo/README.md', content: '# hi' },
    })

    const file = await resolveTargetFile([], async () => payload)

    expect(file).toBe('/repo/README.md')
  })

  it('returns null when stdin holds JSON without a file path', async () => {
    const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } })

    expect(await resolveTargetFile([], async () => payload)).toBeNull()
  })

  it('returns null when stdin is empty', async () => {
    expect(await resolveTargetFile([], async () => '')).toBeNull()
  })

  it('returns null when stdin is not valid JSON', async () => {
    expect(await resolveTargetFile([], async () => 'not json at all')).toBeNull()
  })
})
