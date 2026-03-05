import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  base: '/tp4/',
  plugins: [vue(), vueDevTools()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Ton serveur Node local
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'https://192.168.75.88:8443', // Ta VM
        changeOrigin: true,
        secure: false, // Important : accepte les certificats auto-signés de la VM
        rewrite: (path) => path.replace(/^\/auth/, ''),
      },
    },
  },
});
