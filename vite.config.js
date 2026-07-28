import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Every production build stamps sw.js with a fresh cache version, so the
// service worker always changes bytes and browsers always detect an update.
// This used to be a manual "remember to bump V" step — after missing it
// several deploys in a row (landing page changes sitting stale in already-
// open tabs while a fresh incognito window saw them fine, a dead giveaway
// of exactly this bug), automating it removes the human-memory dependency
// entirely instead of relying on remembering next time too.
function stampServiceWorker() {
  return {
    name: 'stamp-sw-version',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js');
      const content = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, content.replace(/const V = '[^']*';/, `const V = 'fip-${Date.now()}';`));
    },
  };
}

export default {
  plugins: [stampServiceWorker()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),   // landing page (site root)
        app: resolve(__dirname, 'app.html'),         // the Clerk-gated tracker app
        share: resolve(__dirname, 'share.html'),
      },
    },
  },
};
