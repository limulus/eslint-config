import { describe, expect, it } from 'vitest'

import { FIXTURES_DIR, lintFixture } from './helpers.ts'

describe('lint behavior', () => {
  it('reports the rules this package adds on top of universe', async () => {
    const reported = await lintFixture('core.js')

    expect(reported).toContain('no-nested-ternary')
    expect(reported).toContain('no-void')
  })

  it('reports the React Compiler rules from eslint-plugin-react-hooks', async () => {
    const reported = await lintFixture('react-compiler.jsx')

    expect(reported).toContain('react-hooks/set-state-in-effect')
    expect(reported).toContain('react-hooks/refs')
    expect(reported).toContain('react-hooks/purity')
  })

  it('reports type-aware rules when a project is configured', async () => {
    const reported = await lintFixture('type-aware.ts', [
      {
        languageOptions: {
          parserOptions: { projectService: true, tsconfigRootDir: FIXTURES_DIR },
        },
      },
    ])

    expect(reported).toContain('@typescript-eslint/prefer-readonly')
  })
})
