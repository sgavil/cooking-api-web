import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cooking-api-web/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    reportCompressedSize: false,
  },
})