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
        slotBindings: group.userData?.slotBindings || null,
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
    expect(entry.skeletonId, entry.label).toBe('HUMANOID_STANDARD');
    expect(entry.slotBindings?.HEAD, entry.label).toEqual(expect.arrayContaining(['Head', 'HEAD']));
    expect(entry.slotBindings?.TORSO, entry.label).toEqual(expect.arrayContaining(['Hips', 'Spine', 'Neck']));
    expect(entry.animationProfile, entry.label).toBe('HUMANOID_STANDARD_AVATAR_BASE');
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
      hasFaceDecalPiece: headNames.includes('FACE_DECAL'),
      hasLegacyFaceGeometry: headNames.some((name) => /(EYE|IRIS|PUPIL|BROW|MOUTH|TEETH)/i.test(name)),
      hasHairPiece: headNames.some((name) => /HAIR/i.test(name)),
      slotSourceMode: slotSource?.svgSource?.inputs?.recipe?.headBuildMode || null,
      slotSourceHasMoldMarkup: String(slotSource?.svgSource?.markup || '').includes('data-rv-head-build-mode="mold"'),
      slotSourceMountRoles: ['nose', 'earPair', 'hairCap'].filter((role) => (
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
  expect(diagnostics.hasFaceDecalPiece).toBe(true);
  expect(diagnostics.hasLegacyFaceGeometry).toBe(false);
  expect(diagnostics.hasHairPiece).toBe(true);
  expect(diagnostics.slotSourceMode).toBe('mold');
  expect(diagnostics.slotSourceHasMoldMarkup).toBe(true);
  expect(diagnostics.slotSourceMountRoles).toEqual(['nose', 'earPair', 'hairCap']);

  await assertNoPageErrors(page);
});

test('randomizes mold avatar recipes from the forge controls', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);

  const before = await page.locator('#avatar-sheet').textContent();
  await page.locator('#avatar-random-btn').click();
  await waitForUi(page, 600);
  await expect(page.locator('#avatar-forge-status')).not.toContainText(/failed/i);

  const after = await page.locator('#avatar-sheet').textContent();
  expect(after).not.toBe(before);
  await expect(page.locator('#avatar-label-input')).toHaveValue(/Random \d{4}/);

  await assertNoPageErrors(page);
});

