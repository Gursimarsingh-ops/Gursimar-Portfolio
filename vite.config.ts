import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Where the browser's /api and /media requests go.
 *
 * - default: the local Worker started by `npm run dev:api`, which itself is
 *   bound to the shared production D1 and Backblaze B2 store (see wrangler.toml).
 * - `API_PROXY_TARGET=https://your-worker.workers.dev` (in .env.local or the
 *   shell) sends requests straight to the deployed Worker instead, so the dev
 *   UI and the live site use literally the same backend instance.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.API_PROXY_TARGET || "http://127.0.0.1:8787").trim();
  const targetIsRemote = !/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])/i.test(apiTarget);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // `npm run dev:api` serves the API on 8787 for /admin and /security development.
        "/api": { target: apiTarget, changeOrigin: targetIsRemote },
        "/media": { target: apiTarget, changeOrigin: targetIsRemote },
      },
    },
  };
});
