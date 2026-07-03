import * as THREE from 'three';
import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

const FACE_DECAL_SPEC = {
  resolution: [64, 32],
  background: 'transparent',
  layers: [
    { kind: 'eye', side: 'L', style: 'oval', iris: '#3a6ea5', x: 0.3, y: 0.46, w: 0.16, h: 0.26 },
    { kind: 'eye', side: 'R', style: 'halfmoon', iris: '#3a6ea5', x: 0.7, y: 0.46, w: 0.16, h: 0.26 },
    { kind: 'brow', side: 'L', style: 'angled', color: '#5a3d2b', x: 0.3, y: 0.26, w: 0.2, h: 0.06, angle: -8 },
    { kind: 'brow', side: 'R', style: 'angled', color: '#5a3d2b', x: 0.7, y: 0.26, w: 0.2, h: 0.06, angle: 8 },
    { kind: 'mouth', style: 'smile', color: '#7a3b2e', x: 0.5, y: 0.74, w: 0.26, h: 0.12 },
  ],
};

const SPRITE_FACE_DECAL_SPEC = {
  resolution: [128, 128],
  background: 'transparent',
  flipY: false,
  layers: [
    { kind: 'eye', side: 'L', sprite: 'eye_lash', tint: { iris: '#3a6ea5' }, x: 0.3, y: 0.44, w: 0.18, h: 0.18 },
    { kind: 'eye', side: 'R', sprite: 'eye_lash', tint: { iris: '#3a6ea5' }, x: 0.7, y: 0.44, w: 0.18, h: 0.18 },
    { kind: 'brow', side: 'L', sprite: 'brow_angled', tint: { brow: '#5a3d2b' }, x: 0.3, y: 0.25, w: 0.2, h: 0.07, angle: -8 },
    { kind: 'brow', side: 'R', sprite: 'brow_angled', tint: { brow: '#5a3d2b' }, x: 0.7, y: 0.25, w: 0.2, h: 0.07, angle: 8 },
    { kind: 'mouth', sprite: 'mouth_grin', tint: { lip: '#7a3b2e' }, x: 0.5, y: 0.74, w: 0.32, h: 0.16 },
  ],
};

const FACE_DECAL_FIXTURE = {
  name: 'Face Decal Import',
  pieces: [
    {
      name: 'HEAD_BLOCK',
      geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } },
      color: '#d8ad86',
      position: [0, 1, 0],
    },
    {
      name: 'FACE_DECAL',
      geometry: { type: 'plane', params: { width: 0.68, height: 0.36 } },
      color: '#ffffff',
      position: [0, 1.02, 0.52],
      decal: SPRITE_FACE_DECAL_SPEC,
    },
  ],
};

const AVATAR_SPRITE_IDS_V1 = [
  'eye_oval',
  'eye_dot',
  'eye_halfmoon',
  'eye_angry',
  'eye_star',
  'eye_lash',
  'mouth_smile',
  'mouth_flat',
  'mouth_open',
  'mouth_frown',
  'mouth_grin',
  'brow_flat',
  'brow_angled',
  'brow_thick',
];

test('renders decal layers to a transparent nearest-filter canvas texture', async ({ page }) => {
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async (spec) => {
    const {
      createFaceDecalTexture,
      renderDecalLayers,
      validateFaceDecalSpec,
    } = await import('/src/modules/texture/texture-generator.js');

    const validationError = validateFaceDecalSpec(spec);
    const invalid = structuredClone(spec);
    invalid.layers[0].style = 'unsupported';
    const invalidError = validateFaceDecalSpec(invalid);
    const canvas = renderDecalLayers(spec);
    const ctx = canvas.getContext('2d');
    const transparentPixel = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    const eyePixel = Array.from(ctx.getImageData(19, 15, 1, 1).data);
    const { texture, textureDefinition } = createFaceDecalTexture(spec);

    return {
      validationError,
      invalidError,
      width: canvas.width,
      height: canvas.height,
      transparentAlpha: transparentPixel[3],
      eyeAlpha: eyePixel[3],
      magFilter: texture.magFilter,
      minFilter: texture.minFilter,
      dataUrlPrefix: textureDefinition.dataURL.slice(0, 22),
      persistedLayers: textureDefinition.decal.layers.length,
      transformRepeat: textureDefinition.transform.repeat,
    };
  }, FACE_DECAL_SPEC);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.invalidError).toContain('eye style');
  expect(diagnostics.width).toBe(64);
  expect(diagnostics.height).toBe(32);
  expect(diagnostics.transparentAlpha).toBe(0);
  expect(diagnostics.eyeAlpha).toBeGreaterThan(0);
  expect(diagnostics.magFilter).toBe(THREE.NearestFilter);
  expect(diagnostics.minFilter).toBe(THREE.NearestFilter);
  expect(diagnostics.dataUrlPrefix).toBe('data:image/png;base64,');
  expect(diagnostics.persistedLayers).toBe(FACE_DECAL_SPEC.layers.length);
  expect(diagnostics.transformRepeat).toEqual([1, -1]);
  await assertNoPageErrors(page);
});

