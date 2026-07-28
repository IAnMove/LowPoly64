import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { createCompanionServer } from '../../server/agent/companion.js';
import { callCompanionCommand } from '../../server/agent/command-client.js';

const APP_PORT = 41735;
const AGENT_PORT = 47831;
const TOKEN = 'standalone-browser-e2e-token-123456789';
const ORIGIN = `http://127.0.0.1:${APP_PORT}`;

async function waitForHttp(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test('standalone browser-to-companion-to-command E2E', { timeout: 240_000 }, async (t) => {
  const vite = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host', '127.0.0.1',
      '--port', String(APP_PORT),
      '--strictPort',
    ],
    { cwd: process.cwd(), stdio: 'ignore' },
  );
  const companion = createCompanionServer({
    host: '127.0.0.1',
    port: AGENT_PORT,
    token: TOKEN,
    allowedOrigins: [ORIGIN],
    commandTimeoutMs: 20_000,
  });
  await companion.listen();
  await waitForHttp(ORIGIN);
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  t.after(async () => {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    await companion.close().catch(() => {});
    vite.kill('SIGTERM');
  });

  await page.goto(ORIGIN, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60_000 });
  while (companion.registry.sessions.size !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const command = (name, args = {}) => callCompanionCommand(name, args, {
    host: '127.0.0.1',
    port: AGENT_PORT,
    token: TOKEN,
  });

  const created = await command('add_primitive', { type: 'cube', name: 'STANDALONE E2E CUBE' });
  assert.equal(created.ok, true);
  const id = created.changedIds[0];
  await command('select_objects', { ids: [id], mode: 'replace' });
  await command('update_object_transform', {
    id,
    position: [2, 1.5, -1],
    rotation_degrees: [0, 35, 0],
    scale: [1.2, 0.8, 1],
    relative: false,
  });
  const capture = await command('capture_viewport', {
    max_width: 128,
    max_height: 128,
    format: 'png',
  });
  assert.equal(capture.data.mimeType, 'image/png');
  assert.ok(capture.data.data.length > 1_000);
  await command('update_object_transform', {
    id,
    position: [-0.5, 0, 0],
    rotation_degrees: null,
    scale: null,
    relative: true,
  });
  await command('undo');
  assert.deepEqual((await command('get_object', { id, detail: 'compact' })).data.transform.position, [2, 1.5, -1]);
  await command('redo');
  assert.deepEqual((await command('get_object', { id, detail: 'compact' })).data.transform.position, [1.5, 1.5, -1]);
  await assert.rejects(
    command('delete_objects', { ids: [id], confirm: false }),
    (error) => error.code === 'CONFIRMATION_REQUIRED',
  );
  await command('delete_objects', { ids: [id], confirm: true });
  await command('undo');
  assert.equal((await command('get_object', { id, detail: 'compact' })).ok, true);

  await page.goto('about:blank');
  while (companion.registry.sessions.size !== 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await assert.rejects(command('get_scene_summary'), (error) => error.code === 'NO_ACTIVE_EDITOR');
  await page.goto(ORIGIN, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60_000 });
  while (companion.registry.sessions.size !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal((await command('get_scene_summary')).ok, true);
});
