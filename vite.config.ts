import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error Dev-only JS plugin without type declarations
import viteWritingGradePlugin from './scripts/vite-writing-grade-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteWritingGradePlugin() as Plugin],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
