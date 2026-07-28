import assert from 'node:assert/strict';
import test from 'node:test';
import WebSocket from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createCompanionServer } from '../server/agent/companion.js';

const TOKEN = 'mcp-test-token-with-enough-entropy-123456';
const ORIGIN = 'http://127.0.0.1:5173';

async function testRig(t) {
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    allowedOrigins: [ORIGIN],
    commandTimeoutMs: 1_000,
  });
  const address = await companion.listen();
  const editor = new WebSocket(
    `ws://127.0.0.1:${address.port}/agent/browser?token=${encodeURIComponent(TOKEN)}`,
    { origin: ORIGIN },
  );
  await new Promise((resolve, reject) => {
    editor.once('open', resolve);
    editor.once('error', reject);
  });
  editor.send(JSON.stringify({ type: 'hello', sessionId: 'mcp-editor', visible: true }));
  await new Promise((resolve) => {
    const listener = (raw) => {
      if (JSON.parse(raw.toString()).type === 'hello_ack') {
        editor.off('message', listener);
        resolve();
      }
    };
    editor.on('message', listener);
  });
  editor.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type !== 'command') return;
    const data = message.name === 'capture_viewport'
      ? {
        mimeType: 'image/png',
        width: 1,
        height: 1,
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',
      }
      : { ready: true, echoed: message.args };
    editor.send(JSON.stringify({
      type: 'command_result',
      requestId: message.requestId,
      result: {
        ok: true,
        command: message.name,
        changedIds: [],
        warnings: [],
        data,
        scene: { objectCount: 0 },
      },
    }));
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}/mcp`),
    { requestInit: { headers: { authorization: `Bearer ${TOKEN}` } } },
  );
  const client = new Client({ name: 'retrovisor-test-client', version: '1.0.0' });
  await client.connect(transport);
  t.after(async () => {
    await client.close();
    editor.close();
    await companion.close();
  });
  return client;
}

test('MCP initialize and tools/list expose the strict twenty-tool catalog', async (t) => {
  const client = await testRig(t);
  const tools = await client.listTools();
  assert.equal(tools.tools.length, 20);
  assert.ok(tools.tools.every((tool) => tool.inputSchema.additionalProperties === false));
  assert.equal(tools.tools.find((tool) => tool.name === 'delete_objects').annotations.destructiveHint, true);
});

test('MCP tools/call routes successful calls and rejects invalid/destructive input', async (t) => {
  const client = await testRig(t);
  const status = await client.callTool({ name: 'get_application_status', arguments: {} });
  assert.equal(status.isError, false);
  assert.equal(status.structuredContent.ok, true);

  const invalid = await client.callTool({
    name: 'update_object_transform',
    arguments: { id: 'not-stable', position: [0, 0, 0] },
  });
  assert.equal(invalid.isError, true);
  assert.equal(invalid.structuredContent.error.code, 'VALIDATION_ERROR');

  const destructive = await client.callTool({
    name: 'delete_objects',
    arguments: { ids: ['rv_12345678'], confirm: false },
  });
  assert.equal(destructive.isError, true);
  assert.equal(destructive.structuredContent.error.code, 'CONFIRMATION_REQUIRED');

  const capture = await client.callTool({
    name: 'capture_viewport',
    arguments: { max_width: 64, max_height: 64, format: 'png' },
  });
  assert.equal(capture.content[0].type, 'image');
  assert.equal(capture.content[0].mimeType, 'image/png');
});

test('MCP reports NO_ACTIVE_EDITOR when no Retrovisor tab is connected', async (t) => {
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    allowedOrigins: [ORIGIN],
  });
  const address = await companion.listen();
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${address.port}/mcp`),
    { requestInit: { headers: { authorization: `Bearer ${TOKEN}` } } },
  );
  const client = new Client({ name: 'no-editor-test', version: '1.0.0' });
  await client.connect(transport);
  t.after(async () => {
    await client.close();
    await companion.close();
  });
  const result = await client.callTool({ name: 'get_application_status', arguments: {} });
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent.error.code, 'NO_ACTIVE_EDITOR');
});

test('STDIO adapter initializes and forwards a real tools/call to the companion', async (t) => {
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: 0,
    token: TOKEN,
    allowedOrigins: [ORIGIN],
    commandTimeoutMs: 1_000,
  });
  const address = await companion.listen();
  const editor = new WebSocket(
    `ws://127.0.0.1:${address.port}/agent/browser?token=${encodeURIComponent(TOKEN)}`,
    { origin: ORIGIN },
  );
  await new Promise((resolve, reject) => {
    editor.once('open', resolve);
    editor.once('error', reject);
  });
  editor.send(JSON.stringify({ type: 'hello', sessionId: 'stdio-editor', visible: true }));
  await new Promise((resolve) => {
    const listener = (raw) => {
      if (JSON.parse(raw.toString()).type === 'hello_ack') {
        editor.off('message', listener);
        resolve();
      }
    };
    editor.on('message', listener);
  });
  editor.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type === 'command') {
      editor.send(JSON.stringify({
        type: 'command_result',
        requestId: message.requestId,
        result: {
          ok: true,
          command: message.name,
          changedIds: [],
          warnings: [],
          data: { objectCount: 3 },
          scene: { objectCount: 3 },
        },
      }));
    }
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['server/agent/mcp-stdio.js'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      RETROVISOR_AGENT_HOST: '127.0.0.1',
      RETROVISOR_AGENT_PORT: String(address.port),
      RETROVISOR_AGENT_TOKEN: TOKEN,
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'stdio-real-client', version: '1.0.0' });
  await client.connect(transport);
  t.after(async () => {
    await client.close();
    editor.close();
    await companion.close();
  });
  assert.equal((await client.listTools()).tools.length, 20);
  const summary = await client.callTool({ name: 'get_scene_summary', arguments: {} });
  assert.equal(summary.structuredContent.data.objectCount, 3);
});
