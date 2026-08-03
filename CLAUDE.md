# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is `@limulus/eslint-config`, a shared ESLint configuration package that extends
`eslint-config-universe`. It provides ESLint rules, Prettier configuration, and a
`limulus-format` bin for formatting a single file. The package is ESM only and uses ESLint
flat config.

## Architecture

Two hand-written entry points, published as-is:

- `index.js` - ESLint flat config extending universe/flat/web and
  universe/flat/shared/typescript-analysis
- `prettier.js` - Prettier options (printWidth: 92, no semicolons, single quotes, trailing
  commas), with a Markdown override setting `proseWrap: 'always'`

Plus the bin, written in TypeScript under `src/` and compiled to `dist/` for publishing:

- `src/lib/` - pure logic, never imports from `src/bin/`. Dispatch by extension, runner
  selection, orchestration, and the injectable IO seams.
- `src/bin/` - `cli.ts` is the entry point (composition only, excluded from coverage);
  `format-command.ts` holds the logic and owns exit codes.

`index.js` carries two temporary shims for ESLint 10, both documented at their definitions:
one restoring `SourceCode` methods for `eslint-plugin-import`, and one resolving the React
version because universe's `'detect'` calls a removed API. Delete each when its upstream
ships.

## What the bin does

`limulus-format <file>` runs `eslint --fix` on JavaScript and TypeScript — universe enables
`prettier/prettier`, so that one pass formats and fixes lint together — and then runs
`prettier --write --ignore-unknown` over everything regardless. The unconditional second
pass is deliberate: it is a ~50ms no-op on a file ESLint handled, and it rescues files
ESLint could not parse.

Exit 0 covers formatted, unchanged, and nothing-to-do. Exit 1 means Prettier itself could
not run. ESLint failing to run (exit 2) is reported on stderr but does not fail the command,
because the file did still get formatted.

## Development Commands

- `npm run verify` - format:check, lint, test with coverage, and tsc --noEmit
- `npm test` - vitest with a 100/100/100/100 coverage gate over `src/**/*.ts`
- `npm run test:pack` - packaging assertions against a real `npm pack`
- `npm run lint` / `npm run format` - self-linting and formatting
- `npm run build` - compile `src/` to `dist/`

Tests follow delto's methodology: red/green/refactor, no `vi.mock()` — inject seams instead
— and entry points are proven by spawning them rather than coverage-ignored. Unit tests use
a fake ESLint, so `src/bin/integration.test.ts` exists to run the real one; do not let that
coverage gap reopen.

## Package Management

This package uses semantic-release for automated publishing. Commits must follow
conventional commit format as enforced by commitlint. Pushing `main` publishes to npm.

Peer dependency ranges are always open-ended (`>=`), never carets — a future major is not
known to be incompatible until it exists.

## Key Dependencies

- `eslint-config-universe` - base configuration
- `globals` - global variables for different environments
- Peer dependencies: eslint >=10, prettier >=3, typescript >=5, and eslint_d >=15 as an
  optional peer (the bin uses the daemon when its major matches the project's ESLint)
