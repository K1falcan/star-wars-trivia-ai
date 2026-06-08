import { defineConfig } from "vite";

// Static SPA build for Cloudflare Pages. Output goes to dist/.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});
