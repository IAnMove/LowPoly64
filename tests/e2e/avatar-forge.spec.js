import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  closeRigPanelIfOpen,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

async function suppressKnownAvatarForgeWarnings(page) {
  await page.addInitScript(() => {
    const originalWarn = console.warn.bind(console);
    console.warn = (...args) => {
      const text = args.map((entry) => String(entry ?? '')).join(' ');
      if (
        text.includes('Unknown geometry type') ||
        text.includes('Parent "HEAD" not found') ||
        text.includes('Animation target "HEAD" not found') ||
        text.includes('THREE.GLTFExporter: Could not export animation track')
      ) {
        return;
      }
      originalWarn(...args);
    };
  });
}

async function openAvatarForge(page) {
  await page.evaluate(async () => {
    await window.openAvatarForge();
  });
  await expect(page.locator('#avatar-forge-modal')).toBeVisible();
}

async function updateAvatarForgeRecipe(page, recipe) {
  async function setRangeValue(inputId, value) {
    await page.locator(`#${inputId}`).evaluate((input, nextValue) => {
      input.value = String(nextValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  if (recipe.label !== undefined) {
    await page.locator('#avatar-label-input').fill(recipe.label);
  }
  if (recipe.bodyPresetId) {
    await page.locator('#avatar-body-select').selectOption(recipe.bodyPresetId);
  }
  if (recipe.headMoldId) {
    await page.locator('#avatar-head-mold-select').selectOption(recipe.headMoldId);
  }
  if (recipe.headShapeId) {
    await page.locator('#avatar-head-shape-select').selectOption(recipe.headShapeId);
  }
  if (recipe.hairPresetId) {
    await page.locator('#avatar-hair-select').selectOption(recipe.hairPresetId);
  }
  if (recipe.eyePresetId) {
    await page.locator('#avatar-eye-select').selectOption(recipe.eyePresetId);
  }
  if (recipe.browPresetId) {
    await page.locator('#avatar-brow-select').selectOption(recipe.browPresetId);
  }
  if (recipe.nosePresetId) {
    await page.locator('#avatar-nose-select').selectOption(recipe.nosePresetId);
  }
  if (recipe.mouthPresetId) {
    await page.locator('#avatar-mouth-select').selectOption(recipe.mouthPresetId);
  }
  if (recipe.earPresetId) {
    await page.locator('#avatar-ear-select').selectOption(recipe.earPresetId);
  }
  if (recipe.accessoryId) {
    await page.locator('#avatar-accessory-select').selectOption(recipe.accessoryId);
  }
  if (recipe.paletteId) {
    await page.locator('#avatar-palette-select').selectOption(recipe.paletteId);
  }
  if (recipe.features && typeof recipe.features === 'object') {
    for (const [featureKey, featureState] of Object.entries(recipe.features)) {
      if (!featureState || typeof featureState !== 'object') continue;
      if (featureState.presetId) {
        const selectId = {
          hair: 'avatar-hair-select',
          eyes: 'avatar-eye-select',
          brows: 'avatar-brow-select',
          nose: 'avatar-nose-select',
          mouth: 'avatar-mouth-select',
          ears: 'avatar-ear-select',
        }[featureKey];
        if (selectId) {
          await page.locator(`#${selectId}`).selectOption(featureState.presetId);
        }
      }
      if (featureState.placement && typeof featureState.placement === 'object') {
        for (const [fieldKey, value] of Object.entries(featureState.placement)) {
          await setRangeValue(`avatar-feature-${featureKey}-${fieldKey}`, value);
        }
      }
    }
  }

  await waitForUi(page, 450);
  await expect(page.locator('#avatar-forge-status')).not.toContainText(/failed/i);
}

async function confirmAvatarForge(page) {
  await page.locator('#avatar-forge-confirm-btn').click();
  await expect(page.locator('#avatar-forge-modal')).toBeHidden({ timeout: 30000 });
  await waitForUi(page, 450);
}

async function selectAvatarGroup(page, label) {
  await page.evaluate(async (targetLabel) => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ deselectAll, selectMesh }] = await Promise.all([
      import('/src/modules/viewport/selection.js'),
    ]);
    const target = state.userObjects.children.find((child) => child.userData?.avatarRecipe?.label === targetLabel);
    if (!target) {
      throw new Error(`Avatar group not found: ${targetLabel}`);
    }
    deselectAll();
    selectMesh(target);
  }, label);
}

async function insertAvatarGroup(page, recipe) {
  await page.evaluate(async (nextRecipe) => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ buildAvatarGroup }, { deselectAll, selectMesh }, { refreshObjectList, updateSelectedOverlay }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/viewport/selection.js'),
      import('/src/modules/viewport/object-list.js'),
    ]);

    const group = await buildAvatarGroup(nextRecipe);
    state.userObjects.add(group);
    deselectAll();
    selectMesh(group);
    refreshObjectList();
    updateSelectedOverlay();
  }, recipe);
}

async function sceneSummary(page) {
  return page.evaluate(async () => {
    const state = window.__LOWPOLY64_STATE__;
    return state.userObjects.children.map((child) => ({
      name: child.userData?.name || child.name || 'Object',
      childCount: child.children.length,
      meshCount: child.getObjectsByProperty('isMesh', true).length,
      hasAvatarRecipe: !!child.userData?.avatarRecipe,
      avatarRecipe: child.userData?.avatarRecipe
        ? {
            label: child.userData.avatarRecipe.label,
            headBuildMode: child.userData.avatarRecipe.headBuildMode || null,
            bodyPresetId: child.userData.avatarRecipe.bodyPresetId,
            headShapeId: child.userData.avatarRecipe.headShapeId,
            headMoldId: child.userData.avatarRecipe.headMoldId || null,
            hairPresetId: child.userData.avatarRecipe.hairPresetId,
            eyePresetId: child.userData.avatarRecipe.eyePresetId,
            browPresetId: child.userData.avatarRecipe.browPresetId,
            mouthPresetId: child.userData.avatarRecipe.mouthPresetId,
            features: child.userData.avatarRecipe.features
              ? JSON.parse(JSON.stringify(child.userData.avatarRecipe.features))
              : null,
            accessoryIds: Array.isArray(child.userData.avatarRecipe.accessoryIds)
              ? [...child.userData.avatarRecipe.accessoryIds]
              : [],
            paletteId: child.userData.avatarRecipe.paletteId,
            colorOverrides: child.userData.avatarRecipe.colorOverrides
              ? { ...child.userData.avatarRecipe.colorOverrides }
              : {},
          }
        : null,
      archetype: child.userData?.archetype || null,
      animationProfile: child.userData?.animationProfile || null,
      skeletonId: child.userData?.skeletonId || null,
    }));
  });
}

async function waitForSceneObjectCount(page, expectedCount) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const state = window.__LOWPOLY64_STATE__;
      return state.userObjects.children.length;
    });
  }).toBe(expectedCount);
}

