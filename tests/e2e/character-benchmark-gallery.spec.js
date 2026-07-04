import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 240000 });

const BENCHMARKS = Object.freeze([
  {
    id: 'n64_elf_hero_cm',
    faceMode: 'featureSlabs',
    requiredParts: ['HEAD', 'EYE_SLAB_L', 'EYE_SLAB_R', 'BROW_SLAB_L', 'BROW_SLAB_R', 'MOUTH_SLAB', 'EAR_L_POINT', 'EAR_R_POINT', 'HAT_CAP'],
  },
  {
    id: 'n64_simple_villager_cm',
    faceMode: 'faceDecal',
    requiredParts: ['HEAD', 'FACE_DECAL', 'HAIR_CAP'],
  },
  {
    id: 'psx_slim_guard_cm',
    faceMode: 'faceDecal',
    requiredParts: ['HEAD', 'FACE_DECAL', 'HELMET_CAP', 'SPEAR_SHAFT'],
  },
  {
    id: 'n64_cover_mascot_v2_cm',
    faceMode: 'faceTexture',
    requiredParts: ['HEAD', 'FACE_DECAL', 'EAR_L', 'EAR_R', 'CAP_DOME', 'CAP_BRIM'],
  },
]);

const CAPTURE_ROOT = path.join('.tmp-head-views', 'character-benchmark');

async function collectBenchmarkDiagnostics(page) {
  return page.evaluate(async (benchmarks) => {
    const [{ state }, { TEMPLATE_REGISTRY }, { instantiateTemplateDefinition }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
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
      return box;
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

    function meshBoundsForNames(group, names) {
      const wanted = new Set(Array.isArray(names) ? names : [names]);
      const box = emptyBox();
      let found = false;
      group.traverse((node) => {
        const parentName = node.parent?.userData?.name || node.parent?.name || '';
        const nodeName = node.userData?.name || node.name || '';
        if (!node.isMesh || !node.geometry || (!wanted.has(parentName) && !wanted.has(nodeName))) return;
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

    function templateFaceSummary(def) {
      const headSlot = (def.slots || []).find((slot) => slot.slotId === 'HEAD') || null;
      const pieces = Array.isArray(headSlot?.pieces) ? headSlot.pieces : [];
      const faceDecals = pieces.filter((piece) => piece.name === 'FACE_DECAL');
      const featureSlabs = pieces.filter((piece) => /^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/.test(piece.name || ''));
      return {
        faceDecalCount: faceDecals.length,
        faceDecalHasTexture: faceDecals.some((piece) => !!(piece.decal || piece.texture?.dataURL || piece.texture?.decal)),
        featureSlabCount: featureSlabs.length,
        featureSlabsWithDecal: featureSlabs.filter((piece) => !!piece.decal).length,
      };
    }

    const results = [];

    for (const benchmark of benchmarks) {
      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === benchmark.id);
      if (!def) {
        results.push({ id: benchmark.id, found: false });
        continue;
      }

      for (const child of [...state.userObjects.children]) {
        state.userObjects.remove(child);
      }

      const group = instantiateTemplateDefinition(def);
      group.userData.name = def.name;
      group.name = def.name;
      state.userObjects.add(group);
      group.updateWorldMatrix(true, true);

      const total = meshBoundsForNames(group, []);
      const head = meshBoundsForNames(group, 'HEAD');
      const faceDecal = meshBoundsForNames(group, 'FACE_DECAL');
      const featureSlabs = meshBoundsForNames(group, ['EYE_SLAB_L', 'EYE_SLAB_R', 'BROW_SLAB_L', 'BROW_SLAB_R', 'MOUTH_SLAB']);
      const required = Object.fromEntries(
        benchmark.requiredParts.map((name) => [name, !!meshBoundsForNames(group, name)])
      );
      const faceSummary = templateFaceSummary(def);

      results.push({
        id: benchmark.id,
        found: true,
        category: def.category,
        assetRole: def.assetRole,
        faceMode: benchmark.faceMode,
        total,
        head,
        faceDecal,
        featureSlabs,
        required,
        ...faceSummary,
        faceDecalCoverage: faceDecal && head ? (faceDecal.width * faceDecal.height) / Math.max(head.width * head.height, 0.0001) : 0,
        featureSlabDepth: featureSlabs?.depth || 0,
      });
    }

    return results;
  }, BENCHMARKS);
}

async function frameBenchmarkView(page, id, viewName) {
  await page.evaluate(async ({ id: benchmarkId, viewName: view }) => {
    const [{ state }, { TEMPLATE_REGISTRY }, { instantiateTemplateDefinition }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
    ]);

    for (const child of [...state.userObjects.children]) {
      state.userObjects.remove(child);
    }

    const def = TEMPLATE_REGISTRY.find((entry) => entry.id === benchmarkId);
    const group = instantiateTemplateDefinition(def);
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
      const isHead = parentName === 'HEAD' || nodeName === 'HEAD';
      const isFace = parentName === 'FACE_DECAL'
        || nodeName === 'FACE_DECAL'
        || /^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/.test(parentName)
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
  }, { id, viewName });
}

test('validates the character benchmark gallery contracts', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await collectBenchmarkDiagnostics(page);
  expect(diagnostics).toHaveLength(BENCHMARKS.length);

  for (const result of diagnostics) {
    const benchmark = BENCHMARKS.find((entry) => entry.id === result.id);
    const detail = JSON.stringify(result, null, 2);
    expect(result.found, result.id).toBe(true);
    expect(result.assetRole, result.id).toBe('characterModel');
    expect(result.head, detail).toBeTruthy();
    expect(result.head.height, detail).toBeGreaterThan(0.45);

    for (const name of benchmark.requiredParts) {
      expect(result.required[name], `${result.id} missing ${name}`).toBe(true);
    }

    if (benchmark.faceMode === 'featureSlabs') {
      expect(result.faceDecalCount, detail).toBe(0);
      expect(result.featureSlabCount, detail).toBe(5);
      expect(result.featureSlabsWithDecal, detail).toBe(5);
      expect(result.featureSlabDepth, detail).toBeGreaterThan(0.05);
    } else {
      expect(result.faceDecalCount, detail).toBe(1);
      expect(result.faceDecalHasTexture, detail).toBe(true);
      expect(result.faceDecalCoverage, detail).toBeGreaterThan(0.12);
    }
  }

  await assertNoPageErrors(page);
});

test('captures the character benchmark gallery views', async ({ page }) => {
  test.skip(!process.env.CAPTURE_CHARACTER_BENCHMARK, 'Set CAPTURE_CHARACTER_BENCHMARK=1 to capture the character benchmark gallery.');

  await bootstrapApp(page, '/', { requireEditorModals: false });
  fs.mkdirSync(CAPTURE_ROOT, { recursive: true });

  for (const benchmark of BENCHMARKS) {
    for (const viewName of ['front', 'profile', 'three-quarter']) {
      await frameBenchmarkView(page, benchmark.id, viewName);
      await waitForUi(page, 400);
      await page.locator('#viewport-container, canvas').first().screenshot({
        path: path.join(CAPTURE_ROOT, `${benchmark.id}_${viewName}.png`),
      });
    }
  }

  await assertNoPageErrors(page);
});
