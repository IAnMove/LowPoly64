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
    expect(entry.bottom, `${entry.id} bottom`).toBeGreaterThanOrEqual(0.55);
    expect(entry.bottom, `${entry.id} bottom`).toBeLessThanOrEqual(0.645);
    expect(entry.width, `${entry.id} width`).toBeGreaterThanOrEqual(0.025);
    expect(entry.width, `${entry.id} width`).toBeLessThanOrEqual(0.11);
    expect(entry.height, `${entry.id} height`).toBeGreaterThanOrEqual(0.025);
    expect(entry.height, `${entry.id} height`).toBeLessThanOrEqual(0.18);
  }

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
      { compileAvatarHeadSvg },
      { AVATAR_MOLD_FEATURE_BUNDLES },
      { createMoldAvatarRecipeFromBundle },
    ] = await Promise.all([
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

    return AVATAR_MOLD_FEATURE_BUNDLES.map((bundle) => {
      const recipe = createMoldAvatarRecipeFromBundle(bundle.id, {
        label: 'Bundle Probe',
        accessoryIds: ['none'],
      });

      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.innerHTML = compileAvatarHeadSvg(recipe);
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const head = buildSelectorBox(svg, '#HEAD_BASE');
      const eyes = buildSelectorBox(svg, '[data-rv-role="eye_white"], [data-rv-role="iris"], [data-rv-role="pupil"]');
      const brows = buildSelectorBox(svg, '[data-rv-role="eyebrow"]');
      const nose = buildSelectorBox(svg, '[data-rv-role="nose"]');
      const mouth = buildSelectorBox(svg, '[data-rv-role="mouth"]');
      const ears = buildSelectorBox(svg, '[data-rv-role="ear"]');

      host.remove();

      const browEyeGap = (eyes.y - (brows.y + brows.height)) / head.height;
      const eyeNoseGap = (nose.y - (eyes.y + eyes.height)) / head.height;
      const noseMouthGap = (mouth.y - (nose.y + nose.height)) / head.height;

      return {
        id: bundle.id,
        hairPresetId: recipe.hairPresetId,
        eyePresetId: recipe.eyePresetId,
        browPresetId: recipe.browPresetId,
        nosePresetId: recipe.features?.nose?.presetId || '',
        mouthPresetId: recipe.mouthPresetId,
        earPresetId: recipe.features?.ears?.presetId || '',
        browEyeGap: Number(browEyeGap.toFixed(4)),
        eyeNoseGap: Number(eyeNoseGap.toFixed(4)),
        noseMouthGap: Number(noseMouthGap.toFixed(4)),
        mouthBottom: Number((((mouth.y + mouth.height) - head.y) / head.height).toFixed(4)),
        earTop: Number(((ears.y - head.y) / head.height).toFixed(4)),
      };
    });
  });

  for (const entry of diagnostics) {
    expect(entry.hairPresetId, `${entry.id} hair`).toBeTruthy();
    expect(entry.eyePresetId, `${entry.id} eyes`).toBeTruthy();
    expect(entry.browPresetId, `${entry.id} brows`).toBeTruthy();
    expect(entry.nosePresetId, `${entry.id} nose`).toBeTruthy();
    expect(entry.mouthPresetId, `${entry.id} mouth`).toBeTruthy();
    expect(entry.earPresetId, `${entry.id} ears`).toBeTruthy();
    expect(entry.browEyeGap, `${entry.id} browEyeGap`).toBeGreaterThanOrEqual(-0.02);
    expect(entry.eyeNoseGap, `${entry.id} eyeNoseGap`).toBeGreaterThanOrEqual(0);
    expect(entry.noseMouthGap, `${entry.id} noseMouthGap`).toBeGreaterThanOrEqual(0.015);
    expect(entry.mouthBottom, `${entry.id} mouthBottom`).toBeLessThanOrEqual(0.9);
    expect(entry.earTop, `${entry.id} earTop`).toBeGreaterThanOrEqual(0.38);
    expect(entry.earTop, `${entry.id} earTop`).toBeLessThanOrEqual(0.46);
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
