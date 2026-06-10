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
