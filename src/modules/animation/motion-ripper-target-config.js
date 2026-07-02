import { t } from '../shared/i18n.js';
import { buildBoneToTargetMap } from './mesh-animation-translation.js';
import { getSkeletonById } from './skeleton-registry.js';
import { isSkinnedCaptureGroup } from './capture-skinned-character.js';
import {
  CAPTURE_JOINTS,
  CAPTURE_TARGET_ALIASES,
  HUMANOID_CAPTURE_COMPATIBLE_SKELETON_IDS,
  HUMANOID_CAPTURE_SKELETON_ID,
} from './motion-ripper-constants.js';

export function isCaptureGeneratedGroup(group) {
  return group?.userData?.humanoidRigMode === 'capture-generated'
    || isSkinnedCaptureGroup(group)
    || group?.userData?.motionRipperGenerated?.generatedFrom === 'motion-ripper-video'
    || group?.userData?.motionRipperGenerated?.generatedFrom === 'motion-ripper-video-skinned';
}

export function getRootTargetName(group) {
  const rootName = String(group?.userData?.name || group?.name || 'GROUP').trim() || 'GROUP';
  if (!group.name) group.name = rootName;
  return rootName;
}

function getFallbackNamedTargets(group) {
  const map = {};
  group?.traverse((node) => {
    const nodeName = String(node?.userData?.name || node?.name || '').trim();
    if (!nodeName) return;
    if (!(nodeName in map)) {
      map[nodeName] = nodeName;
    }
  });
  return map;
}

export function findTargetNodeByName(group, targetName) {
  if (!group || !targetName) return null;
  let targetNode = null;
  group.traverse((node) => {
    if (targetNode) return;
    const nodeName = String(node?.userData?.name || node?.name || '').trim();
    if (nodeName === targetName) {
      targetNode = node;
    }
  });
  return targetNode;
}

function getNamedParentTarget(group, node) {
  let parent = node?.parent;
  while (parent && parent !== group) {
    const parentName = String(parent?.userData?.name || parent?.name || '').trim();
    if (parentName) return parentName;
    parent = parent.parent;
  }
  return null;
}

function resolvePelvisTargetName(group, animationTargets) {
  const leftUpperNode = findTargetNodeByName(group, animationTargets.LEG_L_UPPER);
  const rightUpperNode = findTargetNodeByName(group, animationTargets.LEG_R_UPPER);
  const leftParentTarget = getNamedParentTarget(group, leftUpperNode);
  const rightParentTarget = getNamedParentTarget(group, rightUpperNode);

  if (leftParentTarget && leftParentTarget === rightParentTarget) {
    return leftParentTarget;
  }

  return animationTargets.PELVIS || animationTargets.SPINE || animationTargets.CHEST || null;
}

function applyCaptureTargetAliases(animationTargets) {
  CAPTURE_JOINTS.forEach((jointName) => {
    if (animationTargets[jointName]) return;
    const aliases = CAPTURE_TARGET_ALIASES[jointName] || [];
    const targetName = aliases.map((alias) => animationTargets[alias]).find(Boolean);
    if (targetName) {
      animationTargets[jointName] = targetName;
    }
  });
  return animationTargets;
}

export function resolveCaptureTargetConfig(group) {
  const skeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  const slotMap = group.userData?.slotMap || {};
  const slotBindings = group.userData?.slotBindings || skeleton?.defaultBindings || {};
  const syntheticPivotSet = new Set(group.userData?.syntheticHumanoidPivots || []);
  const animationTargets = applyCaptureTargetAliases({
    ...buildBoneToTargetMap(group, slotMap, slotBindings),
    ...getFallbackNamedTargets(group),
  });
  const rootMotionTargetName = getRootTargetName(group);
  animationTargets.ROOT = rootMotionTargetName;

  const pelvisTargetName = animationTargets.PELVIS || resolvePelvisTargetName(group, animationTargets) || rootMotionTargetName;
  const chestTargetName = animationTargets.CHEST || animationTargets.SPINE || pelvisTargetName;
  const neckTargetName = animationTargets.NECK || chestTargetName || animationTargets.HEAD || null;

  animationTargets.PELVIS = pelvisTargetName;
  animationTargets.CHEST = chestTargetName;
  animationTargets.NECK = neckTargetName;

  const displayTargets = {
    ...animationTargets,
    PELVIS: pelvisTargetName,
    CHEST: chestTargetName,
    NECK: neckTargetName || chestTargetName || animationTargets.HEAD || pelvisTargetName,
  };
  const suppressedBones = new Set();

  if (!pelvisTargetName || pelvisTargetName === chestTargetName) {
    suppressedBones.add('PELVIS');
  }
  if (!chestTargetName) {
    suppressedBones.add('CHEST');
  }
  if (!neckTargetName || neckTargetName === chestTargetName || neckTargetName === animationTargets.HEAD) {
    suppressedBones.add('NECK');
  }

  ['L', 'R'].forEach((side) => {
    const clavicleName = `CLAVICLE_${side}`;
    const armUpperName = `ARM_${side}_UPPER`;
    const clavicleTarget = animationTargets[clavicleName];
    const armUpperTarget = animationTargets[armUpperName];

    if (
      syntheticPivotSet.has(clavicleName)
      || !clavicleTarget
      || clavicleTarget === armUpperTarget
      || clavicleTarget === chestTargetName
      || clavicleTarget === neckTargetName
    ) {
      suppressedBones.add(clavicleName);
    }

    displayTargets[clavicleName] = clavicleTarget || armUpperTarget || chestTargetName || neckTargetName || pelvisTargetName;
  });

  return {
    animationTargets,
    displayTargets,
    rootMotionTargetName,
    suppressedBones,
  };
}

// FROZEN PATH (see docs/motion-ripper-freeze.md): importing a capture into an
// arbitrary selected model relies on rest-delta retargeting, which cannot work
// for rigs with heterogeneous pivots/local axes. Import is therefore allowed
// only where the mapping is 1:1 by construction:
//  - groups generated by the capture itself, or
//  - groups conforming to the HUMANOID_STANDARD skeleton (same bone names).
// Do NOT widen this gate with new heuristics; migrate models to
// HUMANOID_STANDARD instead.
export function resolveImportEligibility(group) {
  if (!group?.isGroup) {
    return { ok: false, error: t('selectGroupForAnim') };
  }
  if (isCaptureGeneratedGroup(group)) {
    return { ok: true };
  }
  const skeletonId = String(group.userData?.skeletonId || '').toUpperCase();
  if (skeletonId !== 'HUMANOID_STANDARD') {
    return { ok: false, error: t('motionRipperImportFrozen') };
  }
  const skeleton = getSkeletonById('HUMANOID_STANDARD');
  const missing = (skeleton?.bones || [])
    .map((bone) => bone.name)
    .filter((name) => !findTargetNodeByName(group, name));
  if (missing.length > 0) {
    return { ok: false, error: t('motionRipperImportMissingBones', { bones: missing.join(', ') }) };
  }
  return { ok: true };
}

export function canCaptureGroup(group) {
  if (!group?.isGroup) {
    return { ok: false, error: t('selectGroupForAnimMode') };
  }

  const skeletonId = group.userData?.skeletonId || null;
  const archetype = group.userData?.archetype || null;

  if (skeletonId && !HUMANOID_CAPTURE_COMPATIBLE_SKELETON_IDS.has(skeletonId)) {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }
  if (archetype && archetype !== 'HUMANOID') {
    return { ok: false, error: t('motionRipperOnlyHumanoid') };
  }

  return { ok: true };
}
