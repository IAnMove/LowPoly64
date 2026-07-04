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

test('keeps detached nose presets readable on the canonical head mold', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ compileAvatarHeadSvg }, { AVATAR_NOSE_PRESETS }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-head-svg.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function buildSelectorBox(svg, selector) {
      const nodes = Array.from(svg.querySelectorAll(selector));
      const boxes = nodes
        .map((node) => {
          const bbox = node.getBBox();
          const matrix = node.getCTM();
          if (!matrix) return null;
          const corners = [
            new DOMPoint(bbox.x, bbox.y),
            new DOMPoint(bbox.x + bbox.width, bbox.y),
            new DOMPoint(bbox.x, bbox.y + bbox.height),
            new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
          ].map((point) => point.matrixTransform(matrix));
          const xs = corners.map((point) => point.x);
          const ys = corners.map((point) => point.y);
          return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        })
        .filter(Boolean);

      if (!boxes.length) return null;

      return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.min(...boxes.map((box) => box.y)),
        width: Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map((box) => box.x)),
        height: Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y)),
      };
    }

    function measureNose(noseId) {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.style.top = '0';
      host.innerHTML = compileAvatarHeadSvg(createMoldAvatarRecipe({
        label: 'Nose Probe',
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'none_01' },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: noseId },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: 'ear_soft_01' },
        },
      }));
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const head = buildSelectorBox(svg, '#HEAD_BASE');
      const nose = buildSelectorBox(svg, '[data-rv-role="nose"]');

      host.remove();

      const center = ((nose.x + (nose.width / 2)) - (head.x + (head.width / 2))) / head.width;
      const top = (nose.y - head.y) / head.height;
      const bottom = ((nose.y + nose.height) - head.y) / head.height;
      const width = nose.width / head.width;
      const height = nose.height / head.height;

      return {
        id: noseId,
        center: Number(center.toFixed(4)),
        top: Number(top.toFixed(4)),
        bottom: Number(bottom.toFixed(4)),
        width: Number(width.toFixed(4)),
        height: Number(height.toFixed(4)),
      };
    }

    return AVATAR_NOSE_PRESETS.map((entry) => measureNose(entry.id));
  });

  for (const entry of diagnostics) {
    expect(Math.abs(entry.center), `${entry.id} center`).toBeLessThanOrEqual(0.01);
    expect(entry.top, `${entry.id} top`).toBeGreaterThanOrEqual(0.43);
    expect(entry.top, `${entry.id} top`).toBeLessThanOrEqual(0.535);
    expect(entry.bottom, `${entry.id} bottom`).toBeGreaterThanOrEqual(0.53);
    expect(entry.bottom, `${entry.id} bottom`).toBeLessThanOrEqual(0.645);
    expect(entry.width, `${entry.id} width`).toBeGreaterThanOrEqual(0.025);
    expect(entry.width, `${entry.id} width`).toBeLessThanOrEqual(0.11);
    expect(entry.height, `${entry.id} height`).toBeGreaterThanOrEqual(0.013);
    expect(entry.height, `${entry.id} height`).toBeLessThanOrEqual(0.18);
  }

  await assertNoPageErrors(page);
});

test('applies hair helmet volume and length sliders to procedural hair bounds', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    async function measureHair(placement) {
      const recipe = createMoldAvatarRecipe({
        label: 'Hair Slider Probe',
        bodyPresetId: 'psx_chibi',
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'bridge_low_pony_01', placement },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          mouth: { presetId: 'smile_01' },
        },
      });
      const group = await buildAvatarGroup(recipe);
      group.updateMatrixWorld(true);
      const box = {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      };
      group.traverse((node) => {
        if (!node.isMesh || !node.geometry?.getAttribute) return;
        const name = String(node.name || node.parent?.name || '').toUpperCase();
        if (!name.includes('HAIR_HELM')) return;
        const positions = node.geometry.getAttribute('position');
        const m = node.matrixWorld.elements;
        for (let i = 0; i < positions.count; i += 1) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
          const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
          const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
          box.minX = Math.min(box.minX, wx); box.maxX = Math.max(box.maxX, wx);
          box.minY = Math.min(box.minY, wy); box.maxY = Math.max(box.maxY, wy);
          box.minZ = Math.min(box.minZ, wz); box.maxZ = Math.max(box.maxZ, wz);
        }
      });
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
      return {
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
        depth: box.maxZ - box.minZ,
        minY: box.minY,
      };
    }

    const thin = await measureHair({ size: 0.7, offsetY: 0, length: 0 });
    const thick = await measureHair({ size: 1.35, offsetY: 0, length: 0 });
    const short = await measureHair({ size: 1, offsetY: 0, length: -48 });
    const long = await measureHair({ size: 1, offsetY: 0, length: 48 });

    return { thin, thick, short, long };
  });

  const detail = JSON.stringify(report, null, 2);
  expect(report.thick.width - report.thin.width, detail).toBeGreaterThan(0.015);
  expect(report.thick.depth - report.thin.depth, detail).toBeGreaterThan(0.01);
  expect(report.short.minY - report.long.minY, detail).toBeGreaterThan(0.04);

  await assertNoPageErrors(page);
});

