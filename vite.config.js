import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const devEntry = resolve(import.meta.dirname, 'index.dev.html');

/** Serve index.dev.html at / during `vite` dev (root index.html is the GH Pages redirect). */
function devIndexPlugin() {
  return {
    name: 'dev-index',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          req.url = '/index.dev.html';
        }
        next();
      });
    },
  };
}

// For GitHub Pages: BASE_PATH=/your-repo-name/ npm run build
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [devIndexPlugin()],
  build: {
    rollupOptions: {
      input: devEntry,
    },
  },
});
