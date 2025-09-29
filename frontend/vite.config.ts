import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        howItWorks: resolve(__dirname, 'how-it-works.html'),
      },
      output: {
        manualChunks: undefined,
      },
    },
  },
})