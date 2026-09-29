import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { alphaTab } from '@coderline/alphatab-vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // The browser calls /api on whatever host served the page (Tailscale, an SSH tunnel, localhost),
    // and the dev server forwards it to Django, so only the frontend port has to be reachable.
    const apiProxy = {
      '/api': {
        target: env.API_PROXY_TARGET || 'http://localhost:8000',
        // Keep the browser's Host so Django's ALLOWED_HOSTS applies to the address the user opened.
        changeOrigin: false,
      },
    };
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1')
          .split(',')
          .map(host => host.trim())
          .filter(Boolean),
        proxy: apiProxy,
      },
      preview: {
        proxy: apiProxy,
      },
      plugins: [react(), alphaTab()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
