# @limulus/eslint-config

My ESLint configuration, based on
[eslint-config-universe](https://www.npmjs.com/package/eslint-config-universe).

Feel free to use for your own projects, but it is entirely subject to my own whims.

## Set Up

Add an `eslint.config.js`:

```js
import config from '@limulus/eslint-config'

export default [
  ...config,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
]
```

Add a `prettier.config.js`:

```js
module.exports = {
  ...require('@limulus/eslint-config/prettier'),
}
```

Formatting is checked by ESLint itself: `prettier/prettier` reports as a warning, so
`eslint --fix` formats and `eslint --max-warnings 0` fails on unformatted code. This package
enables that rule and depends on `eslint-plugin-prettier` and `eslint-config-prettier`
directly, rather than inheriting them from eslint-config-universe, which turned the rule off
in 16.1.0.

Markdown prose is hard-wrapped at 92 columns. This is scoped to Markdown, so YAML is left
alone.