test('applies the head scale slider to mounted avatar heads', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    async function measureHead(headScale) {
      const recipe = createMoldAvatarRecipe({
        label: 'Head Scale Probe',
        bodyPresetId: 'psx_chibi',
        headScale,
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'none_01' },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: 'nose_soft_01' },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: 'ear_soft_01' },
        },
      });
      const group = await buildAvatarGroup(recipe);
      group.updateMatrixWorld(true);
      const box = {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      };
      group.traverse((node) => {
        if (!node.isMesh || !node.geometry?.getAttribute) return;
        const name = String(node.name || node.parent?.name || '').toUpperCase();
        if (name !== 'HEAD_BASE') return;
        const positions = node.geometry.getAttribute('position');
        const m = node.matrixWorld.elements;
        for (let i = 0; i < positions.count; i += 1) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
          const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
          const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
          box.minX = Math.min(box.minX, wx); box.maxX = Math.max(box.maxX, wx);
          box.minY = Math.min(box.minY, wy); box.maxY = Math.max(box.maxY, wy);
          box.minZ = Math.min(box.minZ, wz); box.maxZ = Math.max(box.maxZ, wz);
        }
      });
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
      return {
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
        depth: box.maxZ - box.minZ,
      };
    }

    const small = await measureHead(0.85);
    const large = await measureHead(1.4);
    return { small, large };
  });

  const detail = JSON.stringify(report, null, 2);
  expect(report.large.width / report.small.width, detail).toBeGreaterThan(1.5);
  expect(report.large.height / report.small.height, detail).toBeGreaterThan(1.5);
  expect(report.large.depth / report.small.depth, detail).toBeGreaterThan(1.5);

  await assertNoPageErrors(page);
});

test('keeps detached ear presets mirrored on the canonical head mold', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ compileAvatarHeadSvg }, { AVATAR_EAR_PRESETS }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-head-svg.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function buildSelectorBoxes(svg, selector) {
      return Array.from(svg.querySelectorAll(selector))
        .map((node) => {
          const bbox = node.getBBox();
          const matrix = node.getCTM();
          if (!matrix) return null;
          const corners = [
            new DOMPoint(bbox.x, bbox.y),
            new DOMPoint(bbox.x + bbox.width, bbox.y),
            new DOMPoint(bbox.x, bbox.y + bbox.height),
            new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
          ].map((point) => point.matrixTransform(matrix));
          const xs = corners.map((point) => point.x);
          const ys = corners.map((point) => point.y);
          return {
            id: node.id,
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        })
        .filter(Boolean);
    }

    function buildSelectorBox(svg, selector) {
      const boxes = buildSelectorBoxes(svg, selector);
      if (!boxes.length) return null;
      return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.min(...boxes.map((box) => box.y)),
        width: Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map((box) => box.x)),
        height: Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y)),
      };
    }

    return AVATAR_EAR_PRESETS.map((earPreset) => {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.innerHTML = compileAvatarHeadSvg(createMoldAvatarRecipe({
        label: 'Ear Probe',
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'none_01' },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: 'nose_soft_01' },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: earPreset.id },
        },
      }));
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const head = buildSelectorBox(svg, '#HEAD_BASE');
      const ears = buildSelectorBoxes(svg, '[data-rv-role="ear"]');
      const left = ears.find((entry) => entry.id === 'EAR_L') || ears[0];
      const right = ears.find((entry) => entry.id === 'EAR_R') || ears[1];

      host.remove();

      return {
        id: earPreset.id,
        count: ears.length,
        leftCenter: Number((((left.x + (left.width / 2)) - (head.x + (head.width / 2))) / head.width).toFixed(4)),
        rightCenter: Number((((right.x + (right.width / 2)) - (head.x + (head.width / 2))) / head.width).toFixed(4)),
        leftTop: Number(((left.y - head.y) / head.height).toFixed(4)),
        rightTop: Number(((right.y - head.y) / head.height).toFixed(4)),
        leftHeight: Number((left.height / head.height).toFixed(4)),
        rightHeight: Number((right.height / head.height).toFixed(4)),
      };
    });
  });

  for (const entry of diagnostics) {
    expect(entry.count, `${entry.id} count`).toBe(2);
    expect(Math.abs(Math.abs(entry.leftCenter) - Math.abs(entry.rightCenter)), `${entry.id} center symmetry`).toBeLessThanOrEqual(0.03);
    expect(Math.abs(entry.leftTop - entry.rightTop), `${entry.id} top symmetry`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(entry.leftHeight - entry.rightHeight), `${entry.id} height symmetry`).toBeLessThanOrEqual(0.01);
    expect(Math.abs(entry.leftCenter), `${entry.id} left center`).toBeGreaterThanOrEqual(0.15);
    expect(Math.abs(entry.leftCenter), `${entry.id} left center`).toBeLessThanOrEqual(0.28);
    expect(Math.abs(entry.rightCenter), `${entry.id} right center`).toBeGreaterThanOrEqual(0.15);
    expect(Math.abs(entry.rightCenter), `${entry.id} right center`).toBeLessThanOrEqual(0.28);
  }

  await assertNoPageErrors(page);
});

