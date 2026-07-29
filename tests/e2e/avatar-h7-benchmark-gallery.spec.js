import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

const H7_BENCHMARKS = Object.freeze([
  {
    id: 'h7_serious_hero',
    role: 'serious hero',
    expectedSprites: Object.freeze({
      eyes: 'eye_square_guard',
      brows: 'brow_low_heavy',
      mouth: 'mouth_grit_square',
    }),
    recipe: Object.freeze({
      label: 'H7 Serious Hero',
      bodyPresetId: 'n64_classic',
      headMoldId: 'gen_head_heroic',
      featureSlabPresetId: 'default_embedded',
      paletteId: 'ivory_wine',
      accessoryIds: ['bridge_jewel_circlet_01'],
      features: {
        hair: { presetId: 'psx_layered_hero_01' },
        eyes: { presetId: 'psx_square_guard_01' },
        brows: { presetId: 'psx_low_heavy_01' },
        nose: { presetId: 'nose_bridge_01' },
        mouth: { presetId: 'psx_grit_square_01' },
        ears: { presetId: 'ear_point_01' },
      },
    }),
  },
  {
    id: 'h7_cute_npc',
    role: 'cute npc',
    expectedSprites: Object.freeze({
      eyes: 'eye_wide_wonder',
      brows: 'brow_round_thick_soft',
      mouth: 'mouth_big_cheer',
    }),
    recipe: Object.freeze({
      label: 'H7 Cute NPC',
      bodyPresetId: 'psx_chibi',
      headMoldId: 'gen_head_chibi',
      featureSlabPresetId: 'default_embedded',
      paletteId: 'pastel_pop',
      accessoryIds: ['n64_flower_pin_01'],
      features: {
        hair: { presetId: 'n64_round_bangs_01' },
        eyes: { presetId: 'n64_wide_wonder_01' },
        brows: { presetId: 'bridge_round_thick_soft_01' },
        nose: { presetId: 'nose_soft_01' },
        mouth: { presetId: 'n64_big_cheer_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }),
  },
  {
    id: 'h7_elder',
    role: 'elder',
    expectedSprites: Object.freeze({
      eyes: 'eye_teary',
      brows: 'brow_short_worry',
      mouth: 'mouth_elder_moustache_gap',
    }),
    recipe: Object.freeze({
      label: 'H7 Elder',
      bodyPresetId: 'psx_heavy',
      headMoldId: 'gen_head_broad',
      featureSlabPresetId: 'flat_safe',
      paletteId: 'cocoa_cream',
      accessoryIds: ['bridge_mono_earring_01'],
      features: {
        hair: { presetId: 'psx_slick_back_01' },
        eyes: { presetId: 'bridge_teary_01' },
        brows: { presetId: 'bridge_short_worry_01' },
        nose: { presetId: 'nose_bridge_01' },
        mouth: { presetId: 'bridge_elder_moustache_gap_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }),
  },
  {
    id: 'h7_villain',
    role: 'villain',
    expectedSprites: Object.freeze({
      eyes: 'eye_cat_slit',
      brows: 'brow_angry_block',
      mouth: 'mouth_side_fang',
    }),
    recipe: Object.freeze({
      label: 'H7 Villain',
      bodyPresetId: 'psx_slim',
      headMoldId: 'gen_head_long',
      featureSlabPresetId: 'toy_extruded',
      paletteId: 'mocha_night',
      accessoryIds: ['bridge_tiny_horns_01'],
      features: {
        hair: { presetId: 'psx_slick_back_01' },
        eyes: { presetId: 'bridge_cat_slit_01' },
        brows: { presetId: 'psx_angry_block_01' },
        nose: { presetId: 'nose_bridge_01' },
        mouth: { presetId: 'bridge_side_fang_01' },
        ears: { presetId: 'ear_point_01' },
      },
    }),
  },
  {
    id: 'h7_robot',
    role: 'robot',
    expectedSprites: Object.freeze({
      eyes: 'eye_goggle_round',
      brows: 'brow_flat_micro',
      mouth: 'mouth_mask_line',
    }),
    recipe: Object.freeze({
      label: 'H7 Robot',
      bodyPresetId: 'n64_classic',
      headMoldId: 'gen_head_square',
      featureSlabPresetId: 'mask_plate',
      paletteId: 'cool_ash',
      accessoryIds: ['psx_visor_strip_01'],
      features: {
        hair: { presetId: 'none_01' },
        eyes: { presetId: 'n64_goggle_round_01' },
        brows: { presetId: 'bridge_flat_micro_01' },
        nose: { presetId: 'nose_soft_01' },
        mouth: { presetId: 'psx_mask_line_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }),
  },
  {
    id: 'h7_mask_ghost',
    role: 'mask ghost',
    expectedSprites: Object.freeze({
      eyes: 'eye_hollow_mask',
      brows: 'brow_elf_sweep',
      mouth: 'mouth_soft_o',
    }),
    recipe: Object.freeze({
      label: 'H7 Mask Ghost',
      bodyPresetId: 'psx_slim',
      headMoldId: 'gen_head_slim',
      featureSlabPresetId: 'flat_safe',
      paletteId: 'porcelain_blue',
      accessoryIds: ['none'],
      features: {
        hair: { presetId: 'bridge_low_pony_01' },
        eyes: { presetId: 'psx_hollow_mask_01' },
        brows: { presetId: 'bridge_elf_sweep_01' },
        nose: { presetId: 'nose_soft_01' },
        mouth: { presetId: 'bridge_soft_o_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }),
  },
]);

const VIEW_NAMES = Object.freeze(['front', 'profile', 'three-quarter']);
const CAPTURE_ROOT = path.join('docs', 'baselines', '2026-07-05-character-benchmark-h7');

async function collectH7BenchmarkDiagnostics(page) {
  return page.evaluate(async (benchmarks) => {
    const [{ state }, { buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function emptyBox() {
      return {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      };
    }

    function expandBox(box, x, y, z) {
      box.minX = Math.min(box.minX, x);
      box.maxX = Math.max(box.maxX, x);
      box.minY = Math.min(box.minY, y);
      box.maxY = Math.max(box.maxY, y);
      box.minZ = Math.min(box.minZ, z);
      box.maxZ = Math.max(box.maxZ, z);
    }

    function summarizeBox(box, found) {
      if (!found) return null;
      return {
        minX: box.minX,
        maxX: box.maxX,
        minY: box.minY,
        maxY: box.maxY,
        minZ: box.minZ,
        maxZ: box.maxZ,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
        depth: box.maxZ - box.minZ,
      };
    }

    function nodeName(node) {
      return String(node?.userData?.name || node?.name || '');
    }

    function meshBounds(group, predicate) {
      const box = emptyBox();
      let found = false;
      group.traverse((node) => {
        if (!node.isMesh || !node.geometry || !predicate(node)) return;
        node.geometry.computeBoundingBox();
        const bb = node.geometry.boundingBox;
        if (!bb) return;
        const e = node.matrixWorld.elements;
        for (let i = 0; i < 8; i += 1) {
          const x = i & 1 ? bb.max.x : bb.min.x;
          const y = i & 2 ? bb.max.y : bb.min.y;
          const z = i & 4 ? bb.max.z : bb.min.z;
          expandBox(
            box,
            (e[0] * x) + (e[4] * y) + (e[8] * z) + e[12],
            (e[1] * x) + (e[5] * y) + (e[9] * z) + e[13],
            (e[2] * x) + (e[6] * y) + (e[10] * z) + e[14],
          );
          found = true;
        }
      });
      return summarizeBox(box, found);
    }

    function boundsForNames(group, names) {
      const wanted = new Set(names);
      return meshBounds(group, (node) => wanted.has(nodeName(node)) || wanted.has(nodeName(node.parent)));
    }

    function boundsForPattern(group, pattern) {
      return meshBounds(group, (node) => pattern.test(nodeName(node)) || pattern.test(nodeName(node.parent)));
    }

    function boxInside(inner, outer, tolerance = 0.02) {
      if (!inner || !outer) return false;
      return inner.minX >= outer.minX - tolerance
        && inner.maxX <= outer.maxX + tolerance
        && inner.minY >= outer.minY - tolerance
        && inner.maxY <= outer.maxY + tolerance
        && inner.minZ >= outer.minZ - tolerance
        && inner.maxZ <= outer.maxZ + tolerance;
    }

    function firstMesh(root) {
      let mesh = null;
      root.traverse((node) => {
        if (mesh || !node.isMesh) return;
        mesh = node;
      });
      return mesh;
    }

    function collectFeatureSlabs(group) {
      const slabs = [];
      group.traverse((node) => {
        const name = nodeName(node);
        if (!node.userData?.isPivot || !/^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/.test(name)) return;
        const mesh = firstMesh(node);
        const meta = node.userData?.featureSlab || {};
        const layer = mesh?.userData?.decalSpec?.layers?.[0] || null;
        slabs.push({
          name,
          kind: meta.kind || null,
          sprite: layer?.sprite || null,
          presetId: meta.presetId || null,
          surfaceZ: meta.surfaceZ,
          centerSurfaceZ: meta.centerSurfaceZ,
          frontZ: meta.frontZ,
          depth: meta.depth,
          embeddedRatio: meta.embeddedRatio,
          frontProtrusionRatio: meta.protrusionRatio,
          hasDecal: !!mesh?.userData?.decalSpec,
        });
      });
      return slabs.sort((a, b) => a.name.localeCompare(b.name));
    }

    const results = [];
    for (const benchmark of benchmarks) {
      for (const child of [...state.userObjects.children]) {
        state.userObjects.remove(child);
      }
      const group = await buildAvatarGroup(createMoldAvatarRecipe(benchmark.recipe));
      state.userObjects.add(group);
      group.updateWorldMatrix(true, true);

      const total = meshBounds(group, () => true);
      const head = boundsForNames(group, ['HEAD_BASE']);
      const featureSlabs = collectFeatureSlabs(group);
      const faceDecal = boundsForNames(group, ['FACE_DECAL']);
      const adornment = boundsForPattern(group, /(HAIR|ACC_|ACCESSORY|GLASSES|VISOR|HORN|CIRCLET|FLOWER|RIBBON|PONY|CAP|HELM)/i);
      const featureSlabBounds = boundsForNames(group, ['EYE_SLAB_L', 'EYE_SLAB_R', 'BROW_SLAB_L', 'BROW_SLAB_R', 'MOUTH_SLAB']);

      results.push({
        id: benchmark.id,
        role: benchmark.role,
        recipe: benchmark.recipe,
        total,
        head,
        faceDecalPresent: !!faceDecal,
        adornment,
        adornmentInsideTotal: boxInside(adornment, total, 0.04),
        featureSlabs,
        featureSlabBounds,
        spriteSummary: {
          eyes: featureSlabs.filter((entry) => entry.kind === 'eye').map((entry) => entry.sprite).sort(),
          brows: featureSlabs.filter((entry) => entry.kind === 'brow').map((entry) => entry.sprite).sort(),
          mouth: featureSlabs.filter((entry) => entry.kind === 'mouth').map((entry) => entry.sprite).sort(),
        },
      });
    }

    return results;
  }, H7_BENCHMARKS);
}

async function frameH7BenchmarkView(page, benchmark, viewName) {
  await page.evaluate(async ({ recipe, view }) => {
    const [{ state }, { buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    for (const child of [...state.userObjects.children]) {
      state.userObjects.remove(child);
    }

    const group = await buildAvatarGroup(createMoldAvatarRecipe(recipe));
    state.userObjects.add(group);
    group.updateWorldMatrix(true, true);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const headBox = { minZ: Infinity, maxZ: -Infinity };
    const faceBox = { minZ: Infinity, maxZ: -Infinity };
    let headFound = false;
    let faceFound = false;

    function expandZ(box, z) {
      box.minZ = Math.min(box.minZ, z);
      box.maxZ = Math.max(box.maxZ, z);
    }

    group.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      node.geometry.computeBoundingBox();
      const bb = node.geometry.boundingBox;
      if (!bb) return;
      const parentName = String(node.parent?.userData?.name || node.parent?.name || '');
      const nodeName = String(node.userData?.name || node.name || '');
      const isHead = parentName === 'HEAD_BASE' || nodeName === 'HEAD_BASE';
      const isFace = /^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/.test(parentName)
        || /^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/.test(nodeName);
      const e = node.matrixWorld.elements;
      for (let i = 0; i < 8; i += 1) {
        const x = i & 1 ? bb.max.x : bb.min.x;
        const y = i & 2 ? bb.max.y : bb.min.y;
        const z = i & 4 ? bb.max.z : bb.min.z;
        const wx = (e[0] * x) + (e[4] * y) + (e[8] * z) + e[12];
        const wy = (e[1] * x) + (e[5] * y) + (e[9] * z) + e[13];
        const wz = (e[2] * x) + (e[6] * y) + (e[10] * z) + e[14];
        min[0] = Math.min(min[0], wx); max[0] = Math.max(max[0], wx);
        min[1] = Math.min(min[1], wy); max[1] = Math.max(max[1], wy);
        min[2] = Math.min(min[2], wz); max[2] = Math.max(max[2], wz);
        if (isHead) {
          headFound = true;
          expandZ(headBox, wz);
        }
        if (isFace) {
          faceFound = true;
          expandZ(faceBox, wz);
        }
      }
    });

    const center = {
      x: (min[0] + max[0]) * 0.5,
      y: (min[1] + max[1]) * 0.5,
      z: (min[2] + max[2]) * 0.5,
    };
    const height = Math.max(max[1] - min[1], 1);
    const distance = height * 1.65;
    const headCenterZ = headFound ? (headBox.minZ + headBox.maxZ) * 0.5 : center.z;
    const faceCenterZ = faceFound ? (faceBox.minZ + faceBox.maxZ) * 0.5 : center.z + 1;
    const frontSign = faceCenterZ < headCenterZ ? -1 : 1;
    const offsets = {
      front: [0, frontSign * distance],
      profile: [-frontSign * distance, 0],
      'three-quarter': [-frontSign * distance * 0.7, frontSign * distance * 0.7],
    };
    const [dx, dz] = offsets[view] || offsets.front;
    state.camera.position.set(center.x + dx, center.y + (height * 0.08), center.z + dz);
    state.orbitControls.target.set(center.x, center.y, center.z);
    state.orbitControls.update();
  }, { recipe: benchmark.recipe, view: viewName });
}

test('validates H7 depth and atlas benchmark recipes', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await collectH7BenchmarkDiagnostics(page);
  expect(diagnostics).toHaveLength(H7_BENCHMARKS.length);

  for (const result of diagnostics) {
    const benchmark = H7_BENCHMARKS.find((entry) => entry.id === result.id);
    const detail = JSON.stringify(result, null, 2);
    expect(result.total, detail).toBeTruthy();
    expect(result.head, detail).toBeTruthy();
    expect(result.head.height, detail).toBeGreaterThan(0.45);
    expect(result.head.width, detail).toBeGreaterThan(0.25);
    expect(result.faceDecalPresent, detail).toBe(false);
    expect(result.featureSlabs, detail).toHaveLength(5);
    expect(result.featureSlabBounds.depth, detail).toBeGreaterThan(0.04);
    expect(result.adornment, detail).toBeTruthy();
    expect(result.adornmentInsideTotal, detail).toBe(true);
    expect(result.spriteSummary.eyes, detail).toEqual([benchmark.expectedSprites.eyes, benchmark.expectedSprites.eyes]);
    expect(result.spriteSummary.brows, detail).toEqual([benchmark.expectedSprites.brows, benchmark.expectedSprites.brows]);
    expect(result.spriteSummary.mouth, detail).toEqual([benchmark.expectedSprites.mouth]);

    for (const slab of result.featureSlabs) {
      expect(slab.hasDecal, `${result.id} ${slab.name}`).toBe(true);
      expect(slab.depth, `${result.id} ${slab.name}`).toBeGreaterThan(0);
      expect(slab.frontZ, `${result.id} ${slab.name}`).toBeGreaterThan(slab.centerSurfaceZ ?? slab.surfaceZ);
      expect(slab.embeddedRatio, `${result.id} ${slab.name}`).toBeGreaterThanOrEqual(0.4);
      expect(slab.embeddedRatio, `${result.id} ${slab.name}`).toBeLessThanOrEqual(0.8);
      expect(slab.frontProtrusionRatio, `${result.id} ${slab.name}`).toBeGreaterThan(0);
    }
  }

  await assertNoPageErrors(page);
});

test('captures H7 depth and atlas benchmark gallery views', async ({ page }) => {
  test.skip(!process.env.CAPTURE_CHARACTER_BENCHMARK_H7, 'Set CAPTURE_CHARACTER_BENCHMARK_H7=1 to capture the H7 character benchmark gallery.');

  await bootstrapApp(page, '/', { requireEditorModals: false });
  fs.mkdirSync(CAPTURE_ROOT, { recursive: true });

  for (const benchmark of H7_BENCHMARKS) {
    for (const viewName of VIEW_NAMES) {
      await frameH7BenchmarkView(page, benchmark, viewName);
      await waitForUi(page, 400);
      await page.locator('#viewport-container, canvas').first().screenshot({
        path: path.join(CAPTURE_ROOT, `${benchmark.id}_${viewName}.png`),
      });
    }
  }

  await assertNoPageErrors(page);
});
