import { defineConfig } from 'vite';
import { rhubarbLipSyncPlugin } from './server/speech/rhubarb-vite-plugin.js';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [rhubarbLipSyncPlugin()],
  server: {
    port: 5176,
    strictPort: true,
    watch: {
      ignored: [
        '**/artifacts/**',
        '**/dist/**',
        '**/playwright-report/**',
        '**/test-results/**',
      ],
    },
  },
  build: {
    // The remaining large shared chunk is the Three.js runtime used across
    // scene/edit/export flows, so the default Vite warning threshold is too low.
    chunkSizeWarningLimit: 700,
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        help: 'help.html',
        speech: 'speech-lab.html',
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
