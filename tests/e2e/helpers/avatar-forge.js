import { expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  closeRigPanelIfOpen,
  waitForUi,
} from './app.js';

export {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  closeRigPanelIfOpen,
  waitForUi,
} from './app.js';

export async function suppressKnownAvatarForgeWarnings(page) {
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

export async function openAvatarForge(page) {
  await page.evaluate(async () => {
    await window.openAvatarForge();
  });
  await expect(page.locator('#avatar-forge-modal')).toBeVisible();
}

export async function updateAvatarForgeRecipe(page, recipe) {
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

export async function confirmAvatarForge(page) {
  await page.locator('#avatar-forge-confirm-btn').click();
  await expect(page.locator('#avatar-forge-modal')).toBeHidden({ timeout: 30000 });
  await waitForUi(page, 450);
}

export async function selectAvatarGroup(page, label) {
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

export async function insertAvatarGroup(page, recipe) {
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

export async function sceneSummary(page) {
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

export async function waitForSceneObjectCount(page, expectedCount) {
  await expect.poll(async () => {
    return page.evaluate(() => {
      const state = window.__LOWPOLY64_STATE__;
      return state.userObjects.children.length;
    });
  }).toBe(expectedCount);
}

export async function collectAvatarCatalogSweepReport(page) {
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

export async function collectAccessoryAndPaletteAuditReport(page) {
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
