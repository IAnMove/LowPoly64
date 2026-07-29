import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

test('starts from a volumetric reef-fish example and keeps depth proportional while resizing', async ({ page }) => {
  await bootstrapApp(page);
  await page.evaluate(() => window.openPngModelWorkbench());
  await expect(page.locator('#png-model-modal')).toBeVisible();

  await page.locator('#png-model-example-fish').click();
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 30000 });
  await expect(page.locator('#png-model-file-label')).toContainText('built-in example');
  await expect(page.locator('#png-model-name')).toHaveValue('REEF FISH');
  await expect(page.locator('#png-model-depth-profile')).toHaveValue('organic');
  await expect(page.locator('#png-model-analysis')).toContainText('Depth:');
  await expect(page.locator('#png-model-analysis')).toContainText('Profile: ORGANIC');

  const initial = await page.evaluate(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    return getPngModelWorkbenchDiagnostics();
  });
  expect(initial.settings.thickness).toBe(1.5);
  expect(initial.analysis.maximumDepth).toBeGreaterThan(1);
  expect(initial.analysis.depthToHeightRatio).toBeGreaterThan(0.2);

  await page.locator('#png-model-target-size').evaluate((input) => {
    input.value = '10';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#png-model-thickness')).toHaveValue('3');
  await page.waitForFunction(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const diagnostics = getPngModelWorkbenchDiagnostics();
    return (
      !diagnostics.pending
      && diagnostics.analysis
      && diagnostics.settings.targetSize === 10
      && diagnostics.settings.thickness === 3
    );
  }, null, { timeout: 30000 });
  const resized = await page.evaluate(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    return getPngModelWorkbenchDiagnostics();
  });
  expect(resized.analysis.depthToHeightRatio).toBeCloseTo(initial.analysis.depthToHeightRatio, 4);
  await assertNoPageErrors(page);
});

