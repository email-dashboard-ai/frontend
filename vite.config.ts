import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: "./postcss.config.js",
  },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          redux: ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          mui: [
            "@mui/material",
            "@mui/icons-material",
            "@emotion/react",
            "@emotion/styled",
          ],
          vendor: [
            "axios",
            "jwt-decode",
            "md5",
            "react-hot-toast",
            "react-hook-form",
            "lucide-react",
          ],
        },
      },
    },
  },
});
