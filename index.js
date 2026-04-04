const { defineConfig } = require('eslint/config')
const globals = require('globals')
const webConfig = require('eslint-config-universe/flat/web')
const typescriptAnalysisConfig = require('eslint-config-universe/flat/shared/typescript-analysis')

module.exports = defineConfig([
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
