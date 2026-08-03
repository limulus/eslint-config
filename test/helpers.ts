import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint, type Linter } from 'eslint'

import config from '../index.js'

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures')

export function createESLint(overrides: Linter.Config[] = []): ESLint {
  return new ESLint({
    cwd: TEST_DIR,
    overrideConfigFile: true,
    // Deliberately no `settings.react.version` override. Pinning one here would mask the
    // detection crash this config has to handle itself — see the regression test in
    // config.test.ts. Tests must lint the config exactly as consumers receive it.
    overrideConfig: [...(config as Linter.Config[]), ...overrides],
  })
}

/** Lints a single fixture and returns the set of rule IDs that reported against it. */
export async function lintFixture(
  fixture: string,
  overrides: Linter.Config[] = []
): Promise<Set<string | null>> {
  const eslint = createESLint(overrides)
  const [result] = await eslint.lintFiles([path.join(FIXTURES_DIR, fixture)])
  return new Set(result.messages.map((message) => message.ruleId))
}
