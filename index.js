import { SourceCode } from 'eslint'
import typescriptAnalysisConfig from 'eslint-config-universe/flat/shared/typescript-analysis.js'
import webConfig from 'eslint-config-universe/flat/web.js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'

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

export default defineConfig([
  ...webConfig,
  ...typescriptAnalysisConfig,
  {
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
