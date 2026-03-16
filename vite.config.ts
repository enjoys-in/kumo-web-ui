import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const URL = 'http://localhost:8000'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: URL,
        changeOrigin: true,
        ws: true,
      },
      '/metrics': {
        target: URL,
        changeOrigin: true,
      },
    },
  },
})
