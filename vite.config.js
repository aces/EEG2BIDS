import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content Security Policy for the renderer, injected into index.html in
 * place of the %CSP% token. The dev variant additionally allows inline
 * scripts (Vite's react-refresh preamble) and the HMR websocket; production
 * allows no inline scripts at all. connect-src covers the local Python
 * Socket.IO backend (polling + websocket transports); the backend port is
 * configurable at runtime, so any loopback port is allowed. The policy is
 * baked in at build time and cannot know the chosen port, but the backend
 * only ever binds 127.0.0.1, so this stays loopback-only.
 * @param {boolean} dev - true for the dev server, false for a build
 * @return {string} the policy string
 */
const contentSecurityPolicy = (dev) => [
  `default-src 'self'`,
  `script-src 'self'${dev ? ` 'unsafe-inline'` : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data:`,
  `font-src 'self' data:`,
  `connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*` +
    (dev ? ' ws://localhost:3000' : ''),
].join('; ');

export default defineConfig(({command}) => ({
  // Relative asset paths so the production build loads from file:// in
  // Electron
  base: './',
  plugins: [
    react(),
    {
      name: 'inject-csp',
      transformIndexHtml(html) {
        return html.replace(
            '%CSP%',
            contentSecurityPolicy(command === 'serve'),
        );
      },
    },
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: 'build',
  },
}));
