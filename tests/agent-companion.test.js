import assert from 'node:assert/strict';
import test from 'node:test';
import WebSocket from 'ws';
import { createCompanionServer } from '../server/agent/companion.js';

const TOKEN = 'test-token-with-enough-entropy-1234567890';
const ORIGIN = 'http://127.0.0.1:5173';

async function startCompanion(overrides = {}) {
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    allowedOrigins: [ORIGIN],
    commandTimeoutMs: 500,
    heartbeatTimeoutMs: 1_000,
    ...overrides,
  });
  const address = await companion.listen();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { companion, baseUrl, port: address.port };
}

function openEditor(port, sessionId = 'editor-1') {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${port}/agent/browser?token=${encodeURIComponent(TOKEN)}`,
      { origin: ORIGIN },
    );
    socket.once('error', reject);
    socket.once('open', () => {
      socket.send(JSON.stringify({
        type: 'hello',
        sessionId,
        title: 'Test editor',
        visible: true,
      }));
    });
    socket.on('message', (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === 'hello_ack') resolve(socket);
    });
  });
}

async function postCommand(baseUrl, body, token = TOKEN) {
  return fetch(`${baseUrl}/agent/command`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

test('companion exposes browser config only to allowed origins', async (t) => {
  const { companion, baseUrl } = await startCompanion();
  t.after(() => companion.close());

  const rejected = await fetch(`${baseUrl}/agent/config`, {
    headers: { origin: 'http://malicious.invalid' },
  });
  assert.equal(rejected.status, 403);

  const accepted = await fetch(`${baseUrl}/agent/config`, {
    headers: { origin: ORIGIN },
  });
  assert.equal(accepted.status, 200);
  assert.match((await accepted.json()).webSocketUrl, /^ws:\/\/127\.0\.0\.1:/);
});

test('companion reports no active editor and rejects invalid bearer tokens', async (t) => {
  const { companion, baseUrl } = await startCompanion();
  t.after(() => companion.close());

  const unauthorized = await postCommand(baseUrl, { name: 'get_application_status', args: {} }, 'wrong');
  assert.equal(unauthorized.status, 401);

  const missing = await postCommand(baseUrl, { name: 'get_application_status', args: {} });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).error.code, 'NO_ACTIVE_EDITOR');
});

test('companion routes a validated command to the active editor', async (t) => {
  const { companion, baseUrl, port } = await startCompanion();
  t.after(() => companion.close());
  const socket = await openEditor(port);
  t.after(() => socket.close());

  socket.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type !== 'command') return;
    socket.send(JSON.stringify({
      type: 'command_result',
      requestId: message.requestId,
      result: { ok: true, command: message.name, changedIds: [], data: { ready: true } },
    }));
  });

  const response = await postCommand(baseUrl, { name: 'get_application_status', args: {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.command, 'get_application_status');
});

test('disconnect cleanup permits a new editor session to reconnect', async (t) => {
  const { companion, baseUrl, port } = await startCompanion();
  t.after(() => companion.close());
  const first = await openEditor(port, 'same-editor');
  first.close();
  await new Promise((resolve) => first.once('close', resolve));

  const missing = await postCommand(baseUrl, { name: 'get_scene_summary', args: {} });
  assert.equal(missing.status, 503);

  const second = await openEditor(port, 'same-editor');
  t.after(() => second.close());
  second.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === 'command') {
      second.send(JSON.stringify({
        type: 'command_result',
        requestId: message.requestId,
        result: { ok: true, command: message.name, changedIds: [], data: { objectCount: 0 } },
      }));
    }
  });
  const reconnected = await postCommand(baseUrl, { name: 'get_scene_summary', args: {} });
  assert.equal(reconnected.status, 200);
  assert.equal((await reconnected.json()).ok, true);
});

test('assistant status is origin-scoped and missing credentials fail without exposing secrets', async (t) => {
  const { companion, baseUrl } = await startCompanion();
  t.after(() => companion.close());

  const status = await fetch(`${baseUrl}/assistant/status`, { headers: { origin: ORIGIN } });
  assert.equal(status.status, 200);
  const statusBody = await status.json();
  assert.match(statusBody.instructions, /OPENAI_API_KEY/);
  assert.equal(JSON.stringify(statusBody).includes(TOKEN), false);

  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const chat = await fetch(`${baseUrl}/assistant/chat`, {
      method: 'POST',
      headers: { origin: ORIGIN, 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });
    assert.equal(chat.status, 200);
    const events = (await chat.text()).trim().split('\n').map(JSON.parse);
    assert.equal(events.at(-1).type, 'error');
    assert.equal(events.at(-1).code, 'PROVIDER_NOT_CONFIGURED');
  } finally {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  }
});
