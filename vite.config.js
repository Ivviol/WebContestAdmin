import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,   // listen on 0.0.0.0 — accessible from LAN
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
