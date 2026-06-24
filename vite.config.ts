/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import { fileURLToPath } from 'node:url'

/** Splits large third-party dependencies into their own cacheable chunks. */
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined

  // CodeMirror is the heaviest dependency — keep it (and its lezer parsers)
  // isolated so it can be lazy-loaded without dragging in the rest of vendor.
  if (
    id.includes('@codemirror') ||
    id.includes('@uiw/react-codemirror') ||
    id.includes('@lezer') ||
    id.includes('codemirror')
  ) {
    return 'vendor-codemirror'
  }

  if (id.includes('lucide-react')) {
    return 'vendor-lucide'
  }

  if (
    id.includes('/react-dom/') ||
    id.includes('/react/') ||
    id.includes('/scheduler/')
  ) {
    return 'vendor-react'
  }

  return undefined
}

export default defineConfig({
  plugins: [react(), viteCompression({ algorithm: 'gzip' })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
})
