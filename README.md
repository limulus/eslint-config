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

Markdown prose is hard-wrapped at 92 columns. This is scoped to Markdown, so YAML is left
alone.