async function collectAvatarCatalogSweepReport(page) {
  return page.evaluate(async () => {
    const [
      {
        AVATAR_HEAD_SHAPES,
        AVATAR_HAIR_PRESETS,
        AVATAR_EYE_PRESETS,
        AVATAR_BROW_PRESETS,
        AVATAR_MOUTH_PRESETS,
      },
      { compileAvatarHeadSvg },
    ] = await Promise.all([
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-head-svg.js'),
    ]);

    const heads = AVATAR_HEAD_SHAPES.filter((entry) => !entry.experimental && entry.id !== 'psx_portrait_skull_01');
    const hairs = AVATAR_HAIR_PRESETS.filter((entry) => entry.id !== 'none_01');
    const eyes = AVATAR_EYE_PRESETS.filter((entry) => entry.id !== 'none_01');
    const brows = AVATAR_BROW_PRESETS.filter((entry) => entry.id !== 'none_01');
    const mouths = AVATAR_MOUTH_PRESETS.filter((entry) => entry.id !== 'none_01');
    const failures = [];

    const thresholds = {
      hair: Object.freeze({
        centerAbsMax: 0.1,
        widthMin: 0.55,
        widthMax: 1.45,
        topMin: -0.18,
        topMax: 0.14,
        bottomMin: 0.25,
        bottomMax: 1.28,
      }),
      eyes: Object.freeze({
        centerAbsMax: 0.035,
        widthMin: 0.14,
        widthMax: 0.72,
        topMin: 0.3,
        topMax: 0.57,
        bottomMin: 0.39,
        bottomMax: 0.64,
      }),
      brows: Object.freeze({
        centerAbsMax: 0.03,
        widthMin: 0.22,
        widthMax: 0.75,
        topMin: 0.24,
        topMax: 0.4,
        bottomMin: 0.3,
        bottomMax: 0.44,
      }),
      mouth: Object.freeze({
        centerAbsMax: 0.02,
        widthMin: 0.08,
        widthMax: 0.43,
        topMin: 0.46,
        topMax: 0.88,
        bottomMin: 0.52,
        bottomMax: 0.94,
      }),
      face: Object.freeze({
        browEyeGapMin: 0,
        eyeMouthGapMin: 0.05,
      }),
    };

    function pushFailure(section, headId, presetId, metric, value, details = {}) {
      failures.push({
        section,
        headId,
        presetId,
        metric,
        value: Number(value.toFixed(4)),
        ...details,
      });
    }

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

    function measureRecipe(recipe) {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.style.top = '0';
      host.innerHTML = compileAvatarHeadSvg({
        label: 'Audit Probe',
        accessoryIds: ['none'],
        ...recipe,
      });
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const result = {
        head: buildSelectorBox(svg, '#HEAD_BASE'),
        hair: buildSelectorBox(svg, '[data-rv-role="hair"], [data-rv-role="hair_back"]'),
        eyes: buildSelectorBox(svg, '[data-rv-role="eye_white"], [data-rv-role="iris"], [data-rv-role="pupil"]'),
        brows: buildSelectorBox(svg, '[data-rv-role="eyebrow"]'),
        nose: buildSelectorBox(svg, '[data-rv-role="nose"]'),
        mouth: buildSelectorBox(svg, '[data-rv-role="mouth"]'),
      };

      host.remove();
      return result;
    }

    function centerDeltaRatio(partBox, headBox) {
      return ((partBox.x + (partBox.width / 2)) - (headBox.x + (headBox.width / 2))) / headBox.width;
    }

    function topRatio(partBox, headBox) {
      return (partBox.y - headBox.y) / headBox.height;
    }

    function bottomRatio(partBox, headBox) {
      return ((partBox.y + partBox.height) - headBox.y) / headBox.height;
    }

    function widthRatio(partBox, headBox) {
      return partBox.width / headBox.width;
    }

    function checkRange(section, headId, presetId, metric, value, min, max) {
      if (value < min || value > max) {
        pushFailure(section, headId, presetId, metric, value, {
          min: Number(min.toFixed(4)),
          max: Number(max.toFixed(4)),
        });
      }
    }

    heads.forEach((head) => {
      hairs.forEach((hair) => {
        const metrics = measureRecipe({
          headShapeId: head.id,
          hairPresetId: hair.id,
          eyePresetId: 'none_01',
          browPresetId: 'none_01',
          mouthPresetId: 'none_01',
        });
        const center = Math.abs(centerDeltaRatio(metrics.hair, metrics.head));
        checkRange('hair', head.id, hair.id, 'centerAbs', center, 0, thresholds.hair.centerAbsMax);
        checkRange('hair', head.id, hair.id, 'widthRatio', widthRatio(metrics.hair, metrics.head), thresholds.hair.widthMin, thresholds.hair.widthMax);
        checkRange('hair', head.id, hair.id, 'topRatio', topRatio(metrics.hair, metrics.head), thresholds.hair.topMin, thresholds.hair.topMax);
        checkRange('hair', head.id, hair.id, 'bottomRatio', bottomRatio(metrics.hair, metrics.head), thresholds.hair.bottomMin, thresholds.hair.bottomMax);
      });

      eyes.forEach((eye) => {
        const metrics = measureRecipe({
          headShapeId: head.id,
          hairPresetId: 'none_01',
          eyePresetId: eye.id,
          browPresetId: 'soft_01',
          mouthPresetId: 'smile_01',
        });
        const center = Math.abs(centerDeltaRatio(metrics.eyes, metrics.head));
        checkRange('eyes', head.id, eye.id, 'centerAbs', center, 0, thresholds.eyes.centerAbsMax);
        checkRange('eyes', head.id, eye.id, 'widthRatio', widthRatio(metrics.eyes, metrics.head), thresholds.eyes.widthMin, thresholds.eyes.widthMax);
        checkRange('eyes', head.id, eye.id, 'topRatio', topRatio(metrics.eyes, metrics.head), thresholds.eyes.topMin, thresholds.eyes.topMax);
        checkRange('eyes', head.id, eye.id, 'bottomRatio', bottomRatio(metrics.eyes, metrics.head), thresholds.eyes.bottomMin, thresholds.eyes.bottomMax);
      });

      brows.forEach((brow) => {
        const metrics = measureRecipe({
          headShapeId: head.id,
          hairPresetId: 'none_01',
          eyePresetId: 'wide_01',
          browPresetId: brow.id,
          mouthPresetId: 'smile_01',
        });
        const center = Math.abs(centerDeltaRatio(metrics.brows, metrics.head));
        checkRange('brows', head.id, brow.id, 'centerAbs', center, 0, thresholds.brows.centerAbsMax);
        checkRange('brows', head.id, brow.id, 'widthRatio', widthRatio(metrics.brows, metrics.head), thresholds.brows.widthMin, thresholds.brows.widthMax);
        checkRange('brows', head.id, brow.id, 'topRatio', topRatio(metrics.brows, metrics.head), thresholds.brows.topMin, thresholds.brows.topMax);
        checkRange('brows', head.id, brow.id, 'bottomRatio', bottomRatio(metrics.brows, metrics.head), thresholds.brows.bottomMin, thresholds.brows.bottomMax);
      });

      mouths.forEach((mouth) => {
        const metrics = measureRecipe({
          headShapeId: head.id,
          hairPresetId: 'none_01',
          eyePresetId: 'wide_01',
          browPresetId: 'soft_01',
          mouthPresetId: mouth.id,
        });
        const center = Math.abs(centerDeltaRatio(metrics.mouth, metrics.head));
        checkRange('mouth', head.id, mouth.id, 'centerAbs', center, 0, thresholds.mouth.centerAbsMax);
        checkRange('mouth', head.id, mouth.id, 'widthRatio', widthRatio(metrics.mouth, metrics.head), thresholds.mouth.widthMin, thresholds.mouth.widthMax);
        checkRange('mouth', head.id, mouth.id, 'topRatio', topRatio(metrics.mouth, metrics.head), thresholds.mouth.topMin, thresholds.mouth.topMax);
        checkRange('mouth', head.id, mouth.id, 'bottomRatio', bottomRatio(metrics.mouth, metrics.head), thresholds.mouth.bottomMin, thresholds.mouth.bottomMax);
      });
    });

    const faceBundles = [
      {
        id: 'default',
        eyePresetId: 'wide_01',
        browPresetId: 'soft_01',
        mouthPresetId: 'smile_01',
      },
      {
        id: 'psx',
        eyePresetId: 'psx_almond_soft_01',
        browPresetId: 'psx_flat_thick_01',
        mouthPresetId: 'psx_line_01',
      },
      {
        id: 'n64',
        eyePresetId: 'n64_cartool_oval_01',
        browPresetId: 'n64_curve_01',
        mouthPresetId: 'n64_bean_01',
      },
      {
        id: 'bridge',
        eyePresetId: 'bridge_confident_half_01',
        browPresetId: 'bridge_arched_soft_01',
        mouthPresetId: 'bridge_toothy_grin_01',
      },
    ];

    heads.forEach((head) => {
      faceBundles.forEach((bundle) => {
        const metrics = measureRecipe({
          headShapeId: head.id,
          hairPresetId: 'none_01',
          eyePresetId: bundle.eyePresetId,
          browPresetId: bundle.browPresetId,
          mouthPresetId: bundle.mouthPresetId,
        });

        const browEyeGapRatio = (metrics.eyes.y - (metrics.brows.y + metrics.brows.height)) / metrics.head.height;
        const eyeMouthGapRatio = (metrics.mouth.y - (metrics.eyes.y + metrics.eyes.height)) / metrics.head.height;

        if (browEyeGapRatio < thresholds.face.browEyeGapMin) {
          pushFailure('face', head.id, bundle.id, 'browEyeGapRatio', browEyeGapRatio, {
            min: thresholds.face.browEyeGapMin,
          });
        }
        if (eyeMouthGapRatio < thresholds.face.eyeMouthGapMin) {
          pushFailure('face', head.id, bundle.id, 'eyeMouthGapRatio', eyeMouthGapRatio, {
            min: thresholds.face.eyeMouthGapMin,
          });
        }
      });
    });

    return {
      counts: {
        heads: heads.length,
        hairCombos: heads.length * hairs.length,
        eyeCombos: heads.length * eyes.length,
        browCombos: heads.length * brows.length,
        mouthCombos: heads.length * mouths.length,
        faceBundles: heads.length * faceBundles.length,
      },
      failureCount: failures.length,
      failures: failures.slice(0, 25),
    };
  });
}

