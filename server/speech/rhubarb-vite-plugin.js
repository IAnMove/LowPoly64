import { createRhubarbRequestHandler } from './rhubarb-service.js';

export function rhubarbLipSyncPlugin(options = {}) {
  const handler = createRhubarbRequestHandler(options);
  const attach = server => {
    server.middlewares.use((request, response, next) => {
      Promise.resolve(handler(request, response, next)).catch(next);
    });
  };
  return {
    name: 'retrovisor-rhubarb-lip-sync',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

