import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    // The remaining large shared chunk is the Three.js runtime used across
    // scene/edit/export flows, so the default Vite warning threshold is too low.
    chunkSizeWarningLimit: 700,
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        help: 'help.html',
      },
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (normalized.includes('/node_modules/jszip/')) {
            return 'jszip';
          }

          if (normalized.includes('/src/data/templates/')) {
            const match = normalized.match(/\/src\/data\/templates\/([^/]+)\//);
            const folder = match?.[1] || 'misc';
            return `templates-${folder}`;
          }

          return undefined;
        },
      },
    },
  },
});