test('loads, paints, inserts, reopens, persists, exports, and undo/redoes a PNG model', async ({ page }) => {
  await bootstrapApp(page);
  const dataURL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, 96, 64);
    context.fillStyle = '#ee7b2d';
    context.beginPath();
    context.ellipse(48, 32, 30, 18, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(18, 32);
    context.lineTo(3, 12);
    context.lineTo(3, 52);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(67, 26, 3, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL('image/png');
  });
  const pngBuffer = Buffer.from(dataURL.split(',')[1], 'base64');

  await expect(page.locator('[data-i18n=pngFlatModel]')).toBeVisible();
  const openError = await page.evaluate(async () => {
    try {
      await window.openPngModelWorkbench();
      return null;
    } catch (error) {
      return error?.stack || error?.message || String(error);
    }
  });
  expect(openError).toBeNull();
  await expect(page.locator('#png-model-modal')).toBeVisible();
  await page.locator('#png-model-file').setInputFiles({ name: 'fish.png', mimeType: 'image/png', buffer: pngBuffer });
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 20000 });
  await expect(page.locator('#png-model-analysis')).toContainText('Triangles:');
  const initialTopology = await page.evaluate(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    return getPngModelWorkbenchDiagnostics().topology;
  });
  expect(initialTopology.vertexCount).toBeGreaterThan(0);
  expect(initialTopology.triangleCount).toBeGreaterThan(0);

  await page.locator('#png-model-density').evaluate((input) => {
    input.value = '52';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(async (previousTriangles) => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const diagnostics = getPngModelWorkbenchDiagnostics();
    return diagnostics.density === 52 && diagnostics.topology?.triangleCount > previousTriangles;
  }, initialTopology.triangleCount, { timeout: 20000 });
  await expect(page.locator('#png-model-density-value')).toHaveText('52');
  await expect(page.locator('#png-model-topology-summary')).toContainText('vertices');
  await expect(page.locator('#png-model-topology-summary')).toContainText('triangles');

  await page.locator('#png-model-show-wireframe').check();
  await page.locator('#png-model-show-vertices').check();
  const inspection = await page.evaluate(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    return getPngModelWorkbenchDiagnostics().inspection;
  });
  expect(inspection).toMatchObject({ showWireframe: true, showVertices: true });
  expect(inspection.wireframeObjects).toBeGreaterThan(0);
  expect(inspection.vertexObjects).toBeGreaterThan(0);

  const paint = page.locator('#png-model-paint');
  const box = await paint.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.52);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.68, box.y + box.height * 0.52, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 20000 });

  if (process.env.PNG_MODEL_CAPTURE_PATH) {
    await page.locator('#png-model-modal > div').screenshot({
      path: process.env.PNG_MODEL_CAPTURE_PATH,
      animations: 'disabled',
    });
  }

  await page.locator('#png-model-confirm').click();
  await expect(page.locator('#png-model-modal')).toBeHidden();

  const inserted = await page.evaluate(async () => {
    const { getHistoryStatus, undo, redo } = await import('/src/modules/shared/undo.js');
    const state = window.__LOWPOLY64_STATE__;
    const group = state.userObjects.children[0];
    const beforeUndo = {
      uuid: group.uuid,
      name: group.userData.name,
      children: group.children.length,
      hasSource: group.userData.pngModelSource.dataURL.startsWith('data:image/png'),
      painted: group.userData.pngModelDepthMap.values.some((value) => value !== 0),
      triangleCount: group.userData.pngModelAnalysis.triangleCount,
      density: group.userData.pngModelSettings.density,
      hasInspectionMetadata: Object.keys(group.userData).some((key) => /inspection|wireframe|vertices/i.test(key)),
      hasInspectionChildren: group.children.some((child) => /PNG MODEL (POLYGONS|VERTICES)/.test(child.name)),
      selected: state.selectedMesh === group,
      history: getHistoryStatus(),
    };
    undo();
    const afterUndoCount = state.userObjects.children.length;
    redo();
    return { beforeUndo, afterUndoCount, afterRedoCount: state.userObjects.children.length };
  });
  expect(inserted.beforeUndo).toMatchObject({
    name: 'fish',
    children: 2,
    hasSource: true,
    painted: true,
    density: 52,
    hasInspectionMetadata: false,
    hasInspectionChildren: false,
    selected: true,
  });
  expect(inserted.beforeUndo.triangleCount).toBeGreaterThan(0);
  expect(inserted.beforeUndo.history.undoDepth).toBeGreaterThan(0);
  expect(inserted.afterUndoCount).toBe(0);
  expect(inserted.afterRedoCount).toBe(1);

  await expect(page.locator('#btn-edit-png-model')).toBeVisible();
  await page.locator('#btn-edit-png-model').click();
  await expect(page.locator('#png-model-confirm')).toHaveText('UPDATE MODEL');
  await expect(page.locator('#png-model-density')).toHaveValue('52');
  await expect(page.locator('#png-model-show-wireframe')).toBeChecked();
  await expect(page.locator('#png-model-show-vertices')).toBeChecked();
  await page.waitForFunction(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const diagnostics = getPngModelWorkbenchDiagnostics();
    return diagnostics.loaded && !diagnostics.loading && !diagnostics.pending && diagnostics.topology;
  }, null, { timeout: 30000 });
  await page.locator('#png-model-thickness').evaluate((input) => {
    input.value = '1.6';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(async () => {
    const { getPngModelWorkbenchDiagnostics } = await import('/src/modules/png-model/png-model-ui.js');
    const diagnostics = getPngModelWorkbenchDiagnostics();
    return (
      !diagnostics.pending
      && diagnostics.topology
      && diagnostics.settings.thickness === 1.6
    );
  }, null, { timeout: 20000 });
  await page.locator('#png-model-confirm').evaluate((button) => button.click());
  await expect(page.locator('#png-model-modal')).toBeHidden({ timeout: 30000 });

  const roundtrip = await page.evaluate(async (originalUuid) => {
    const [persistence, exporter, history, importer] = await Promise.all([
      import('/src/modules/viewport/persistence.js'),
      import('/src/modules/viewport/export.js'),
      import('/src/modules/shared/undo.js'),
      import('/src/modules/viewport/json-import.js'),
    ]);
    const state = window.__LOWPOLY64_STATE__;
    const updated = state.userObjects.children[0];
    const compact = persistence.serializeGroupAsImportJSON(updated);
    const scene = persistence.serializeScene();
    const { buffer } = await exporter.exportGLBToBuffer();
    const updatedDepth = updated.userData.pngModelAnalysis.maximumHalfDepth;
    history.undo();
    const undoneDepth = state.userObjects.children[0].userData.pngModelAnalysis.maximumHalfDepth;
    history.redo();
    await persistence.deserializeScene(scene);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const restored = state.userObjects.children[0];
    const surface = restored.children.find((child) => child.userData.pngModelRole === 'surface');
    const importResult = await importer.importObjectFromJSON(JSON.stringify(compact));
    return {
      sameUuidOnUpdate: updated.uuid === originalUuid,
      updatedDepth,
      undoneDepth,
      compactHasRecipe: !!compact.pngModelSource?.dataURL && compact.pngModelDepthMap.values.some((value) => value !== 0),
      restoredEditable: !!restored.userData.pngModelSource?.dataURL,
      restoredRole: surface?.userData.pngModelRole,
      restoredTransparent: surface?.material.transparent,
      restoredTexture: !!surface?.material.map,
      glbBytes: buffer.byteLength,
      importSuccess: importResult.success,
      importedEditable: !!state.userObjects.children[1]?.userData.pngModelSource?.dataURL,
    };
  }, inserted.beforeUndo.uuid);
  expect(roundtrip.sameUuidOnUpdate).toBe(true);
  expect(roundtrip.updatedDepth).toBeGreaterThan(roundtrip.undoneDepth);
  expect(roundtrip.compactHasRecipe).toBe(true);
  expect(roundtrip.restoredEditable).toBe(true);
  expect(roundtrip.restoredRole).toBe('surface');
  expect(roundtrip.restoredTransparent).toBe(true);
  expect(roundtrip.restoredTexture).toBe(true);
  expect(roundtrip.glbBytes).toBeGreaterThan(1000);
  expect(roundtrip.importSuccess).toBe(true);
  expect(roundtrip.importedEditable).toBe(true);
  await assertNoPageErrors(page);
});
