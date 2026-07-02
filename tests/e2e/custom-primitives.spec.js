import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

const TAPERED_BOX_FIXTURE = {
  name: 'Tapered Box Roundtrip',
  pieces: [
    {
      name: 'TORSO_FRUSTUM',
      geometry: {
        type: 'taperedBox',
        params: {
          widthBottom: 1.4,
          depthBottom: 0.9,
          widthTop: 0.86,
          depthTop: 0.62,
          height: 1.8,
          offsetTopX: 0.1,
          offsetTopZ: -0.06,
        },
      },
      color: '#c08457',
      position: [0, 1, 0],
    },
    {
      name: 'SHADED_FRUSTUM',
      geometry: {
        type: 'taperedBox',
        params: {
          widthBottom: 0.9,
          depthBottom: 0.72,
          widthTop: 0.48,
          depthTop: 0.44,
          height: 1.25,
          offsetTopX: -0.08,
          offsetTopZ: 0.04,
        },
      },
      color: '#7c3f23',
      position: [1.6, 0.75, 0],
      faceColors: ['#5f2f19', '#d89a68', '#99582f', '#99582f', '#e6b17d', '#3d1f12'],
    },
  ],
};

test('imports, persists, re-exports, and GLB-exports taperedBox pieces', async ({ page }) => {
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async (fixture) => {
    const [
      { importObjectFromJSON, validateObjectJSON },
      { serializeGroupAsImportJSON, serializeScene, deserializeScene },
      { exportGLBToBuffer },
    ] = await Promise.all([
      import('/src/modules/viewport/json-import.js'),
      import('/src/modules/viewport/persistence.js'),
      import('/src/modules/viewport/export.js'),
    ]);

    const validationError = validateObjectJSON(fixture);
    const invalid = structuredClone(fixture);
    invalid.pieces[0].geometry.params.height = -1;
    const invalidError = validateObjectJSON(invalid);
    const importResult = await importObjectFromJSON(JSON.stringify(fixture));
    if (!importResult.success) throw new Error(importResult.error);

    const state = window.__LOWPOLY64_STATE__;
    const group = state.userObjects.children[0];
    const exportedJson = serializeGroupAsImportJSON(group);
    const sceneJson = serializeScene();

    await deserializeScene(sceneJson);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const restoredGroup = state.userObjects.children[0];
    const meshes = [];
    restoredGroup.traverse((node) => {
      if (node.isMesh) {
        meshes.push({
          name: node.parent?.userData?.name || node.userData?.name || node.name,
          geometryType: node.userData.geometryType,
          geometryParams: node.userData.geometryParams,
          positionCount: node.geometry.getAttribute('position')?.count || 0,
          indexCount: node.geometry.index?.count || 0,
          hasVertexColorAttribute: !!node.geometry.getAttribute('color'),
          faceColors: node.userData.faceColorArray || null,
        });
      }
    });

    const { buffer, filename } = await exportGLBToBuffer();

    return {
      validationError,
      invalidError,
      exportedTypes: exportedJson.pieces.map((piece) => piece.geometry.type),
      sceneTypes: sceneJson.objects[0].children.map((child) => child.mesh.geometryType),
      meshes,
      glbFilename: filename,
      glbBytes: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  }, TAPERED_BOX_FIXTURE);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.invalidError).toContain('height');
  expect(diagnostics.exportedTypes).toEqual(['taperedBox', 'taperedBox']);
  expect(diagnostics.sceneTypes).toEqual(['taperedBox', 'taperedBox']);
  expect(diagnostics.meshes).toHaveLength(2);

  const plain = diagnostics.meshes.find((entry) => entry.name === 'TORSO_FRUSTUM');
  expect(plain?.geometryParams).toMatchObject(TAPERED_BOX_FIXTURE.pieces[0].geometry.params);
  expect(plain?.positionCount).toBe(8);
  expect(plain?.indexCount).toBe(36);

  const shaded = diagnostics.meshes.find((entry) => entry.name === 'SHADED_FRUSTUM');
  expect(shaded?.geometryParams).toMatchObject(TAPERED_BOX_FIXTURE.pieces[1].geometry.params);
  expect(shaded?.hasVertexColorAttribute).toBe(true);
  expect(shaded?.faceColors).toEqual(TAPERED_BOX_FIXTURE.pieces[1].faceColors);

  expect(diagnostics.glbFilename).toBe('lowpoly64-scene.glb');
  expect(diagnostics.glbBytes).toBeGreaterThan(0);
  await waitForUi(page, 100);
  await assertNoPageErrors(page);
});
