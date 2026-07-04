import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('registers the N64 elf hero as a standard-rig flagship character', async ({ page }) => {
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

    const def = TEMPLATE_REGISTRY.find((entry) => entry.id === 'n64_elf_hero_cm');
    if (!def) return { found: false };

    const group = instantiateTemplateDefinition(def);
    group.userData.name = def.name;
    group.name = def.name;

    for (const child of [...state.userObjects.children]) {
      state.userObjects.remove(child);
    }
    state.userObjects.add(group);
    group.updateWorldMatrix(true, true);

    function findNode(name) {
      let match = null;
      group.traverse((node) => {
        if (!match && (node.userData?.name === name || node.name === name)) {
          match = node;
        }
      });
      return match;
    }

    function emptyBox() {
      return {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
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

    function meshBoundsForNames(names) {
      const wanted = new Set(names);
      const box = emptyBox();
      let found = false;
      group.traverse((node) => {
        const parentName = node.parent?.userData?.name || node.parent?.name || '';
        const nodeName = node.userData?.name || node.name || '';
        if (!node.isMesh || !node.geometry || (!wanted.has(parentName) && !wanted.has(nodeName))) return;
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
      if (!found) return null;
      return {
        ...box,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
        depth: box.maxZ - box.minZ,
      };
    }

    const head = meshBoundsForNames(['HEAD']);
    const ears = meshBoundsForNames(['EAR_L_POINT', 'EAR_R_POINT']);
    const hat = meshBoundsForNames(['HAT_CAP', 'HAT_TAIL']);
    const tunic = meshBoundsForNames(['TORSO', 'CHEST', 'TUNIC_SKIRT']);
    const belt = meshBoundsForNames(['BELT_WRAP', 'BELT_BUCKLE']);
    const boots = meshBoundsForNames(['FOOT_L', 'FOOT_R']);
    const faceDecalNode = findNode('FACE_DECAL');
    const featureSlabNames = ['EYE_SLAB_L', 'EYE_SLAB_R', 'BROW_SLAB_L', 'BROW_SLAB_R', 'MOUTH_SLAB'];
    const featureSlabNodes = featureSlabNames.map((name) => findNode(name));
    const featureSlabsWithDecal = featureSlabNodes.filter((node) => {
      let hasDecalSpec = false;
      node?.traverse?.((child) => {
        if (child.userData?.decalSpec) hasDecalSpec = true;
      });
      return hasDecalSpec;
    }).length;
    const eyeSlabs = meshBoundsForNames(['EYE_SLAB_L', 'EYE_SLAB_R']);
    const browSlabs = meshBoundsForNames(['BROW_SLAB_L', 'BROW_SLAB_R']);
    const mouthSlab = meshBoundsForNames(['MOUTH_SLAB']);

    const standard = getSkeletonById('HUMANOID_STANDARD');
    const legacy = getSkeletonById('HUMANOID_DEFAULT');
    const legacyWalk = legacy?.animations?.find((entry) => entry.name === 'walk');
    const boneMap = buildBoneToTargetMap(group, group.userData.slotMap, group.userData.slotBindings || standard?.defaultBindings || {});
    const translatedWalk = translateAnimForMesh(legacyWalk, group, boneMap);
    const walkClip = translatedWalk ? compileAnimation(translatedWalk, group) : null;
    const arm = findNode('ARM_L_UPPER');
    const beforeArmRotation = arm?.rotation?.x || 0;
    let afterArmRotation = beforeArmRotation;

    if (walkClip) {
      group.userData.animationClips = [walkClip];
      playAnimation(group, 0);
      state.animationMixer?.setTime?.(0.5);
      afterArmRotation = arm?.rotation?.x || 0;
      stopAnimation();
    }

    return {
      found: true,
      id: def.id,
      category: def.category,
      assetRole: def.assetRole,
      skeletonId: group.userData.skeletonId,
      humanoidRigMode: group.userData.humanoidRigMode,
      slotMap: group.userData.slotMap,
      slotBindings: group.userData.slotBindings,
      translatedTargets: translatedWalk?.tracks?.map((track) => track.target) || [],
      clipTrackCount: walkClip?.tracks?.length || 0,
      armRotationDelta: Math.abs(afterArmRotation - beforeArmRotation),
      parts: {
        faceDecal: !!faceDecalNode,
        featureSlabCount: featureSlabNodes.filter(Boolean).length,
        featureSlabsWithDecal,
        ears: !!ears,
        hat: !!hat,
        tunic: !!tunic,
        belt: !!belt,
        boots: !!boots,
      },
      visual: {
        hatAboveHead: hat && head ? hat.maxY - head.maxY : 0,
        earSpanOverHead: ears && head ? ears.width / Math.max(head.width, 0.0001) : 0,
        eyeSlabDepth: eyeSlabs?.depth || 0,
        browSlabDepth: browSlabs?.depth || 0,
        mouthSlabDepth: mouthSlab?.depth || 0,
        bootDepth: boots?.depth || 0,
        tunicHeight: tunic?.height || 0,
      },
    };
  });

  expect(diagnostics.found).toBe(true);
  expect(diagnostics).toMatchObject({
    id: 'n64_elf_hero_cm',
    category: 'N64',
    assetRole: 'characterModel',
    skeletonId: 'HUMANOID_STANDARD',
  });
  expect(diagnostics.slotMap.HEAD).toEqual(expect.arrayContaining([
    'HEAD',
    'EYE_SLAB_L',
    'EYE_SLAB_R',
    'BROW_SLAB_L',
    'BROW_SLAB_R',
    'MOUTH_SLAB',
    'HAT_CAP',
    'HAT_TAIL',
  ]));
  expect(diagnostics.slotMap.TORSO).toEqual(expect.arrayContaining(['PELVIS', 'TORSO', 'CHEST', 'NECK']));
  expect(diagnostics.slotMap.ARM_L).toEqual(expect.arrayContaining(['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L']));
  expect(diagnostics.slotBindings.ARM_L).toEqual(expect.arrayContaining(['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L']));
  expect(diagnostics.translatedTargets).toEqual(expect.arrayContaining(['ARM_L_UPPER', 'ARM_R_UPPER', 'LEG_L_UPPER', 'LEG_R_UPPER']));
  expect(diagnostics.clipTrackCount).toBeGreaterThan(0);
  expect(diagnostics.armRotationDelta).toBeGreaterThan(0.05);
  expect(diagnostics.parts).toEqual({
    faceDecal: false,
    featureSlabCount: 5,
    featureSlabsWithDecal: 5,
    ears: true,
    hat: true,
    tunic: true,
    belt: true,
    boots: true,
  });
  expect(diagnostics.visual.hatAboveHead).toBeGreaterThan(0.2);
  expect(diagnostics.visual.earSpanOverHead).toBeGreaterThan(1.2);
  expect(diagnostics.visual.eyeSlabDepth).toBeGreaterThan(0.05);
  expect(diagnostics.visual.browSlabDepth).toBeGreaterThan(0.05);
  expect(diagnostics.visual.mouthSlabDepth).toBeGreaterThan(0.05);
  expect(diagnostics.visual.bootDepth).toBeGreaterThan(0.65);
  expect(diagnostics.visual.tunicHeight).toBeGreaterThan(1.2);

  await assertNoPageErrors(page);
});

test('captures the N64 elf hero benchmark views', async ({ page }) => {
  test.skip(!process.env.CAPTURE_ELF_HERO, 'Set CAPTURE_ELF_HERO=1 to capture the flagship hero views.');

  await bootstrapApp(page, '/', { requireEditorModals: false });

  for (const viewName of ['front', 'profile', 'three-quarter']) {
    await page.evaluate(async (view) => {
      const [{ state }, { TEMPLATE_REGISTRY }, { instantiateTemplateDefinition }] = await Promise.all([
        import('/src/modules/shared/state.js'),
        import('/src/modules/viewport/template-registry.js'),
        import('/src/modules/viewport/templates.js'),
      ]);

      for (const child of [...state.userObjects.children]) {
        state.userObjects.remove(child);
      }

      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === 'n64_elf_hero_cm');
      const group = instantiateTemplateDefinition(def);
      state.userObjects.add(group);
      group.updateWorldMatrix(true, true);

      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      group.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        node.geometry.computeBoundingBox();
        const bb = node.geometry.boundingBox;
        if (!bb) return;
        const e = node.matrixWorld.elements;
        for (let i = 0; i < 8; i += 1) {
          const x = i & 1 ? bb.max.x : bb.min.x;
          const y = i & 2 ? bb.max.y : bb.min.y;
          const z = i & 4 ? bb.max.z : bb.min.z;
          const wx = (e[0] * x) + (e[4] * y) + (e[8] * z) + e[12];
          const wy = (e[1] * x) + (e[5] * y) + (e[9] * z) + e[13];
          const wz = (e[2] * x) + (e[6] * y) + (e[10] * z) + e[14];
          min[0] = Math.min(min[0], wx); max[0] = Math.max(max[0], wx);
          min[1] = Math.min(min[1], wy); max[1] = Math.max(max[1], wy);
          min[2] = Math.min(min[2], wz); max[2] = Math.max(max[2], wz);
        }
      });

      const center = {
        x: (min[0] + max[0]) * 0.5,
        y: (min[1] + max[1]) * 0.5,
        z: (min[2] + max[2]) * 0.5,
      };
      const height = Math.max(max[1] - min[1], 1);
      const distance = height * 1.65;
      const offsets = {
        front: [0, distance],
        profile: [-distance, 0],
        'three-quarter': [-distance * 0.7, distance * 0.7],
      };
      const [dx, dz] = offsets[view] || offsets.front;
      state.camera.position.set(center.x + dx, center.y + (height * 0.08), center.z + dz);
      state.orbitControls.target.set(center.x, center.y, center.z);
      state.orbitControls.update();
    }, viewName);

    await waitForUi(page, 400);
    await page.locator('#viewport-container, canvas').first().screenshot({
      path: `.tmp-head-views/flagship/n64_elf_hero_cm_${viewName}.png`,
    });
  }

  await assertNoPageErrors(page);
});
