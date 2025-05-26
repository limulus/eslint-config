# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

This is `@limulus/eslint-config`, a shared ESLint configuration package that extends
`eslint-config-universe`. The package provides both ESLint rules and Prettier configuration
for consistent code formatting. It uses ESLint v9 flat config format.

## Architecture

The project has two main configuration files:

- `index.js` - Main ESLint flat config extending universe/flat/web and
  universe/flat/shared/typescript-analysis
- `prettier.js` - Prettier configuration with custom settings (printWidth: 92, no
  semicolons, single quotes, trailing commas)

## ESLint v9 Flat Config

This package uses ESLint v9 flat config format:

- Uses `defineConfig` from `eslint/config`
- Imports flat configs from `eslint-config-universe/flat/` directory
- Combines web config, TypeScript analysis config, and custom rules
- Adds node globals support

## Development Commands

- `npm test` - Runs test (currently just passes, no actual tests)
- `npm run prepare` - Sets up Husky git hooks

## Package Management

This package uses semantic-release for automated publishing. Commits must follow
conventional commit format as enforced by commitlint.

## Key Dependencies

- `eslint-config-universe` - Base ESLint configuration (v15+ for flat config support)
- `globals` - Global variables for different environments
- Requires peer dependencies: eslint >=9, prettier >=3, typescript >=5
