import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The browser never talks to n8n directly in local development. The dev
// server proxies /api/* to the Express server, which is the only place that
// knows the n8n shared secret (see server/server.js, src/api/client.js).
//
// GitHub Pages deployment (classroom target:
// https://viviangal.github.io/medcore-document-operations-hub/) needs two
// build-only adjustments that must NOT affect local dev:
//   - `base` — GitHub Pages serves this project from a sub-path, not "/", so
//     the production build's asset URLs and router need that prefix. Using
//     `command === 'build'` here (true only for `vite build`, never for
//     `vite`/`vite dev`) keeps `npm run dev` serving from "/" exactly as
//     before.
//   - `build.outDir` — set to "docs" so `npm run build` produces a site the
//     repository can publish directly from main branch's /docs folder,
//     which is what GitHub Pages' "Deploy from a branch" option expects.
//     `docs/` is not listed in .gitignore, so the generated site is
//     committable (nothing else about .gitignore changes).
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/medcore-document-operations-hub/' : '/',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true
      }
    }
  }
}))