test('loads avatar sprites with exact palette-swap tint slots', async ({ page }) => {
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async () => {
    const { AVATAR_SPRITE_MANIFEST, loadSprite } = await import('/src/modules/texture/texture-generator.js');
    const canvas = await loadSprite('eye_oval', { iris: '#3a6ea5' });
    const cached = await loadSprite('eye_oval', { iris: '#3a6ea5' });
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bluePixels = 0;
    let magentaPixels = 0;
    let opaquePixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      opaquePixels += 1;
      if (data[index] === 0x3a && data[index + 1] === 0x6e && data[index + 2] === 0xa5) {
        bluePixels += 1;
      }
      if (data[index] === 0xff && data[index + 1] === 0x00 && data[index + 2] === 0xff) {
        magentaPixels += 1;
      }
    }

    return {
      width: canvas.width,
      height: canvas.height,
      ids: AVATAR_SPRITE_MANIFEST.map((entry) => entry.id),
      sameCachedCanvas: canvas === cached,
      bluePixels,
      magentaPixels,
      opaquePixels,
    };
  });

  expect(diagnostics.ids).toEqual(expect.arrayContaining(AVATAR_SPRITE_IDS_V1));
  expect(diagnostics.ids).toHaveLength(AVATAR_SPRITE_IDS_V1.length);
  expect(diagnostics.width).toBe(32);
  expect(diagnostics.height).toBe(32);
  expect(diagnostics.sameCachedCanvas).toBe(true);
  expect(diagnostics.opaquePixels).toBeGreaterThan(0);
  expect(diagnostics.bluePixels).toBeGreaterThan(0);
  expect(diagnostics.magentaPixels).toBe(0);
  await assertNoPageErrors(page);
});

test('composes sprite decal layers with drawImage and mirrored right-side sprites', async ({ page }) => {
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async (spec) => {
    const {
      createFaceDecalTextureAsync,
      renderDecalLayersAsync,
      validateFaceDecalSpec,
    } = await import('/src/modules/texture/texture-generator.js');

    const validationError = validateFaceDecalSpec(spec);
    const invalid = structuredClone(spec);
    invalid.layers[0].sprite = 'mouth_smile';
    const invalidKindError = validateFaceDecalSpec(invalid);
    const canvas = await renderDecalLayersAsync(spec);
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let bluePixels = 0;
    let magentaPixels = 0;
    let greenPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] === 0) continue;
      if (data[index] === 0x3a && data[index + 1] === 0x6e && data[index + 2] === 0xa5) bluePixels += 1;
      if (data[index] === 0xff && data[index + 1] === 0x00 && data[index + 2] === 0xff) magentaPixels += 1;
      if (data[index] === 0x00 && data[index + 1] === 0xff && data[index + 2] === 0x00) greenPixels += 1;
    }
    const { textureDefinition } = await createFaceDecalTextureAsync(spec);

    return {
      validationError,
      invalidKindError,
      width: canvas.width,
      height: canvas.height,
      bluePixels,
      magentaPixels,
      greenPixels,
      persistedSprite: textureDefinition.decal.layers[0].sprite,
      persistedTint: textureDefinition.decal.layers[0].tint,
    };
  }, SPRITE_FACE_DECAL_SPEC);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.invalidKindError).toContain('sprite kind');
  expect(diagnostics.width).toBe(128);
  expect(diagnostics.height).toBe(128);
  expect(diagnostics.bluePixels).toBeGreaterThan(0);
  expect(diagnostics.magentaPixels).toBe(0);
  expect(diagnostics.greenPixels).toBe(0);
  expect(diagnostics.persistedSprite).toBe('eye_lash');
  expect(diagnostics.persistedTint).toEqual({ iris: '#3a6ea5' });
  await assertNoPageErrors(page);
});