async function collectAccessoryAndPaletteAuditReport(page) {
  return page.evaluate(async () => {
    const [
      {
        AVATAR_ACCESSORY_PRESETS,
        AVATAR_PALETTES,
      },
      { compileAvatarHeadSvg },
    ] = await Promise.all([
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-head-svg.js'),
    ]);

    const representativeHeads = [
      { headShapeId: 'square_mii_01', hairPresetId: 'side_part_01' },
      { headShapeId: 'wide_cheek_01', hairPresetId: 'n64_round_bangs_01' },
      { headShapeId: 'psx_hero_jaw_01', hairPresetId: 'bridge_bowl_01' },
      { headShapeId: 'psx_skull_01', hairPresetId: 'psx_slick_back_01' },
      { headShapeId: 'n64_skull_01', hairPresetId: 'bridge_low_pony_01' },
    ];
    const accessoryRules = {
      ribbon_blue: { centerAbsMax: 0.08, topMin: 0.02, topMax: 0.18, bottomMin: 0.14, bottomMax: 0.3, widthMin: 0.2, widthMax: 0.45 },
      round_glasses: { centerAbsMax: 0.08, topMin: 0.32, topMax: 0.46, bottomMin: 0.46, bottomMax: 0.6, widthMin: 0.2, widthMax: 0.65 },
      star_clip: { centerMin: 0.18, centerMax: 0.4, topMin: 0.08, topMax: 0.22, bottomMin: 0.24, bottomMax: 0.4, widthMin: 0.18, widthMax: 0.34 },
      psx_square_glasses_01: { centerAbsMax: 0.08, topMin: 0.34, topMax: 0.48, bottomMin: 0.5, bottomMax: 0.64, widthMin: 0.45, widthMax: 0.76 },
      psx_visor_strip_01: { centerAbsMax: 0.06, topMin: 0.26, topMax: 0.42, bottomMin: 0.4, bottomMax: 0.54, widthMin: 0.45, widthMax: 0.72 },
      psx_bandana_knot_01: { centerAbsMax: 0.08, topMin: 0.08, topMax: 0.24, bottomMin: 0.26, bottomMax: 0.48, widthMin: 0.5, widthMax: 0.82 },
      psx_eyepatch_01: { centerAbsMax: 0.12, topMin: 0.32, topMax: 0.46, bottomMin: 0.46, bottomMax: 0.6, widthMin: 0.45, widthMax: 0.9 },
      n64_headband_sport_01: { centerAbsMax: 0.06, topMin: 0.08, topMax: 0.24, bottomMin: 0.18, bottomMax: 0.4, widthMin: 0.32, widthMax: 0.72 },
      n64_goggles_up_01: { centerAbsMax: 0.06, topMin: 0.14, topMax: 0.3, bottomMin: 0.26, bottomMax: 0.44, widthMin: 0.45, widthMax: 0.82 },
      n64_flower_pin_01: { centerMin: 0.18, centerMax: 0.4, topMin: 0.08, topMax: 0.22, bottomMin: 0.22, bottomMax: 0.38, widthMin: 0.18, widthMax: 0.3 },
      n64_leaf_clip_01: { centerMin: 0.18, centerMax: 0.38, topMin: 0.1, topMax: 0.24, bottomMin: 0.24, bottomMax: 0.42, widthMin: 0.18, widthMax: 0.3 },
      bridge_hairpin_duo_01: { centerMin: 0.18, centerMax: 0.38, topMin: 0.12, topMax: 0.28, bottomMin: 0.24, bottomMax: 0.4, widthMin: 0.22, widthMax: 0.34 },
      bridge_tiny_horns_01: { centerAbsMax: 0.08, topMin: 0.02, topMax: 0.18, bottomMin: 0.16, bottomMax: 0.3, widthMin: 0.24, widthMax: 0.45 },
      bridge_jewel_circlet_01: { centerAbsMax: 0.06, topMin: 0.12, topMax: 0.24, bottomMin: 0.2, bottomMax: 0.34, widthMin: 0.3, widthMax: 0.56 },
      bridge_mono_earring_01: { centerMin: 0.18, centerMax: 0.42, topMin: 0.44, topMax: 0.6, bottomMin: 0.68, bottomMax: 0.88, widthMin: 0.16, widthMax: 0.3 },
    };

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

    function measureRecipe(recipe) {
      const host = document.createElement('div');
      host.style.position = 'absolute';
      host.style.left = '-9999px';
      host.innerHTML = compileAvatarHeadSvg({
        label: 'Audit Probe',
        eyePresetId: 'wide_01',
        browPresetId: 'soft_01',
        mouthPresetId: 'smile_01',
        ...recipe,
      });
      document.body.appendChild(host);
      const svg = host.querySelector('svg');
      const result = {
        head: buildSelectorBox(svg, '#HEAD_BASE'),
        accessory: buildSelectorBox(svg, '[data-rv-role="hat_front"], [data-rv-role="hat_back"]'),
      };
      host.remove();
      return result;
    }

    function toRgb(hex) {
      const value = String(hex || '').replace('#', '');
      return {
        r: Number.parseInt(value.slice(0, 2), 16) / 255,
        g: Number.parseInt(value.slice(2, 4), 16) / 255,
        b: Number.parseInt(value.slice(4, 6), 16) / 255,
      };
    }

    function relativeLuminance(hex) {
      const { r, g, b } = toRgb(hex);
      const transform = (channel) => (
        channel <= 0.03928
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4
      );
      return (0.2126 * transform(r)) + (0.7152 * transform(g)) + (0.0722 * transform(b));
    }

    function contrastRatio(left, right) {
      const lumA = relativeLuminance(left);
      const lumB = relativeLuminance(right);
      const lighter = Math.max(lumA, lumB);
      const darker = Math.min(lumA, lumB);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const accessoryFailures = [];
    const accessories = AVATAR_ACCESSORY_PRESETS.filter((entry) => entry.id !== 'none');
    representativeHeads.forEach((headRecipe) => {
      accessories.forEach((accessory) => {
        const metrics = measureRecipe({
          headShapeId: headRecipe.headShapeId,
          hairPresetId: headRecipe.hairPresetId,
          accessoryIds: [accessory.id],
        });
        const head = metrics.head;
        const part = metrics.accessory;
        const centerDeltaRatio = ((part.x + (part.width / 2)) - (head.x + (head.width / 2))) / head.width;
        const centerAbs = Math.abs(centerDeltaRatio);
        const topRatio = (part.y - head.y) / head.height;
        const bottomRatio = ((part.y + part.height) - head.y) / head.height;
        const widthRatio = part.width / head.width;
        const rule = accessoryRules[accessory.id];

        if (rule.centerAbsMax !== undefined && centerAbs > rule.centerAbsMax) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'centerAbs', value: Number(centerAbs.toFixed(4)) });
        }
        if (rule.centerMin !== undefined && centerDeltaRatio < rule.centerMin) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'centerMin', value: Number(centerDeltaRatio.toFixed(4)) });
        }
        if (rule.centerMax !== undefined && centerDeltaRatio > rule.centerMax) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'centerMax', value: Number(centerDeltaRatio.toFixed(4)) });
        }
        if (topRatio < rule.topMin || topRatio > rule.topMax) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'topRatio', value: Number(topRatio.toFixed(4)) });
        }
        if (bottomRatio < rule.bottomMin || bottomRatio > rule.bottomMax) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'bottomRatio', value: Number(bottomRatio.toFixed(4)) });
        }
        if (widthRatio < rule.widthMin || widthRatio > rule.widthMax) {
          accessoryFailures.push({ headShapeId: headRecipe.headShapeId, accessoryId: accessory.id, metric: 'widthRatio', value: Number(widthRatio.toFixed(4)) });
        }
      });
    });

    const paletteFailures = [];
    AVATAR_PALETTES.forEach((palette) => {
      const metrics = {
        skinHair: contrastRatio(palette.skin, palette.hair),
        bodySeparation: contrastRatio(palette.bodyPrimary, palette.bodySecondary),
        accentContrast: contrastRatio(palette.accent, palette.bodyPrimary),
        irisContrast: contrastRatio('#fff8f2', palette.iris),
      };
      if (metrics.skinHair < 1.35) paletteFailures.push({ paletteId: palette.id, metric: 'skinHair', value: Number(metrics.skinHair.toFixed(4)) });
      if (metrics.bodySeparation < 1.18) paletteFailures.push({ paletteId: palette.id, metric: 'bodySeparation', value: Number(metrics.bodySeparation.toFixed(4)) });
      if (metrics.accentContrast < 1.12) paletteFailures.push({ paletteId: palette.id, metric: 'accentContrast', value: Number(metrics.accentContrast.toFixed(4)) });
      if (metrics.irisContrast < 1.45) paletteFailures.push({ paletteId: palette.id, metric: 'irisContrast', value: Number(metrics.irisContrast.toFixed(4)) });
    });

    return {
      accessoryCount: accessories.length,
      paletteCount: AVATAR_PALETTES.length,
      accessoryFailureCount: accessoryFailures.length,
      accessoryFailures: accessoryFailures.slice(0, 20),
      paletteFailureCount: paletteFailures.length,
      paletteFailures,
    };
  });
}

