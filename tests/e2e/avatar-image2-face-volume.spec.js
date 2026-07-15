import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';
import {
  openAvatarForge,
  updateAvatarForgeRecipe,
} from './helpers/avatar-forge.js';

test.describe.configure({ timeout: 300000 });

const CAPTURE_ROOT = path.join('docs', 'baselines', '2026-07-05-image2-face-volume');

const IMAGE2_FEATURE_RECIPE = Object.freeze({
  label: 'Image2 Feature Volume',
  bodyPresetId: 'n64_classic',
  headMoldId: 'gen_head_heroic',
  featureSlabPresetId: 'default_embedded',
  paletteId: 'ivory_wine',
  accessoryIds: ['bridge_jewel_circlet_01'],
  features: {
    hair: { presetId: 'psx_layered_hero_01' },
    fullFace: { presetId: 'none_01' },
    eyes: { presetId: 'image2_hero_oval_01' },
    brows: { presetId: 'image2_angry_slash_01' },
    nose: { presetId: 'nose_bridge_01' },
    mouth: { presetId: 'image2_tooth_grin_01' },
    ears: { presetId: 'ear_point_01' },
  },
});

const IMAGE2_FULL_FACE_RECIPE = Object.freeze({
  label: 'Image2 Full Face Volume',
  bodyPresetId: 'psx_chibi',
  headMoldId: 'gen_head_chibi',
  featureSlabPresetId: 'toy_extruded',
  paletteId: 'pastel_pop',
  accessoryIds: ['n64_flower_pin_01'],
  features: {
    hair: { presetId: 'n64_round_bangs_01' },
    fullFace: { presetId: 'image2_young_hero_01' },
    eyes: { presetId: 'image2_sleepy_lid_01' },
    brows: { presetId: 'image2_hero_flat_01' },
    nose: { presetId: 'nose_soft_01' },
    mouth: { presetId: 'image2_hero_smile_01' },
    ears: { presetId: 'ear_soft_01' },
  },
});

const IMAGE2_TRANSPARENT_FULL_FACE_RECIPE = Object.freeze({
  label: 'Image2 Transparent Full Face Volume',
  bodyPresetId: 'psx_chibi',
  headMoldId: 'gen_head_chibi',
  featureSlabPresetId: 'toy_extruded',
  paletteId: 'warm_rose',
  accessoryIds: [],
  features: {
    hair: { presetId: 'side_part_01' },
    fullFace: { presetId: 'image2_transparent_brave_neutral_01' },
    eyes: { presetId: 'image2_sleepy_lid_01' },
    brows: { presetId: 'image2_hero_flat_01' },
    nose: { presetId: 'nose_soft_01' },
    mouth: { presetId: 'image2_hero_smile_01' },
    ears: { presetId: 'ear_soft_01' },
  },
});

