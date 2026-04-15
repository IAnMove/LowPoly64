import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  addTemplate,
  bootstrapApp,
  capture,
  capturePage,
  captureTemplateSections,
  captureFocusedViewport,
  closeRigPanelIfOpen,
  expandObjectList,
  lingerOnCurrentState,
  openArchetype,
  openPromptGenerator,
  openSvgWorkbench,
  openTextureEditor,
  paintOnTextureCanvas,
  resetScene,
  selectPrimaryEditableMesh,
  slugify,
  waitForFrames,
  waitForObjectCount,
  waitForTemplateCatalog,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ mode: 'serial' });

test('captures the editor shell, object list, and properties panel', async ({ page }) => {
  await bootstrapApp(page);
  await waitForTemplateCatalog(page);
  await addTemplate(page, 'crate');
  await addTemplate(page, 'house');
  await addTemplate(page, 'tree');
  await expandObjectList(page);

  await capturePage(page, 'editor/editor-shell.png');
  await captureFocusedViewport(page, page.locator('#left-panel'), 'editor/left-panel.png');
  await captureFocusedViewport(page, page.locator('#right-panel'), 'editor/properties-panel.png');
  await captureFocusedViewport(page, page.locator('#object-list-panel'), 'editor/object-list.png');

  await expect(page.locator('#object-list-count')).toContainText('(3)');
});

test.describe('template library stills', () => {
  test('captures template menus for release collateral', async ({ page }) => {
    await bootstrapApp(page);
    await waitForTemplateCatalog(page);
    await captureTemplateSections(page, 'templates', { lingerMs: 0, settleMs: 150 });
  });
});

test('captures archetype and rigging flows', async ({ page }) => {
  await bootstrapApp(page);

  await addTemplate(page, 'crate');
  await page.evaluate(() => {
    window.openAssignRigModal();
  });
  await expect(page.locator('#assign-rig-modal')).toBeVisible();
  await capturePage(page, 'rigging/assign-rig-modal.png');
  await page.locator('#assign-rig-modal button').filter({ hasText: /cancel/i }).click();
  await expect(page.locator('#assign-rig-modal')).toBeHidden();
  await lingerOnCurrentState(page, 900);

  await resetScene(page);
  await openArchetype(page, 'HUMANOID');
  await capturePage(page, 'rigging/humanoid-rig-panel.png');
  await expect.poll(async () => page.locator('#rig-anim-list button').count()).toBeGreaterThan(0);
  await page.locator('#rig-anim-list button').first().click();
  await waitForUi(page, 700);
  await capturePage(page, 'rigging/humanoid-rig-playing.png', { lingerMs: 2200 });

  await closeRigPanelIfOpen(page);
  await openArchetype(page, 'QUADRUPED');
  await capturePage(page, 'rigging/quadruped-rig-panel.png');
});

test('captures texture editor, AI generator, prompt editor, and config surfaces', async ({ page }) => {
  await bootstrapApp(page);
  await addTemplate(page, 'swordsman_cm');
  await selectPrimaryEditableMesh(page);

  await openTextureEditor(page);
  await paintOnTextureCanvas(page);
  await page.evaluate(() => {
    window.texToggleGrid();
    window.texSetGridSize('4x1');
  });
  await waitForUi(page, 250);
  await capturePage(page, 'textures/texture-editor.png', { lingerMs: 2200 });

  await page.evaluate(() => {
    window.openAIGenModal();
  });
  await expect(page.locator('#ai-gen-modal')).toBeVisible();
  await capturePage(page, 'textures/ai-generator-modal.png');

  await page.evaluate(() => {
    window.closeAIGenModal();
    window.openPromptExpandModal();
  });
  await expect(page.locator('#prompt-expand-modal')).toBeVisible();
  await capturePage(page, 'textures/prompt-editor-modal.png');

  await page.evaluate(() => {
    window.closePromptExpandModal();
    window.openConfigModal();
  });
  await expect(page.locator('#config-modal')).toBeVisible();
  await capturePage(page, 'textures/config-modal.png', { lingerMs: 2200 });
});

test('captures SVG workbench and prompt generation flows', async ({ page }) => {
  await bootstrapApp(page);
  await openSvgWorkbench(page);
  await page.locator('[data-svg-sample-key="filledStar"]').click();
  await expect(page.locator('#svg-analysis')).not.toContainText(/No SVG analyzed yet/i);
  await waitForUi(page, 300);
  await capturePage(page, 'svg/svg-workbench-general.png');

  await page.locator('[data-svg-sample-key="pixelHeart"]').click();
  await waitForUi(page, 300);
  await capturePage(page, 'svg/svg-workbench-pixel.png');

  await page.locator('#svg-confirm-btn').click();
  await expect(page.locator('#svg-workbench-modal')).toBeHidden({ timeout: 30000 });
  await waitForObjectCount(page, 1);
  await capturePage(page, 'svg/svg-imported-object.png', { lingerMs: 2200 });

  await resetScene(page);
  await openArchetype(page, 'HUMANOID');
  await closeRigPanelIfOpen(page);
  await page.evaluate(() => {
    window.openSvgHeadWorkbenchForSelection();
  });
  await expect(page.locator('#svg-workbench-modal')).toBeVisible();
  await capturePage(page, 'svg/svg-head-lab.png');

  await page.evaluate(() => {
    window.closeSvgWorkbench();
  });
  await openPromptGenerator(page);
  await capturePage(page, 'prompts/llm-prompt-generator.png', { lingerMs: 2200 });
});

test('captures the help page for release collateral', async ({ page }) => {
  await bootstrapApp(page, '/help.html');
  await capturePage(page, 'help/help-overview.png', { fullPage: true });

  const sections = ['workflow', 'svg-workbench', 'ai-textures', 'template-files', 'quality'];
  for (const sectionId of sections) {
    const locator = page.locator(`#${sectionId}`);
    await captureFocusedViewport(page, locator, path.join('help', `${slugify(sectionId)}.png`));
  }

  await waitForFrames(page, 2);
});
