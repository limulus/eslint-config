import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { installedVersion, readStream, runCommand } from './io.ts'

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
describe('installedVersion', () => {
  it('resolves a package that is installed', () => {
    expect(installedVersion('eslint', REPO_ROOT)).toMatch(/^\d+\./)
  })

  it('returns null for a package that is not installed', () => {
    expect(installedVersion('eslint_d/eslint', REPO_ROOT)).toBeNull()
  })
})

describe('runCommand', () => {
  it('captures stdout and status from a command that runs', () => {
    const result = runCommand('node', ['-e', 'process.stdout.write("hi")'], REPO_ROOT)

    expect(result.stdout).toBe('hi')
    expect(result.status).toBe(0)
    expect(result.failed).toBe(false)
  })

  it('reports a non-zero status without treating it as a spawn failure', () => {
    const result = runCommand('node', ['-e', 'process.exit(3)'], REPO_ROOT)

    expect(result.status).toBe(3)
    expect(result.failed).toBe(false)
  })

  it('captures stderr, which carries the reason a formatter bailed out', () => {
    const result = runCommand(
      'node',
      ['-e', 'process.stderr.write("why it broke")'],
      REPO_ROOT
    )

    expect(result.stderr).toBe('why it broke')
  })

  it('captures output far past the 1 MiB default buffer', () => {
    // ESLint's JSON report embeds the whole fixed source, so a large file overruns node's
    // default and comes back as ENOBUFS -- indistinguishable from the binary never running.
    const script = 'process.stdout.write("x".repeat(4 * 1024 * 1024))'
    const result = runCommand('node', ['-e', script], REPO_ROOT)

    expect(result.failed).toBe(false)
    expect(result.stdout).toHaveLength(4 * 1024 * 1024)
  })

  it('finds a binary hoisted to an ancestor, as in a workspace', () => {
    // src/lib has no node_modules of its own; the binaries live at the repo root. npm puts every
    // ancestor's .bin on PATH for lifecycle scripts, and a workspace package depends on that.
    const nested = path.join(REPO_ROOT, 'src', 'lib')
    const result = runCommand('prettier', ['--version'], nested)

    expect(result.failed).toBe(false)
    expect(result.stdout.trim()).toMatch(/^\d+\./)
  })

  it('marks a command that cannot be spawned as failed', () => {
    expect(runCommand('definitely-not-a-real-binary', [], REPO_ROOT).failed).toBe(true)
  })

  it('finds project-local binaries, which are not on PATH by default', () => {
    // The bin spawns `prettier` / `eslint_d` by bare name; they live in node_modules/.bin.
    const result = runCommand('prettier', ['--version'], REPO_ROOT)

    expect(result.failed).toBe(false)
    expect(result.stdout.trim()).toMatch(/^\d+\./)
  })
})

describe('readStream', () => {
  it('concatenates every chunk', async () => {
    async function* chunks() {
      yield Buffer.from('{"a":')
      yield Buffer.from('1}')
    }

    expect(await readStream(chunks())).toBe('{"a":1}')
  })

  it('keeps a multi-byte character split across two chunks intact', async () => {
    // stdin arrives in 64 KiB chunks with no regard for character boundaries. Decoding each
    // chunk on its own turns the straddling character into replacement bytes, which for a hook
    // payload means formatting a path that does not exist.
    const full = Buffer.from('{"file_path":"/tmp/ééé.md"}', 'utf8')
    const cut = 20
    async function* split() {
      yield full.subarray(0, cut)
      yield full.subarray(cut)
    }

    expect(await readStream(split())).toBe(full.toString('utf8'))
  })

  it('accepts string chunks too, as a stream with an encoding set yields', async () => {
    async function* chunks() {
      yield '{"a":'
      yield '1}'
    }

    expect(await readStream(chunks())).toBe('{"a":1}')
  })

  it('returns an empty string for an empty stream', async () => {
    async function* nothing(): AsyncGenerator<Buffer> {
      // no chunks
    }

    expect(await readStream(nothing())).toBe('')
  })
})
