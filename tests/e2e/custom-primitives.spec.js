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

const LIMB_LOFT_FIXTURE = {
  name: 'Limb Loft Examples',
  pieces: [
    {
      name: 'BENT_ARM_LOFT',
      geometry: {
        type: 'limbLoft',
        params: {
          sides: 6,
          sections: [
            { y: 0, radiusX: 0.18, radiusZ: 0.14, offsetX: 0, offsetZ: 0 },
            { y: 0.55, radiusX: 0.13, radiusZ: 0.11, offsetX: 0.05, offsetZ: 0.04 },
            { y: 1.05, radiusX: 0.11, radiusZ: 0.09, offsetX: 0.02, offsetZ: 0.12 },
          ],
          capTop: true,
          capBottom: true,
        },
      },
      color: '#d8a074',
      position: [-0.8, 0.2, 0],
      vertexColors: { top: '#e4b184', bottom: '#a96f47' },
    },
    {
      name: 'TAPERED_LEG_LOFT',
      geometry: {
        type: 'limbLoft',
        params: {
          sides: 6,
          sections: [
            { y: 0, radiusX: 0.22, radiusZ: 0.18, offsetX: 0, offsetZ: 0 },
            { y: 0.62, radiusX: 0.18, radiusZ: 0.15, offsetX: -0.02, offsetZ: 0.01 },
            { y: 1.18, radiusX: 0.14, radiusZ: 0.12, offsetX: 0, offsetZ: -0.03 },
          ],
          capTop: true,
          capBottom: true,
        },
      },
      color: '#56619c',
      position: [0.8, 0.1, 0],
    },
  ],
};

const LATHE_MUSHROOM_FIXTURE = {
  name: 'Lathe Mushroom Example',
  pieces: [
    {
      name: 'MUSHROOM_CAP_LATHE',
      geometry: {
        type: 'lathe',
        params: {
          points: [
            [0, -0.24],
            [0.62, -0.18],
            [0.82, 0.02],
            [0.44, 0.2],
            [0, 0.3],
          ],
          segments: 8,
        },
      },
      color: '#d94a38',
      position: [0, 1.45, 0],
      vertexColors: { top: '#f87171', bottom: '#8f2d23' },
    },
    {
      name: 'MUSHROOM_STEM',
      geometry: {
        type: 'cylinder',
        params: {
          radiusTop: 0.18,
          radiusBottom: 0.25,
          height: 1.15,
          radialSegments: 6,
        },
      },
      color: '#f0d6b8',
      position: [0, 0.68, 0],
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

test('imports, persists, re-exports, and GLB-exports limbLoft pieces', async ({ page }) => {
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
    const invalidSides = structuredClone(fixture);
    invalidSides.pieces[0].geometry.params.sides = 3;
    const invalidSidesError = validateObjectJSON(invalidSides);
    const invalidSections = structuredClone(fixture);
    invalidSections.pieces[0].geometry.params.sections[1].y = 0;
    const invalidSectionsError = validateObjectJSON(invalidSections);

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
        });
      }
    });

    const { buffer, filename } = await exportGLBToBuffer();

    return {
      validationError,
      invalidSidesError,
      invalidSectionsError,
      exportedTypes: exportedJson.pieces.map((piece) => piece.geometry.type),
      sceneTypes: sceneJson.objects[0].children.map((child) => child.mesh.geometryType),
      meshes,
      glbFilename: filename,
      glbBytes: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  }, LIMB_LOFT_FIXTURE);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.invalidSidesError).toContain('sides');
  expect(diagnostics.invalidSectionsError).toContain('limbLoft');
  expect(diagnostics.exportedTypes).toEqual(['limbLoft', 'limbLoft']);
  expect(diagnostics.sceneTypes).toEqual(['limbLoft', 'limbLoft']);
  expect(diagnostics.meshes).toHaveLength(2);

  const arm = diagnostics.meshes.find((entry) => entry.name === 'BENT_ARM_LOFT');
  expect(arm?.geometryParams).toMatchObject(LIMB_LOFT_FIXTURE.pieces[0].geometry.params);
  expect(arm?.positionCount).toBe(20);
  expect(arm?.indexCount).toBe(108);
  expect(arm?.hasVertexColorAttribute).toBe(true);

  const leg = diagnostics.meshes.find((entry) => entry.name === 'TAPERED_LEG_LOFT');
  expect(leg?.geometryParams).toMatchObject(LIMB_LOFT_FIXTURE.pieces[1].geometry.params);
  expect(leg?.positionCount).toBe(20);
  expect(leg?.indexCount).toBe(108);

  expect(diagnostics.glbFilename).toBe('lowpoly64-scene.glb');
  expect(diagnostics.glbBytes).toBeGreaterThan(0);
  await waitForUi(page, 100);
  await assertNoPageErrors(page);
});

test('imports, persists, re-exports, and GLB-exports a lathe mushroom', async ({ page }) => {
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
    const invalidSegments = structuredClone(fixture);
    invalidSegments.pieces[0].geometry.params.segments = 3;
    const invalidSegmentsError = validateObjectJSON(invalidSegments);
    const invalidProfile = structuredClone(fixture);
    invalidProfile.pieces[0].geometry.params.points[2][1] = -0.18;
    const invalidProfileError = validateObjectJSON(invalidProfile);

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
        });
      }
    });

    const { buffer, filename } = await exportGLBToBuffer();

    return {
      validationError,
      invalidSegmentsError,
      invalidProfileError,
      exportedTypes: exportedJson.pieces.map((piece) => piece.geometry.type),
      sceneTypes: sceneJson.objects[0].children.map((child) => child.mesh.geometryType),
      meshes,
      glbFilename: filename,
      glbBytes: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  }, LATHE_MUSHROOM_FIXTURE);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.invalidSegmentsError).toContain('segments');
  expect(diagnostics.invalidProfileError).toContain('lathe');
  expect(diagnostics.exportedTypes).toEqual(['lathe', 'cylinder']);
  expect(diagnostics.sceneTypes).toEqual(['lathe', 'cylinder']);
  expect(diagnostics.meshes).toHaveLength(2);

  const cap = diagnostics.meshes.find((entry) => entry.name === 'MUSHROOM_CAP_LATHE');
  expect(cap?.geometryParams).toMatchObject(LATHE_MUSHROOM_FIXTURE.pieces[0].geometry.params);
  expect(cap?.positionCount).toBe(40);
  expect(cap?.indexCount).toBe(192);
  expect(cap?.hasVertexColorAttribute).toBe(true);

  expect(diagnostics.glbFilename).toBe('lowpoly64-scene.glb');
  expect(diagnostics.glbBytes).toBeGreaterThan(0);
  await waitForUi(page, 100);
  await assertNoPageErrors(page);
});
