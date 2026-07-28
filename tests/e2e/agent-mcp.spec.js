import { expect, test } from '@playwright/test';
import { createCompanionServer } from '../../server/agent/companion.js';
import { callCompanionCommand } from '../../server/agent/command-client.js';

const PORT = 47831;
const TOKEN = 'playwright-agent-token-with-enough-entropy';
let companion;

test.use({ viewport: { width: 800, height: 600 } });

async function command(name, args = {}) {
  return callCompanionCommand(name, args, {
    host: '127.0.0.1',
    port: PORT,
    token: TOKEN,
  });
}

test.beforeAll(async () => {
  companion = createCompanionServer({
    host: '127.0.0.1',
    port: PORT,
    token: TOKEN,
    allowedOrigins: ['http://127.0.0.1:41733'],
    commandTimeoutMs: 20_000,
  });
  await companion.listen();
});

test.afterAll(async () => {
  await companion?.close();
});

test('agent inspects, edits, captures, corrects, and uses undo/redo on the real editor', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true);
  await expect.poll(async () => companion.registry.sessions.size).toBe(1);

  const status = await command('get_application_status');
  expect(status.ok).toBe(true);
  expect(status.data.ready).toBe(true);

  const created = await command('add_primitive', {
    type: 'cube',
    name: 'AGENT TEST CUBE',
    transform: {
      position: [0, 1, 0],
      rotation_degrees: [0, 0, 0],
      scale: [1, 1, 1],
    },
  });
  expect(created.ok).toBe(true);
  const id = created.changedIds[0];
  expect(id).toMatch(/^rv_/);

  const selected = await command('select_objects', { ids: [id], mode: 'replace' });
  expect(selected.data.selectedIds).toEqual([id]);

  const moved = await command('update_object_transform', {
    id,
    position: [2, 1.5, -1],
    rotation_degrees: [0, 35, 0],
    scale: [1.2, 0.8, 1],
    relative: false,
  });
  expect(moved.data.transform.position).toEqual([2, 1.5, -1]);

  const styled = await command('update_object_appearance', {
    id,
    name: 'AGENT BLUE CUBE',
    color: '#4488ff',
    material: 'Phong',
    opacity: 0.9,
  });
  expect(styled.data.appearance.color).toBe('#4488ff');

  const firstCapture = await command('capture_viewport', {
    max_width: 256,
    max_height: 256,
    format: 'png',
  });
  expect(firstCapture.ok).toBe(true);
  expect(firstCapture.data.mimeType).toBe('image/png');
  expect(firstCapture.data.data.length).toBeGreaterThan(1_000);

  const corrected = await command('update_object_transform', {
    id,
    position: [-0.5, 0, 0],
    rotation_degrees: null,
    scale: null,
    relative: true,
  });
  expect(corrected.data.transform.position).toEqual([1.5, 1.5, -1]);

  await command('undo');
  const afterUndo = await command('get_object', { id, detail: 'full' });
  expect(afterUndo.data.transform.position).toEqual([2, 1.5, -1]);

  await command('redo');
  const afterRedo = await command('get_object', { id, detail: 'full' });
  expect(afterRedo.data.transform.position).toEqual([1.5, 1.5, -1]);

  const secondCapture = await command('capture_viewport', {
    max_width: 256,
    max_height: 256,
    format: 'png',
  });
  expect(secondCapture.data.data.length).toBeGreaterThan(1_000);

  await expect(command('delete_objects', { ids: [id], confirm: false }))
    .rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
  const deleted = await command('delete_objects', { ids: [id], confirm: true });
  expect(deleted.ok).toBe(true);

  await command('undo');
  const restored = await command('get_object', { id, detail: 'compact' });
  expect(restored.ok).toBe(true);

  await page.goto('about:blank');
  await expect.poll(async () => companion.registry.sessions.size).toBe(0);
  await expect(command('get_scene_summary')).rejects.toMatchObject({ code: 'NO_ACTIVE_EDITOR' });

  await page.goto('/');
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true);
  await expect.poll(async () => companion.registry.sessions.size).toBe(1);
  expect((await command('get_scene_summary')).ok).toBe(true);
});
