import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) return 'recharts-vendor';
            // Keep only core React libs in react-vendor to avoid pulling r3f/etc. into it
            if (/node_modules\\react\\/.test(id) || /node_modules\\react-dom\\/.test(id) || /node_modules\\react-router-dom\\/.test(id)) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
