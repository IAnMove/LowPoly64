import { DEFAULT_AGENT_HOST, DEFAULT_AGENT_PORT } from './config.js';

export async function callCompanionCommand(name, args = {}, options = {}) {
  const host = options.host || process.env.RETROVISOR_AGENT_HOST || DEFAULT_AGENT_HOST;
  const port = Number(options.port || process.env.RETROVISOR_AGENT_PORT || DEFAULT_AGENT_PORT);
  const token = options.token || process.env.RETROVISOR_AGENT_TOKEN;
  if (!token) {
    const error = new Error('RETROVISOR_AGENT_TOKEN is required to connect to the local companion.');
    error.code = 'TOKEN_REQUIRED';
    throw error;
  }
  const response = await fetch(`http://${host}:${port}/agent/command`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name, args, sessionId: options.sessionId || null }),
    signal: options.signal,
  });
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Companion returned HTTP ${response.status}.`);
    error.code = body?.error?.code || 'COMPANION_HTTP_ERROR';
    error.details = body?.error?.details || null;
    throw error;
  }
  return body;
}
