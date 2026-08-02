import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// The prepack build makes this far slower than vitest's default timeout.
const PACK_TIMEOUT = 120_000

interface PackReport {
  files: { path: string }[]
}

interface Manifest {
  bin: Record<string, string>
  exports: Record<string, { import: string }>
}

// Drop inherited npm_* vars so a parent npm invocation can't alter the spawned npm.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^npm_/i.test(key))
)

let workDir: string
let paths: string[]
let manifest: Manifest

beforeAll(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'limulus-pack-'))

  const pack = spawnSync(
    'npm',
    ['pack', '--json', '--foreground-scripts=false', '--pack-destination', workDir],
    { cwd: repoRoot, encoding: 'utf8', env, timeout: PACK_TIMEOUT }
  )
  expect(pack.error).toBeUndefined()
  expect(pack.status).toBe(0)

  // Lifecycle output can precede the JSON despite --foreground-scripts=false
  const report = (
    JSON.parse(pack.stdout.slice(pack.stdout.indexOf('['))) as PackReport[]
  )[0]
  paths = report.files.map((file) => file.path)
  manifest = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
  ) as Manifest
}, PACK_TIMEOUT)

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

describe('the published tarball', () => {
  it('ships the config entry points', () => {
    expect(paths).toContain('index.js')
    expect(paths).toContain('prettier.js')
  })

  it('ships every path the manifest points at', () => {
    for (const target of Object.values(manifest.bin)) {
      expect(paths).toContain(target.replace(/^\.\//, ''))
    }
    for (const target of Object.values(manifest.exports)) {
      expect(paths).toContain(target.import.replace(/^\.\//, ''))
    }
  })

  it('ships the compiled bin, not just its source', () => {
    expect(paths.some((file) => file.startsWith('dist/bin/'))).toBe(true)
  })

  it('ships src for source maps but excludes tests', () => {
    expect(paths.some((file) => file.startsWith('src/'))).toBe(true)
    expect(paths.filter((file) => file.endsWith('.test.ts'))).toEqual([])
  })
})
