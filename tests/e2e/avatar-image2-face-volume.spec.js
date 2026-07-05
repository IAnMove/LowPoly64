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
    group.traverse((node) => {
      const name = nodeName(node);
      if (name) names.push(name);
      if (!node.userData?.featureSlab || !node.userData?.isPivot) return;
      const mesh = firstMesh(node);
      const layer = mesh?.userData?.decalSpec?.layers?.[0] || {};
      const meta = node.userData.featureSlab;
      slabs.push({
        name,
        kind: meta.kind,
        sprite: layer.sprite || null,
        background: mesh?.userData?.decalSpec?.background || null,
        shape: meta.shape || null,
        width: meta.width,
        height: meta.height,
        surfaceZ: meta.surfaceZ,
        frontZ: meta.frontZ,
        depth: meta.depth,
        protrusionRatio: meta.protrusionRatio,
        embeddedRatio: meta.embeddedRatio,
        vertexCount: mesh?.geometry?.getAttribute?.('position')?.count || 0,
      });
    });

    return {
      recipe: group.userData?.avatarRecipe,
      names,
      slabs,
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
  expect(result.slabs.filter((entry) => entry.kind === 'eye').map((entry) => entry.sprite).sort(), detail)
    .toEqual(['eye_image2_hero_oval', 'eye_image2_hero_oval']);
  expect(result.slabs.filter((entry) => entry.kind === 'brow').map((entry) => entry.sprite).sort(), detail)
    .toEqual(['brow_image2_angry_slash', 'brow_image2_angry_slash']);
  expect(result.slabs.find((entry) => entry.kind === 'mouth')?.sprite, detail).toBe('mouth_image2_tooth_grin');

  for (const slab of result.slabs) {
    expect(slab.shape, detail).toMatch(/^(eye|brow|mouth)$/);
    expect(slab.vertexCount, detail).toBeGreaterThanOrEqual(40);
    expect(slab.depth, detail).toBeGreaterThan(0.05);
    expect(slab.frontZ - slab.surfaceZ, detail).toBeGreaterThan(0.03);
    expect(slab.embeddedRatio, detail).toBeGreaterThanOrEqual(0.2);
    expect(slab.background, detail).toMatch(/^#[0-9a-f]{6}$/i);
  }

  const eyes = result.slabs.filter((entry) => entry.kind === 'eye');
  const brows = result.slabs.filter((entry) => entry.kind === 'brow');
  const mouth = result.slabs.find((entry) => entry.kind === 'mouth');
  for (const slab of eyes) {
    expect(slab.background.toLowerCase(), detail).toBe('#ffffff');
    expect(slab.protrusionRatio, detail).toBeGreaterThanOrEqual(0.45);
  }
  for (const slab of brows) {
    expect(slab.background.toLowerCase(), detail).not.toBe('#ffffff');
    expect(slab.protrusionRatio, detail).toBeGreaterThanOrEqual(0.62);
  }
  expect(mouth?.background.toLowerCase(), detail).not.toBe('#ffffff');
  expect(mouth?.protrusionRatio, detail).toBeGreaterThanOrEqual(0.68);
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

test('captures Image2 face volume references', async ({ page }) => {
  test.skip(!process.env.CAPTURE_IMAGE2_FACE_VOLUME, 'Set CAPTURE_IMAGE2_FACE_VOLUME=1 to capture Image2 face volume references.');
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  fs.mkdirSync(CAPTURE_ROOT, { recursive: true });
  for (const [id, recipe] of [
    ['image2_loose', IMAGE2_FEATURE_RECIPE],
    ['image2_fullface', IMAGE2_FULL_FACE_RECIPE],
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
