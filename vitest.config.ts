// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',        // DOM globals for React tests
    setupFiles: ['./vitest.setup.ts'],
    deps: {
      inline: ['lodash-es'],   // 👈 add this line
    },
    coverage: {
      provider: 'v8',            // ← built-in; no external package needed
      reportsDirectory: 'coverage'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})