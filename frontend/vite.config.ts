import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  optimizeDeps: {
	  exclude: ['@tailwindcss/oxide-linux-x64-gnu', '@tailwindcss/oxide']
  },
  build: {
	  rollupOptions: {
		  external: ['@tailwindcss/oxide-linux-x64-gnu']
	  }
  }
});
