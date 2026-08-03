import config from './index.js'

export default [
  {
    // Build output, coverage, and the scratch consumer projects the integration tests create.
    ignores: ['dist/**', 'coverage/**', '.integration-*/**'],
  },
  ...config,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Fixtures are deliberately bad code — they exist to be reported on, not to be clean.
    files: ['test/fixtures/**'],
    rules: {
      'no-nested-ternary': 'off',
      'no-void': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/purity': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
    },
  },
]
