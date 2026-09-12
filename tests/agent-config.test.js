import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AGENT_ALLOWED_ORIGINS,
  DEFAULT_AGENT_HOST,
  DEFAULT_AGENT_PORT,
  DEFAULT_APP_PORT,
  loadAgentConfig,
} from '../server/agent/config.js';

const ENV_KEYS = [
  'RETROVISOR_AGENT_HOST',
  'RETROVISOR_AGENT_PORT',
  'RETROVISOR_AGENT_ALLOWED_ORIGINS',
  'RETROVISOR_AGENT_TOKEN',
];

function restoreEnvironment(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

test('agent config defaults to the Vite app port and loopback origins', () => {
  const snapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  ENV_KEYS.forEach((key) => delete process.env[key]);
  try {
    const config = loadAgentConfig({ token: 'default-config-test-token-123456' });
    assert.equal(DEFAULT_APP_PORT, 5176);
    assert.equal(config.host, DEFAULT_AGENT_HOST);
    assert.equal(config.port, DEFAULT_AGENT_PORT);
    assert.deepEqual([...config.allowedOrigins], DEFAULT_AGENT_ALLOWED_ORIGINS);
    assert.equal(config.allowedOrigins.has('http://127.0.0.1:5173'), false);
    assert.equal(config.allowedOrigins.has('http://malicious.invalid'), false);
  } finally {
    restoreEnvironment(snapshot);
  }
});

test('agent config preserves explicit environment and call-site overrides', () => {
  const snapshot = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.RETROVISOR_AGENT_HOST = 'localhost';
  process.env.RETROVISOR_AGENT_PORT = '48123';
  process.env.RETROVISOR_AGENT_ALLOWED_ORIGINS = 'http://127.0.0.1:41735, http://localhost:41735';
  process.env.RETROVISOR_AGENT_TOKEN = 'environment-config-test-token-123456';
  try {
    const fromEnvironment = loadAgentConfig();
    assert.equal(fromEnvironment.host, 'localhost');
    assert.equal(fromEnvironment.port, 48123);
    assert.deepEqual([...fromEnvironment.allowedOrigins], [
      'http://127.0.0.1:41735',
      'http://localhost:41735',
    ]);

    const fromCallSite = loadAgentConfig({
      host: '::1',
      port: 48124,
      allowedOrigins: ['http://127.0.0.1:41736'],
      token: 'call-site-config-test-token-123456',
    });
    assert.equal(fromCallSite.host, '::1');
    assert.equal(fromCallSite.port, 48124);
    assert.deepEqual([...fromCallSite.allowedOrigins], ['http://127.0.0.1:41736']);
    assert.equal(fromCallSite.token, 'call-site-config-test-token-123456');
  } finally {
    restoreEnvironment(snapshot);
  }
});
