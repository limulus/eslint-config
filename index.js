module.exports = {
  extends: [
    'standard-with-typescript',
    'plugin:@typescript-eslint/recommended'
  ],
  ignorePatterns: [ 'node_modules/', 'dist/' ],
  env: { 'jest': true },
  parser: '@typescript-eslint/parser',
  plugins: [
    'eslint-plugin-standard',
    '@typescript-eslint/eslint-plugin',
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
    "@typescript-eslint/no-implicit-any-catch": ["error"],
  }
}