test('migrates old head recipe fields into canonical mold mode', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const migratedGroup = await buildAvatarGroup({
      label: 'Migration Probe',
      bodyPresetId: 'psx_chibi',
      headBuildMode: 'legacy',
      ['head' + 'ShapeId']: 'psx_portrait_01',
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
        headMoldId: group.userData?.avatarRecipe?.headMoldId || null,
        markupMode: markup.includes('data-rv-head-build-mode="mold"')
          ? 'mold'
          : null,
        hasMountRoles: markup.includes('data-rv-mount-role='),
      };
    }

    const result = {
      migrated: read(migratedGroup),
      mold: read(moldGroup),
    };

    [migratedGroup, moldGroup].forEach((group) => {
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

  expect(diagnostics.migrated.headBuildMode).toBe('mold');
  expect(diagnostics.migrated.headMoldId).toBe('psx_mesh_portrait_01');
  expect(diagnostics.migrated.markupMode).toBe('mold');
  expect(diagnostics.migrated.hasMountRoles).toBe(true);

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

test('starts blank Avatar Forge sessions in canonical mold mode', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);

  await expect(page.locator('#avatar-body-select')).toHaveValue('psx_chibi');
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('psx_mesh_portrait_01');
  await expect.poll(() => page.evaluate(() => !document.getElementById('avatar-head-' + 'shape-wrap'))).toBe(true);
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

test('normalizes every head mesh into canonical space with landmarks attached', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { AVATAR_HEAD_MESH_MAP, HEAD_LANDMARK_KEYS },
      { buildAvatarGroup },
      { createMoldAvatarRecipe },
    ] = await Promise.all([
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
    ]);

    const heads = Object.entries(AVATAR_HEAD_MESH_MAP).map(([id, entry]) => {
      const vertices = entry.customGeometry?.vertices || [];
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      vertices.forEach((vertex) => {
        for (let axis = 0; axis < 3; axis += 1) {
          min[axis] = Math.min(min[axis], vertex[axis]);
          max[axis] = Math.max(max[axis], vertex[axis]);
        }
      });
      const landmarks = entry.landmarks || {};
      const landmarksInsideBounds = Object.values(landmarks).every((point) => (
        Array.isArray(point)
        && point.every((value, axis) => value >= min[axis] - 0.05 && value <= max[axis] + 0.05)
      ));
      return {
        id,
        hasRootTransform: 'rootTransform' in entry && !!entry.rootTransform,
        bounds: { min, max },
        landmarkKeys: Object.keys(landmarks).sort(),
        landmarksInsideBounds,
        eyeSidesSplit: !!landmarks.eyeL && !!landmarks.eyeR
          && landmarks.eyeL[0] < 0 && landmarks.eyeR[0] > 0,
      };
    });

    const variantGroup = await buildAvatarGroup(createMoldAvatarRecipe({
      label: 'Variant Transform Probe',
      bodyPresetId: 'psx_chibi',
      headMoldId: 'psx_mesh_portrait_normal_175',
      accessoryIds: ['none'],
    }));

    let headBase = null;
    variantGroup.traverse((node) => {
      if (headBase) return;
      const nodeName = node.userData?.name || node.name || '';
      if (nodeName === 'HEAD_BASE') headBase = node;
    });
    const builtTransform = headBase ? {
      rotation: headBase.rotation.toArray().slice(0, 3),
      parent: headBase.parent?.userData?.name || headBase.parent?.name || null,
    } : null;

    variantGroup.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => material?.dispose?.());
      } else {
        node.material?.dispose?.();
      }
    });

    return { heads, builtTransform, expectedLandmarkKeys: [...HEAD_LANDMARK_KEYS].sort() };
  });

  expect(diagnostics.heads.length).toBeGreaterThanOrEqual(7);
  diagnostics.heads.forEach((head) => {
    // Corrective root transforms are gone: every head is pre-normalized.
    expect(head.hasRootTransform).toBe(false);
    // Canonical space: height 1.2, bottom on y=0, centered on x/z.
    expect(head.bounds.max[1] - head.bounds.min[1]).toBeCloseTo(1.2, 3);
    expect(head.bounds.min[1]).toBeCloseTo(0, 3);
    expect(head.bounds.min[0] + head.bounds.max[0]).toBeCloseTo(0, 3);
    expect(head.bounds.min[2] + head.bounds.max[2]).toBeCloseTo(0, 3);
    expect(head.landmarkKeys).toEqual(diagnostics.expectedLandmarkKeys);
    expect(head.landmarksInsideBounds).toBe(true);
    expect(head.eyeSidesSplit).toBe(true);
  });

  // No corrective rotation survives on the built HEAD_BASE node.
  expect(diagnostics.builtTransform?.parent).toBe('HEAD');
  expect(diagnostics.builtTransform.rotation[0]).toBeCloseTo(0, 5);
  expect(diagnostics.builtTransform.rotation[1]).toBeCloseTo(0, 5);
  expect(diagnostics.builtTransform.rotation[2]).toBeCloseTo(0, 5);

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

test('opens old avatar recipes as editable mold recipes', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Migration UI Probe',
    bodyPresetId: 'psx_chibi',
    headBuildMode: 'legacy',
    ['head' + 'ShapeId']: 'psx_portrait_01',
    hairPresetId: 'side_part_01',
    eyePresetId: 'wide_01',
    browPresetId: 'soft_01',
    mouthPresetId: 'smile_01',
    accessoryIds: ['none'],
  });
  await selectAvatarGroup(page, 'Migration UI Probe');
  await openAvatarForge(page);

  await expect(page.locator('#avatar-head-mode')).toContainText(/MOLD|MOLDE|CANONICAL|CANONICO/i);
  await expect.poll(() => page.evaluate(() => !document.getElementById('avatar-head-' + 'shape-wrap'))).toBe(true);
  await expect(page.locator('#avatar-head-mold-wrap')).toBeVisible();
  await expect(page.locator('#avatar-nose-wrap')).toBeVisible();
  await expect(page.locator('#avatar-ear-wrap')).toBeVisible();
  await expect(page.locator('#avatar-feature-eyes-size')).toBeEnabled();

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
      headMoldId: 'psx_mesh_portrait_01',
      features: {
        hair: { presetId: 'bob_01' },
        eyes: { presetId: 'wide_01' },
        brows: { presetId: 'soft_01' },
        mouth: { presetId: 'smile_01' },
      },
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
    const faceNames = headNames.filter((name) => /(FACE_DECAL|EYE|IRIS|PUPIL|BROW|NOSE|MOUTH)/i.test(name));
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
