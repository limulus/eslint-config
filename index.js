module.exports = {
  extends: [ 'standard' ],
  ignorePatterns: [ 'node_modules/', 'built/' ],
  env: { 'jest': true },
  parser: '@typescript-eslint/parser',
  plugins: [
    'eslint-plugin-standard',
    '@typescript-eslint/eslint-plugin'
  ],
  rules: {
    'arrow-parens': [ 'error', 'always' ],
    'comma-dangle': [ 'error', {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never'
    }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error'
  }
}
