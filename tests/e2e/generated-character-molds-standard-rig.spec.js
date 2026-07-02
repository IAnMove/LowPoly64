import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
} from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('emits generated character molds as complete HUMANOID_STANDARD rigs', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const diagnostics = await page.evaluate(async () => {
    const [
      { GENERATED_CHARACTER_MOLDS },
      { TEMPLATE_REGISTRY },
      { instantiateTemplateDefinition },
      { getSkeletonById },
      { buildBoneToTargetMap, translateAnimForMesh },
      { resolveImportEligibility },
    ] = await Promise.all([
      import('/src/data/templates/generated-character-molds.js'),
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
      import('/src/modules/animation/skeleton-registry.js'),
      import('/src/modules/animation/mesh-animation-translation.js'),
      import('/src/modules/animation/motion-ripper-target-config.js'),
    ]);

    const standard = getSkeletonById('HUMANOID_STANDARD');
    const standardWalk = standard?.animations?.find((entry) => entry.name === 'walk') || null;
    const parentByBone = Object.fromEntries((standard?.bones || []).map((bone) => [bone.name, bone.parent || null]));

    function findNode(group, name) {
      let match = null;
      group.traverse((node) => {
        if (match) return;
        const nodeName = String(node.userData?.name || node.name || '').trim();
        if (nodeName === name) match = node;
      });
      return match;
    }

    function namedParent(group, node) {
      const parent = node?.parent || null;
      if (!parent || parent === group) return null;
      return String(parent.userData?.name || parent.name || '').trim() || null;
    }

    function worldPosition(node) {
      node.updateWorldMatrix(true, false);
      const e = node.matrixWorld.elements;
      return { x: e[12], y: e[13], z: e[14] };
    }

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

    function meshBoundsForName(group, name) {
      const box = emptyBox();
      let found = false;
      group.traverse((node) => {
        const parentName = String(node.parent?.userData?.name || node.parent?.name || '').trim();
        const nodeName = String(node.userData?.name || node.name || '').trim();
        if (!node.isMesh || !node.geometry || (parentName !== name && nodeName !== name)) return;
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
      return found ? box : null;
    }

    function jointDelta(group, boneName, meshName, edge) {
      const bone = findNode(group, boneName);
      const meshBox = meshBoundsForName(group, meshName);
      if (!bone || !meshBox) return Infinity;
      const p = worldPosition(bone);
      return Math.abs(p.y - meshBox[edge]);
    }

    return GENERATED_CHARACTER_MOLDS.map((mold) => {
      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === mold.id);
      const group = def ? instantiateTemplateDefinition(def) : null;
      if (!group) {
        return { id: mold.id, found: false };
      }
      group.updateWorldMatrix(true, true);

      const bones = Object.keys(parentByBone).map((boneName) => {
        const node = findNode(group, boneName);
        return {
          name: boneName,
          present: !!node,
          parent: node ? namedParent(group, node) : null,
          expectedParent: parentByBone[boneName],
          identityRotation: node
            ? Math.abs(node.rotation.x) < 1e-6
              && Math.abs(node.rotation.y) < 1e-6
              && Math.abs(node.rotation.z) < 1e-6
              && Math.abs(node.quaternion.w - 1) < 1e-6
            : false,
        };
      });

      const boneMap = buildBoneToTargetMap(group, group.userData.slotMap, group.userData.slotBindings);
      const translatedWalk = translateAnimForMesh(standardWalk, group, boneMap);
      const importEligibility = resolveImportEligibility(group);

      return {
        id: mold.id,
        found: true,
        skeletonId: group.userData.skeletonId,
        animationProfile: group.userData.animationProfile,
        humanoidRigMode: group.userData.humanoidRigMode,
        syntheticHumanoidPivots: group.userData.syntheticHumanoidPivots || [],
        slotBindings: group.userData.slotBindings,
        missingBones: bones.filter((entry) => !entry.present).map((entry) => entry.name),
        parentMismatches: bones.filter((entry) => entry.parent !== entry.expectedParent),
        rotatedBones: bones.filter((entry) => !entry.identityRotation).map((entry) => entry.name),
        leftRight: {
          shoulder: (findNode(group, 'Left_Shoulder')?.position?.x || 0) - (findNode(group, 'Right_Shoulder')?.position?.x || 0),
          hip: (findNode(group, 'Left_Upper_Leg')?.position?.x || 0) - (findNode(group, 'Right_Upper_Leg')?.position?.x || 0),
        },
        jointDeltas: {
          leftShoulder: jointDelta(group, 'Left_Upper_Arm', 'ARM_L', 'maxY'),
          leftElbowUpper: jointDelta(group, 'Left_Lower_Arm', 'ARM_L', 'minY'),
          leftElbowLower: jointDelta(group, 'Left_Lower_Arm', 'ARM_L_FOREARM', 'maxY'),
          leftHip: jointDelta(group, 'Left_Upper_Leg', 'LEG_L', 'maxY'),
          leftKneeUpper: jointDelta(group, 'Left_Lower_Leg', 'LEG_L', 'minY'),
          leftKneeLower: jointDelta(group, 'Left_Lower_Leg', 'LEG_L_SHIN', 'maxY'),
          rightShoulder: jointDelta(group, 'Right_Upper_Arm', 'ARM_R', 'maxY'),
          rightElbowUpper: jointDelta(group, 'Right_Lower_Arm', 'ARM_R', 'minY'),
          rightElbowLower: jointDelta(group, 'Right_Lower_Arm', 'ARM_R_FOREARM', 'maxY'),
          rightHip: jointDelta(group, 'Right_Upper_Leg', 'LEG_R', 'maxY'),
          rightKneeUpper: jointDelta(group, 'Right_Lower_Leg', 'LEG_R', 'minY'),
          rightKneeLower: jointDelta(group, 'Right_Lower_Leg', 'LEG_R_SHIN', 'maxY'),
        },
        translatedTargets: translatedWalk?.tracks?.map((track) => track.target) || [],
        importEligibility,
      };
    });
  });

  expect(diagnostics).toHaveLength(6);
  for (const entry of diagnostics) {
    const detail = JSON.stringify(entry, null, 2);
    expect(entry.found, detail).toBe(true);
    expect(entry.skeletonId, detail).toBe('HUMANOID_STANDARD');
    expect(entry.animationProfile, detail).toBe('HUMANOID_STANDARD_AVATAR_BASE');
    expect(entry.humanoidRigMode, detail).toBe('standard');
    expect(entry.syntheticHumanoidPivots, detail).toEqual([]);
    expect(entry.missingBones, detail).toEqual([]);
    expect(entry.parentMismatches, detail).toEqual([]);
    expect(entry.rotatedBones, detail).toEqual([]);
    expect(entry.leftRight.shoulder, detail).toBeGreaterThan(0);
    expect(entry.leftRight.hip, detail).toBeGreaterThan(0);
    expect(entry.slotBindings.HEAD, detail).toEqual(expect.arrayContaining(['Head', 'HEAD']));
    expect(entry.slotBindings.TORSO, detail).toEqual(expect.arrayContaining(['Hips', 'Spine', 'Neck', 'PELVIS', 'TORSO']));
    expect(entry.slotBindings.ARM_L, detail).toEqual(expect.arrayContaining(['Left_Shoulder', 'Left_Upper_Arm', 'Left_Lower_Arm', 'Left_Hand', 'ARM_L', 'ARM_L_FOREARM', 'HAND_L']));
    expect(entry.slotBindings.ARM_R, detail).toEqual(expect.arrayContaining(['Right_Shoulder', 'Right_Upper_Arm', 'Right_Lower_Arm', 'Right_Hand', 'ARM_R', 'ARM_R_FOREARM', 'HAND_R']));
    expect(entry.slotBindings.LEG_L, detail).toEqual(expect.arrayContaining(['Left_Upper_Leg', 'Left_Lower_Leg', 'Left_Foot', 'LEG_L', 'LEG_L_SHIN', 'FOOT_L']));
    expect(entry.slotBindings.LEG_R, detail).toEqual(expect.arrayContaining(['Right_Upper_Leg', 'Right_Lower_Leg', 'Right_Foot', 'LEG_R', 'LEG_R_SHIN', 'FOOT_R']));
    expect(entry.slotBindings.WEAPON_MAIN, detail).toEqual(expect.arrayContaining(['Right_Hand', 'HAND_R']));
    expect(entry.slotBindings.WEAPON_SECONDARY, detail).toEqual(expect.arrayContaining(['Left_Hand', 'HAND_L']));
    Object.entries(entry.jointDeltas).forEach(([metric, value]) => {
      expect(value, `${entry.id} ${metric}\n${detail}`).toBeLessThan(0.035);
    });
    expect(entry.translatedTargets, detail).toEqual(expect.arrayContaining([
      'Left_Upper_Leg',
      'Right_Upper_Leg',
      'Left_Upper_Arm',
      'Right_Upper_Arm',
    ]));
    expect(entry.importEligibility, detail).toMatchObject({ ok: true });
  }

  await assertNoPageErrors(page);
});
