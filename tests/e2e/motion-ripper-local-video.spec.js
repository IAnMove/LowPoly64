import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { addTemplate, assertNoPageErrors, bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

test('motion ripper exposes local slow-video capture controls', async () => {
  const html = readRepoFile('src', 'modules', 'animation', 'animation-html.js');
  const bindings = readRepoFile('src', 'bindings.js');

  expect(html).toContain('motion-ripper-local-video-input');
  expect(html).toContain('motion-ripper-local-video-time');
  expect(html).toContain('data-motion-ripper-local-video-speed="0.25"');
  expect(html).toContain('motionRipperLocalVideoPrevFrame()');
  expect(html).toContain('motionRipperLocalVideoNextFrame()');

  expect(bindings).toContain('window.motionRipperLoadLocalVideo');
  expect(bindings).toContain('window.motionRipperSetLocalVideoSpeed');
  expect(bindings).toContain('window.motionRipperLocalVideoPrevFrame');
  expect(bindings).toContain('window.motionRipperLocalVideoNextFrame');
});

test('local video recording uses source video time instead of slowed playback time', async () => {
  const source = readRepoFile('src', 'modules', 'animation', 'motion-ripper-ui.js');

  expect(source).toContain("captureSourceKind === 'local-video'");
  expect(source).toContain('(ui.video.currentTime || 0) - recordingVideoStartedAt');
  expect(source).toContain("recordingVideoStartedAt = captureSourceKind === 'local-video'");
  expect(source).toContain('ui.video.playbackRate = LOCAL_VIDEO_DEFAULT_SPEED');
});

test('opens Motion Ripper for an eligible humanoid without a preview-controller error', async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: [
      'export const FilesetResolver = { forVisionTasks: async () => ({}) };',
      'export const PoseLandmarker = { createFromOptions: async () => ({ close() {} }) };',
    ].join('\n'),
  }));
  await bootstrapApp(page);
  await addTemplate(page, 'star_ranger');

  await page.evaluate(() => {
    void window.openMotionRipperModal();
  });

  await expect(page.locator('#motion-ripper-modal')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#motion-ripper-target-label')).toContainText(/star ranger|ranger estelar/i);
  await assertNoPageErrors(page);
});
