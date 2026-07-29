import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

function buildFastPoserSample(name = 'Animateur Walk Probe') {
  return {
    format: 'fast-poser-asset',
    version: 1,
    type: 'animation',
    name,
    playbackSpeed: 1,
    keyframes: [
      {
        time: 0,
        pose: {
          Hips_0: { position: [0, 2.55, 0], quaternion: [0.018, 0.707, 0.018, 0.707] },
          Spine_0: { position: [0, 0.2, 0], quaternion: [0.08, 0, 0, 0.997] },
          Head_0: { position: [0, 1.2, 0], quaternion: [-0.04, 0, 0, 0.999] },
          Left_Shoulder_0: { position: [0.42, 1.02, 0], quaternion: [0, 0, 0.04, 0.999] },
          Left_Upper_Arm_0: { position: [0.6, 1.1, 0], quaternion: [-0.2, 0, 0.08, 0.976] },
          Left_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.1, 0, 0, 0.995] },
          Right_Shoulder_0: { position: [-0.42, 1.02, 0], quaternion: [0, 0, -0.04, 0.999] },
          Right_Upper_Arm_0: { position: [-0.6, 1.1, 0], quaternion: [0.12, 0, -0.06, 0.991] },
          Right_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.16, 0, 0, 0.987] },
          Left_Upper_Leg_0: { position: [0.25, -0.2, 0], quaternion: [0.15, 0, 0, 0.989] },
          Left_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.08, 0, 0, 0.997] },
          Right_Upper_Leg_0: { position: [-0.25, -0.2, 0], quaternion: [-0.15, 0, 0, 0.989] },
          Right_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.22, 0, 0, 0.975] },
        },
      },
      {
        time: 0.5,
        pose: {
          Hips_0: { position: [0.35, 2.62, 0.2], quaternion: [0.018, 0.707, 0.018, 0.707] },
          Spine_0: { position: [0, 0.2, 0], quaternion: [0.18, 0, 0, 0.984] },
          Head_0: { position: [0, 1.2, 0], quaternion: [-0.08, 0, 0, 0.997] },
          Left_Shoulder_0: { position: [0.42, 1.02, 0], quaternion: [0, 0, 0.1, 0.995] },
          Left_Upper_Arm_0: { position: [0.6, 1.1, 0], quaternion: [-0.45, 0, 0.11, 0.886] },
          Left_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.24, 0, 0, 0.971] },
          Right_Shoulder_0: { position: [-0.42, 1.02, 0], quaternion: [0, 0, -0.1, 0.995] },
          Right_Upper_Arm_0: { position: [-0.6, 1.1, 0], quaternion: [0.36, 0, -0.08, 0.929] },
          Right_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.34, 0, 0, 0.94] },
          Left_Upper_Leg_0: { position: [0.25, -0.2, 0], quaternion: [0.42, 0, 0, 0.907] },
          Left_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.3, 0, 0, 0.954] },
          Right_Upper_Leg_0: { position: [-0.25, -0.2, 0], quaternion: [-0.42, 0, 0, 0.907] },
          Right_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.12, 0, 0, 0.993] },
        },
      },
      {
        time: 1,
        pose: {
          Hips_0: { position: [0, 2.55, 0], quaternion: [0.018, 0.707, 0.018, 0.707] },
          Spine_0: { position: [0, 0.2, 0], quaternion: [0.08, 0, 0, 0.997] },
          Head_0: { position: [0, 1.2, 0], quaternion: [-0.04, 0, 0, 0.999] },
          Left_Shoulder_0: { position: [0.42, 1.02, 0], quaternion: [0, 0, 0.04, 0.999] },
          Left_Upper_Arm_0: { position: [0.6, 1.1, 0], quaternion: [-0.2, 0, 0.08, 0.976] },
          Left_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.1, 0, 0, 0.995] },
          Right_Shoulder_0: { position: [-0.42, 1.02, 0], quaternion: [0, 0, -0.04, 0.999] },
          Right_Upper_Arm_0: { position: [-0.6, 1.1, 0], quaternion: [0.12, 0, -0.06, 0.991] },
          Right_Lower_Arm_0: { position: [0, -0.9, 0], quaternion: [0.16, 0, 0, 0.987] },
          Left_Upper_Leg_0: { position: [0.25, -0.2, 0], quaternion: [0.15, 0, 0, 0.989] },
          Left_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.08, 0, 0, 0.997] },
          Right_Upper_Leg_0: { position: [-0.25, -0.2, 0], quaternion: [-0.15, 0, 0, 0.989] },
          Right_Lower_Leg_0: { position: [0, -1.1, 0], quaternion: [0.22, 0, 0, 0.975] },
        },
      },
    ],
  };
}

