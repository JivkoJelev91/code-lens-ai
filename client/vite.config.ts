import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const SERVER_PORT = 4001

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '/api': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
  },
})