import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5001',
      '/r': 'http://localhost:5001',
      '/upload-image': 'http://localhost:5001',
      '/health': 'http://localhost:5001',
      '/uploads': 'http://localhost:5001'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
