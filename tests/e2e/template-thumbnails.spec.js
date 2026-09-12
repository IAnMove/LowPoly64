import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

test('every default model has a valid thumbnail and clicking its row still creates that model', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.locator('#template-list [data-template-id]').first().waitFor();
  const coverage = await page.evaluate(async () => {
    const { TEMPLATE_REGISTRY } = await import('/src/modules/viewport/template-registry.js');
    const entries = [...document.querySelectorAll('#template-list [data-template-id]')];
    const failures = [];
    for (let offset = 0; offset < entries.length; offset += 16) {
      await Promise.all(entries.slice(offset, offset + 16).map(async row => {
        try {
          const image = row.querySelector('img');
          if (!image || image.loading !== 'lazy' || image.alt !== '') throw new Error('Missing accessible lazy preview');
          const response = await fetch(image.src);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          const bitmap = await createImageBitmap(await response.blob());
          if (bitmap.width !== 144 || bitmap.height !== 112) throw new Error('Unexpected dimensions');
          bitmap.close();
        } catch (error) { failures.push({ id: row.dataset.templateId, error: error.message }); }
      }));
    }
    return { expected: TEMPLATE_REGISTRY.map(model => model.id).sort(), actual: entries.map(row => row.dataset.templateId).sort(), failures };
  });
  expect(coverage.actual).toEqual(coverage.expected);
  expect(coverage.failures).toEqual([]);
  const chair = page.locator('[data-template-id="chair"]');
  await chair.scrollIntoViewIfNeeded();
  await expect.poll(() => chair.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const bounds = await chair.evaluate(row => {
    const label = row.querySelector('.template-catalog-labels').getBoundingClientRect();
    const image = row.querySelector('img').getBoundingClientRect();
    const box = row.getBoundingClientRect();
    return { labelRight: label.right, imageLeft: image.left, imageRight: image.right, rowRight: box.right };
  });
  expect(bounds.imageLeft).toBeGreaterThan(bounds.labelRight);
  expect(bounds.imageRight).toBeLessThanOrEqual(bounds.rowRight);
  const before = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length);
  await chair.click();
  await expect.poll(() => page.evaluate(() => window.__LOWPOLY64_STATE__.selectedMesh?.userData.templateId)).toBe('chair');
  expect(await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length)).toBe(before + 1);
  await fs.mkdir('artifacts/template-thumbnails', { recursive: true });
  await page.screenshot({ path: 'artifacts/template-thumbnails/catalog-editor.png' });
  await page.setViewportSize({ width: 1000, height: 800 });
  await chair.scrollIntoViewIfNeeded();
  await expect(chair.locator('img')).toBeVisible();
  await chair.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length)).toBe(before + 2);
  await page.locator('#workspace-speech-tab').click();
  await expect(page.locator('#speech-workspace')).toBeVisible();
  await page.locator('#workspace-scene-tab').click();
  await expect(chair).toBeVisible();
  await assertNoPageErrors(page);
});
