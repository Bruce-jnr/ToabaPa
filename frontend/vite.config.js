import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const config = loadEnv(mode, process.cwd(), ['API_URL', 'VITE_API_URL'])
  if (!config.VITE_API_URL) throw new Error('Set VITE_API_URL in the environment or .env file.')
  if (!config.API_URL) throw new Error('Set API_URL in the environment or .env file.')
  return {
  plugins: [react()],
  envDir: '..',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': config.API_URL,
    },
  },
  }
})