test('saves and loads avatar groups without breaking non-avatar groups', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Save Avatar',
  });

  await waitForSceneObjectCount(page, 1);
  await addTemplate(page, 'crate');
  await waitForSceneObjectCount(page, 2);

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);
  const beforeNonAvatar = beforeSave.find((entry) => !entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.label).toBe('Save Avatar');
  expect(beforeNonAvatar?.name).toBeTruthy();

  await page.evaluate(() => {
    return window.saveScene();
  });
  await page.evaluate(() => {
    window.resetScene();
  });
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 2);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);
  const afterNonAvatar = afterLoad.find((entry) => !entry.hasAvatarRecipe);

  expect(afterAvatar).toEqual(beforeAvatar);
  expect(afterNonAvatar).toEqual(beforeNonAvatar);
  await assertNoPageErrors(page);
});

test('validates representative avatar combinations as humanoid-safe builds', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  const diagnostics = await page.evaluate(async () => {
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
    const recipes = [
      {
        label: 'Matrix A',
        bodyPresetId: 'psx_chibi',
        hairPresetId: 'bob_01',
        eyePresetId: 'wide_01',
        browPresetId: 'soft_01',
        mouthPresetId: 'smile_01',
        paletteId: 'warm_rose',
      },
      {
        label: 'Matrix B',
        bodyPresetId: 'psx_heroic',
        hairPresetId: 'short_spikes_01',
        eyePresetId: 'intense_01',
        browPresetId: 'angled_01',
        mouthPresetId: 'grin_01',
        paletteId: 'sunny_tan',
      },
      {
        label: 'Matrix C',
        bodyPresetId: 'n64_classic',
        hairPresetId: 'side_part_01',
        eyePresetId: 'sleepy_01',
        browPresetId: 'straight_01',
        mouthPresetId: 'neutral_01',
        paletteId: 'cool_ash',
      },
    ];

    const results = [];
    for (const recipe of recipes) {
      const group = await buildAvatarGroup(recipe);
      results.push({
        label: recipe.label,
        archetype: group.userData?.archetype || null,
        hasAvatarRecipe: !!group.userData?.avatarRecipe,
        headSlotCount: Array.isArray(group.userData?.slotMap?.HEAD) ? group.userData.slotMap.HEAD.length : 0,
        skeletonId: group.userData?.skeletonId || null,
        animationProfile: group.userData?.animationProfile || null,
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
    }
    return results;
  });

  expect(diagnostics).toHaveLength(3);
  for (const entry of diagnostics) {
    expect(entry.archetype, entry.label).toBe('HUMANOID');
    expect(entry.hasAvatarRecipe, entry.label).toBe(true);
    expect(entry.headSlotCount, entry.label).toBeGreaterThan(0);
    expect(entry.skeletonId, entry.label).toBe('HUMANOID_DEFAULT');
    expect(entry.animationProfile, entry.label).toBe('HUMANOID_AVATAR_BASE');
  }

  await assertNoPageErrors(page);
});

test('builds mold-mode avatars from the canonical mesh head with detached features', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const recipe = createMoldAvatarRecipe({
      label: 'Mold Probe',
      bodyPresetId: 'psx_chibi',
      accessoryIds: ['none'],
      features: {
        hair: { presetId: 'psx_slick_back_01' },
        eyes: { presetId: 'psx_almond_soft_01' },
        brows: { presetId: 'psx_serious_01' },
        nose: { presetId: 'nose_bridge_01', placement: { size: 1.04, offsetX: 2, offsetY: -4 } },
        mouth: { presetId: 'psx_line_01' },
        ears: { presetId: 'ear_point_01' },
      },
    });
    const group = await buildAvatarGroup(recipe);
    const headNames = Array.isArray(group.userData?.slotMap?.HEAD) ? group.userData.slotMap.HEAD : [];
    const slotSource = group.userData?.slotSvgSources?.HEAD || null;

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
      headBuildMode: group.userData?.avatarRecipe?.headBuildMode || null,
      headMoldId: group.userData?.avatarRecipe?.headMoldId || null,
      hairPresetId: group.userData?.avatarRecipe?.hairPresetId || null,
      eyePresetId: group.userData?.avatarRecipe?.eyePresetId || null,
      browPresetId: group.userData?.avatarRecipe?.browPresetId || null,
      mouthPresetId: group.userData?.avatarRecipe?.mouthPresetId || null,
      nosePresetId: group.userData?.avatarRecipe?.features?.nose?.presetId || null,
      earPresetId: group.userData?.avatarRecipe?.features?.ears?.presetId || null,
      headSlotCount: headNames.length,
      hasNosePiece: headNames.some((name) => /NOSE/i.test(name)),
      hasEarPiece: headNames.some((name) => /EAR/i.test(name)),
      hasMouthPiece: headNames.some((name) => /MOUTH/i.test(name)),
      hasHairPiece: headNames.some((name) => /HAIR/i.test(name)),
      slotSourceMode: slotSource?.svgSource?.inputs?.recipe?.headBuildMode || null,
      slotSourceHasMoldMarkup: String(slotSource?.svgSource?.markup || '').includes('data-rv-head-build-mode="mold"'),
      slotSourceMountRoles: ['eyePair', 'browPair', 'nose', 'mouth', 'earPair', 'hairCap'].filter((role) => (
        String(slotSource?.svgSource?.markup || '').includes(`data-rv-mount-role="${role}"`)
      )),
    };
  });

  expect(diagnostics.headBuildMode).toBe('mold');
  expect(diagnostics.headMoldId).toBe('psx_mesh_portrait_01');
  expect(diagnostics.hairPresetId).toBe('psx_slick_back_01');
  expect(diagnostics.eyePresetId).toBe('psx_almond_soft_01');
  expect(diagnostics.browPresetId).toBe('psx_serious_01');
  expect(diagnostics.mouthPresetId).toBe('psx_line_01');
  expect(diagnostics.nosePresetId).toBe('nose_bridge_01');
  expect(diagnostics.earPresetId).toBe('ear_point_01');
  expect(diagnostics.headSlotCount).toBeGreaterThan(5);
  expect(diagnostics.hasNosePiece).toBe(true);
  expect(diagnostics.hasEarPiece).toBe(true);
  expect(diagnostics.hasMouthPiece).toBe(true);
  expect(diagnostics.hasHairPiece).toBe(true);
  expect(diagnostics.slotSourceMode).toBe('mold');
  expect(diagnostics.slotSourceHasMoldMarkup).toBe(true);
  expect(diagnostics.slotSourceMountRoles).toEqual(['eyePair', 'browPair', 'nose', 'mouth', 'earPair', 'hairCap']);

  await assertNoPageErrors(page);
});