async function collectImage2FaceDiagnostics(page, recipe) {
  return page.evaluate(async (recipeInput) => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function nodeName(node) {
      return String(node?.userData?.name || node?.name || '');
    }

    function firstMesh(node) {
      if (node?.isMesh) return node;
      let mesh = null;
      node?.traverse?.((child) => {
        if (!mesh && child.isMesh) mesh = child;
      });
      return mesh;
    }

    const group = await buildAvatarGroup(createMoldAvatarRecipe(recipeInput));
    const names = [];
    const slabs = [];
    const edges = [];
    group.traverse((node) => {
      const name = nodeName(node);
      if (name) names.push(name);
      if (node.userData?.role === 'FACE_FEATURE_EDGE' && node.userData?.isPivot) {
        const mesh = firstMesh(node);
        const positions = mesh?.geometry?.getAttribute?.('position');
        const zValues = positions
          ? Array.from({ length: positions.count }, (_, index) => positions.getZ(index))
          : [];
        edges.push({
          name,
          color: mesh?.material?.color ? `#${mesh.material.color.getHexString()}` : null,
          hasTexture: !!mesh?.material?.map,
          transparent: !!mesh?.material?.transparent,
          vertexCount: mesh?.geometry?.getAttribute?.('position')?.count || 0,
          triangleCount: mesh?.geometry?.getIndex?.()?.count
            ? mesh.geometry.getIndex().count / 3
            : 0,
          geometrySpan: zValues.length ? Math.max(...zValues) - Math.min(...zValues) : 0,
        });
      }
      if (!node.userData?.featureSlab || !node.userData?.isPivot) return;
      const mesh = firstMesh(node);
      const layer = mesh?.userData?.decalSpec?.layers?.[0] || {};
      const meta = node.userData.featureSlab;
      const positions = mesh?.geometry?.getAttribute?.('position');
      const zValues = positions
        ? Array.from({ length: positions.count }, (_, index) => positions.getZ(index))
        : [];
      slabs.push({
        name,
        kind: meta.kind,
        sprite: layer.sprite || null,
        tintIris: layer.tint?.iris || null,
        background: mesh?.userData?.decalSpec?.background || null,
        shape: meta.shape || null,
        geometryMode: meta.geometryMode || null,
        edgeColor: meta.edgeColor || null,
        sourceBounds: meta.sourceBounds || null,
        transparentBackground: meta.transparentBackground || false,
        width: meta.width,
        height: meta.height,
        surfaceZ: meta.surfaceZ,
        frontZ: meta.frontZ,
        depth: meta.depth,
        protrusionRatio: meta.protrusionRatio,
        embeddedRatio: meta.embeddedRatio,
        decalFrontZ: meta.decalFrontZ || null,
        volumeId: meta.volumeId || null,
        inflatedEdgeZ: meta.inflatedEdgeZ || null,
        inflatedCenterZ: meta.inflatedCenterZ || null,
        embeddedBackZ: meta.embeddedBackZ || null,
        followsHeadSurface: meta.followsHeadSurface || false,
        centerSurfaceZ: meta.centerSurfaceZ || null,
        surfaceDepthRange: meta.surfaceDepthRange || 0,
        edgeWallId: meta.edgeWallId || null,
        edgeWallColor: meta.edgeWallColor || null,
        geometryMinZ: zValues.length ? Math.min(...zValues) : null,
        geometryMaxZ: zValues.length ? Math.max(...zValues) : null,
        vertexCount: mesh?.geometry?.getAttribute?.('position')?.count || 0,
        explicitUvCount: mesh?.userData?.geometryParams?.uvs?.length || 0,
      });
    });

    return {
      recipe: group.userData?.avatarRecipe,
      names,
      slabs,
      edges,
    };
  }, recipe);
}

async function showRecipeInForge(page, recipe, view = 'front') {
  await openAvatarForge(page);
  await updateAvatarForgeRecipe(page, recipe);
  await page.evaluate(async (viewName) => {
    const [{ setAvatarForgePreviewView }] = await Promise.all([
      import('/src/modules/avatar/avatar-ui.js'),
    ]);
    setAvatarForgePreviewView(viewName);
  }, view);
  await waitForUi(page, 300);
}

