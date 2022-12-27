module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: ['universe/web', 'universe/shared/typescript-analysis'],
  rules: {
    'no-nested-ternary': 'error',
  },
}