test('keeps mold and legacy head builders isolated without mode confusion', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const legacyGroup = await buildAvatarGroup({
      label: 'Legacy Probe',
      bodyPresetId: 'psx_chibi',
      headShapeId: 'psx_portrait_01',
      hairPresetId: 'side_part_01',
      eyePresetId: 'wide_01',
      browPresetId: 'soft_01',
      mouthPresetId: 'smile_01',
      accessoryIds: ['none'],
      paletteId: 'warm_rose',
    });

    const moldGroup = await buildAvatarGroup(createMoldAvatarRecipe({
      label: 'Mold Isolation Probe',
      bodyPresetId: 'psx_chibi',
      accessoryIds: ['none'],
      features: {
        nose: { presetId: 'nose_soft_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }));

    function read(group) {
      const slotSource = group.userData?.slotSvgSources?.HEAD || null;
      const markup = String(slotSource?.svgSource?.markup || '');
      return {
        headBuildMode: group.userData?.avatarRecipe?.headBuildMode || null,
        headShapeId: group.userData?.avatarRecipe?.headShapeId || null,
        headMoldId: group.userData?.avatarRecipe?.headMoldId || null,
        markupMode: markup.includes('data-rv-head-build-mode="mold"')
          ? 'mold'
          : (markup.includes('data-rv-head-build-mode="legacy"') ? 'legacy' : null),
        hasMountRoles: markup.includes('data-rv-mount-role='),
      };
    }

    const result = {
      legacy: read(legacyGroup),
      mold: read(moldGroup),
    };

    [legacyGroup, moldGroup].forEach((group) => {
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
    });

    return result;
  });

  expect(diagnostics.legacy.headBuildMode).toBe('legacy');
  expect(diagnostics.legacy.headShapeId).toBe('psx_portrait_01');
  expect(diagnostics.legacy.markupMode).toBe('legacy');
  expect(diagnostics.legacy.hasMountRoles).toBe(false);

  expect(diagnostics.mold.headBuildMode).toBe('mold');
  expect(diagnostics.mold.headMoldId).toBe('psx_mesh_portrait_01');
  expect(diagnostics.mold.markupMode).toBe('mold');
  expect(diagnostics.mold.hasMountRoles).toBe(true);

  await assertNoPageErrors(page);
});

test('wraps canonical head pieces under a HEAD label pivot', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { buildAvatarGroup },
      { createMoldAvatarRecipe },
      { serializeGroupAsImportJSON },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/modules/viewport/persistence.js'),
    ]);

    const group = await buildAvatarGroup(createMoldAvatarRecipe({
      label: 'Head Label Probe',
      bodyPresetId: 'psx_chibi',
      accessoryIds: ['round_glasses'],
      features: {
        hair: { presetId: 'bob_01' },
        nose: { presetId: 'nose_soft_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    }));

    const legacy = serializeGroupAsImportJSON(group, { format: 'legacy' });
    const headSlot = Array.isArray(legacy?.slotMap?.HEAD) ? [...legacy.slotMap.HEAD] : [];
    const headPieces = headSlot
      .map((name) => legacy.pieces.find((piece) => piece.name === name))
      .filter(Boolean)
      .map((piece) => ({
        name: piece.name,
        geometryType: piece.geometry?.type || '',
        parent: piece.parent || null,
      }));

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
      headSlot,
      headPieces,
    };
  });

  expect(diagnostics.headSlot[0]).toBe('HEAD');
  expect(diagnostics.headPieces.find((entry) => entry.name === 'HEAD')?.geometryType).toBe('label');
  expect(diagnostics.headPieces.some((entry) => entry.name === 'HEAD_BASE')).toBe(true);

  diagnostics.headPieces
    .filter((entry) => entry.name !== 'HEAD')
    .forEach((entry) => {
      expect(entry.parent, `${entry.name} parent`).toBe('HEAD');
    });

  await assertNoPageErrors(page);
});

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

test('starts blank Avatar Forge sessions in canonical mold mode', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);

  await expect(page.locator('#avatar-body-select')).toHaveValue('psx_chibi');
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('psx_mesh_portrait_01');
  await expect(page.locator('#avatar-head-shape-wrap')).toBeHidden();
  await expect(page.locator('#avatar-nose-wrap')).toBeVisible();
  await expect(page.locator('#avatar-ear-wrap')).toBeVisible();
  await expect(page.locator('#avatar-head-mode')).toContainText(/MOLD|MOLDE|CANONICAL|CANONICO/i);
  await expect(page.locator('#avatar-feature-eyes-size')).toBeEnabled();

  await page.locator('#avatar-body-select').selectOption('n64_classic');
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('psx_mesh_portrait_01');

  await assertNoPageErrors(page);
});

