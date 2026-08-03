import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.join(HERE, '..', '..')
const BIN = path.join(HERE, 'cli.ts')

/**
 * A scratch consumer project, deliberately created inside the repo: `@limulus/eslint-config`
 * then self-references through this package's own `exports` map, which is what a real consumer
 * resolves. The node_modules symlink is what puts `.bin` on the spawned formatter's PATH.
 *
 * The unit suite injects a fake ESLint, so it proves the orchestration and nothing about whether
 * the config can actually be loaded. That gap is why an ESLint 10 crash in the React rules sat
 * undetected behind a green 100%-coverage suite: the bin swallowed it into a silent Prettier
 * pass. These tests spawn the real binary against a real ESLint.
 */
const makeProject = (eslintConfig: string): string => {
  const dir = mkdtempSync(path.join(REPO, '.integration-'))
  symlinkSync(path.join(REPO, 'node_modules'), path.join(dir, 'node_modules'), 'dir')
  writeFileSync(path.join(dir, 'eslint.config.js'), eslintConfig)
  writeFileSync(path.join(dir, '.prettierrc.json'), '"@limulus/eslint-config/prettier"\n')
  return dir
}

const workDir = makeProject(
  "import config from '@limulus/eslint-config'\n\nexport default config\n"
)
const brokenDir = makeProject("throw new Error('plugin exploded after an upgrade')\n")

afterAll(() => {
  for (const dir of [workDir, brokenDir]) rmSync(dir, { recursive: true, force: true })
})

const runBin = (target: string, cwd = workDir) => runBinArgs([target], cwd)

const runBinArgs = (args: string[], cwd = workDir) =>
  spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' })

describe('the eslint arm, end to end', () => {
  it('applies a lint fix that prettier alone could not make', () => {
    // `let` -> `const` is the discriminator: no Prettier configuration can produce it, so seeing
    // it proves ESLint actually linted rather than the fallback quietly taking over. The spacing
    // inside console.log is the Prettier half of the same pass.
    const target = path.join(workDir, 'app.js')
    writeFileSync(
      target,
      "import path from 'node:path'\n\nlet root = path.sep\nconsole.log( root )\n"
    )

    const result = runBin(target)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe(
      "import path from 'node:path'\n\nconst root = path.sep\nconsole.log(root)\n"
    )
  })

  it('formats a dash-prefixed path passed after --', () => {
    // The separator has to survive two hops: this bin's own parser, and the formatter it
    // spawns. Both would otherwise read the name as an option.
    writeFileSync(path.join(workDir, '-dash.js'), 'let a = 1\nconsole.log( a )\n')

    const result = runBinArgs(['--', '-dash.js'])

    expect(result.status).toBe(0)
    expect(readFileSync(path.join(workDir, '-dash.js'), 'utf8')).toBe(
      'const a = 1\nconsole.log(a)\n'
    )
  })

  it('formats but says so when the consumer eslint config is broken outright', () => {
    // The failure this guards is degradation, not breakage: every file still comes out
    // formatted and the hook still exits 0, so without the diagnostic a project can lose the
    // entire lint half of the tool and never be told.
    const target = path.join(brokenDir, 'app.js')
    writeFileSync(target, "let root = 'x'\nconsole.log( root )\n")

    const result = runBin(target, brokenDir)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe("let root = 'x'\nconsole.log(root)\n")
    expect(result.stderr).toMatch(/could not lint/)
    expect(result.stderr).toMatch(/plugin exploded after an upgrade/)
  })

  it('formats a file the eslint arm cannot parse via the prettier fallback', () => {
    // A .ts outside any tsconfig include. ESLint cannot produce a fix for it; Prettier can, and
    // the file must not be left untouched.
    const target = path.join(workDir, 'stray.ts')
    writeFileSync(target, 'export const value:string   =    "quoted"\n')

    const result = runBin(target)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe("export const value: string = 'quoted'\n")
    // Says so, rather than leaving it to be discovered. A .ts that never gets linted is worth
    // one line of stderr even though it is a configuration choice rather than a fault.
    expect(result.stderr).toMatch(/could not lint/)
    expect(result.stderr).toMatch(/requires type information/)
  })
})
