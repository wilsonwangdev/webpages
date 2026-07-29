import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://wilson-web.pages.dev",
  base: "/ara",
  outDir: "dist",
  build: {
    format: "directory",
  },
});
