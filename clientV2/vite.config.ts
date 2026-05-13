import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import compression from "vite-plugin-compression";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: "/",
    plugins: [
      vue(),
      vueDevTools(),
      compression({ algorithm: 'gzip', ext: '.gz' }),
      compression({ algorithm: 'brotliCompress', ext: '.br' }),
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