import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./", // CRITICAL: This makes assets load from ./assets instead of /assets
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