test('imports, persists, re-exports, and GLB-exports sprite faceDecal specs', async ({ page }) => {
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async (fixture) => {
    const [
      { importObjectFromJSON, validateObjectJSON },
      { serializeGroupAsImportJSON, serializeScene, deserializeScene },
      { exportGLBToBuffer },
      { waitForFaceDecalTextures },
    ] = await Promise.all([
      import('/src/modules/viewport/json-import.js'),
      import('/src/modules/viewport/persistence.js'),
      import('/src/modules/viewport/export.js'),
      import('/src/modules/texture/texture-generator.js'),
    ]);

    const validationError = validateObjectJSON(fixture);
    const importResult = await importObjectFromJSON(JSON.stringify(fixture));
    if (!importResult.success) throw new Error(importResult.error);

    const state = window.__LOWPOLY64_STATE__;
    const group = state.userObjects.children[0];
    await waitForFaceDecalTextures(group);
    const decalDiagnostics = (() => {
      let result = null;
      group.traverse((node) => {
        if (result || !node.isMesh || node.parent?.userData?.name !== 'FACE_DECAL') return;
        result = {
          hasTexture: !!node.material.map,
          hasDecalSpec: !!node.userData.decalSpec,
          textureDataUrlPrefix: node.userData.textureDefinition?.dataURL?.slice(0, 22) || '',
          transparent: node.material.transparent,
          alphaTest: node.material.alphaTest,
          magFilter: node.material.map?.magFilter || null,
        };
      });
      return result;
    })();

    const exportedJson = serializeGroupAsImportJSON(group);
    const exportedDecalPiece = exportedJson.pieces.find((piece) => piece.name === 'FACE_DECAL');
    const sceneJson = serializeScene();
    const sceneDecalNode = sceneJson.objects[0].children.find((child) => child.name === 'FACE_DECAL');

    await deserializeScene(sceneJson);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await waitForFaceDecalTextures(state.userObjects.children[0]);

    let restoredHasDecal = false;
    state.userObjects.children[0].traverse((node) => {
      if (node.isMesh && node.parent?.userData?.name === 'FACE_DECAL') {
        restoredHasDecal = !!node.userData.decalSpec && !!node.material.map;
      }
    });

    const { buffer, filename } = await exportGLBToBuffer();

    return {
      validationError,
      decalDiagnostics,
      exportedHasDecal: !!exportedDecalPiece?.decal,
      exportedHasTextureFallback: !!exportedDecalPiece?.texture?.dataURL,
      exportedTextureHasDecal: !!exportedDecalPiece?.texture?.decal,
      sceneHasDecal: !!sceneDecalNode?.mesh?.decal,
      restoredHasDecal,
      exportedSprite: exportedDecalPiece?.decal?.layers?.[0]?.sprite || null,
      exportedTint: exportedDecalPiece?.decal?.layers?.[0]?.tint || null,
      sceneSprite: sceneDecalNode?.mesh?.decal?.layers?.[0]?.sprite || null,
      glbFilename: filename,
      glbBytes: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  }, FACE_DECAL_FIXTURE);

  expect(diagnostics.validationError).toBeNull();
  expect(diagnostics.decalDiagnostics).toMatchObject({
    hasTexture: true,
    hasDecalSpec: true,
    textureDataUrlPrefix: 'data:image/png;base64,',
    transparent: true,
    alphaTest: 0.01,
    magFilter: THREE.NearestFilter,
  });
  expect(diagnostics.exportedHasDecal).toBe(true);
  expect(diagnostics.exportedHasTextureFallback).toBe(true);
  expect(diagnostics.exportedTextureHasDecal).toBe(true);
  expect(diagnostics.sceneHasDecal).toBe(true);
  expect(diagnostics.restoredHasDecal).toBe(true);
  expect(diagnostics.exportedSprite).toBe('eye_lash');
  expect(diagnostics.exportedTint).toEqual({ iris: '#3a6ea5' });
  expect(diagnostics.sceneSprite).toBe('eye_lash');
  expect(diagnostics.glbFilename).toBe('lowpoly64-scene.glb');
  expect(diagnostics.glbBytes).toBeGreaterThan(0);
  await waitForUi(page, 100);
  await assertNoPageErrors(page);
});
