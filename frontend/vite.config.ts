import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Once the FastAPI backend exists, /api calls are forwarded to it.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