async function selectGroupByTemplateId(page, templateId) {
  await page.evaluate(async (id) => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ deselectAll, selectMesh }] = await Promise.all([
      import('/src/modules/viewport/selection.js'),
    ]);
    const group = state.userObjects.children.find((child) => child.userData?.templateId === id);
    if (!group) {
      throw new Error(`Template group not found: ${id}`);
    }
    deselectAll();
    selectMesh(group);
  }, templateId);
  await waitForUi(page, 150);
}

async function importFastPoserAsset(page, templateId, asset) {
  return page.evaluate(async ({ id, sourceAsset }) => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ detectFormat }, { importAnimationDataToGroup }] = await Promise.all([
      import('/src/modules/viewport/character-model.js'),
      import('/src/modules/animation/animation-import.js'),
    ]);

    const group = state.userObjects.children.find((child) => child.userData?.templateId === id);
    if (!group) {
      throw new Error(`Template group not found: ${id}`);
    }

    const format = detectFormat(sourceAsset);
    const result = importAnimationDataToGroup(sourceAsset, group);
    const imported = group.userData?.animations?.[group.userData.animations.length - 1] || null;
    return {
      format,
      result,
      groupName: group.userData?.name || group.name || 'GROUP',
      imported: imported
        ? {
            name: imported.name,
            duration: imported.duration,
            trackCount: imported.tracks.length,
            targets: imported.tracks.map((track) => track.target),
          }
        : null,
      clipCount: group.userData?.animationClips?.length || 0,
    };
  }, { id: templateId, sourceAsset: asset });
}

test('keeps standard humanoid aliases compatible with legacy slot maps', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  const result = await page.evaluate(async () => {
    const [{ getSkeletonById }, { buildBoneToTargetMap }] = await Promise.all([
      import('/src/modules/animation/skeleton-registry.js'),
      import('/src/modules/animation/mesh-animation-translation.js'),
    ]);

    const standard = getSkeletonById('HUMANOID_STANDARD');
    const legacy = getSkeletonById('HUMANOID_DEFAULT');
    const group = { userData: { name: 'Alias Probe', archetype: 'HUMANOID' } };
    const legacySlotMap = {
      TORSO: ['PELVIS', 'CHEST', 'NECK'],
      ARM_L: ['CLAVICLE_L', 'LEFT_ARM_UPPER', 'LEFT_ARM_LOWER', 'LEFT_HAND'],
      ARM_R: ['CLAVICLE_R', 'RIGHT_ARM_UPPER', 'RIGHT_ARM_LOWER', 'RIGHT_HAND'],
      LEG_L: ['LEFT_LEG_THIGH', 'LEFT_LEG_SHIN', 'LEFT_FOOT'],
      LEG_R: ['RIGHT_LEG_THIGH', 'RIGHT_LEG_SHIN', 'RIGHT_FOOT'],
      HEAD: ['HEAD'],
    };
    const standardSlotMap = {
      TORSO: ['Hips', 'Spine', 'Neck'],
      ARM_L: ['Left_Shoulder', 'Left_Upper_Arm', 'Left_Lower_Arm', 'Left_Hand'],
      ARM_R: ['Right_Shoulder', 'Right_Upper_Arm', 'Right_Lower_Arm', 'Right_Hand'],
      LEG_L: ['Left_Upper_Leg', 'Left_Lower_Leg', 'Left_Foot'],
      LEG_R: ['Right_Upper_Leg', 'Right_Lower_Leg', 'Right_Foot'],
      HEAD: ['Head'],
    };

    return {
      standardBoneNames: standard?.bones?.map((bone) => bone.name) || [],
      standardBoneCount: standard?.bones?.length || 0,
      standardHeadParent: standard?.bones?.find((bone) => bone.name === 'Head')?.parent || null,
      standardBindings: standard?.defaultBindings || {},
      captureLoaded: !!getSkeletonById('HUMANOID_CAPTURE'),
      defaultLoaded: !!legacy,
      standardToLegacy: buildBoneToTargetMap(group, legacySlotMap, standard?.defaultBindings || {}),
      legacyToStandard: buildBoneToTargetMap(group, standardSlotMap, legacy?.defaultBindings || {}),
    };
  });

  expect(result.standardBoneCount).toBe(18);
  expect(result.standardBoneNames).toEqual(expect.arrayContaining([
    'Hips',
    'Spine',
    'Left_Shoulder',
    'Left_Upper_Arm',
    'Right_Upper_Leg',
  ]));
  expect(result.standardHeadParent).toBe('Neck');
  expect(result.standardBindings.HEAD).toEqual(expect.arrayContaining(['Head']));
  expect(result.captureLoaded).toBe(true);
  expect(result.defaultLoaded).toBe(true);
  expect(result.standardToLegacy.Hips).toBe('PELVIS');
  expect(result.standardToLegacy.Left_Shoulder).toBe('CLAVICLE_L');
  expect(result.standardToLegacy.Left_Upper_Arm).toBe('LEFT_ARM_UPPER');
  expect(result.legacyToStandard.PELVIS).toBe('Hips');
  expect(result.legacyToStandard.CHEST).toBe('Spine');
  expect(result.legacyToStandard.CLAVICLE_R).toBe('Right_Shoulder');
  expect(result.legacyToStandard.ARM_R_UPPER).toBe('Right_Upper_Arm');

  await assertNoPageErrors(page);
});

