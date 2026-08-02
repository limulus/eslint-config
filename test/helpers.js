import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'

import config from '../index.js'

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url))
export const FIXTURES_DIR = path.join(TEST_DIR, 'fixtures')

export function createESLint(overrides = []) {
  return new ESLint({
    cwd: TEST_DIR,
    overrideConfigFile: true,
    overrideConfig: [
      ...config,
      // universe sets `react: { version: 'detect' }`, which warns on every run because React is
      // not a dependency here. Pinning a version keeps the output clean.
      { settings: { react: { version: '19.0' } } },
      ...overrides,
    ],
  })
}

// Lints a single fixture and returns the set of rule IDs that reported against it.
export async function lintFixture(fixture, overrides = []) {
  const eslint = createESLint(overrides)
  const [result] = await eslint.lintFiles([path.join(FIXTURES_DIR, fixture)])
  return new Set(result.messages.map((message) => message.ruleId))
}
