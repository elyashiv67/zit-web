import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation'

export default defineConfig({
  plugins: [react(), svgr(), crossOriginIsolation()],
  base: '/zit-web/',
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
})