test('reports unmapped and partial Fast Poser animation imports', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  const result = await page.evaluate(async (asset) => {
    const { importAnimationDataToGroup } = await import('/src/modules/animation/animation-import.js');

    const emptyGroup = {
      name: 'EmptyProbe',
      userData: { name: 'EmptyProbe' },
      traverse(callback) {
        callback(this);
      },
    };
    const emptyImport = importAnimationDataToGroup(asset, emptyGroup);

    const hips = { name: 'Hips', userData: { name: 'Hips' } };
    const partialGroup = {
      name: 'PartialProbe',
      userData: { name: 'PartialProbe' },
      traverse(callback) {
        callback(this);
        callback(hips);
      },
    };
    const partialImport = importAnimationDataToGroup(asset, partialGroup);

    return {
      emptyImport,
      partialImport,
      partialTargets: partialGroup.userData?.animations?.[0]?.tracks?.map((track) => track.target) || [],
    };
  }, buildFastPoserSample('Compatibility State Probe'));

  expect(result.emptyImport.success).toBe(false);
  expect(result.emptyImport.error).toMatch(/No compatible humanoid tracks/);
  expect(result.partialImport.success).toBe(true);
  expect(result.partialImport.warnings?.[0]).toMatch(/partial humanoid animation/i);
  expect(result.partialTargets).toEqual(expect.arrayContaining(['PartialProbe', 'Hips']));

  await assertNoPageErrors(page);
});

