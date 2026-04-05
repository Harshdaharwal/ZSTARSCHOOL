import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so `dist/` works when opened from a subfolder (e.g. Live Server) and for portable hosting.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
})
