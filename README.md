# @limulus/eslint-config

My ESLint configuration, based on
[eslint-config-universe](https://www.npmjs.com/package/eslint-config-universe).

Feel free to use for your own projects, but it is entirely subject to my own whims.

Requires ESLint 10 or newer. This package is ESM only.

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

Add a `.prettierrc.json`:

```json
"@limulus/eslint-config/prettier"
```

Markdown prose is hard-wrapped at 92 columns. This is scoped to Markdown, so YAML is left
alone.

## Formatting a single file

The package ships a `limulus-format` bin that formats one file the way this config wants it:

```sh
npx limulus-format src/thing.ts
```

It picks the tool for you. JavaScript and TypeScript go through ESLint — universe enables
`prettier/prettier`, so ESLint already applies Prettier to them and fixes lint on the same
pass. Everything else goes through Prettier directly. A file ESLint cannot parse, such as a
`.ts` outside your `tsconfig.json` `include`, falls back to Prettier rather than being
skipped.

Install [`eslint_d`](https://www.npmjs.com/package/eslint_d) to make it roughly ten times
faster:

```sh
npm install --save-dev eslint_d
```

It is an optional peer dependency, so it is only installed if you ask for it. Match its
major to your ESLint major — `eslint_d` 15 is for ESLint 10 — because it depends on ESLint
rather than peering it, and a mismatched install would otherwise lint through a nested copy
with different rule behavior. `limulus-format` checks this and falls back to plain `eslint`
if they disagree.

`eslint_d` caches your config in memory. After editing `eslint.config.js` or upgrading a
plugin, run `eslint_d restart`.

### As a Claude Code hook

The bin reads `tool_input.file_path` from a hook payload on stdin, so it needs no shell
plumbing. In `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "npx limulus-format" }]
      }
    ]
  }
}
```

It exits 0 whether the file was reformatted, already clean, or not something it handles, and
only reports a failure when a formatter genuinely could not run — a hook that exits non-zero
feeds noise back to the agent.

## Upgrading to 7.x

This package is now ESM and requires ESLint 10.

`require('@limulus/eslint-config/prettier')` no longer works. It throws
`ERR_PACKAGE_PATH_NOT_EXPORTED` rather than silently returning a module namespace that
Prettier would ignore in favor of its defaults. Replace a CommonJS `prettier.config.js` with
the `.prettierrc.json` above, or with an ESM config:

```js
import config from '@limulus/eslint-config/prettier'

export default { ...config }
```

ESLint flat configs already using `import config from '@limulus/eslint-config'` need no
change.