test('keeps mold hair presets anchored to the canonical head mold', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ compileAvatarHeadSvg }, { AVATAR_HAIR_PRESETS }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-head-svg.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function buildSelectorBox(svg, selector) {
      const nodes = Array.from(svg.querySelectorAll(selector));
      const boxes = nodes
        .map((node) => {
          const bbox = node.getBBox();
          const matrix = node.getCTM();
          if (!matrix) return null;
          const corners = [
            new DOMPoint(bbox.x, bbox.y),
            new DOMPoint(bbox.x + bbox.width, bbox.y),
            new DOMPoint(bbox.x, bbox.y + bbox.height),
            new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height),
          ].map((point) => point.matrixTransform(matrix));
          const xs = corners.map((point) => point.x);
          const ys = corners.map((point) => point.y);
          return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        })
        .filter(Boolean);

      if (!boxes.length) return null;

      return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.min(...boxes.map((box) => box.y)),
        width: Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map((box) => box.x)),
        height: Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y)),
      };
    }

    return AVATAR_HAIR_PRESETS.filter((entry) => entry.id !== 'none_01').map((hairPreset) => {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.innerHTML = compileAvatarHeadSvg(createMoldAvatarRecipe({
        label: 'Hair Probe',
        accessoryIds: ['none'],
        features: {
          hair: { presetId: hairPreset.id },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: 'nose_soft_01' },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: 'ear_soft_01' },
        },
      }));
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const head = buildSelectorBox(svg, '#HEAD_BASE');
      const hair = buildSelectorBox(svg, '[data-rv-role="hair"], [data-rv-role="hair_back"]');

      host.remove();

      return {
        id: hairPreset.id,
        mountRole: hairPreset.mountRole || '',
        mountVariantFront: hairPreset.mountVariantFront || '',
        mountVariantBack: hairPreset.mountVariantBack || '',
        center: Number((((hair.x + (hair.width / 2)) - (head.x + (head.width / 2))) / head.width).toFixed(4)),
        top: Number(((hair.y - head.y) / head.height).toFixed(4)),
        bottom: Number((((hair.y + hair.height) - head.y) / head.height).toFixed(4)),
        width: Number((hair.width / head.width).toFixed(4)),
        height: Number((hair.height / head.height).toFixed(4)),
      };
    });
  });

  for (const entry of diagnostics) {
    expect(entry.mountRole, `${entry.id} mountRole`).toBe('hairCap');
    expect(entry.mountVariantFront, `${entry.id} mountVariantFront`).toBeTruthy();
    expect(entry.mountVariantBack, `${entry.id} mountVariantBack`).toBeTruthy();
    expect(Math.abs(entry.center), `${entry.id} center`).toBeLessThanOrEqual(0.07);
    expect(entry.top, `${entry.id} top`).toBeGreaterThanOrEqual(-0.06);
    expect(entry.top, `${entry.id} top`).toBeLessThanOrEqual(0.24);
    expect(entry.bottom, `${entry.id} bottom`).toBeGreaterThanOrEqual(0.34);
    expect(entry.bottom, `${entry.id} bottom`).toBeLessThanOrEqual(1.05);
    expect(entry.width, `${entry.id} width`).toBeGreaterThanOrEqual(0.16);
    expect(entry.width, `${entry.id} width`).toBeLessThanOrEqual(0.95);
    expect(entry.height, `${entry.id} height`).toBeGreaterThanOrEqual(0.12);
    expect(entry.height, `${entry.id} height`).toBeLessThanOrEqual(1.06);
  }

  await assertNoPageErrors(page);
});

