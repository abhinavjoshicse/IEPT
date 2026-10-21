import { defineConfig } from 'vite';
import contentPlugin from './scripts/build-content.js';

export default defineConfig({
  plugins: [contentPlugin()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
});
