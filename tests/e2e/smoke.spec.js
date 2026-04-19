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
  await expect(page.locator('#avatar-forge')).toBeVisible();
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

test('keeps rig highlights attached while a selected slot animates', async ({ page }) => {
  await bootstrapApp(page);
  await openArchetype(page, 'HUMANOID');

  await expect(page.locator('#rig-panel-modal')).toBeVisible();
  await page.evaluate(async () => {
    const rigUi = await import('/src/modules/animation/rig-ui.js');
    if (!rigUi.selectRigSlot('ARM_R')) throw new Error('Could not select ARM_R');
    if (!rigUi.selectRigBone('HAND_R')) throw new Error('Could not select HAND_R');
  });

  const before = await page.evaluate(async () => {
    const rigUi = await import('/src/modules/animation/rig-ui.js');
    return rigUi.getRigPanelDiagnostics();
  });

  expect(before.selectedSlot).toBe('ARM_R');
  expect(before.selectedBone).toBe('HAND_R');
  expect(before.highlightedPieceNames.length).toBeGreaterThan(0);
  expect(before.highlightedPieceWorldPositions.length).toBeGreaterThan(0);
  expect(before.highlightedBoneNames).toEqual(expect.arrayContaining(['ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R']));
  expect(before.selectedBoneColor).toBe('ffcc00');

  await page.getByRole('button', { name: 'attack', exact: true }).click();

  await expect.poll(async () => {
    return page.evaluate(async () => {
      const rigUi = await import('/src/modules/animation/rig-ui.js');
      return rigUi.getRigPanelDiagnostics();
    });
  }).toMatchObject({
    currentAnimation: 'attack',
    playing: true,
    selectedSlot: 'ARM_R',
    selectedBone: 'HAND_R',
    selectedBoneColor: 'ffcc00',
  });

  await waitForUi(page, 180);

  const during = await page.evaluate(async () => {
    const rigUi = await import('/src/modules/animation/rig-ui.js');
    return rigUi.getRigPanelDiagnostics();
  });

  const beforeArmPiece = before.highlightedPieceWorldPositions.find((entry) => entry.center);
  const duringArmPiece = during.highlightedPieceWorldPositions.find((entry) => entry.center);

  expect(during.highlightedPieceNames).toEqual(before.highlightedPieceNames);
  expect(during.highlightedBoneNames).toEqual(expect.arrayContaining(['ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R']));
  expect(during.selectedBoneColor).toBe('ffcc00');
  expect(during.selectedBoneScale).toBeGreaterThan(1);
  expect(during.selectedBoneWorldPosition).not.toEqual(before.selectedBoneWorldPosition);
  expect(beforeArmPiece?.center).toBeTruthy();
  expect(duringArmPiece?.center).toBeTruthy();
  expect(duringArmPiece?.center).not.toEqual(beforeArmPiece?.center);
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