test('orders canonical mold selectors with usable defaults before none entries', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);
  await openAvatarForge(page);

  const snapshot = await page.evaluate(() => {
    function readSelect(id) {
      const select = document.getElementById(id);
      const options = Array.from(select.options).map((option) => ({
        value: option.value,
        label: option.textContent,
      }));
      return {
        count: options.length,
        selected: select.value,
        first: options[0]?.value || '',
        last: options[options.length - 1]?.value || '',
        values: options.map((option) => option.value),
      };
    }

    return {
      headMold: readSelect('avatar-head-mold-select'),
      hair: readSelect('avatar-hair-select'),
      eyes: readSelect('avatar-eye-select'),
      brows: readSelect('avatar-brow-select'),
      nose: readSelect('avatar-nose-select'),
      mouth: readSelect('avatar-mouth-select'),
      ears: readSelect('avatar-ear-select'),
      accessory: readSelect('avatar-accessory-select'),
      palette: readSelect('avatar-palette-select'),
    };
  });

  expect(snapshot.headMold.count).toBe(7);
  expect(snapshot.headMold.first).toBe('psx_mesh_portrait_01');
  expect(snapshot.headMold.selected).toBe('psx_mesh_portrait_01');
  expect(snapshot.headMold.values).toEqual([
    'psx_mesh_portrait_01',
    'psx_mesh_portrait_normal_175',
    'psx_mesh_portrait_cabezon_175',
    'psx_mesh_portrait_duro_175',
    'psx_mesh_portrait_duro_250',
    'psx_mesh_portrait_gordo_175',
    'psx_mesh_portrait_gordo_275',
  ]);

  expect(snapshot.hair.count).toBe(16);
  expect(snapshot.hair.first).toBe('bob_01');
  expect(snapshot.hair.last).toBe('none_01');
  expect(snapshot.hair.selected).toBe('bob_01');

  expect(snapshot.eyes.count).toBe(16);
  expect(snapshot.eyes.first).toBe('wide_01');
  expect(snapshot.eyes.last).toBe('none_01');
  expect(snapshot.eyes.selected).toBe('wide_01');

  expect(snapshot.brows.count).toBe(16);
  expect(snapshot.brows.first).toBe('soft_01');
  expect(snapshot.brows.last).toBe('none_01');
  expect(snapshot.brows.selected).toBe('soft_01');

  expect(snapshot.nose.count).toBe(5);
  expect(snapshot.nose.selected).toBe('nose_soft_01');

  expect(snapshot.mouth.count).toBe(16);
  expect(snapshot.mouth.first).toBe('smile_01');
  expect(snapshot.mouth.last).toBe('none_01');
  expect(snapshot.mouth.selected).toBe('neutral_01');

  expect(snapshot.ears.count).toBe(3);
  expect(snapshot.ears.selected).toBe('ear_soft_01');

  expect(snapshot.accessory.count).toBe(16);
  expect(snapshot.accessory.first).toBe('ribbon_blue');
  expect(snapshot.accessory.last).toBe('none');
  expect(snapshot.accessory.selected).toBe('none');

  expect(snapshot.palette.count).toBe(15);
  expect(snapshot.palette.first).toBe('warm_rose');
  expect(snapshot.palette.selected).toBe('warm_rose');

  await assertNoPageErrors(page);
});

test('applies corrective root transforms only to imported mesh portrait variants', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { AVATAR_HEAD_MESH_MAP },
      { buildAvatarGroup },
      { createMoldAvatarRecipe },
    ] = await Promise.all([
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    function readHeadBaseTransform(group) {
      let headBase = null;
      group.traverse((node) => {
        if (headBase) return;
        const nodeName = node.userData?.name || node.name || '';
        if (nodeName === 'HEAD_BASE') headBase = node;
      });
      return headBase ? {
        position: headBase.position.toArray().slice(0, 3),
        rotation: headBase.rotation.toArray().slice(0, 3),
        parent: headBase.parent?.userData?.name || headBase.parent?.name || null,
      } : null;
    }

    const [canonicalGroup, variantGroup] = await Promise.all([
      buildAvatarGroup(createMoldAvatarRecipe({
        label: 'Canonical Transform Probe',
        bodyPresetId: 'psx_chibi',
        headMoldId: 'psx_mesh_portrait_01',
        accessoryIds: ['none'],
      })),
      buildAvatarGroup(createMoldAvatarRecipe({
        label: 'Variant Transform Probe',
        bodyPresetId: 'psx_chibi',
        headMoldId: 'psx_mesh_portrait_normal_175',
        accessoryIds: ['none'],
      })),
    ]);

    const builtTransforms = {
      canonical: readHeadBaseTransform(canonicalGroup),
      variant: readHeadBaseTransform(variantGroup),
    };

    [canonicalGroup, variantGroup].forEach((group) => {
      group.traverse((node) => {
        if (!node.isMesh) return;
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      });
    });

    return {
      canonical: AVATAR_HEAD_MESH_MAP.psx_mesh_portrait_01?.rootTransform || null,
      variants: [
        'psx_mesh_portrait_normal_175',
        'psx_mesh_portrait_cabezon_175',
        'psx_mesh_portrait_duro_175',
        'psx_mesh_portrait_duro_250',
        'psx_mesh_portrait_gordo_175',
        'psx_mesh_portrait_gordo_275',
      ].map((id) => ({
        id,
        rootTransform: AVATAR_HEAD_MESH_MAP[id]?.rootTransform || null,
      })),
      builtTransforms,
    };
  });

  expect(diagnostics.canonical).toBeNull();
  diagnostics.variants.forEach((entry) => {
    expect(entry.rootTransform).toEqual({
      rotationDegrees: { x: -90, y: 0, z: 0 },
      position: { x: 0, y: 0.7, z: 0.1 },
    });
  });
  expect(diagnostics.builtTransforms.canonical).toEqual({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    parent: 'HEAD',
  });
  expect(diagnostics.builtTransforms.variant.parent).toBe('HEAD');
  expect(diagnostics.builtTransforms.variant.position[0]).toBeCloseTo(0, 5);
  expect(diagnostics.builtTransforms.variant.position[1]).toBeCloseTo(0.7, 5);
  expect(diagnostics.builtTransforms.variant.position[2]).toBeCloseTo(0.1, 5);
  expect(diagnostics.builtTransforms.variant.rotation[0]).toBeCloseTo(-Math.PI / 2, 5);
  expect(diagnostics.builtTransforms.variant.rotation[1]).toBeCloseTo(0, 5);
  expect(diagnostics.builtTransforms.variant.rotation[2]).toBeCloseTo(0, 5);

  await assertNoPageErrors(page);
});

