import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      hmr: true,
      watch: {},
      proxy: {
        "/api": {
          target:
            process.env.VITE_BACKEND_PROXY_TARGET || "http://localhost:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
