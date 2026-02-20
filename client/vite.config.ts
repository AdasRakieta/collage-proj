import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      // Redirect /journey (no trailing slash) → /journey/ so browser refresh works in dev
      name: 'redirect-base-slash',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/journey') {
            res.writeHead(302, { Location: '/journey/' });
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  },
  // Base path for subpath deployment under /journey/
  // This ensures all assets are loaded from /journey/assets/ and React Router works correctly
  base: '/journey/',
})
