import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // `npm run worker:dev` serves the API on 8787 for /admin development.
      "/api": "http://127.0.0.1:8787",
      "/media": "http://127.0.0.1:8787",
    },
  },
});
