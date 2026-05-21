import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// For GitHub Pages: BASE_PATH=/your-repo-name/ npm run build
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: resolve(import.meta.dirname, 'index.dev.html'),
    },
  },
});