test('imports Fast Poser animation assets into skeleton and star_ranger humanoids', async ({ page }) => {
  await test.step('bootstrap the editor', async () => {
    await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });
  });

  await test.step('add both humanoid templates', async () => {
    await addTemplate(page, 'skeleton');
    await addTemplate(page, 'star_ranger');
  });

  const skeletonResult = await test.step('import the skeleton animation', async () => {
    await selectGroupByTemplateId(page, 'skeleton');
    return importFastPoserAsset(page, 'skeleton', buildFastPoserSample('Skeleton Animateur Probe'));
  });
  expect(skeletonResult.format).toBe('animation');
  expect(skeletonResult.result.success).toBe(true);
  expect(skeletonResult.imported?.trackCount).toBeGreaterThanOrEqual(10);
  expect(skeletonResult.imported?.targets).toEqual(expect.arrayContaining([
    skeletonResult.groupName,
    'PELVIS',
    'CHEST',
    'NECK',
    'CLAVICLE_L',
  ]));
  expect(skeletonResult.imported?.targets?.some((target) => ['HAND_L', 'LEFT_HAND', 'HAND_LEFT'].includes(target))).toBe(true);
  expect(skeletonResult.imported?.targets?.some((target) => ['FOOT_R', 'RIGHT_FOOT', 'RIGHT_BOOT', 'RIGHT_SHOE'].includes(target))).toBe(true);
  expect(skeletonResult.clipCount).toBeGreaterThan(0);

  const rangerResult = await test.step('import the star_ranger animation', async () => {
    await selectGroupByTemplateId(page, 'star_ranger');
    return importFastPoserAsset(page, 'star_ranger', buildFastPoserSample('Ranger Animateur Probe'));
  });
  expect(rangerResult.format).toBe('animation');
  expect(rangerResult.result.success).toBe(true);
  expect(rangerResult.imported?.trackCount).toBeGreaterThanOrEqual(10);
  expect(rangerResult.imported?.targets).toEqual(expect.arrayContaining([
    rangerResult.groupName,
    'PELVIS',
    'CHEST',
    'NECK',
    'CLAVICLE_L',
  ]));
  expect(rangerResult.imported?.targets?.some((target) => ['HAND_R', 'RIGHT_HAND', 'HAND_RIGHT'].includes(target))).toBe(true);
  expect(rangerResult.imported?.targets?.some((target) => ['FOOT_L', 'LEFT_FOOT', 'LEFT_BOOT', 'LEFT_SHOE'].includes(target))).toBe(true);
  expect(rangerResult.clipCount).toBeGreaterThan(0);

  await assertNoPageErrors(page);
});

test('round-trips imported animations back to Fast Poser assets', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  await addTemplate(page, 'skeleton');
  await addTemplate(page, 'hero');

  const exported = await page.evaluate(async (sourceAsset) => {
    const state = window.__LOWPOLY64_STATE__;
    const [{ importAnimationDataToGroup }, animateurTools] = await Promise.all([
      import('/src/modules/animation/animation-import.js'),
      import('/src/modules/animation/animateur-animation-import.js'),
    ]);

    const skeleton = state.userObjects.children.find((child) => child.userData?.templateId === 'skeleton');
    const hero = state.userObjects.children.find((child) => child.userData?.templateId === 'hero');
    if (!skeleton || !hero) {
      throw new Error('Required humanoid templates were not found');
    }

    const imported = importAnimationDataToGroup(sourceAsset, skeleton);
    if (!imported.success) {
      throw new Error(imported.error || 'Import failed');
    }

    const animationDef = skeleton.userData.animations[skeleton.userData.animations.length - 1];
    const exportedAsset = animateurTools.convertAnimationDefinitionToFastPoserAsset(animationDef, skeleton);
    if (!exportedAsset.success) {
      throw new Error(exportedAsset.error || 'Export failed');
    }

    const roundTrip = importAnimationDataToGroup(exportedAsset.data, hero);
    return {
      exported: {
        format: exportedAsset.data.format,
        type: exportedAsset.data.type,
        keyframeCount: exportedAsset.data.keyframes.length,
        firstPoseKeys: Object.keys(exportedAsset.data.keyframes[0]?.pose || {}),
        secondHipPosition: exportedAsset.data.keyframes[1]?.pose?.Hips_0?.position || null,
      },
      roundTrip,
      heroAnimationCount: hero.userData?.animations?.length || 0,
      heroLastTargets: hero.userData?.animations?.[hero.userData.animations.length - 1]?.tracks?.map((track) => track.target) || [],
    };
  }, buildFastPoserSample('Round Trip Probe'));

  expect(exported.exported.format).toBe('fast-poser-asset');
  expect(exported.exported.type).toBe('animation');
  expect(exported.exported.keyframeCount).toBe(3);
  expect(exported.exported.firstPoseKeys).toEqual(expect.arrayContaining([
    'Hips_0',
    'Spine_0',
    'Head_0',
    'Left_Shoulder_0',
    'Left_Upper_Arm_0',
    'Right_Upper_Leg_0',
  ]));
  expect(exported.exported.secondHipPosition).toHaveLength(3);
  expect(exported.roundTrip.success).toBe(true);
  expect(exported.heroAnimationCount).toBeGreaterThan(0);
  expect(exported.heroLastTargets).toEqual(expect.arrayContaining([
    'PELVIS',
    'CHEST',
    'NECK',
  ]));

  await assertNoPageErrors(page);
});
