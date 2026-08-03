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
const workDir = mkdtempSync(path.join(REPO, '.integration-'))
symlinkSync(path.join(REPO, 'node_modules'), path.join(workDir, 'node_modules'), 'dir')
writeFileSync(
  path.join(workDir, 'eslint.config.js'),
  "import config from '@limulus/eslint-config'\n\nexport default config\n"
)
writeFileSync(path.join(workDir, '.prettierrc.json'), '"@limulus/eslint-config/prettier"\n')

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const runBin = (target: string) =>
  spawnSync(process.execPath, [BIN, target], { cwd: workDir, encoding: 'utf8' })

describe('the eslint arm, end to end', () => {
  it('applies a lint fix that prettier alone could not make', () => {
    // `let` -> `const` is the discriminator: no Prettier configuration can produce it, so seeing
    // it proves ESLint actually linted rather than the fallback quietly taking over. The spacing
    // inside console.log is the Prettier half of the same pass.
    const target = path.join(workDir, 'app.js')
    writeFileSync(target, "import path from 'node:path'\n\nlet root = path.sep\nconsole.log( root )\n")

    const result = runBin(target)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe(
      "import path from 'node:path'\n\nconst root = path.sep\nconsole.log(root)\n"
    )
  })

  it('formats a file the eslint arm cannot parse via the prettier fallback', () => {
    // A .ts outside any tsconfig include. ESLint cannot produce a fix for it; Prettier can, and
    // the file must not be left untouched.
    const target = path.join(workDir, 'stray.ts')
    writeFileSync(target, 'export const value:string   =    "quoted"\n')

    const result = runBin(target)

    expect(result.status).toBe(0)
    expect(readFileSync(target, 'utf8')).toBe("export const value: string = 'quoted'\n")
  })
})