test('builds Image2 loose facial features as visible protruding volumes', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await collectImage2FaceDiagnostics(page, IMAGE2_FEATURE_RECIPE);
  const detail = JSON.stringify(result, null, 2);

  expect(result.slabs, detail).toHaveLength(5);
  expect(result.slabs.map((entry) => entry.name).sort(), detail).toEqual([
    'BROW_SLAB_L',
    'BROW_SLAB_R',
    'EYE_SLAB_L',
    'EYE_SLAB_R',
    'MOUTH_SLAB',
  ]);
  expect(result.edges.map((entry) => entry.name).sort(), detail).toEqual([
    'BROW_SLAB_L_EDGE',
    'BROW_SLAB_R_EDGE',
    'EYE_SLAB_L_EDGE',
    'EYE_SLAB_R_EDGE',
    'MOUTH_SLAB_EDGE',
  ]);
  expect(result.slabs.filter((entry) => entry.kind === 'eye').map((entry) => entry.sprite).sort(), detail)
    .toEqual(['eye_image2_hero_oval', 'eye_image2_hero_oval']);
  expect(result.slabs.filter((entry) => entry.kind === 'brow').map((entry) => entry.sprite).sort(), detail)
    .toEqual(['brow_image2_angry_slash', 'brow_image2_angry_slash']);
  expect(result.slabs.find((entry) => entry.kind === 'mouth')?.sprite, detail).toBe('mouth_image2_tooth_grin');
  expect(result.names.some((name) => /_VOLUME$/.test(name)), detail).toBe(false);

  for (const slab of result.slabs) {
    const referenceSurfaceZ = slab.followsHeadSurface ? slab.centerSurfaceZ : slab.surfaceZ;
    expect(slab.shape, detail).toMatch(/^(eye|brow|mouth)$/);
    expect(slab.geometryMode, detail).toMatch(/^spriteContourInflated(Plane|Surface)$/);
    expect(slab.edgeColor, detail).toMatch(/^#[0-9a-f]{6}$/i);
    expect(slab.edgeWallId, detail).toBe(`${slab.name}_EDGE`);
    expect(slab.edgeWallColor, detail).toBe(slab.edgeColor);
    expect(slab.sourceBounds, detail).toHaveLength(4);
    expect(slab.sourceBounds[2], detail).toBeGreaterThan(0);
    expect(slab.sourceBounds[3], detail).toBeGreaterThan(0);
    expect(slab.vertexCount, detail).toBeGreaterThanOrEqual(70);
    expect(slab.explicitUvCount, detail).toBe(slab.vertexCount);
    expect(slab.volumeId, detail).toBeNull();
    expect(slab.inflatedEdgeZ, detail).toBeGreaterThan(referenceSurfaceZ);
    expect(slab.inflatedCenterZ, detail).toBeGreaterThan(slab.inflatedEdgeZ);
    expect(slab.embeddedBackZ, detail).toBeLessThan(referenceSurfaceZ);
    expect(slab.frontZ, detail).toBeCloseTo(slab.inflatedCenterZ, 5);
    expect(slab.depth, detail).toBeGreaterThan(0.05);
    expect(slab.frontZ - referenceSurfaceZ, detail).toBeGreaterThan(0.015);
    expect(slab.frontZ - referenceSurfaceZ, detail).toBeLessThan(0.055);
    expect(slab.embeddedRatio, detail).toBeGreaterThanOrEqual(0.7);
    expect(slab.background, detail).toBe('transparent');
    expect(slab.transparentBackground, detail).toBe(true);
    const edge = result.edges.find((entry) => entry.name === slab.edgeWallId);
    expect(edge?.color, detail).toBe(slab.edgeColor);
    expect(edge?.hasTexture, detail).toBe(false);
    expect(edge?.transparent, detail).toBe(false);
    expect(edge?.vertexCount, detail).toBeGreaterThanOrEqual(50);
    expect(edge?.triangleCount, detail).toBeGreaterThanOrEqual(50);
    expect(edge?.geometrySpan, detail).toBeGreaterThan(slab.depth * 0.1);
  }

  const eyes = result.slabs.filter((entry) => entry.kind === 'eye');
  const brows = result.slabs.filter((entry) => entry.kind === 'brow');
  const mouth = result.slabs.find((entry) => entry.kind === 'mouth');
  for (const slab of eyes) {
    expect(slab.geometryMode, detail).toBe('spriteContourInflatedSurface');
    expect(slab.followsHeadSurface, detail).toBe(true);
    expect(slab.centerSurfaceZ, detail).toBeGreaterThan(0);
    expect(slab.surfaceDepthRange, detail).toBeGreaterThan(0.02);
    expect(slab.vertexCount, detail).toBeGreaterThanOrEqual(100);
    expect(slab.width / slab.height, detail).toBeCloseTo(1 / 0.7, 2);
    expect(slab.protrusionRatio, detail).toBeLessThanOrEqual(0.28);
  }
  for (const slab of brows) {
    expect(slab.geometryMode, detail).toBe('spriteContourInflatedSurface');
    expect(slab.followsHeadSurface, detail).toBe(true);
    expect(slab.centerSurfaceZ, detail).toBeGreaterThan(0);
    expect(slab.surfaceDepthRange, detail).toBeGreaterThan(0.02);
    expect(slab.protrusionRatio, detail).toBeLessThanOrEqual(0.3);
  }
  expect(mouth?.geometryMode, detail).toBe('spriteContourInflatedSurface');
  expect(mouth?.followsHeadSurface, detail).toBe(true);
  expect(mouth?.centerSurfaceZ, detail).toBeGreaterThan(0);
  expect(mouth?.surfaceDepthRange, detail).toBeGreaterThan(0.008);
  expect(mouth?.protrusionRatio, detail).toBeLessThanOrEqual(0.26);
});

test('scales inflated feature depth without changing sprite placement', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const shallow = await collectImage2FaceDiagnostics(page, {
    ...IMAGE2_FEATURE_RECIPE,
    featureDepthScale: 0.6,
  });
  const deep = await collectImage2FaceDiagnostics(page, {
    ...IMAGE2_FEATURE_RECIPE,
    featureDepthScale: 1.4,
  });

  expect(shallow.recipe.featureDepthScale).toBe(0.6);
  expect(deep.recipe.featureDepthScale).toBe(1.4);
  expect(deep.slabs).toHaveLength(shallow.slabs.length);
  shallow.slabs.forEach((shallowSlab, index) => {
    const deepSlab = deep.slabs[index];
    expect(deepSlab.name).toBe(shallowSlab.name);
    expect(deepSlab.width).toBeCloseTo(shallowSlab.width, 5);
    expect(deepSlab.height).toBeCloseTo(shallowSlab.height, 5);
    expect(deepSlab.centerSurfaceZ).toBeCloseTo(shallowSlab.centerSurfaceZ, 5);
    expect(deepSlab.surfaceDepthRange).toBeCloseTo(shallowSlab.surfaceDepthRange, 5);
    expect(deepSlab.depth).toBeGreaterThan(shallowSlab.depth * 2);
    expect(deepSlab.inflatedCenterZ - deepSlab.inflatedEdgeZ)
      .toBeGreaterThan((shallowSlab.inflatedCenterZ - shallowSlab.inflatedEdgeZ) * 1.8);
  });
});