test('defines readable mold feature bundles before manual placement', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { buildAvatarGroup },
      { AVATAR_MOLD_FEATURE_BUNDLES },
      { createMoldAvatarRecipeFromBundle },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function expandBox(box, node) {
      node.geometry.computeBoundingBox?.();
      if (!node.geometry.boundingBox) return box;
      const next = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
      return box ? box.union(next) : next;
    }

    function summarizeBox(box) {
      if (!box || box.isEmpty()) return null;
      return {
        minX: box.min.x,
        maxX: box.max.x,
        minY: box.min.y,
        maxY: box.max.y,
        width: box.max.x - box.min.x,
        height: box.max.y - box.min.y,
      };
    }

    function unionBoxes(boxes) {
      const valid = boxes.filter(Boolean);
      if (!valid.length) return null;
      const minX = Math.min(...valid.map((box) => box.x));
      const minY = Math.min(...valid.map((box) => box.y));
      const maxX = Math.max(...valid.map((box) => box.x + box.width));
      const maxY = Math.max(...valid.map((box) => box.y + box.height));
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    }

    function normalizeFeatureBox(box, head) {
      if (!box || !head) return null;
      return {
        x: (box.minX - head.minX) / Math.max(head.width, 0.0001),
        y: (head.maxY - box.maxY) / Math.max(head.height, 0.0001),
        width: box.width / Math.max(head.width, 0.0001),
        height: box.height / Math.max(head.height, 0.0001),
      };
    }

    function disposeGroup(group) {
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
    }

    return Promise.all(AVATAR_MOLD_FEATURE_BUNDLES.map(async (bundle) => {
      const recipe = createMoldAvatarRecipeFromBundle(bundle.id, {
        label: 'Bundle Probe',
        accessoryIds: ['none'],
      });
      const group = await buildAvatarGroup(recipe);
      const headNames = Array.isArray(group.userData?.slotMap?.HEAD) ? group.userData.slotMap.HEAD : [];
      group.updateMatrixWorld(true);
      const boxes = { head: null, eyes: null, brows: null, mouth: null };
      group.traverse((node) => {
        if (!node.isMesh) return;
        const name = String(node.name || node.parent?.name || '').toUpperCase();
        if (name === 'HEAD_BASE') boxes.head = expandBox(boxes.head, node);
        if (/^EYE_SLAB_[LR]$/.test(name)) boxes.eyes = expandBox(boxes.eyes, node);
        if (/^BROW_SLAB_[LR]$/.test(name)) boxes.brows = expandBox(boxes.brows, node);
        if (name === 'MOUTH_SLAB') boxes.mouth = expandBox(boxes.mouth, node);
      });

      const headBox = summarizeBox(boxes.head);
      const eyeBox = normalizeFeatureBox(summarizeBox(boxes.eyes), headBox);
      const browBox = normalizeFeatureBox(summarizeBox(boxes.brows), headBox);
      const mouthBox = normalizeFeatureBox(summarizeBox(boxes.mouth), headBox);
      const browEyeGap = eyeBox && browBox ? eyeBox.y - (browBox.y + browBox.height) : -1;
      const eyeMouthGap = eyeBox && mouthBox ? mouthBox.y - (eyeBox.y + eyeBox.height) : -1;
      const featureSlabCount = headNames.filter((name) => /^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/i.test(name)).length;
      const legacyFaceCount = headNames.filter((name) => (
        /(EYE|IRIS|PUPIL|BROW|MOUTH|TEETH)/i.test(name)
        && !/^(EYE|BROW|MOUTH)_SLAB(_[LR])?$/i.test(name)
      )).length;
      disposeGroup(group);

      return {
        id: bundle.id,
        hairPresetId: recipe.hairPresetId,
        eyePresetId: recipe.eyePresetId,
        browPresetId: recipe.browPresetId,
        nosePresetId: recipe.features?.nose?.presetId || '',
        mouthPresetId: recipe.mouthPresetId,
        earPresetId: recipe.features?.ears?.presetId || '',
        featureSlabCount,
        legacyFaceCount,
        browEyeGap: Number(browEyeGap.toFixed(4)),
        eyeMouthGap: Number(eyeMouthGap.toFixed(4)),
        mouthBottom: Number((mouthBox ? mouthBox.y + mouthBox.height : 2).toFixed(4)),
      };
    }));
  });

  for (const entry of diagnostics) {
    expect(entry.hairPresetId, `${entry.id} hair`).toBeTruthy();
    expect(entry.eyePresetId, `${entry.id} eyes`).toBeTruthy();
    expect(entry.browPresetId, `${entry.id} brows`).toBeTruthy();
    expect(entry.nosePresetId, `${entry.id} nose`).toBeTruthy();
    expect(entry.mouthPresetId, `${entry.id} mouth`).toBeTruthy();
    expect(entry.earPresetId, `${entry.id} ears`).toBeTruthy();
    expect(entry.featureSlabCount, `${entry.id} feature slabs`).toBe(5);
    expect(entry.legacyFaceCount, `${entry.id} legacy face count`).toBe(0);
    expect(entry.browEyeGap, `${entry.id} browEyeGap`).toBeGreaterThanOrEqual(-0.02);
    expect(entry.eyeMouthGap, `${entry.id} eyeMouthGap`).toBeGreaterThanOrEqual(0.05);
    expect(entry.mouthBottom, `${entry.id} mouthBottom`).toBeLessThanOrEqual(0.95);
  }

  await assertNoPageErrors(page);
});

test('keeps accessory placement and palette readability stable across representative recipes', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await collectAccessoryAndPaletteAuditReport(page);

  expect(
    report.accessoryFailureCount,
    JSON.stringify({
      accessoryCount: report.accessoryCount,
      failures: report.accessoryFailures,
    }, null, 2)
  ).toBe(0);
  expect(
    report.paletteFailureCount,
    JSON.stringify({
      paletteCount: report.paletteCount,
      failures: report.paletteFailures,
    }, null, 2)
  ).toBe(0);

  await assertNoPageErrors(page);
});

