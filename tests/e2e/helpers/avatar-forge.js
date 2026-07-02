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
        AVATAR_HEAD_MOLDS,
        AVATAR_HAIR_PRESETS,
        AVATAR_EYE_PRESETS,
        AVATAR_BROW_PRESETS,
        AVATAR_MOUTH_PRESETS,
      },
      { AVATAR_HEAD_MESH_MAP },
      { compileAvatarHeadSvg },
      { buildFaceDecalPart },
      { createMoldAvatarRecipe, resolveAvatarRecipe },
    ] = await Promise.all([
      import('/src/data/avatar/catalog.js'),
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/modules/avatar/avatar-head-svg.js'),
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const molds = AVATAR_HEAD_MOLDS;
    const hairs = AVATAR_HAIR_PRESETS.filter((entry) => entry.id !== 'none_01');
    const eyes = AVATAR_EYE_PRESETS.filter((entry) => entry.id !== 'none_01');
    const brows = AVATAR_BROW_PRESETS.filter((entry) => entry.id !== 'none_01');
    const mouths = AVATAR_MOUTH_PRESETS.filter((entry) => entry.id !== 'none_01');
    const failures = [];

    const thresholds = {
      hair: Object.freeze({
        centerAbsMax: 0.1,
        widthMin: 0.16,
        widthMax: 0.95,
        topMin: -0.06,
        topMax: 0.24,
        bottomMin: 0.25,
        bottomMax: 1.05,
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
        widthMin: 0.035,
        widthMax: 0.43,
        topMin: 0.46,
        topMax: 0.88,
        bottomMin: 0.52,
        bottomMax: 0.94,
      }),
      face: Object.freeze({
        browEyeGapMin: -0.02,
        eyeMouthGapMin: 0.05,
      }),
    };

    function pushFailure(section, moldId, presetId, metric, value, details = {}) {
      failures.push({
        section,
        moldId,
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
      host.innerHTML = compileAvatarHeadSvg(createMoldAvatarRecipe({
        label: 'Audit Probe',
        accessoryIds: ['none'],
        ...recipe,
      }));
      document.body.appendChild(host);

      const svg = host.querySelector('svg');
      const result = {
        head: buildSelectorBox(svg, '#HEAD_BASE'),
        hair: buildSelectorBox(svg, '[data-rv-role="hair"], [data-rv-role="hair_back"]'),
        nose: buildSelectorBox(svg, '[data-rv-role="nose"]'),
      };

      host.remove();
      return result;
    }

    function layerBox(layer) {
      if (!layer) return null;
      return {
        x: (layer.x || 0) - ((layer.w || 0) / 2),
        y: (layer.y || 0) - ((layer.h || 0) / 2),
        width: layer.w || 0,
        height: layer.h || 0,
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

    function measureFaceRecipe(recipe) {
      const resolved = resolveAvatarRecipe(createMoldAvatarRecipe({
        label: 'Audit Probe',
        accessoryIds: ['none'],
        ...recipe,
      }));
      const meshId = resolved.headMold?.headMeshId || resolved.headMold?.id || '';
      const faceDecalPart = buildFaceDecalPart(resolved, AVATAR_HEAD_MESH_MAP[meshId] || null);
      const faceDecalSpec = faceDecalPart?.decal || null;
      const layers = faceDecalSpec?.layers || [];
      return {
        head: { x: 0, y: 0, width: 1, height: 1 },
        eyes: unionBoxes(layers.filter((layer) => layer.kind === 'eye').map(layerBox)),
        brows: unionBoxes(layers.filter((layer) => layer.kind === 'brow').map(layerBox)),
        mouth: unionBoxes(layers.filter((layer) => layer.kind === 'mouth').map(layerBox)),
      };
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

    function checkRange(section, moldId, presetId, metric, value, min, max) {
      if (value < min || value > max) {
        pushFailure(section, moldId, presetId, metric, value, {
          min: Number(min.toFixed(4)),
          max: Number(max.toFixed(4)),
        });
      }
    }

    for (const mold of molds) {
      hairs.forEach((hair) => {
        const metrics = measureRecipe({
          headMoldId: mold.id,
          features: {
            hair: { presetId: hair.id },
            eyes: { presetId: 'none_01' },
            brows: { presetId: 'none_01' },
            mouth: { presetId: 'none_01' },
          },
        });
        const center = Math.abs(centerDeltaRatio(metrics.hair, metrics.head));
        checkRange('hair', mold.id, hair.id, 'centerAbs', center, 0, thresholds.hair.centerAbsMax);
        checkRange('hair', mold.id, hair.id, 'widthRatio', widthRatio(metrics.hair, metrics.head), thresholds.hair.widthMin, thresholds.hair.widthMax);
        checkRange('hair', mold.id, hair.id, 'topRatio', topRatio(metrics.hair, metrics.head), thresholds.hair.topMin, thresholds.hair.topMax);
        checkRange('hair', mold.id, hair.id, 'bottomRatio', bottomRatio(metrics.hair, metrics.head), thresholds.hair.bottomMin, thresholds.hair.bottomMax);
      });

      for (const eye of eyes) {
        const metrics = measureFaceRecipe({
          headMoldId: mold.id,
          features: {
            hair: { presetId: 'none_01' },
            eyes: { presetId: eye.id },
            brows: { presetId: 'soft_01' },
            mouth: { presetId: 'smile_01' },
          },
        });
        const center = Math.abs(centerDeltaRatio(metrics.eyes, metrics.head));
        checkRange('eyes', mold.id, eye.id, 'centerAbs', center, 0, 0.12);
        checkRange('eyes', mold.id, eye.id, 'widthRatio', widthRatio(metrics.eyes, metrics.head), 0.22, 0.72);
        checkRange('eyes', mold.id, eye.id, 'topRatio', topRatio(metrics.eyes, metrics.head), 0.05, 0.48);
        checkRange('eyes', mold.id, eye.id, 'bottomRatio', bottomRatio(metrics.eyes, metrics.head), 0.12, 0.58);
      }

      for (const brow of brows) {
        const metrics = measureFaceRecipe({
          headMoldId: mold.id,
          features: {
            hair: { presetId: 'none_01' },
            eyes: { presetId: 'wide_01' },
            brows: { presetId: brow.id },
            mouth: { presetId: 'smile_01' },
          },
        });
        const center = Math.abs(centerDeltaRatio(metrics.brows, metrics.head));
        checkRange('brows', mold.id, brow.id, 'centerAbs', center, 0, 0.12);
        checkRange('brows', mold.id, brow.id, 'widthRatio', widthRatio(metrics.brows, metrics.head), 0.2, 0.72);
        checkRange('brows', mold.id, brow.id, 'topRatio', topRatio(metrics.brows, metrics.head), 0.02, 0.38);
        checkRange('brows', mold.id, brow.id, 'bottomRatio', bottomRatio(metrics.brows, metrics.head), 0.06, 0.46);
      }

      for (const mouth of mouths) {
        const metrics = measureFaceRecipe({
          headMoldId: mold.id,
          features: {
            hair: { presetId: 'none_01' },
            eyes: { presetId: 'wide_01' },
            brows: { presetId: 'soft_01' },
            mouth: { presetId: mouth.id },
          },
        });
        const center = Math.abs(centerDeltaRatio(metrics.mouth, metrics.head));
        checkRange('mouth', mold.id, mouth.id, 'centerAbs', center, 0, 0.12);
        checkRange('mouth', mold.id, mouth.id, 'widthRatio', widthRatio(metrics.mouth, metrics.head), 0.06, 0.42);
        checkRange('mouth', mold.id, mouth.id, 'topRatio', topRatio(metrics.mouth, metrics.head), 0.48, 0.94);
        checkRange('mouth', mold.id, mouth.id, 'bottomRatio', bottomRatio(metrics.mouth, metrics.head), 0.5, 0.98);
      }
    }

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

    for (const mold of molds) {
      for (const bundle of faceBundles) {
        const metrics = measureFaceRecipe({
          headMoldId: mold.id,
          features: {
            hair: { presetId: 'none_01' },
            eyes: { presetId: bundle.eyePresetId },
            brows: { presetId: bundle.browPresetId },
            mouth: { presetId: bundle.mouthPresetId },
          },
        });

        const browEyeGapRatio = (metrics.eyes.y - (metrics.brows.y + metrics.brows.height)) / metrics.head.height;
        const eyeMouthGapRatio = (metrics.mouth.y - (metrics.eyes.y + metrics.eyes.height)) / metrics.head.height;

        if (browEyeGapRatio < thresholds.face.browEyeGapMin) {
          pushFailure('face', mold.id, bundle.id, 'browEyeGapRatio', browEyeGapRatio, {
            min: thresholds.face.browEyeGapMin,
          });
        }
        if (eyeMouthGapRatio < thresholds.face.eyeMouthGapMin) {
          pushFailure('face', mold.id, bundle.id, 'eyeMouthGapRatio', eyeMouthGapRatio, {
            min: thresholds.face.eyeMouthGapMin,
          });
        }
      }
    }

    return {
      counts: {
        molds: molds.length,
        hairCombos: molds.length * hairs.length,
        eyeCombos: molds.length * eyes.length,
        browCombos: molds.length * brows.length,
        mouthCombos: molds.length * mouths.length,
        faceBundles: molds.length * faceBundles.length,
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
      { createMoldAvatarRecipe },
    ] = await Promise.all([
      import('/src/data/avatar/catalog.js'),
      import('/src/modules/avatar/avatar-head-svg.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const representativeMolds = [
      { headMoldId: 'psx_mesh_portrait_01', hairPresetId: 'side_part_01' },
      { headMoldId: 'psx_mesh_portrait_cabezon_175', hairPresetId: 'n64_round_bangs_01' },
      { headMoldId: 'psx_mesh_portrait_duro_175', hairPresetId: 'bridge_bowl_01' },
      { headMoldId: 'psx_mesh_portrait_gordo_175', hairPresetId: 'psx_slick_back_01' },
      { headMoldId: 'psx_mesh_portrait_gordo_275', hairPresetId: 'bridge_low_pony_01' },
    ];
    const accessoryRules = {
      ribbon_blue: { centerAbsMax: 0.08, topMin: 0.02, topMax: 0.18, bottomMin: 0.14, bottomMax: 0.3, widthMin: 0.06, widthMax: 0.45 },
      round_glasses: { centerAbsMax: 0.08, topMin: 0.32, topMax: 0.46, bottomMin: 0.46, bottomMax: 0.6, widthMin: 0.12, widthMax: 0.65 },
      star_clip: { centerMin: 0.18, centerMax: 0.4, topMin: 0.08, topMax: 0.22, bottomMin: 0.2, bottomMax: 0.4, widthMin: 0.018, widthMax: 0.34 },
      psx_square_glasses_01: { centerAbsMax: 0.08, topMin: 0.34, topMax: 0.48, bottomMin: 0.46, bottomMax: 0.64, widthMin: 0.12, widthMax: 0.76 },
      psx_visor_strip_01: { centerAbsMax: 0.06, topMin: 0.26, topMax: 0.42, bottomMin: 0.31, bottomMax: 0.54, widthMin: 0.13, widthMax: 0.72 },
      psx_bandana_knot_01: { centerAbsMax: 0.08, topMin: 0.08, topMax: 0.24, bottomMin: 0.25, bottomMax: 0.48, widthMin: 0.15, widthMax: 0.82 },
      psx_eyepatch_01: { centerAbsMax: 0.13, topMin: 0.32, topMax: 0.46, bottomMin: 0.44, bottomMax: 0.6, widthMin: 0.13, widthMax: 0.9 },
      n64_headband_sport_01: { centerAbsMax: 0.06, topMin: 0.08, topMax: 0.24, bottomMin: 0.18, bottomMax: 0.4, widthMin: 0.13, widthMax: 0.72 },
      n64_goggles_up_01: { centerAbsMax: 0.06, topMin: 0.14, topMax: 0.3, bottomMin: 0.23, bottomMax: 0.44, widthMin: 0.14, widthMax: 0.82 },
      n64_flower_pin_01: { centerMin: 0.18, centerMax: 0.4, topMin: 0.08, topMax: 0.22, bottomMin: 0.21, bottomMax: 0.38, widthMin: 0.02, widthMax: 0.3 },
      n64_leaf_clip_01: { centerMin: 0.18, centerMax: 0.4, topMin: 0.1, topMax: 0.24, bottomMin: 0.21, bottomMax: 0.42, widthMin: 0.018, widthMax: 0.3 },
      bridge_hairpin_duo_01: { centerMin: 0.18, centerMax: 0.4, topMin: 0.12, topMax: 0.28, bottomMin: 0.21, bottomMax: 0.4, widthMin: 0.02, widthMax: 0.34 },
      bridge_tiny_horns_01: { centerAbsMax: 0.08, topMin: 0.02, topMax: 0.18, bottomMin: 0.16, bottomMax: 0.3, widthMin: 0.055, widthMax: 0.45 },
      bridge_jewel_circlet_01: { centerAbsMax: 0.06, topMin: 0.12, topMax: 0.24, bottomMin: 0.2, bottomMax: 0.34, widthMin: 0.115, widthMax: 0.56 },
      bridge_mono_earring_01: { centerMin: 0.18, centerMax: 0.6, topMin: 0.62, topMax: 0.66, bottomMin: 0.64, bottomMax: 0.7, widthMin: 0.012, widthMax: 0.3 },
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
      host.innerHTML = compileAvatarHeadSvg(createMoldAvatarRecipe({
        label: 'Audit Probe',
        features: {
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          mouth: { presetId: 'smile_01' },
        },
        ...recipe,
      }));
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
    representativeMolds.forEach((moldRecipe) => {
      accessories.forEach((accessory) => {
        const metrics = measureRecipe({
          headMoldId: moldRecipe.headMoldId,
          features: { hair: { presetId: moldRecipe.hairPresetId } },
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
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'centerAbs', value: Number(centerAbs.toFixed(4)) });
        }
        if (rule.centerMin !== undefined && centerDeltaRatio < rule.centerMin) {
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'centerMin', value: Number(centerDeltaRatio.toFixed(4)) });
        }
        if (rule.centerMax !== undefined && centerDeltaRatio > rule.centerMax) {
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'centerMax', value: Number(centerDeltaRatio.toFixed(4)) });
        }
        if (topRatio < rule.topMin || topRatio > rule.topMax) {
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'topRatio', value: Number(topRatio.toFixed(4)) });
        }
        if (bottomRatio < rule.bottomMin || bottomRatio > rule.bottomMax) {
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'bottomRatio', value: Number(bottomRatio.toFixed(4)) });
        }
        if (widthRatio < rule.widthMin || widthRatio > rule.widthMax) {
          accessoryFailures.push({ headMoldId: moldRecipe.headMoldId, accessoryId: accessory.id, metric: 'widthRatio', value: Number(widthRatio.toFixed(4)) });
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
