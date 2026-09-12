import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/app.js';

test('agent panel previews full images, downloads complete JSON and identifies the current editor', async ({ page }) => {
  test.setTimeout(120000);
  const definition = { name: 'Prueba del panel', rows: Array.from({ length: 151 }, (_, index) => ({ index, value: `Pieza ${index}` })), notes: 'complete '.repeat(700) };
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  let submitted;
  await page.route('**/agent/config', route => route.fulfill({ json: { assistantUrl: 'http://127.0.0.1:47899/assistant', webSocketUrl: 'ws://127.0.0.1:47899/unavailable' } }));
  await page.route('**/assistant/status', route => route.fulfill({ json: { providers: { ollama: { configured: true, local: true, defaultModel: 'ui-test-model' } } } }));
  await page.route('**/assistant/probe', route => route.fulfill({ json: { ok: false, model: 'ui-test-model', capabilities: { tools: true, vision: false, structuredJson: true }, manualReviewRequired: true } }));
  await page.route('**/assistant/chat', async route => {
    submitted = route.request().postDataJSON();
    const events = [
      { type: 'tool_completed', name: 'export_character_asset', ok: true, artifacts: [{ kind: 'json', mimeType: 'application/json', encoding: 'json', filename: 'personaje-completo.json', data: definition }, { kind: 'image', mimeType: 'image/png', encoding: 'base64', filename: 'vista.png', data: png }] },
      { type: 'visual_review_required', message: 'Las vistas están listas para tu revisión.' },
      { type: 'text_delta', delta: 'Texto provisional del proveedor.' },
      { type: 'completed', text: 'Archivos preparados para la prueba del panel.' },
    ];
    await route.fulfill({ contentType: 'application/x-ndjson', body: events.map(event => JSON.stringify(event)).join('\n') + '\n' });
  });
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.getByRole('button', { name: 'AGENT', exact: true }).click();
  await page.getByRole('button', { name: 'COMPROBAR', exact: true }).click();
  await expect(page.locator('.rv-agent-capabilities')).toContainText('visión ✗');
  await page.locator('.rv-agent-input').fill('Guarda el personaje');
  await page.locator('.rv-agent-send').click();
  await expect(page.locator('.rv-agent-artifact')).toHaveCount(2);
  await expect(page.locator('.rv-agent-artifact img')).toBeVisible();
  await expect(page.locator('.rv-agent-messages')).toContainText('revisión');
  await expect(page.locator('.rv-agent-assistant').last()).toHaveText('Archivos preparados para la prueba del panel.');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.rv-agent-artifact').first().getByRole('link').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('personaje-completo.json');
  const saved = path.join(process.cwd(), 'artifacts', 'llm-character-control', 'panel-download.json');
  await fs.mkdir(path.dirname(saved), { recursive: true });
  await download.saveAs(saved);
  expect(JSON.parse(await fs.readFile(saved, 'utf8'))).toEqual(definition);
  expect(submitted.sessionId).toBe(await page.evaluate(() => sessionStorage.getItem('retrovisor-agent-session')));
});
