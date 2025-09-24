// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',        // DOM globals for React tests
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      'pixi.js': resolve(__dirname, 'tests/setup/pixi.module-mock.ts'),
    },
    deps: {
      inline: ['lodash-es'],   // 👈 add this line
    },
    coverage: {
      provider: 'v8',            // ← built-in; no external package needed
      reportsDirectory: 'coverage'
    },
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})