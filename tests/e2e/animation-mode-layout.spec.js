import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

async function openAnimationModeForTemplate(page, templateId) {
  await addTemplate(page, templateId);
  await page.evaluate(async (id) => {
    const state = window.__LOWPOLY64_STATE__;
    const { selectMesh } = await import('/src/modules/viewport/selection.js');
    const group = state.userObjects.children.find((child) => child.userData?.templateId === id);
    if (!group) throw new Error(`Template group not found: ${id}`);
    selectMesh(group);
    await window.enterAnimationMode();
  }, templateId);
  await waitForUi(page, 500);
}

test('animation mode keeps the model and rig previews in a bounded 50/50 split', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAnimationModeForTemplate(page, 'skeleton');

  const diagnostics = await page.evaluate(() => window.getAnimModeRigPreviewDiagnostics());
  expect(diagnostics).toMatchObject({
    animationMode: true,
    groupTemplateId: 'skeleton',
    skeletonId: 'HUMANOID_DEFAULT',
    helperAttached: true,
    splitHidden: false,
    modelStageHidden: false,
    rigStageHidden: false,
    emptyHidden: true,
  });
  expect(diagnostics.boneCount).toBeGreaterThan(0);
  expect(diagnostics.canvasSize.width).toBeGreaterThan(160);
  expect(diagnostics.canvasSize.height).toBeGreaterThan(160);

  const layout = await page.evaluate(() => {
    const rectFor = (id) => {
      const node = document.getElementById(id);
      const rect = node?.getBoundingClientRect();
      return rect ? {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      } : null;
    };
    return {
      workspace: rectFor('main-workspace'),
      split: rectFor('anim-mode-preview-split'),
      modelStage: rectFor('anim-mode-model-stage'),
      rigStage: rectFor('anim-mode-rig-stage'),
      rigViewport: rectFor('anim-mode-rig-viewport'),
    };
  });

  expect(layout.workspace.height).toBeGreaterThan(300);
  expect(layout.split.height).toBeLessThanOrEqual(layout.workspace.height + 1);
  expect(layout.modelStage.height).toBeLessThanOrEqual(layout.workspace.height + 1);
  expect(layout.rigStage.height).toBeLessThanOrEqual(layout.workspace.height + 1);
  expect(Math.abs(layout.modelStage.width - layout.rigStage.width)).toBeLessThanOrEqual(8);
  expect(layout.rigViewport.height).toBeLessThan(layout.rigStage.height);

  await page.evaluate(() => window.animModeToggleRigViewport());
  await waitForUi(page, 250);

  const hiddenLayout = await page.evaluate(() => {
    const split = document.getElementById('anim-mode-preview-split').getBoundingClientRect();
    const modelStage = document.getElementById('anim-mode-model-stage').getBoundingClientRect();
    const rigStage = document.getElementById('anim-mode-rig-stage');
    return {
      splitWidth: split.width,
      modelWidth: modelStage.width,
      rigHidden: rigStage.classList.contains('hidden'),
    };
  });

  expect(hiddenLayout.rigHidden).toBe(true);
  expect(hiddenLayout.modelWidth).toBeGreaterThan(hiddenLayout.splitWidth - 8);
  await assertNoPageErrors(page);
});
