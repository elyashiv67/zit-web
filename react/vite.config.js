import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  base: '/zit-web/',
  server: {
    // in dev, call the API as fetch('/api/...') — same origin, so the auth cookie just works
    proxy: {
      '/api': {
        target: 'http://localhost:4586',
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
