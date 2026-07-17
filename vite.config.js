import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths so the production build loads from file:// in Electron
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'build',
  },
});
