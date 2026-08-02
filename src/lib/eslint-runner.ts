/** Which binary runs ESLint. */
export type Runner = 'eslint' | 'eslint_d'

/**
 * Resolves an installed package's version, or null when it is not installed. Injectable so
 * tests can describe a tree without building one on disk.
 *
 * `'eslint'` means the project's own ESLint; `'eslint_d/eslint'` means whichever ESLint the
 * daemon would load, which is not necessarily the same installation.
 */
export type VersionLookup = (specifier: 'eslint' | 'eslint_d/eslint') => string | null

const major = (version: string): string | undefined => version.split('.')[0]

/**
 * Whether to run through the daemon. `eslint_d` is ~10x faster warm, but it depends on ESLint
 * rather than peering it, so a mismatched install silently lints through a nested copy of
 * another major — different rules, no warning. The peer range should prevent that; this is the
 * safety net for `--legacy-peer-deps`, pnpm layouts, and hand-installs.
 */
export function selectRunner(lookupVersion: VersionLookup): Runner {
  const projectESLint = lookupVersion('eslint')
  const daemonESLint = lookupVersion('eslint_d/eslint')
  if (!projectESLint || !daemonESLint) return 'eslint'

  return major(projectESLint) === major(daemonESLint) ? 'eslint_d' : 'eslint'
}
