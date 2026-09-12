import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

test('the editor exposes Bocas y voz directly, without opening Character Studio', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const link = page.locator('#btn-speech-lab');
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.locator('#speech-workspace')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
  await page.locator('#workspace-scene-tab').click();
  await expect(page.locator('#speech-workspace')).toBeHidden();
  await assertNoPageErrors(page);
});

for (const mode of ['missing', 'static', 'offline']) {
  test(`${mode} service preserves prepared gestures and exports, and can be rechecked after setup`, async ({ page }) => {
    let ready = false, analyses = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/speech/rhubarb/status', route => {
      if (ready) return route.fulfill({ json: { ok: true, installed: true } });
      if (mode === 'missing') return route.fulfill({ json: { ok: true, installed: false } });
      if (mode === 'offline') return route.abort('connectionrefused');
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1>Static site fallback</h1>' });
    });
    await page.route('**/api/speech/rhubarb', route => { analyses++; return route.fulfill({ status: 503, json: { ok: false } }); });
    await page.goto('/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__SPEECH_LAB__?.ready);
    await expect(page.locator('#engine-status')).toHaveAttribute('data-state', mode === 'missing' ? 'missing' : 'unavailable');
    await expect(page.locator('#engine-setup')).toBeVisible();
    await page.evaluate(() => window.__SPEECH_LAB__.loadDemo('phrase'));
    await expect(page.locator('#analyze-audio')).toBeDisabled();
    await page.locator('#analysis-phonetic').click();
    expect(await page.evaluate(() => window.__SPEECH_LAB__.track.cues.length)).toBe(54);
    await page.locator('#scrub').evaluate(input => { input.value = '2.3'; input.dispatchEvent(new Event('input')); });
    const previous = await page.evaluate(() => ({ track: window.__SPEECH_LAB__.track, time: document.querySelector('#scrub').value }));
    await expect(page.locator('#save-track')).toBeEnabled();
    for (const button of await page.locator('.export').all()) await expect(button).toBeEnabled();
    ready = true;
    await page.locator('#engine-retry').click();
    await expect(page.locator('#engine-status')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#engine-setup')).toBeHidden();
    await expect(page.locator('#analyze-audio')).toBeEnabled();
    expect(await page.evaluate(() => ({ track: window.__SPEECH_LAB__.track, time: document.querySelector('#scrub').value }))).toEqual(previous);
    expect(analyses).toBe(0);
    expect(errors).toEqual([]);
  });
}
