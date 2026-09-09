import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser never talks to n8n directly. In a later milestone the UI will call
// /api/* on this dev server, which proxies to the Express server, which is the
// only place that knows the n8n shared secret.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true
      }
    }
  }
})
