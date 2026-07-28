import { resolve } from 'path';

export default {
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
