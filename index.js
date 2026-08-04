const { createRequire } = require('node:module')
const path = require('node:path')

const { SourceCode } = require('eslint')
const { defineConfig } = require('eslint/config')
const globals = require('globals')
const webConfig = require('eslint-config-universe/flat/web')
const typescriptAnalysisConfig = require('eslint-config-universe/flat/shared/typescript-analysis')

// TEMPORARY: delete once eslint-plugin-import ships a release newer than 2.32.0.
//
// ESLint 10 removed SourceCode#getTokenOrCommentBefore/After. eslint-plugin-import 2.32.0 still
// calls both from `import/order`, which universe enables, so any file with unsorted imports
// crashes the whole run — no --fix required, since ESLint computes fixes eagerly. Upstream fixed
// this in import-js/eslint-plugin-import#3230 (merged 2026-06-29) using exactly the substitution
// below, but that commit is unreleased. Feature-detected, so it is a no-op on ESLint 9.
if (typeof SourceCode.prototype.getTokenOrCommentBefore !== 'function') {
  SourceCode.prototype.getTokenOrCommentBefore = function (node, skip) {
    return this.getTokenBefore(node, { includeComments: true, skip })
  }
}
if (typeof SourceCode.prototype.getTokenOrCommentAfter !== 'function') {
  SourceCode.prototype.getTokenOrCommentAfter = function (node, skip) {
    return this.getTokenAfter(node, { includeComments: true, skip })
  }
}

// TEMPORARY: delete once eslint-plugin-react ships a release that supports ESLint 10.
//
// universe sets `react.version: 'detect'`. The plugin's detection calls `context.getFilename()`,
// which ESLint 10 removed, so it throws while loading the rule for every file the React rules
// match — plain .js included, React installed or not. eslint-plugin-react 7.37.5 (April 2025) is
// still the newest release and universe pins `^7.37.5`, so no combination of this stack can
// detect a version on ESLint 10. The peer range permits ESLint 10, so without this a consumer
// who upgrades gets a config that crashes on every file.
//
// Resolving the version up front sidesteps detection entirely, mirroring the plugin's semantics:
// whichever React is in scope, else its own '999.999.999' "assume latest" default. The one
// difference is that it resolves from process.cwd() rather than each linted file's directory, so
// a monorepo with differing React versions per package gets the root's — a narrow loss against a
// rule set that otherwise cannot run at all.
const reactVersion = (() => {
  try {
    const requireFromCwd = createRequire(path.join(process.cwd(), 'noop.js'))
    return requireFromCwd('react/package.json').version
  } catch {
    return '999.999.999'
  }
})()

module.exports = defineConfig([
  ...webConfig,
  ...typescriptAnalysisConfig,
  {
    settings: {
      react: { version: reactVersion },
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-nested-ternary': 'error',
      'no-void': ['warn', { allowAsStatement: true }],
    },
  },
])
