# @limulus/eslint-config

My ESLint configuration, based on [eslint-config-universe](https://www.npmjs.com/package/eslint-config-universe).

Feel free to use for your own projects, but it is entirely subject to my own whims.

## Set Up

Add a `.eslintrc.js`:

```js
module.exports = {
  "extends": ["@limulus"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx", "*.d.ts"],
      "parserOptions": { "project": "./tsconfig.json" }
    }
  ]
}
```

Add a `prettier.config.js`:

```js
module.exports = {
  ...require('@limulus/eslint-config/prettier'),
}
```
