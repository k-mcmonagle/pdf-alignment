import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: false, // We provide our own manifest.json
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
      },
    }),
  ],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          konva: ['konva', 'react-konva'],
        },
      },
    },
  },
});
