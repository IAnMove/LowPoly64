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
import { openAvatarForge } from './helpers/avatar-forge.js';

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

test('captures the standard clip library in animation mode', async ({ page }) => {
  await bootstrapApp(page);
  await addTemplate(page, 'psx_humanoid_chibi_mold_cm');
  await page.evaluate(() => window.enterAnimationMode());
  await expect(page.locator('#anim-mode-panel')).toBeVisible();
  await expect(page.locator('#anim-mode-library-clip-select')).toHaveValue('walk');
  await page.locator('#anim-mode-library-clip-select').selectOption('cheer');
  await page.locator('#anim-mode-library-apply').click();
  await expect(page.locator('#anim-mode-library-status')).toContainText(/cheer/i);
  await capturePage(page, 'animation/standard-clip-library.png', { lingerMs: 1800 });
});

test('captures the Motion Ripper local-video workflow', async ({ page }) => {
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
  await expect(page.locator('#motion-ripper-modal')).toBeVisible({ timeout: 30000 });
  await page.locator('#motion-ripper-status-text').evaluate((element) => {
    element.textContent = 'Ready for local slow-motion video or window capture.';
  });
  await page.locator('#motion-ripper-tracked-state').evaluate((element) => {
    element.textContent = 'READY';
  });
  await expect(page.locator('#motion-ripper-local-video-input')).toBeAttached();
  await capturePage(page, 'animation/motion-ripper-local-video.png', { lingerMs: 1800 });
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

test('captures the PNG to editable flat-model workflow', async ({ page }) => {
  await bootstrapApp(page);
  const dataURL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#f58231';
    context.beginPath();
    context.ellipse(65, 49, 38, 25, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(29, 49);
    context.lineTo(8, 20);
    context.lineTo(8, 78);
    context.closePath();
    context.fill();
    context.fillStyle = '#fff7df';
    context.beginPath();
    context.arc(84, 40, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1f2937';
    context.beginPath();
    context.arc(86, 40, 2.5, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL('image/png');
  });
  const pngBuffer = Buffer.from(dataURL.split(',')[1], 'base64');

  await page.evaluate(() => window.openPngModelWorkbench());
  await expect(page.locator('#png-model-modal')).toBeVisible();
  await page.locator('#png-model-file').setInputFiles({
    name: 'release-fish.png',
    mimeType: 'image/png',
    buffer: pngBuffer,
  });
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 30000 });
  await page.locator('#png-model-density').evaluate((input) => {
    input.value = '52';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#png-model-show-wireframe').check();
  await page.locator('#png-model-show-vertices').check();
  await expect(page.locator('#png-model-topology-summary')).toContainText('triangles');
  await capturePage(page, 'png-model/png-to-flat-model-workbench.png', { lingerMs: 1800 });
});

test('captures Avatar Forge starter heroes and authoring controls', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);
  await expect(page.locator('#avatar-hero-presets [data-hero-preset]')).toHaveCount(6);
  await page.locator('[data-hero-preset="hero_quest"]').click();
  await expect(page.locator('#avatar-label-input')).toHaveValue('Quest Hero');
  await expect(page.locator('#avatar-turntable-toggle')).toBeVisible();
  await expect(page.locator('#avatar-copy-recipe-btn')).toBeVisible();
  await waitForUi(page, 900);
  await capturePage(page, 'avatar-forge/starter-heroes-and-controls.png', { lingerMs: 1800 });
});

test('captures the local agent panel with a deterministic tool turn', async ({ page }) => {
  await page.route('http://127.0.0.1:47831/agent/config', (route) => route.fulfill({
    json: { assistantUrl: 'http://127.0.0.1:47831/assistant' },
  }));
  await page.route('http://127.0.0.1:47831/assistant/status', (route) => route.fulfill({
    json: {
      providers: {
        openai: { configured: true, defaultModel: 'gpt-5.2' },
        xai: { configured: false, defaultModel: 'grok-code-fast-1' },
      },
      instructions: 'Local release capture fixture.',
    },
  }));
  await page.route('http://127.0.0.1:47831/assistant/chat', (route) => route.fulfill({
    status: 200,
    contentType: 'application/x-ndjson',
    body: [
      JSON.stringify({ type: 'tool_started', name: 'get_scene_summary' }),
      JSON.stringify({ type: 'tool_completed', name: 'get_scene_summary', ok: true }),
      JSON.stringify({ type: 'text_delta', delta: 'Escena revisada. El modelo está listo para editarse y exportarse.' }),
      '',
    ].join('\n'),
  }));

  await bootstrapApp(page);
  await page.locator('.rv-agent-launcher').click();
  await expect(page.locator('.rv-agent-panel')).toBeVisible();
  await expect(page.locator('.rv-agent-status')).toContainText('LISTO');
  await page.locator('.rv-agent-input').fill('Revisa la escena y dime si está lista para exportar.');
  await page.locator('.rv-agent-send').click();
  await expect(page.locator('.rv-agent-assistant')).toContainText('Escena revisada');
  await expect(page.locator('.rv-agent-tool')).toHaveCount(2);
  await capturePage(page, 'agent/local-agent-tool-turn.png', { lingerMs: 1400 });
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