test('feature slab depth presets preserve slider placement and bounded protrusion', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await page.evaluate(async () => {
    const [
      {
        DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID,
        FEATURE_SLAB_DEPTH_PRESETS,
        buildFeatureSlabParts,
      },
      { AVATAR_HEAD_MESH_MAP },
      { createMoldAvatarRecipe, resolveAvatarRecipe },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const BASE_FEATURES = {
      hair: { presetId: 'none_01' },
      eyes: { presetId: 'wide_01' },
      brows: { presetId: 'soft_01' },
      nose: { presetId: 'nose_soft_01' },
      mouth: { presetId: 'neutral_01' },
      ears: { presetId: 'ear_soft_01' },
    };

    function mergeFeature(base, patch) {
      if (!patch || typeof patch !== 'object') return { ...base };
      return {
        ...base,
        ...patch,
        placement: {
          ...(base.placement || {}),
          ...(patch.placement || {}),
        },
      };
    }

    function makeRecipe(featurePatch = {}) {
      return createMoldAvatarRecipe({
        label: 'Feature Slab Depth Probe',
        bodyPresetId: 'psx_chibi',
        headMoldId: 'gen_head_heroic',
        accessoryIds: ['none'],
        features: {
          eyes: mergeFeature(BASE_FEATURES.eyes, featurePatch.eyes),
          brows: mergeFeature(BASE_FEATURES.brows, featurePatch.brows),
          nose: mergeFeature(BASE_FEATURES.nose, featurePatch.nose),
          mouth: mergeFeature(BASE_FEATURES.mouth, featurePatch.mouth),
          ears: mergeFeature(BASE_FEATURES.ears, featurePatch.ears),
          hair: mergeFeature(BASE_FEATURES.hair, featurePatch.hair),
        },
      });
    }

    function partCenter(part) {
      const vertices = part.customGeometry.vertices;
      return vertices.reduce((acc, vertex) => ({
        x: acc.x + vertex[0] / vertices.length,
        y: acc.y + vertex[1] / vertices.length,
        z: acc.z + vertex[2] / vertices.length,
      }), { x: 0, y: 0, z: 0 });
    }

    function measure(presetId = null, featurePatch = {}) {
      const resolved = resolveAvatarRecipe(makeRecipe(featurePatch));
      const meshId = resolved.headMold?.headMeshId || resolved.headMold?.id;
      const meshEntry = AVATAR_HEAD_MESH_MAP[meshId];
      const headMold = presetId
        ? { ...resolved.headMold, featureSlabPresetId: presetId }
        : resolved.headMold;
      const parts = buildFeatureSlabParts({ ...resolved, headMold }, meshEntry);
      const eye = parts.find((part) => part.id === 'EYE_SLAB_L');
      const meta = eye.featureSlab;
      return {
        presetId: meta.presetId,
        depth: meta.depth,
        headDepth: meta.headDepth,
        headDepthRatio: meta.headDepthRatio,
        depthFactor: meta.depthFactor,
        depthSource: meta.depthSource,
        embeddedRatio: meta.embeddedRatio,
        ratio: (meta.frontZ - meta.surfaceZ) / Math.max(meta.depth, 0.0001),
        layerSpan: eye.decal.layers[0].w,
        sidePadding: meta.sidePadding,
        center: partCenter(eye),
      };
    }

    const byPreset = Object.fromEntries(
      Object.keys(FEATURE_SLAB_DEPTH_PRESETS).map((presetId) => [presetId, measure(presetId)])
    );
    const catalogDefault = measure(null);
    const offset = measure(DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID, {
      eyes: { placement: { offsetX: 48, offsetY: -48 } },
    });

    return {
      defaultPresetId: DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID,
      presetIds: Object.keys(FEATURE_SLAB_DEPTH_PRESETS),
      presetSpecs: FEATURE_SLAB_DEPTH_PRESETS,
      catalogDefault,
      byPreset,
      offsetDelta: {
        x: offset.center.x - byPreset[DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID].center.x,
        y: offset.center.y - byPreset[DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID].center.y,
        ratio: offset.ratio - byPreset[DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID].ratio,
      },
    };
  });

  const detail = JSON.stringify(report, null, 2);
  expect(report.presetIds, detail).toEqual(expect.arrayContaining([
    'flat_safe',
    'default_embedded',
    'toy_extruded',
    'mask_plate',
  ]));
  expect(report.catalogDefault.presetId, detail).toBe(report.defaultPresetId);

  for (const presetId of report.presetIds) {
    const spec = report.presetSpecs[presetId];
    const actual = report.byPreset[presetId];
    expect(actual.presetId, `${presetId} preset`).toBe(presetId);
    expect(Math.abs(actual.depthFactor - spec.depthFactor), `${presetId} depth factor`).toBeLessThan(0.0001);
    expect(Math.abs(actual.headDepthRatio - spec.headDepthRatio), `${presetId} head depth ratio`).toBeLessThan(0.0001);
    expect(Math.abs((actual.depth / actual.headDepth) - spec.headDepthRatio), `${presetId} measured head depth ratio`).toBeLessThan(0.0001);
    expect(actual.depthSource, `${presetId} depth source`).toBe('headDepthRatio');
    expect(Math.abs(actual.ratio - spec.frontProtrusionRatio), `${presetId} protrusion`).toBeLessThan(0.0001);
    expect(Math.abs(actual.embeddedRatio - spec.embeddedRatio), `${presetId} embedded ratio`).toBeLessThan(0.0001);
    expect(Math.abs(actual.embeddedRatio - (1 - actual.ratio)), `${presetId} embedded/protrusion sum`).toBeLessThan(0.0001);
    expect(actual.ratio, `${presetId} protrusion min`).toBeGreaterThanOrEqual(0.2);
    expect(actual.ratio, `${presetId} protrusion max`).toBeLessThanOrEqual(0.6);
    expect(Math.abs(actual.layerSpan - (1 - (spec.sidePadding * 2))), `${presetId} layer span`).toBeLessThan(0.0001);
  }

  expect(report.byPreset.toy_extruded.depth, detail).toBeGreaterThan(report.byPreset.default_embedded.depth);
  expect(report.byPreset.flat_safe.depth, detail).toBeLessThan(report.byPreset.default_embedded.depth);
  expect(report.byPreset.mask_plate.layerSpan, detail).toBeLessThan(report.byPreset.default_embedded.layerSpan);
  expect(Math.abs(report.offsetDelta.x), detail).toBeGreaterThan(0.01);
  expect(Math.abs(report.offsetDelta.y), detail).toBeGreaterThan(0.01);
  expect(Math.abs(report.offsetDelta.ratio), detail).toBeLessThan(0.0001);

  await assertNoPageErrors(page);
});

