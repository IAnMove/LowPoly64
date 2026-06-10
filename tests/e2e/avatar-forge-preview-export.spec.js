import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  closeRigPanelIfOpen,
  collectAccessoryAndPaletteAuditReport,
  collectAvatarCatalogSweepReport,
  confirmAvatarForge,
  insertAvatarGroup,
  openAvatarForge,
  sceneSummary,
  selectAvatarGroup,
  suppressKnownAvatarForgeWarnings,
  updateAvatarForgeRecipe,
  waitForSceneObjectCount,
  waitForUi,
} from './helpers/avatar-forge.js';

test.describe.configure({ timeout: 300000 });

test('switches the preview camera between full-body and head-review framing', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);
  await openAvatarForge(page);

  const readDiagnostics = () => page.evaluate(async () => {
    const { getAvatarForgePreviewDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgePreviewDiagnostics();
  });

  const initial = await readDiagnostics();
  expect(initial.open).toBe(true);
  expect(initial.previewFocusMode).toBe('full');
  expect(initial.hasPreviewGroup).toBe(true);

  await updateAvatarForgeRecipe(page, {
    hairPresetId: 'psx_layered_hero_01',
  });

  const headFocused = await readDiagnostics();
  expect(headFocused.previewFocusMode).toBe('head');
  expect(headFocused.headBuildMode).toBe('mold');
  expect(headFocused.cameraSide).toBe('front');
  expect(headFocused.headBounds?.size?.[1]).toBeGreaterThan(0);
  expect(headFocused.distanceToTarget).toBeLessThan(initial.distanceToTarget);
  expect(headFocused.cameraPosition[2]).toBeGreaterThan(headFocused.controlTarget[2]);

  const previewCanvas = page.locator('#avatar-preview-canvas');
  await expect(previewCanvas).toBeVisible();
  await previewCanvas.hover();
  await page.mouse.wheel(0, -420);
  await waitForUi(page, 350);

  const manuallyZoomed = await readDiagnostics();
  expect(manuallyZoomed.previewFocusMode).toBe('head');
  expect(manuallyZoomed.distanceToTarget).toBeLessThan(headFocused.distanceToTarget);

  await updateAvatarForgeRecipe(page, {
    eyePresetId: 'psx_hero_square_01',
  });

  const stickyHeadZoom = await readDiagnostics();
  expect(stickyHeadZoom.previewFocusMode).toBe('head');
  expect(stickyHeadZoom.distanceToTarget).toBeCloseTo(manuallyZoomed.distanceToTarget, 3);
  stickyHeadZoom.cameraPosition.forEach((value, index) => {
    expect(value).toBeCloseTo(manuallyZoomed.cameraPosition[index], 3);
  });
  stickyHeadZoom.controlTarget.forEach((value, index) => {
    expect(value).toBeCloseTo(manuallyZoomed.controlTarget[index], 3);
  });

  await updateAvatarForgeRecipe(page, {
    bodyPresetId: 'n64_classic',
  });

  const fullFocused = await readDiagnostics();
  expect(fullFocused.previewFocusMode).toBe('full');
  expect(fullFocused.distanceToTarget).toBeGreaterThan(stickyHeadZoom.distanceToTarget);

  await assertNoPageErrors(page);
});

test('opens rig/animation preview and exports a GLB for an avatar-forged humanoid', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await page.evaluate(async () => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ buildAvatarGroup }, { deselectAll, selectMesh }, { refreshObjectList, updateSelectedOverlay }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/viewport/selection.js'),
      import('/src/modules/viewport/object-list.js'),
    ]);

    const group = await buildAvatarGroup({
        label: 'Rig Avatar',
        bodyPresetId: 'psx_heroic',
      headShapeId: 'n64_skull_01',
        hairPresetId: 'short_spikes_01',
      eyePresetId: 'intense_01',
      browPresetId: 'angled_01',
      mouthPresetId: 'grin_01',
      paletteId: 'olive_gold',
    });

    state.userObjects.add(group);
    deselectAll();
    selectMesh(group);
    refreshObjectList();
    updateSelectedOverlay();
  });
  await waitForUi(page, 350);

  await page.evaluate(async () => {
    await window.openRigPanel();
  });
  await expect(page.locator('#rig-panel-modal')).toBeVisible();
  await expect(page.locator('#rig-skeleton-select')).toHaveValue('HUMANOID_DEFAULT');
  await expect(page.locator('#rig-anim-list')).toContainText(/idle/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/walk/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/run/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/hurt/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/die/i);

  await closeRigPanelIfOpen(page);

  const exportResult = await page.evaluate(async () => {
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { buffer, filename } = await exportGLBToBuffer();
    return {
      filename,
      size: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  });

  expect(exportResult.filename).toBe('lowpoly64-scene.glb');
  expect(exportResult.size).toBeGreaterThan(0);

  await assertNoPageErrors(page);
});
