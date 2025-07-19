import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '127.0.0.1',
    hmr: {
      port: 3002,
      host: '127.0.0.1'
    }
  },
})
