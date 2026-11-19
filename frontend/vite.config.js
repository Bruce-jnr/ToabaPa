import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const config = loadEnv(mode, process.cwd(), ['API_URL', 'VITE_API_URL', 'VITE_PUBLIC_API_URL', 'VITE_APP_URL', 'VITE_MARKETING_URL'])
  if (!config.VITE_APP_URL || !config.VITE_MARKETING_URL) throw new Error('Set VITE_APP_URL and VITE_MARKETING_URL in the environment or .env file.')
  if (mode === 'marketing' && !config.VITE_PUBLIC_API_URL) throw new Error('Set VITE_PUBLIC_API_URL for the marketing build.')
  if (mode !== 'marketing' && !config.VITE_API_URL) throw new Error('Set VITE_API_URL for the app build.')
  if (command === 'serve' && mode !== 'marketing' && !config.API_URL) throw new Error('Set API_URL for the development API proxy.')
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '#site-app': fileURLToPath(new URL(mode === 'marketing' ? './src/MarketingApp.jsx' : './src/App.jsx', import.meta.url)),
    },
  },
  envDir: '..',
  build: {
    outDir: mode === 'marketing' ? '../dist-marketing' : '../dist',
    emptyOutDir: true,
  },
  server: {
    proxy: config.API_URL ? { '/api': config.API_URL } : {},
  },
  }
})
