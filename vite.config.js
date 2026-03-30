import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/VIP_Model/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  }
})
