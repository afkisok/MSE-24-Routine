import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Configure Vite 8 WebSocket & HMR for Cloud Run / AI Studio HTTPS reverse proxy (*.run.app)
      // while preserving DISABLE_HMR=true file-watch suppression during agent edits.
      ws: {
        protocol: 'wss',
        clientPort: 443,
      },
      hmr: isHmrDisabled
        ? false
        : {
            protocol: 'wss',
            clientPort: 443,
          },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: isHmrDisabled ? null : {},
    },
  };
});

