import { defineConfig } from 'vitest/config'

// The packaging check spawns a real `npm pack` (full prepack build) plus a consumer
// install, too slow for the everyday `npm test` loop — it runs via `npm run test:pack`
// on pre-push and in CI after verify. Coverage stays off: the test loads no production
// code, so the 100% thresholds would spuriously fail.
export default defineConfig({
  test: {
    include: ['src/packaging.test.ts'],
    environment: 'node',
  },
})
