import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteCommonjs()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    css: false,
  },
});
