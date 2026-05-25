import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: "/",
    plugins: [
      vue(),
      vueDevTools(),
      compression({ algorithm: 'gzip', ext: '.gz' }),
      compression({ algorithm: 'brotliCompress', ext: '.br' }),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'Zanzibar Mobile',
          short_name: 'Zanzibar',
          description: 'Application de jeu géolocalisé multijoueur sous-marin',
          theme_color: '#f39c12',
          background_color: '#0d1b2a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          offlineGoogleAnalytics: false,
          navigateFallback: 'offline.html',
          navigateFallbackDenylist: [/^\/api/],
          // 4.1 Precaching - App shell
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
          // 4.2 Stratégie de cache
          runtimeCaching: [
            {
              // 4.3 Tuiles Mapbox - Cache à la volée
              urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'mapbox-tiles',
                expiration: {
                  maxEntries: 500,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 jours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache API game
              urlPattern: /^http:\/\/localhost:3376\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            leaflet: ['leaflet'],
            vue: ['vue', 'vue-router', 'pinia'],
          }
        }
      }
    },
    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:3376",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});