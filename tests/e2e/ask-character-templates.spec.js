import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
} from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('registers ask-character cold-test templates as animatable standard characters', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { state },
      { TEMPLATE_REGISTRY },
      { instantiateTemplateDefinition },
      { getSkeletonById },
      { buildBoneToTargetMap, translateAnimForMesh },
      { compileAnimation, playAnimation, stopAnimation },
    ] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
      import('/src/modules/animation/skeleton-registry.js'),
      import('/src/modules/animation/mesh-animation-translation.js'),
      import('/src/modules/animation/animation.js'),
    ]);

    function findNode(group, name) {
      let match = null;
      group.traverse((node) => {
        if (!match && (node.userData?.name === name || node.name === name)) {
          match = node;
        }
      });
      return match;
    }

    const standard = getSkeletonById('HUMANOID_STANDARD');
    const legacy = getSkeletonById('HUMANOID_DEFAULT');
    const legacyWalk = legacy?.animations?.find((entry) => entry.name === 'walk');
    const results = [];

    for (const id of ['n64_simple_villager_cm', 'psx_slim_guard_cm']) {
      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === id);
      if (!def) {
        results.push({ id, found: false });
        continue;
      }

      const group = instantiateTemplateDefinition(def);
      group.userData.name = def.name;
      group.name = def.name;

      for (const child of [...state.userObjects.children]) {
        state.userObjects.remove(child);
      }
      state.userObjects.add(group);
      group.updateWorldMatrix(true, true);

      const boneMap = buildBoneToTargetMap(
        group,
        group.userData.slotMap,
        group.userData.slotBindings || standard?.defaultBindings || {},
      );
      const translatedWalk = translateAnimForMesh(legacyWalk, group, boneMap);
      const walkClip = translatedWalk ? compileAnimation(translatedWalk, group) : null;
      const arm = findNode(group, 'ARM_L_UPPER');
      const beforeArmRotation = arm?.rotation?.x || 0;
      let afterArmRotation = beforeArmRotation;

      if (walkClip) {
        group.userData.animationClips = [walkClip];
        playAnimation(group, 0);
        state.animationMixer?.setTime?.(0.5);
        afterArmRotation = arm?.rotation?.x || 0;
        stopAnimation();
      }

      results.push({
        id,
        found: true,
        category: def.category,
        assetRole: def.assetRole,
        skeletonId: group.userData.skeletonId,
        humanoidRigMode: group.userData.humanoidRigMode,
        slotMap: group.userData.slotMap,
        slotBindings: group.userData.slotBindings,
        translatedTargets: translatedWalk?.tracks?.map((track) => track.target) || [],
        clipTrackCount: walkClip?.tracks?.length || 0,
        armRotationDelta: Math.abs(afterArmRotation - beforeArmRotation),
      });
    }

    return results;
  });

  expect(diagnostics).toHaveLength(2);
  for (const result of diagnostics) {
    expect(result.found, result.id).toBe(true);
    expect(result.assetRole, result.id).toBe('characterModel');
    expect(result.skeletonId, result.id).toBe('HUMANOID_STANDARD');
    expect(result.slotMap.HEAD, result.id).toEqual(expect.arrayContaining(['HEAD', 'FACE_DECAL']));
    expect(result.slotMap.TORSO, result.id).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK']));
    expect(result.slotBindings.ARM_L, result.id).toEqual(expect.arrayContaining(['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L']));
    expect(result.translatedTargets, result.id).toEqual(expect.arrayContaining(['ARM_L_UPPER', 'ARM_R_UPPER', 'LEG_L_UPPER', 'LEG_R_UPPER']));
    expect(result.clipTrackCount, result.id).toBeGreaterThan(0);
    expect(result.armRotationDelta, result.id).toBeGreaterThan(0.05);
  }
  expect(diagnostics.map((entry) => entry.category).sort()).toEqual(['N64', 'PSX']);

  await assertNoPageErrors(page);
});
