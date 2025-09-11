import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("d3")) return "recharts-vendor";
            if (id.includes("react")) return "react-vendor";
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
