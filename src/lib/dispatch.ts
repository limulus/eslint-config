import path from 'node:path'

/** Which tool formats a given file. */
export type Strategy = 'eslint' | 'prettier'

// universe enables `prettier/prettier`, so ESLint already applies Prettier to these — running
// Prettier separately would cost a second process for the same result and skip the lint fixes.
const ESLINT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
])

/** The tool that should format `file`. Everything ESLint cannot parse falls to Prettier. */
export function strategyFor(file: string): Strategy {
  return ESLINT_EXTENSIONS.has(path.extname(file).toLowerCase()) ? 'eslint' : 'prettier'
}
