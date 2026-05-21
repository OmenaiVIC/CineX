import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: './index.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@stacks')) {
            return 'vendor-stacks';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/components'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@features': path.resolve(__dirname, './src/features'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@data': path.resolve(__dirname, './src/data'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@config': path.resolve(__dirname, './src/config'),
      '@services': path.resolve(__dirname, './src/services'),
      '@routes': path.resolve(__dirname, './src/app/routes')
    }
  }
})
