import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), viteCommonjs()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
