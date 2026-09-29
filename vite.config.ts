import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base = nombre del repositorio en GitHub Pages
export default defineConfig({
  base: '/justicia-cercana/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Justicia Cercana',
        short_name: 'Justicia Cercana',
        description: 'Cuaderno digital del juez de paz: casos, trámites y agenda. Funciona sin Internet.',
        lang: 'es',
        orientation: 'landscape',
        display: 'standalone',
        start_url: '/justicia-cercana/',
        scope: '/justicia-cercana/',
        background_color: '#f6f4ef',
        theme_color: '#1d4f91',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff,woff2,png,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { port: 5173 },
});