test('builds every registered mesh portrait head mold without missing geometry', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { buildAvatarGroup },
      { createMoldAvatarRecipe },
      { AVATAR_HEAD_MOLDS },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/data/avatar/catalog.js'),
    ]);

    const results = [];
    for (const mold of AVATAR_HEAD_MOLDS) {
      const group = await buildAvatarGroup(createMoldAvatarRecipe({
        label: `Probe ${mold.id}`,
        bodyPresetId: 'psx_chibi',
        headMoldId: mold.id,
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'bob_01' },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: 'nose_soft_01' },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: 'ear_soft_01' },
        },
      }));

      results.push({
        headMoldId: group.userData?.avatarRecipe?.headMoldId || null,
        headSlotCount: Array.isArray(group.userData?.slotMap?.HEAD) ? group.userData.slotMap.HEAD.length : 0,
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
    }

    return results;
  });

  expect(diagnostics).toHaveLength(7);
  expect(diagnostics.map((entry) => entry.headMoldId)).toEqual([
    'psx_mesh_portrait_01',
    'psx_mesh_portrait_normal_175',
    'psx_mesh_portrait_cabezon_175',
    'psx_mesh_portrait_duro_175',
    'psx_mesh_portrait_duro_250',
    'psx_mesh_portrait_gordo_175',
    'psx_mesh_portrait_gordo_275',
  ]);
  diagnostics.forEach((entry) => {
    expect(entry.headSlotCount).toBeGreaterThan(3);
  });

  await assertNoPageErrors(page);
});

test('keeps legacy avatar recipes editable while disabling mold-only controls', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Legacy UI Probe',
    bodyPresetId: 'psx_chibi',
    headShapeId: 'psx_portrait_01',
    hairPresetId: 'side_part_01',
    eyePresetId: 'wide_01',
    browPresetId: 'soft_01',
    mouthPresetId: 'smile_01',
    accessoryIds: ['none'],
  });
  await selectAvatarGroup(page, 'Legacy UI Probe');
  await openAvatarForge(page);

  await expect(page.locator('#avatar-head-mode')).toContainText(/LEGACY|COMPAT/i);
  await expect(page.locator('#avatar-head-shape-wrap')).toBeVisible();
  await expect(page.locator('#avatar-head-mold-wrap')).toBeHidden();
  await expect(page.locator('#avatar-nose-wrap')).toBeHidden();
  await expect(page.locator('#avatar-ear-wrap')).toBeHidden();
  await expect(page.locator('#avatar-feature-eyes-size')).toBeDisabled();

  await assertNoPageErrors(page);
});

test('keeps avatar faces aligned with foot direction and preserves rear head volume', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');

    const group = await buildAvatarGroup({
      label: 'Orientation Probe',
      bodyPresetId: 'psx_chibi',
      headShapeId: 'square_mii_01',
      hairPresetId: 'bob_01',
      eyePresetId: 'wide_01',
      browPresetId: 'soft_01',
      mouthPresetId: 'smile_01',
      paletteId: 'warm_rose',
    });

    function findPivot(root, name) {
      let match = null;
      root.traverse((node) => {
        if (match || !node.userData?.isPivot) return;
        if ((node.userData?.name || node.name) === name) {
          match = node;
        }
      });
      return match;
    }

    function computeBoundsInSpace(targetNames, spaceNode) {
      if (!spaceNode || !Array.isArray(targetNames) || targetNames.length === 0) return null;

      group.updateWorldMatrix(true, true);
      const inverseWorld = spaceNode.matrixWorld.clone().invert();
      let bounds = null;

      targetNames.forEach((targetName) => {
        const node = findPivot(group, targetName);
        if (!node) return;
        node.traverse((child) => {
          if (!child.isMesh || !child.geometry) return;
          child.geometry.computeBoundingBox?.();
          if (!child.geometry.boundingBox) return;
          const localMatrix = inverseWorld.clone().multiply(child.matrixWorld);
          const childBounds = child.geometry.boundingBox.clone().applyMatrix4(localMatrix);
          bounds = bounds ? bounds.union(childBounds) : childBounds;
        });
      });

      return bounds;
    }

    function footFrontSign(footName) {
      const footPivot = findPivot(group, footName);
      const footBounds = computeBoundsInSpace([footName], footPivot);
      if (!footBounds) return 0;
      return Math.abs(footBounds.min.z) >= Math.abs(footBounds.max.z) ? -1 : 1;
    }

    const headNames = Array.isArray(group.userData?.slotMap?.HEAD) ? group.userData.slotMap.HEAD : [];
    const faceNames = headNames.filter((name) => /(EYE|IRIS|PUPIL|BROW|NOSE|MOUTH)/i.test(name));
    const hairBackNames = headNames.filter((name) => /(HAIR_BACK|PONYTAIL|BRAID|CAP_BACK|HELM_BACK|CROWN_BACK|HAT_BACK)/i.test(name));
    const headPivot = findPivot(group, 'HEAD');
    const headBounds = computeBoundsInSpace(headNames, headPivot);
    const faceBounds = computeBoundsInSpace(faceNames, headPivot);
    const hairBackBounds = computeBoundsInSpace(hairBackNames, headPivot);
    const faceCenterZ = faceBounds ? ((faceBounds.min.z + faceBounds.max.z) * 0.5) : 0;
    const faceSign = faceCenterZ <= 0 ? -1 : 1;
    const headFrontExtent = headBounds
      ? (faceSign < 0 ? Math.abs(headBounds.min.z) : Math.abs(headBounds.max.z))
      : 0;
    const headBackExtent = headBounds
      ? (faceSign < 0 ? Math.abs(headBounds.max.z) : Math.abs(headBounds.min.z))
      : 0;
    const hairBackExtent = hairBackBounds
      ? (faceSign < 0 ? Math.abs(hairBackBounds.max.z) : Math.abs(hairBackBounds.min.z))
      : 0;

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
      faceSign,
      footSigns: [footFrontSign('FOOT_L'), footFrontSign('FOOT_R')].filter(Boolean),
      headFrontExtent,
      headBackExtent,
      hairBackExtent,
      faceNameCount: faceNames.length,
      headNameCount: headNames.length,
    };
  });

  expect(diagnostics.faceNameCount).toBeGreaterThan(0);
  expect(diagnostics.headNameCount).toBeGreaterThan(diagnostics.faceNameCount);
  expect(diagnostics.faceSign).toBe(-1);
  expect(diagnostics.footSigns).toEqual([-1, -1]);
  expect(diagnostics.headBackExtent).toBeGreaterThan(diagnostics.headFrontExtent * 0.85);
  expect(diagnostics.hairBackExtent).toBeGreaterThan(diagnostics.headFrontExtent * 0.55);

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

