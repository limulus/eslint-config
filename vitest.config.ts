import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json', 'text', 'text-summary'],
      include: ['src/**/*.ts'],
      // cli.ts is a process entry point — proven by a spawn-based smoke test instead.
      exclude: ['**/node_modules/**', '**/mocks/**', 'src/bin/cli.ts'],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    environment: 'node',
    // packaging.test.ts runs a real `npm pack` (full build) — too slow for the default
    // suite; it runs via `npm run test:pack` (see vitest.pack.config.ts)
    exclude: ['**/node_modules/**', '**/dist/**', 'src/packaging.test.ts'],
  },
})
