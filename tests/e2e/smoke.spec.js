import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  openArchetype,
  openSvgWorkbench,
  openTextureEditor,
  selectPrimaryEditableMesh,
  waitForObjectCount,
  waitForUi,
} from './helpers/app.js';

test('loads the editor shell and help page', async ({ page }) => {
  await bootstrapApp(page);
  await expect(page.locator('h1')).toContainText(/LOWPOLY64/i);
  await expect(page.locator('#left-panel')).toBeVisible();
  await expect(page.locator('#right-panel')).toBeVisible();

  await bootstrapApp(page, '/help.html');
  await expect(page.locator('h1')).toContainText(/build/i);
  await expect(page.locator('#workflow')).toBeVisible();
  await expect(page.locator('#svg-workbench')).toBeVisible();
  await assertNoPageErrors(page);
});

test('opens an archetype directly into the rig panel', async ({ page }) => {
  await bootstrapApp(page);
  await openArchetype(page, 'HUMANOID');

  await expect(page.locator('#rig-panel-modal')).toBeVisible();
  await expect.poll(async () => page.locator('#rig-skeleton-select option').count()).toBeGreaterThan(0);
  await expect.poll(async () => page.locator('#rig-anim-list button').count()).toBeGreaterThan(0);
  await assertNoPageErrors(page);
});

test('opens the texture editor, AI modal, and config modal for a selected model', async ({ page }) => {
  await bootstrapApp(page);
  await addTemplate(page, 'swordsman_cm');
  await selectPrimaryEditableMesh(page);

  await openTextureEditor(page);
  await expect(page.locator('#tex-preview-3d canvas')).toBeVisible();

  await page.evaluate(() => {
    window.openAIGenModal();
  });
  await expect(page.locator('#ai-gen-modal')).toBeVisible();

  await page.evaluate(() => {
    window.closeAIGenModal();
    window.openConfigModal();
  });
  await expect(page.locator('#config-modal')).toBeVisible();
  await assertNoPageErrors(page);
});

test('imports a simple SVG object through the workbench', async ({ page }) => {
  await bootstrapApp(page);
  await openSvgWorkbench(page);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="10" y="10" width="44" height="44" fill="#ffcc00" />
    <circle cx="32" cy="32" r="10" fill="#111111" />
  </svg>`;

  await page.locator('#svg-code-textarea').fill(svg);
  await expect(page.locator('#svg-analysis')).not.toContainText(/No SVG analyzed yet/i);

  await page.locator('#svg-confirm-btn').click();
  await expect(page.locator('#svg-workbench-modal')).toBeHidden({ timeout: 30000 });
  await waitForUi(page, 200);
  await waitForObjectCount(page, 1);
  await assertNoPageErrors(page);
});
