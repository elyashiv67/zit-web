import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  base: '/zit-web/',
  // A check run (API_PROXY_TARGET set) gets its own dependency cache. Sharing node_modules/.vite with a dev
  // server that is already running rewrites that server's prebundled chunks under it, and the next lazy import
  // (the map) loads a second copy of React: "Cannot read properties of null (reading 'useState')".
  cacheDir: process.env.API_PROXY_TARGET ? 'node_modules/.vite-check' : 'node_modules/.vite',
  server: {
    // in dev, call the API as fetch('/api/...') — same origin, so the auth cookie just works
    proxy: {
      '/api': {
        // API_PROXY_TARGET lets a check run the app against another server (e.g. the seeded test server)
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:4586',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.jsx'],
    css: false,
    // the users are in Israel; DST tests depend on it
    env: { TZ: 'Asia/Jerusalem' },
  },
})
