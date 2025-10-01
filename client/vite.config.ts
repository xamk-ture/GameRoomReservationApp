import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use env var from compose, fallback to service name when running in Docker
// and localhost when running locally.
const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:5025";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
