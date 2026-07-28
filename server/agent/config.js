import crypto from 'node:crypto';

export const DEFAULT_AGENT_PORT = 47831;
export const DEFAULT_AGENT_HOST = '127.0.0.1';
export const MAX_HTTP_BODY_BYTES = 1_100_000;
export const MAX_WS_PAYLOAD_BYTES = 4_500_000;

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function loadAgentConfig(overrides = {}) {
  const host = overrides.host || process.env.RETROVISOR_AGENT_HOST || DEFAULT_AGENT_HOST;
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('RETROVISOR_AGENT_HOST must be a loopback address.');
  }
  const port = Number(overrides.port ?? process.env.RETROVISOR_AGENT_PORT ?? DEFAULT_AGENT_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('RETROVISOR_AGENT_PORT must be a valid TCP port.');
  }
  const token = overrides.token
    || process.env.RETROVISOR_AGENT_TOKEN
    || crypto.randomBytes(32).toString('base64url');
  const allowedOrigins = new Set(overrides.allowedOrigins || splitList(
    process.env.RETROVISOR_AGENT_ALLOWED_ORIGINS
      || 'http://127.0.0.1:5173,http://localhost:5173',
  ));
  return {
    host,
    port,
    token,
    allowedOrigins,
    commandTimeoutMs: Number(overrides.commandTimeoutMs || process.env.RETROVISOR_AGENT_TIMEOUT_MS || 15_000),
    heartbeatTimeoutMs: Number(overrides.heartbeatTimeoutMs || 30_000),
  };
}

export function tokenMatches(expected, provided) {
  if (typeof expected !== 'string' || typeof provided !== 'string') return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function isAllowedOrigin(config, origin) {
  return typeof origin === 'string' && config.allowedOrigins.has(origin);
}