test('builds full face as a mutually exclusive embedded skin plate', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await collectImage2FaceDiagnostics(page, IMAGE2_FULL_FACE_RECIPE);
  const detail = JSON.stringify(result, null, 2);
  const names = new Set(result.names);

  expect(result.slabs, detail).toHaveLength(1);
  expect(result.slabs[0].name, detail).toMatch(/FULL_FACE_SLAB$/);
  expect(result.slabs[0].kind, detail).toBe('fullface');
  expect(result.slabs[0].sprite, detail).toBe('fullface_image2_young_hero');
  expect(result.slabs[0].tintIris, detail).toMatch(/^#[0-9a-f]{6}$/i);
  expect(result.slabs[0].shape, detail).toBe('fullface');
  expect(result.slabs[0].width, detail).toBeCloseTo(result.slabs[0].height, 5);
  expect(result.slabs[0].vertexCount, detail).toBe(8);
  expect(result.slabs[0].depth, detail).toBeGreaterThan(0.07);
  expect(result.slabs[0].frontZ - result.slabs[0].surfaceZ, detail).toBeGreaterThan(0.001);
  expect(result.slabs[0].protrusionRatio, detail).toBeLessThanOrEqual(0.1);
  expect(result.slabs[0].embeddedRatio, detail).toBeGreaterThanOrEqual(0.85);
  expect(result.slabs[0].background, detail).toMatch(/^#[0-9a-f]{6}$/i);

  expect([...names].some((name) => /EYE_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /BROW_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /MOUTH_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /NOSE/i.test(name)), detail).toBe(false);
});

test('builds transparent full face as an embedded alpha-only overlay', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await collectImage2FaceDiagnostics(page, IMAGE2_TRANSPARENT_FULL_FACE_RECIPE);
  const detail = JSON.stringify(result, null, 2);
  const names = new Set(result.names);

  expect(result.slabs, detail).toHaveLength(1);
  expect(result.slabs[0].name, detail).toMatch(/FULL_FACE_SLAB$/);
  expect(result.slabs[0].kind, detail).toBe('fullface');
  expect(result.slabs[0].sprite, detail).toBe('fullface_image2_transparent_brave_neutral');
  expect(result.slabs[0].tintIris, detail).toMatch(/^#[0-9a-f]{6}$/i);
  expect(result.slabs[0].shape, detail).toBe('fullface');
  expect(result.slabs[0].width, detail).toBeCloseTo(result.slabs[0].height, 5);
  expect(result.slabs[0].width, detail).toBeLessThan(0.6);
  expect(result.slabs[0].vertexCount, detail).toBe(8);
  expect(result.slabs[0].frontZ - result.slabs[0].surfaceZ, detail).toBeLessThan(0.01);
  expect(result.slabs[0].protrusionRatio, detail).toBeLessThanOrEqual(0.02);
  expect(result.slabs[0].embeddedRatio, detail).toBeGreaterThanOrEqual(0.95);
  expect(result.slabs[0].background, detail).toBe('transparent');
  expect(result.slabs[0].transparentBackground, detail).toBe(true);

  expect([...names].some((name) => /EYE_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /BROW_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /MOUTH_SLAB/i.test(name)), detail).toBe(false);
  expect([...names].some((name) => /NOSE/i.test(name)), detail).toBe(false);
});

test('captures Image2 face volume references', async ({ page }) => {
  test.skip(!process.env.CAPTURE_IMAGE2_FACE_VOLUME, 'Set CAPTURE_IMAGE2_FACE_VOLUME=1 to capture Image2 face volume references.');
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  fs.mkdirSync(CAPTURE_ROOT, { recursive: true });
  for (const [id, recipe] of [
    ['image2_loose', IMAGE2_FEATURE_RECIPE],
    ['image2_fullface', IMAGE2_FULL_FACE_RECIPE],
    ['image2_transparent_fullface', IMAGE2_TRANSPARENT_FULL_FACE_RECIPE],
  ]) {
    for (const view of ['front', 'profile', 'threeQuarter']) {
      await showRecipeInForge(page, recipe, view);
      await page.screenshot({
        path: path.join(CAPTURE_ROOT, `${id}_${view}.png`),
        animations: 'disabled',
      });
    }
  }
});