test('feature slab debug overlays expose slab volume without breaking avatar selection', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);

  await updateAvatarForgeRecipe(page, {
    label: 'Slab Debug Probe',
    bodyPresetId: 'psx_chibi',
    headMoldId: 'gen_head_square',
    featureSlabPresetId: 'toy_extruded',
    accessoryId: 'none',
    features: {
      hair: { presetId: 'none_01' },
      eyes: { presetId: 'wide_01' },
      brows: { presetId: 'soft_01' },
      nose: { presetId: 'nose_soft_01' },
      mouth: { presetId: 'neutral_01' },
      ears: { presetId: 'ear_soft_01' },
    },
  });

  await page.locator('#avatar-feature-slab-debug-toggle').check();
  await expect(page.locator('#avatar-feature-slab-debug-panel')).toBeVisible();
  await expect(page.locator('#avatar-feature-slab-debug-panel')).toContainText('surfaceZ');
  await expect(page.locator('#avatar-feature-slab-debug-panel')).toContainText('frontZ');
  await expect(page.locator('#avatar-feature-slab-debug-panel')).toContainText('depth');
  await expect(page.locator('#avatar-feature-slab-debug-panel')).toContainText('frontProtrusionRatio');

  await expect.poll(async () => page.evaluate(async () => {
    const { getAvatarForgeFeatureSlabDebugDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgeFeatureSlabDebugDiagnostics().slabs.length;
  })).toBe(5);

  const initialDebug = await page.evaluate(async () => {
    const { getAvatarForgeFeatureSlabDebugDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgeFeatureSlabDebugDiagnostics();
  });
  expect(initialDebug.enabled).toBe(true);
  expect(initialDebug.overlayChildCount).toBe(10);
  expect(initialDebug.slabs.map((entry) => entry.name).sort()).toEqual([
    'BROW_SLAB_L',
    'BROW_SLAB_R',
    'EYE_SLAB_L',
    'EYE_SLAB_R',
    'MOUTH_SLAB',
  ]);
  for (const slab of initialDebug.slabs) {
    expect(slab.presetId, slab.name).toBe('toy_extruded');
    expect(slab.spriteId, slab.name).toBeTruthy();
    expect(slab.depth, slab.name).toBeGreaterThan(0);
    expect(slab.frontZ, slab.name).toBeGreaterThan(slab.surfaceZ);
    expect(slab.frontProtrusionRatio, slab.name).toBeGreaterThan(0);
  }

  await updateAvatarForgeRecipe(page, {
    features: {
      eyes: { presetId: 'bridge_confident_half_01' },
    },
  });
  const afterFeatureChange = await page.evaluate(async () => {
    const { getAvatarForgeFeatureSlabDebugDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgeFeatureSlabDebugDiagnostics();
  });
  expect(afterFeatureChange.enabled).toBe(true);
  expect(afterFeatureChange.overlayChildCount).toBe(10);
  expect(afterFeatureChange.slabs.filter((entry) => entry.kind === 'eye').map((entry) => entry.spriteId))
    .toEqual(['eye_angry', 'eye_angry']);

  await confirmAvatarForge(page);
  await waitForSceneObjectCount(page, 1);
  await selectAvatarGroup(page, 'Slab Debug Probe');
  const summary = await sceneSummary(page);
  expect(summary[0]?.avatarRecipe?.featureSlabPresetId).toBe('toy_extruded');

  await assertNoPageErrors(page);
});

test('keeps expanded avatar hair and facial sweeps aligned across the style catalog', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await collectAvatarCatalogSweepReport(page);

  expect(
    report.failureCount,
    JSON.stringify({
      counts: report.counts,
      failures: report.failures,
    }, null, 2)
  ).toBe(0);

  await assertNoPageErrors(page);
});

