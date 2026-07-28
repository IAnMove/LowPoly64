import { MAX_HTTP_BODY_BYTES } from './config.js';

export function sendJson(response, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  response.end(body);
}

export async function readJsonBody(request, maxBytes = MAX_HTTP_BODY_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error(`Request body exceeds ${maxBytes} bytes.`);
      error.code = 'PAYLOAD_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function companionErrorBody(error) {
  return {
    ok: false,
    error: {
      code: error?.code || 'COMPANION_ERROR',
      message: String(error?.message || 'Local companion request failed.').slice(0, 500),
      details: error?.details || null,
    },
  };
}
