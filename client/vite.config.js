import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Vitest's transform pipeline doesn't pick up the oxc automatic JSX
  // runtime that vite build/dev use, so it needs an explicit esbuild
  // fallback — only set it under test to avoid vite's "esbuild and oxc
  // both set" warning during normal dev/build.
  ...(mode === 'test' ? { esbuild: { jsx: 'automatic' } } : {}),
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
}))
