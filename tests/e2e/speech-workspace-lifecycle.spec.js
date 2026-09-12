import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

test('the old lab opens the native workspace and a returning user can detect a newly available engine', async ({ page }) => {
  let installed = false;
  await page.route('**/api/speech/rhubarb/status', route => route.fulfill({ json: { ok: true, installed } }));
  await bootstrapApp(page, '/speech-lab.html', { requireEditorModals: false });
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready);
  expect(new URL(page.url()).pathname).toBe('/');
  expect(new URL(page.url()).search).toBe('?studio=speech');
  await expect(page.locator('#speech-workspace')).toHaveAttribute('role', 'tabpanel');
  await expect(page.locator('#editor-topbar')).toBeVisible();
  await expect(page.locator('dialog:visible, iframe:visible')).toHaveCount(0);
  await page.evaluate(() => window.__SPEECH_STUDIO__.loadDemo(false));
  await expect(page.locator('#speech-engine')).toContainText('no disponible');
  await expect(page.locator('#speech-analyze')).toBeDisabled();
  const track = await page.evaluate(() => window.__SPEECH_STUDIO__.track);
  installed = true;
  await page.locator('#workspace-scene-tab').click();
  await expect(page.locator('#speech-workspace')).toBeHidden();
  await page.locator('#workspace-speech-tab').click();
  await expect(page.locator('#speech-analyze')).toBeEnabled();
  expect(await page.evaluate(() => window.__SPEECH_STUDIO__.track)).toEqual(track);
  await assertNoPageErrors(page);
});

test('leaving while recording preserves the take and cancels an unfinished recording start', async ({ page }) => {
  await bootstrapApp(page, '/?studio=speech', { requireEditorModals: false });
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready);
  await page.evaluate(() => window.__SPEECH_STUDIO__.loadDemo(false));
  await page.locator('#speech-record').click();
  await page.waitForFunction(() => window.__SPEECH_STUDIO__.recording);
  await page.waitForTimeout(800);
  await page.locator('#workspace-scene-tab').click();
  await expect(page.locator('#speech-workspace')).toBeHidden({ timeout: 45000 });
  const take = await page.evaluate(() => {
    const api = window.__SPEECH_STUDIO__;
    return { recording: api.recording, paused: document.getElementById('speech-audio').paused,
      duration: api.lastTake?.duration, video: api.lastTake?.video.size, audio: api.lastTake?.audio?.size };
  });
  expect(take.recording).toBe(false); expect(take.paused).toBe(true);
  expect(take.duration).toBeGreaterThan(.3); expect(take.video).toBeGreaterThan(1000); expect(take.audio).toBeGreaterThan(1000);
  await page.locator('#workspace-speech-tab').click();
  await expect(page.locator('#speech-take')).toBeVisible();
  await page.waitForFunction(() => window.__SPEECH_STUDIO__.ready);
  await page.evaluate(() => {
    const api = window.__SPEECH_STUDIO__;
    window.__originalSpeechOutput = api.media.outputStream;
    api.media.outputStream = () => new Promise(resolve => { window.__resolveSpeechOutput = resolve; });
  });
  await page.locator('#speech-record').click();
  await page.waitForFunction(() => typeof window.__resolveSpeechOutput === 'function');
  await page.locator('#workspace-scene-tab').click();
  await expect(page.locator('#speech-workspace')).toBeHidden();
  await page.evaluate(() => window.__resolveSpeechOutput(null));
  await expect.poll(() => page.evaluate(() => ({ active: window.__SPEECH_STUDIO__.visible, recording: window.__SPEECH_STUDIO__.recording }))).toEqual({ active: false, recording: false });
  await page.evaluate(() => { window.__SPEECH_STUDIO__.media.outputStream = window.__originalSpeechOutput; });
  await page.locator('#workspace-speech-tab').click();
  await page.waitForFunction(() => window.__SPEECH_STUDIO__.ready);
  expect(await page.evaluate(() => window.__SPEECH_STUDIO__.lastTake.duration)).toBe(take.duration);
  await assertNoPageErrors(page);
});