test('applies Mii placement sliders and skull-relative sizing to mounted 3D features', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }, { AVATAR_HEAD_MESH_MAP }, { GENERATED_HEAD_MOLDS }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/data/avatar/catalog/head-molds.js'),
    ]);

    const BASE_FEATURES = {
      hair: { presetId: 'none_01' },
      eyes: { presetId: 'wide_01' },
      brows: { presetId: 'soft_01' },
      nose: { presetId: 'nose_soft_01' },
      mouth: { presetId: 'neutral_01' },
      ears: { presetId: 'ear_soft_01' },
    };

    function mergeFeatures(patch = {}) {
      const merged = {};
      Object.entries(BASE_FEATURES).forEach(([key, value]) => {
        merged[key] = { ...value, ...(patch[key] || {}) };
      });
      return merged;
    }

    function interocular(landmarks) {
      const [l, r] = [landmarks?.eyeL, landmarks?.eyeR];
      if (!Array.isArray(l) || !Array.isArray(r)) return 0;
      return Math.hypot(r[0] - l[0], r[1] - l[1], r[2] - l[2]);
    }

    async function measure(recipeOverrides = {}) {
      const recipe = createMoldAvatarRecipe({
        label: 'Placement 3D Probe',
        accessoryIds: ['none'],
        headMoldId: recipeOverrides.headMoldId || 'gen_head_heroic',
        features: mergeFeatures(recipeOverrides.features || {}),
      });
      const group = await buildAvatarGroup(recipe);
      group.updateMatrixWorld(true);

      const boxes = { nose: null, mouth: null, eyeLeft: null, eyeRight: null };
      const expand = (slot, x, y, z) => {
        const box = boxes[slot] || (boxes[slot] = {
          minX: Infinity, maxX: -Infinity,
          minY: Infinity, maxY: -Infinity,
          minZ: Infinity, maxZ: -Infinity,
        });
        box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
        box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
        box.minZ = Math.min(box.minZ, z); box.maxZ = Math.max(box.maxZ, z);
      };

      group.traverse((node) => {
        if (!node.isMesh || !node.geometry?.getAttribute) return;
        // Piece names live on the PivotGroup wrapper, not on the mesh itself.
        const name = String(node.name || node.parent?.name || '').toUpperCase();
        let slot = null;
        if (name.includes('NOSE')) slot = 'nose';
        if (name === 'MOUTH_SLAB') slot = 'mouth';
        if (name === 'EYE_SLAB_L') slot = 'eyeLeft';
        if (name === 'EYE_SLAB_R') slot = 'eyeRight';
        if (!slot) return;
        const positions = node.geometry.getAttribute('position');
        const m = node.matrixWorld.elements;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i);
          const y = positions.getY(i);
          const z = positions.getZ(i);
          const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
          const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
          const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
          expand(slot, wx, wy, wz);
        }
      });

      const summarize = (box) => (box ? {
        centerX: (box.minX + box.maxX) / 2,
        centerY: (box.minY + box.maxY) / 2,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
      } : null);

      return {
        nose: summarize(boxes.nose),
        mouth: summarize(boxes.mouth),
        eyeLeft: summarize(boxes.eyeLeft),
        eyeRight: summarize(boxes.eyeRight),
      };
    }

    // Pick the generated mold whose skull deviates the most from the default
    // generated head so the relative-size assertion exercises a factor far from 1.
    const reference = interocular(AVATAR_HEAD_MESH_MAP.gen_head_heroic?.landmarks);
    const sizingReference = interocular(AVATAR_HEAD_MESH_MAP.gen_head_heroic?.landmarks);
    const baselineMold = GENERATED_HEAD_MOLDS.find((mold) => mold.id === 'gen_head_heroic');
    const baselineMoldFeatureSizeMultiplier = Number.isFinite(baselineMold?.featureSizeMultiplier)
      ? baselineMold.featureSizeMultiplier
      : 1;
    const baselineRelativeSizeFactor = Math.min(Math.max(
      sizingReference > 0 ? (reference / sizingReference) * baselineMoldFeatureSizeMultiplier : 1,
      0.78,
    ), 1.12);
    let altMold = null;
    let altFactor = 1;
    GENERATED_HEAD_MOLDS.forEach((mold) => {
      const factor = interocular(AVATAR_HEAD_MESH_MAP[mold.headMeshId]?.landmarks) / reference;
      if (Math.abs(factor - 1) > Math.abs(altFactor - 1)) {
        altFactor = factor;
        altMold = mold;
      }
    });
    const altMoldId = altMold?.id || null;
    const altMoldFeatureSizeMultiplier = Number.isFinite(altMold?.featureSizeMultiplier)
      ? altMold.featureSizeMultiplier
      : 1;
    const altRelativeSizeFactor = Math.min(Math.max(
      sizingReference > 0
        ? ((reference * altFactor) / sizingReference) * altMoldFeatureSizeMultiplier
        : altFactor * altMoldFeatureSizeMultiplier,
      0.78,
    ), 1.12);
    const expectedAltNoseToEyeRatioScale = altFactor > 0 && baselineRelativeSizeFactor > 0
      ? altRelativeSizeFactor / (altFactor * baselineRelativeSizeFactor)
      : 1;

    const baseline = await measure();
    const noseDown = await measure({ features: { nose: { placement: { offsetY: 48 } } } });
    const noseUp = await measure({ features: { nose: { placement: { offsetY: -48 } } } });
    const mouthRight = await measure({ features: { mouth: { placement: { offsetX: 48 } } } });
    const mouthLeft = await measure({ features: { mouth: { placement: { offsetX: -48 } } } });
    const eyesSpread = await measure({ features: { eyes: { placement: { spacing: 32 } } } });
    const altHead = altMoldId ? await measure({ headMoldId: altMoldId }) : null;

    const eyeDistance = (entry) => (entry.eyeLeft && entry.eyeRight
      ? Math.abs(entry.eyeRight.centerX - entry.eyeLeft.centerX)
      : 0);

    return {
      altMoldId,
      altFactor,
      altMoldFeatureSizeMultiplier,
      expectedAltNoseToEyeRatioScale,
      baseline,
      noseDownDeltaY: noseDown.nose.centerY - baseline.nose.centerY,
      noseUpDeltaY: noseUp.nose.centerY - baseline.nose.centerY,
      mouthRightDeltaX: mouthRight.mouth.centerX - baseline.mouth.centerX,
      mouthLeftDeltaX: mouthLeft.mouth.centerX - baseline.mouth.centerX,
      baselineEyeDistance: eyeDistance(baseline),
      spreadEyeDistance: eyeDistance(eyesSpread),
      baselineNoseToEyeRatio: baseline.nose.width / eyeDistance(baseline),
      altNoseToEyeRatio: altHead ? altHead.nose.width / eyeDistance(altHead) : null,
    };
  });

  const detail = JSON.stringify(report, null, 2);

  // offsetY is SVG-space (positive = down); offsetX positive pushes toward +x.
  expect(report.noseDownDeltaY, detail).toBeLessThan(-0.01);
  expect(report.noseUpDeltaY, detail).toBeGreaterThan(0.01);
  expect(Math.abs(report.mouthRightDeltaX), detail).toBeGreaterThan(0.01);
  expect(Math.sign(report.mouthLeftDeltaX), detail).toBe(-Math.sign(report.mouthRightDeltaX));
  expect(report.spreadEyeDistance - report.baselineEyeDistance, detail).toBeGreaterThan(0.005);
  // Skull-relative sizing is intentionally mold-tuned: wide sculpted heads keep
  // smaller facial decals because their base mesh already carries facial planes.
  if (report.altNoseToEyeRatio !== null) {
    const ratioScale = report.altNoseToEyeRatio / report.baselineNoseToEyeRatio;
    expect(
      Math.abs(ratioScale - report.expectedAltNoseToEyeRatioScale),
      detail,
    ).toBeLessThan(0.08);
  }

  await assertNoPageErrors(page);
});

