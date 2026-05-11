import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/data': 'http://localhost:4000',
    }
  },
  build: {
    outDir: '../static-react',
    emptyOutDir: true,
  }
})
