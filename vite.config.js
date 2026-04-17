import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Cameron's Fortnite Bazaar",
        short_name: 'FN Bazaar',
        description: "Cameron's Fortnite Bazaar — browse every skin and its V-Bucks value",
        theme_color: '#0d0d1a',
        background_color: '#0d0d1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fortnite-api\.com\/v2\/(cosmetics|shop)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fortnite-api',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fortnite-images',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