test('skull sliders regenerate generated head geometry and landmark-driven decal', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const BASE_FEATURES = {
      hair: { presetId: 'none_01' },
      eyes: { presetId: 'wide_01' },
      brows: { presetId: 'soft_01' },
      nose: { presetId: 'nose_soft_01' },
      mouth: { presetId: 'neutral_01' },
      ears: { presetId: 'ear_soft_01' },
    };

    function expandBox(box, node) {
      node.geometry.computeBoundingBox?.();
      if (!node.geometry.boundingBox) return box;
      const next = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
      return box ? box.union(next) : next;
    }

    function summarizeBox(box) {
      if (!box || box.isEmpty()) return null;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      return {
        minX: box.min.x,
        maxX: box.max.x,
        width: size.x,
        height: size.y,
        centerX: center.x,
        centerY: center.y,
      };
    }

    async function measure(skullWidthDelta) {
      const recipe = createMoldAvatarRecipe({
        label: `Skull Probe ${skullWidthDelta}`,
        bodyPresetId: 'psx_chibi',
        headMoldId: 'gen_head_heroic',
        headParams: { skullWidth: skullWidthDelta },
        accessoryIds: ['none'],
        features: BASE_FEATURES,
      });
      const group = await buildAvatarGroup(recipe);
      group.updateMatrixWorld(true);

      let headBox = null;
      let eyeLeftBox = null;
      let eyeRightBox = null;
      group.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        const name = String(node.parent?.userData?.name || node.parent?.name || node.userData?.name || node.name || '').toUpperCase();
        if (name === 'HEAD_BASE') {
          headBox = expandBox(headBox, node);
          return;
        }
        if (name === 'EYE_SLAB_L') eyeLeftBox = expandBox(eyeLeftBox, node);
        if (name === 'EYE_SLAB_R') eyeRightBox = expandBox(eyeRightBox, node);
      });

      const eyeLeft = summarizeBox(eyeLeftBox);
      const eyeRight = summarizeBox(eyeRightBox);

      return {
        recipeHeadParams: recipe.headParams,
        head: summarizeBox(headBox),
        eyeDistance: eyeLeft && eyeRight ? Math.abs(eyeRight.centerX - eyeLeft.centerX) : 0,
      };
    }

    const narrow = await measure(-0.18);
    const wide = await measure(0.18);
    return {
      narrow,
      wide,
      headWidthDelta: wide.head.width - narrow.head.width,
      eyeDistanceDelta: wide.eyeDistance - narrow.eyeDistance,
    };
  });

  const detail = JSON.stringify(report, null, 2);
  expect(report.narrow.recipeHeadParams.skullWidth, detail).toBe(-0.18);
  expect(report.wide.recipeHeadParams.skullWidth, detail).toBe(0.18);
  expect(report.headWidthDelta, detail).toBeGreaterThan(0.15);
  expect(report.eyeDistanceDelta, detail).toBeGreaterThan(0.05);

  await assertNoPageErrors(page);
});
