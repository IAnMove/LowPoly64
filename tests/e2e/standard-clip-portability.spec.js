import { expect, test } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
} from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

const STANDARD_CASE_IDS = [
  'psx_humanoid_chibi_mold_cm',
  'psx_humanoid_heroic_mold_cm',
  'psx_humanoid_slim_mold_cm',
  'psx_humanoid_heavy_mold_cm',
  'n64_humanoid_round_mold_cm',
  'n64_humanoid_classic_mold_cm',
  'n64_elf_hero_cm',
];

const REQUIRED_STANDARD_CLIPS = ['idle', 'walk', 'run', 'wave', 'jump'];

// T3.2 (newtask.md): the portable clip library applies 1:1 to any conforming
// HUMANOID_STANDARD rig. The only adaptation allowed is scaling position
// deltas by the stature ratio (target hips height / skeleton hips height);
// rotations must be copied untouched.
test('standard clips apply 1:1 across molds with stature-scaled position deltas', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const results = await page.evaluate(async ({ caseIds, clipNames }) => {
    const [
      { TEMPLATE_REGISTRY },
      { instantiateTemplateDefinition },
      { getSkeletonById },
      { buildBoneToTargetMap, mergeSlotBindings, resolveSkeletonPositionScale, translateAnimForMesh },
    ] = await Promise.all([
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
      import('/src/modules/animation/skeleton-registry.js'),
      import('/src/modules/animation/mesh-animation-translation.js'),
    ]);

    const skeleton = getSkeletonById('HUMANOID_STANDARD');
    const skeletonHipsY = skeleton.bones.find((bone) => !bone.parent).position[1];
    const clips = Object.fromEntries(
      clipNames.map((name) => [
        name,
        skeleton.animations.find((entry) => entry.name === name) || null,
      ])
    );

    function findNode(group, name) {
      let match = null;
      group.traverse((node) => {
        if (match) return;
        const nodeName = String(node.userData?.name || node.name || '').trim();
        if (nodeName === name) match = node;
      });
      return match;
    }

    function hipsHeight(group, boneToTarget) {
      const node = findNode(group, boneToTarget.Hips);
      let y = 0;
      let cursor = node;
      while (cursor && cursor !== group) {
        y += cursor.position?.y ?? 0;
        cursor = cursor.parent;
      }
      return y;
    }

    function maxPositionDelta(track) {
      const rest = track.keyframes[0].value;
      return Math.max(...track.keyframes.map((kf) => Math.abs(kf.value[1] - rest[1])));
    }

    return caseIds.map((id) => {
      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === id);
      const group = def ? instantiateTemplateDefinition(def) : null;
      if (!group) return { id, found: false };
      group.updateWorldMatrix(true, true);

      const slotBindings = mergeSlotBindings(skeleton.defaultBindings || {}, group.userData.slotBindings || {});
      const boneToTarget = buildBoneToTargetMap(group, group.userData.slotMap, slotBindings);
      const positionScale = resolveSkeletonPositionScale(skeleton, group, boneToTarget);
      const translated = Object.fromEntries(
        Object.entries(clips).map(([name, clip]) => [
          name,
          clip ? translateAnimForMesh(clip, group, boneToTarget, { positionScale }) : null,
        ])
      );

      const jumpHips = translated.jump?.tracks?.find(
        (track) => track.property === 'position' && track.target === boneToTarget.Hips
      ) || null;
      const waveArm = translated.wave?.tracks?.find(
        (track) => track.property === 'rotation' && track.target === boneToTarget.Right_Upper_Arm
      ) || null;
      const sourceWaveArm = clips.wave.tracks.find(
        (track) => track.target === 'Right_Upper_Arm' && track.property === 'rotation'
      );

      return {
        id,
        found: true,
        positionScale,
        hipsRatio: hipsHeight(group, boneToTarget) / skeletonHipsY,
        rigAnimationNames: (group.userData.animations || []).map((entry) => entry.name),
        translatedNames: Object.fromEntries(
          Object.entries(translated).map(([name, def2]) => [name, !!def2])
        ),
        translatedTrackCounts: Object.fromEntries(
          Object.entries(translated).map(([name, def2]) => [name, def2?.tracks?.length || 0])
        ),
        sourceTrackCounts: Object.fromEntries(
          Object.entries(clips).map(([name, def2]) => [name, def2?.tracks?.length || 0])
        ),
        walkPositionTrackCount: (translated.walk?.tracks || []).filter((track) => track.property === 'position').length,
        runPositionTrackCount: (translated.run?.tracks || []).filter((track) => track.property === 'position').length,
        jumpHipsDelta: jumpHips ? maxPositionDelta(jumpHips) : null,
        waveRotationsUntouched: waveArm
          ? JSON.stringify(waveArm.keyframes.map((kf) => kf.value))
            === JSON.stringify(sourceWaveArm.keyframes.map((kf) => kf.value))
          : false,
      };
    });
  }, { caseIds: STANDARD_CASE_IDS, clipNames: REQUIRED_STANDARD_CLIPS });

  expect(results).toHaveLength(STANDARD_CASE_IDS.length);
  const sourceJumpAmplitude = 0.85; // authored Hips apex delta in humanoid_standard clip asset

  for (const entry of results) {
    const detail = JSON.stringify(entry, null, 2);
    expect(entry.found, detail).toBe(true);
    // Scale factor must track the rig's real hips height.
    expect(entry.positionScale, detail).toBeCloseTo(entry.hipsRatio, 2);
    // All required library clips translate onto the mold/hero without dropped targets.
    expect(entry.translatedNames, detail).toEqual({
      idle: true,
      walk: true,
      run: true,
      wave: true,
      jump: true,
    });
    expect(entry.translatedTrackCounts, detail).toEqual(entry.sourceTrackCounts);
    // Walk/run have no vertical position tracks, so applying locomotion cannot
    // sink the root below its authored rest height.
    expect(entry.walkPositionTrackCount, detail).toBe(0);
    expect(entry.runPositionTrackCount, detail).toBe(0);
    // Position deltas are scaled by stature...
    expect(entry.jumpHipsDelta, detail).toBeCloseTo(sourceJumpAmplitude * entry.positionScale, 2);
    // ...while rotations are copied 1:1, never adapted.
    expect(entry.waveRotationsUntouched, detail).toBe(true);
  }

  const [chibi, heroic] = results;
  // A chibi and a heroic mold must NOT receive the same absolute bounce:
  // the ratio between their jump amplitudes matches their stature ratio.
  expect(chibi.positionScale, JSON.stringify(results)).toBeLessThan(heroic.positionScale);
  expect(chibi.jumpHipsDelta / heroic.jumpHipsDelta, JSON.stringify(results))
    .toBeCloseTo(chibi.positionScale / heroic.positionScale, 2);

  await assertNoPageErrors(page);
});