test('preserves accessory and palette overrides across save and load', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Style Audit Avatar',
    bodyPresetId: 'n64_classic',
    headShapeId: 'square_mii_01',
    hairPresetId: 'bridge_bowl_01',
    eyePresetId: 'bridge_confident_half_01',
    browPresetId: 'bridge_arched_soft_01',
    mouthPresetId: 'bridge_toothy_grin_01',
    accessoryIds: ['bridge_jewel_circlet_01'],
    paletteId: 'arcade_teal',
    colorOverrides: {
      hair: '#3a2254',
      accent: '#ff8a5b',
      bodyPrimary: '#138d90',
    },
  });

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);

  await page.evaluate(() => {
    return window.saveScene();
  });
  await page.evaluate(() => {
    window.resetScene();
  });
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 1);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.accessoryIds).toEqual(['bridge_jewel_circlet_01']);
  expect(beforeAvatar?.avatarRecipe?.paletteId).toBe('arcade_teal');
  expect(beforeAvatar?.avatarRecipe?.headBuildMode).toBe('legacy');
  expect(beforeAvatar?.avatarRecipe?.colorOverrides).toEqual({
    hair: '#3a2254',
    accent: '#ff8a5b',
    bodyPrimary: '#138d90',
  });
  expect(afterAvatar).toEqual(beforeAvatar);

  await assertNoPageErrors(page);
});

test('persists canonical mold feature placements across save, load, and builder reopen', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);
  await openAvatarForge(page);

  await updateAvatarForgeRecipe(page, {
    label: 'Mold Roundtrip Avatar',
    bodyPresetId: 'psx_heavy',
    accessoryId: 'none',
    paletteId: 'arcade_teal',
    features: {
      hair: { presetId: 'psx_layered_hero_01', placement: { size: 1.08, offsetX: 2, offsetY: -4 } },
      eyes: { presetId: 'psx_almond_sharp_01', placement: { size: 1.06, offsetX: 3, offsetY: -2, spacing: 14 } },
      brows: { presetId: 'psx_serious_01', placement: { size: 1.02, offsetX: 1, offsetY: -3 } },
      nose: { presetId: 'nose_bridge_01', placement: { size: 1.05, offsetX: 2, offsetY: -4 } },
      mouth: { presetId: 'psx_line_01', placement: { size: 0.96, offsetX: 0, offsetY: -6 } },
      ears: { presetId: 'ear_point_01', placement: { size: 1.02, offsetX: 0, offsetY: -2 } },
    },
  });
  await confirmAvatarForge(page);

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.headBuildMode).toBe('mold');
  expect(beforeAvatar?.avatarRecipe?.headMoldId).toBe('psx_mesh_portrait_01');
  expect(beforeAvatar?.avatarRecipe?.features?.eyes?.placement?.spacing).toBe(14);
  expect(beforeAvatar?.avatarRecipe?.features?.nose?.presetId).toBe('nose_bridge_01');
  expect(beforeAvatar?.avatarRecipe?.features?.ears?.presetId).toBe('ear_point_01');

  await page.evaluate(() => window.saveScene());
  await page.evaluate(() => window.resetScene());
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 1);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);
  expect(afterAvatar).toEqual(beforeAvatar);

  await selectAvatarGroup(page, 'Mold Roundtrip Avatar');
  await openAvatarForge(page);
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('psx_mesh_portrait_01');
  await expect(page.locator('#avatar-eye-select')).toHaveValue('psx_almond_sharp_01');
  await expect(page.locator('#avatar-nose-select')).toHaveValue('nose_bridge_01');
  await expect(page.locator('#avatar-ear-select')).toHaveValue('ear_point_01');
  await expect(page.locator('#avatar-feature-eyes-spacing')).toHaveValue('14');
  await expect(page.locator('#avatar-feature-mouth-offsetY')).toHaveValue('-6');

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

test('switches the preview camera between full-body and head-review framing', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);
  await openAvatarForge(page);

  const readDiagnostics = () => page.evaluate(async () => {
    const { getAvatarForgePreviewDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgePreviewDiagnostics();
  });

  const initial = await readDiagnostics();
  expect(initial.open).toBe(true);
  expect(initial.previewFocusMode).toBe('full');
  expect(initial.hasPreviewGroup).toBe(true);

  await updateAvatarForgeRecipe(page, {
    hairPresetId: 'psx_layered_hero_01',
  });

  const headFocused = await readDiagnostics();
  expect(headFocused.previewFocusMode).toBe('head');
  expect(headFocused.headBuildMode).toBe('mold');
  expect(headFocused.cameraSide).toBe('front');
  expect(headFocused.headBounds?.size?.[1]).toBeGreaterThan(0);
  expect(headFocused.distanceToTarget).toBeLessThan(initial.distanceToTarget);
  expect(headFocused.cameraPosition[2]).toBeGreaterThan(headFocused.controlTarget[2]);

  const previewCanvas = page.locator('#avatar-preview-canvas');
  await expect(previewCanvas).toBeVisible();
  await previewCanvas.hover();
  await page.mouse.wheel(0, -420);
  await waitForUi(page, 350);

  const manuallyZoomed = await readDiagnostics();
  expect(manuallyZoomed.previewFocusMode).toBe('head');
  expect(manuallyZoomed.distanceToTarget).toBeLessThan(headFocused.distanceToTarget);

  await updateAvatarForgeRecipe(page, {
    eyePresetId: 'psx_hero_square_01',
  });

  const stickyHeadZoom = await readDiagnostics();
  expect(stickyHeadZoom.previewFocusMode).toBe('head');
  expect(stickyHeadZoom.distanceToTarget).toBeCloseTo(manuallyZoomed.distanceToTarget, 3);
  stickyHeadZoom.cameraPosition.forEach((value, index) => {
    expect(value).toBeCloseTo(manuallyZoomed.cameraPosition[index], 3);
  });
  stickyHeadZoom.controlTarget.forEach((value, index) => {
    expect(value).toBeCloseTo(manuallyZoomed.controlTarget[index], 3);
  });

  await updateAvatarForgeRecipe(page, {
    bodyPresetId: 'n64_classic',
  });

  const fullFocused = await readDiagnostics();
  expect(fullFocused.previewFocusMode).toBe('full');
  expect(fullFocused.distanceToTarget).toBeGreaterThan(stickyHeadZoom.distanceToTarget);

  await assertNoPageErrors(page);
});

test('opens rig/animation preview and exports a GLB for an avatar-forged humanoid', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await page.evaluate(async () => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ buildAvatarGroup }, { deselectAll, selectMesh }, { refreshObjectList, updateSelectedOverlay }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/viewport/selection.js'),
      import('/src/modules/viewport/object-list.js'),
    ]);

    const group = await buildAvatarGroup({
        label: 'Rig Avatar',
        bodyPresetId: 'psx_heroic',
      headShapeId: 'n64_skull_01',
        hairPresetId: 'short_spikes_01',
      eyePresetId: 'intense_01',
      browPresetId: 'angled_01',
      mouthPresetId: 'grin_01',
      paletteId: 'olive_gold',
    });

    state.userObjects.add(group);
    deselectAll();
    selectMesh(group);
    refreshObjectList();
    updateSelectedOverlay();
  });
  await waitForUi(page, 350);

  await page.evaluate(async () => {
    await window.openRigPanel();
  });
  await expect(page.locator('#rig-panel-modal')).toBeVisible();
  await expect(page.locator('#rig-skeleton-select')).toHaveValue('HUMANOID_DEFAULT');
  await expect(page.locator('#rig-anim-list')).toContainText(/idle/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/walk/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/run/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/hurt/i);
  await expect(page.locator('#rig-anim-list')).toContainText(/die/i);

  await closeRigPanelIfOpen(page);

  const exportResult = await page.evaluate(async () => {
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { buffer, filename } = await exportGLBToBuffer();
    return {
      filename,
      size: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
    };
  });

  expect(exportResult.filename).toBe('lowpoly64-scene.glb');
  expect(exportResult.size).toBeGreaterThan(0);

  await assertNoPageErrors(page);
});
