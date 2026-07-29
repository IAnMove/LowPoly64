import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

async function openFish(page) {
  await page.evaluate(() => window.openPngModelWorkbench());
  await expect(page.locator('#png-model-modal')).toBeVisible();
  await page.locator('#png-model-example-fish').click();
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 30000 });
}

async function diagnostics(page) {
  return page.evaluate(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    return getPngModelWorkbenchDiagnostics();
  });
}

test('keeps confirmation transactional and applies presentation changes without rebuilding topology', async ({ page }) => {
  await bootstrapApp(page);
  await openFish(page);

  const initial = await diagnostics(page);
  expect(initial.pending).toBe(false);
  expect(initial.settings.keepDepthRatio).toBe(true);
  expect(initial.settings.sideStyle).toBe('sampled');

  await page.locator('#png-model-name').fill('TRANSACTIONAL FISH');
  await page.locator('#png-model-side-color').evaluate((input) => {
    input.value = '#123456';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.locator('#png-model-side-style').selectOption('solid');
  await page.waitForFunction(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const current = getPngModelWorkbenchDiagnostics();
    return (
      !current.pending
      && current.topology
      && current.settings.name === 'TRANSACTIONAL FISH'
      && current.settings.sideColor === '#123456'
      && current.settings.sideStyle === 'solid'
    );
  });
  const presented = await diagnostics(page);
  expect(presented.topology).toEqual(initial.topology);
  expect(presented.settings).toMatchObject({
    name: 'TRANSACTIONAL FISH',
    sideColor: '#123456',
    sideStyle: 'solid',
  });

  const disabledImmediately = await page.evaluate(() => {
    const input = document.getElementById('png-model-thickness');
    const button = document.getElementById('png-model-confirm');
    input.value = '1.75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const disabled = button.disabled;
    button.click();
    return disabled;
  });
  expect(disabledImmediately).toBe(true);
  expect(await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length)).toBe(0);

  await page.waitForFunction(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const current = getPngModelWorkbenchDiagnostics();
    return !current.pending && current.topology && current.settings.thickness === 1.75;
  }, null, { timeout: 30000 });
  await expect(page.locator('#png-model-confirm')).toBeEnabled();
  await page.locator('#png-model-confirm').evaluate((button) => button.click());
  await expect(page.locator('#png-model-modal')).toBeHidden({ timeout: 30000 });

  const result = await page.evaluate(async () => {
    const state = window.__LOWPOLY64_STATE__;
    const group = state.userObjects.children[0];
    const surface = group.children.find((child) => child.userData.pngModelRole === 'surface');
    const { deselectAll, onMouseDown } = await import('/src/modules/viewport/selection.js');
    const point = surface.getWorldPosition(state.camera.position.clone()).project(state.camera);
    const rect = state.renderer.domElement.getBoundingClientRect();
    deselectAll();
    onMouseDown({
      clientX: rect.left + ((point.x + 1) / 2) * rect.width,
      clientY: rect.top + ((1 - point.y) / 2) * rect.height,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    });
    return {
      name: group.userData.name,
      thickness: group.userData.pngModelSettings.thickness,
      sideStyle: group.userData.pngModelSettings.sideStyle,
      selectedRoot: state.selectedMesh === group,
    };
  });
  expect(result).toEqual({
    name: 'TRANSACTIONAL FISH',
    thickness: 1.75,
    sideStyle: 'solid',
    selectedRoot: true,
  });
  await assertNoPageErrors(page);
});

test('supports depth undo/redo, camera views, dirty-close warning, and releases session data', async ({ page }) => {
  await bootstrapApp(page);
  await openFish(page);

  await page.locator('[data-view=front]').click();
  expect((await diagnostics(page)).inspection.view).toBe('front');
  await page.locator('[data-view=side]').click();
  expect((await diagnostics(page)).inspection.view).toBe('side');
  await page.locator('[data-view=three-quarter]').click();

  const paint = page.locator('#png-model-paint');
  const box = await paint.boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 4 });
  await page.mouse.up();
  await expect(page.locator('#png-model-depth-undo')).toBeEnabled();
  await page.locator('#png-model-depth-undo').click();
  await expect(page.locator('#png-model-depth-redo')).toBeEnabled();
  await page.locator('#png-model-depth-redo').click();
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 30000 });
  expect((await diagnostics(page)).dirty).toBe(true);

  const beforeInvalidLoad = await diagnostics(page);
  await page.locator('#png-model-file').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a png'),
  });
  await expect(page.locator('#png-model-status')).toHaveClass(/text-red-400/);
  const afterInvalidLoad = await diagnostics(page);
  expect(afterInvalidLoad.loaded).toBe(true);
  expect(afterInvalidLoad.dirty).toBe(true);
  expect(afterInvalidLoad.topology).toEqual(beforeInvalidLoad.topology);
  await expect(page.locator('#png-model-file-label')).toContainText('reef-fish.png');

  const transparentPng = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('#png-model-file').setInputFiles({
    name: 'transparent.png',
    mimeType: 'image/png',
    buffer: Buffer.from(transparentPng, 'base64'),
  });
  await expect(page.locator('#png-model-status')).toHaveClass(/text-red-400/);
  const afterTransparentLoad = await diagnostics(page);
  expect(afterTransparentLoad.loaded).toBe(true);
  expect(afterTransparentLoad.dirty).toBe(true);
  expect(afterTransparentLoad.topology).toEqual(beforeInvalidLoad.topology);
  await expect(page.locator('#png-model-file-label')).toContainText('reef-fish.png');

  await page.evaluate(() => {
    window.confirm = () => false;
  });
  await page.locator('#png-model-close').click();
  await expect(page.locator('#png-model-modal')).toBeVisible();

  await page.evaluate(() => {
    window.confirm = () => true;
  });
  await page.locator('#png-model-close').click();
  await expect(page.locator('#png-model-modal')).toBeHidden();
  const closed = await diagnostics(page);
  expect(closed).toMatchObject({
    open: false,
    loaded: false,
    dirty: false,
    topology: null,
  });
  await assertNoPageErrors(page);
});

test('ignores an asset load that completes after the workbench closes', async ({ page }) => {
  await bootstrapApp(page);
  await page.evaluate(() => window.openPngModelWorkbench());
  await page.locator('#png-model-example-fish').click({ noWaitAfter: true });
  await page.evaluate(async () => {
    const { closePngModelWorkbench } = await import('/src/modules/png-model/png-model-ui.js');
    closePngModelWorkbench({ force: true });
  });
  await expect(page.locator('#png-model-modal')).toBeHidden();
  await page.waitForTimeout(500);
  const closed = await diagnostics(page);
  expect(closed).toMatchObject({
    open: false,
    loaded: false,
    dirty: false,
    topology: null,
  });
  await assertNoPageErrors(page);
});
