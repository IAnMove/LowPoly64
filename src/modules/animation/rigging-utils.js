import * as THREE from 'three';
import { getSlots } from './archetype-system.js';
import { compileAnimation } from './animation.js';
import { getProfilesByArchetype, getProfilesBySkeletonId, resolveAnimationProfile } from './animation-profiles.js';
import { getSkeletonById } from './skeleton-registry.js';
import {
  buildBoneToTargetMap,
  mergeSlotBindings,
  resolveSkeletonPositionScale,
  translateAnimForMesh,
} from './mesh-animation-translation.js';

const SIDELESS_KEYWORDS_BY_SLOT = Object.freeze({
  HEAD: ['HEAD', 'FACE', 'HAIR', 'BROW', 'EYE', 'IRIS', 'PUPIL', 'NOSE', 'MOUTH', 'LIP', 'EAR', 'HORN', 'HAT', 'CAP', 'HELMET', 'MUZZLE', 'BEARD'],
  TORSO: ['TORSO', 'CHEST', 'BELLY', 'PELVIS', 'COLLAR', 'NECK', 'WAIST', 'HIP', 'SPINE', 'BODY', 'CAPE', 'BACKPACK'],
  BODY: ['BODY', 'TORSO', 'CHEST', 'SHELL', 'CORE', 'FRAME', 'CHASSIS'],
  TAIL: ['TAIL'],
  WING_L: ['WING', 'FEATHER'],
  WING_R: ['WING', 'FEATHER'],
  WHEEL_FL: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_FR: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_RL: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_RR: ['WHEEL', 'TYRE', 'TIRE'],
  WEAPON_MAIN: ['WEAPON', 'SWORD', 'BLADE', 'AXE', 'HAMMER', 'GUN', 'RIFLE', 'BOW', 'STAFF', 'WAND', 'DAGGER', 'SHIELD'],
  WEAPON_SECONDARY: ['WEAPON', 'SWORD', 'BLADE', 'AXE', 'HAMMER', 'GUN', 'RIFLE', 'BOW', 'STAFF', 'WAND', 'DAGGER', 'SHIELD'],
});

const SIDE_KEYWORDS_BY_SLOT = Object.freeze({
  ARM_L: ['ARM', 'HAND', 'FIST', 'GLOVE', 'FOREARM', 'WRIST', 'ELBOW', 'SHOULDER'],
  ARM_R: ['ARM', 'HAND', 'FIST', 'GLOVE', 'FOREARM', 'WRIST', 'ELBOW', 'SHOULDER'],
  LEG_L: ['LEG', 'THIGH', 'SHIN', 'KNEE', 'FOOT', 'BOOT', 'ANKLE'],
  LEG_R: ['LEG', 'THIGH', 'SHIN', 'KNEE', 'FOOT', 'BOOT', 'ANKLE'],
  WING_L: ['WING', 'FEATHER'],
  WING_R: ['WING', 'FEATHER'],
  WHEEL_FL: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_FR: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_RL: ['WHEEL', 'TYRE', 'TIRE'],
  WHEEL_RR: ['WHEEL', 'TYRE', 'TIRE'],
  WEAPON_MAIN: ['WEAPON', 'SWORD', 'BLADE', 'AXE', 'HAMMER', 'GUN', 'RIFLE', 'BOW', 'STAFF', 'WAND', 'DAGGER', 'SHIELD'],
  WEAPON_SECONDARY: ['WEAPON', 'SWORD', 'BLADE', 'AXE', 'HAMMER', 'GUN', 'RIFLE', 'BOW', 'STAFF', 'WAND', 'DAGGER', 'SHIELD'],
});

function normalizeName(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function tokenizeName(name) {
  return normalizeName(name).split('_').filter(Boolean);
}

function cloneAnimationDef(animDef) {
  return {
    ...animDef,
    tracks: (animDef?.tracks || []).map((track) => ({
      ...track,
      keyframes: (track?.keyframes || []).map((keyframe) => ({
        ...keyframe,
        value: Array.isArray(keyframe?.value) ? [...keyframe.value] : keyframe?.value,
      })),
    })),
  };
}

function isRigGeneratedAnimation(animDef) {
  return !!animDef?.generatedByRig;
}

function markRigGeneratedAnimation(animDef, { profileId, skeletonId } = {}) {
  return {
    ...cloneAnimationDef(animDef),
    generatedByRig: true,
    generatedRigProfile: profileId || null,
    generatedRigSkeleton: skeletonId || null,
  };
}

function mergeAnimationDefs(baseAnimations = [], extraAnimations = [], namePrefix = 'profile') {
  const merged = baseAnimations.map((anim) => cloneAnimationDef(anim));
  const usedNames = new Set(merged.map((anim, index) => anim?.name || `anim_${index + 1}`));

  extraAnimations.forEach((anim, index) => {
    if (!anim) return;
    const candidate = cloneAnimationDef(anim);
    const rawName = candidate.name || `anim_${index + 1}`;
    let resolvedName = rawName;
    if (usedNames.has(resolvedName)) {
      const safePrefix = String(namePrefix || 'profile')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'profile';
      resolvedName = `${safePrefix}_${rawName}`;
      let suffix = 2;
      while (usedNames.has(resolvedName)) {
        resolvedName = `${safePrefix}_${rawName}_${suffix++}`;
      }
    }
    candidate.name = resolvedName;
    usedNames.add(resolvedName);
    merged.push(candidate);
  });

  return merged;
}

function buildNamedNodeEntries(group) {
  if (!group?.isGroup) return [];

  group.updateWorldMatrix(true, true);
  const entries = [];

  group.traverse((node) => {
    if (node === group) return;

    const name = node.userData?.name || (node.isGroup ? node.name : '');
    if (!name) return;

    let parentName = null;
    let parent = node.parent;
    while (parent && parent !== group) {
      parentName = parent.userData?.name || (parent.isGroup ? parent.name : '');
      if (parentName) break;
      parent = parent.parent;
    }

    const localPosition = new THREE.Vector3();
    node.getWorldPosition(localPosition);
    group.worldToLocal(localPosition);

    entries.push({
      name,
      normalizedName: normalizeName(name),
      tokens: tokenizeName(name),
      parentName,
      parentNormalizedName: normalizeName(parentName),
      x: localPosition.x,
      y: localPosition.y,
      z: localPosition.z,
    });
  });

  return entries;
}

function detectSide(entry) {
  const normalized = entry.normalizedName;
  const tokens = entry.tokens;
  const hasLeftToken = tokens.includes('L') || tokens.includes('LEFT') || tokens.includes('IZQ') || normalized.endsWith('_L') || normalized.startsWith('L_');
  if (hasLeftToken) return 'L';
  const hasRightToken = tokens.includes('R') || tokens.includes('RIGHT') || tokens.includes('DER') || normalized.endsWith('_R') || normalized.startsWith('R_');
  if (hasRightToken) return 'R';
  if (entry.x < -0.05) return 'L';
  if (entry.x > 0.05) return 'R';
  return null;
}

function scoreSlotForEntry(slotId, entry, archetype) {
  const side = detectSide(entry);
  const tokens = new Set(entry.tokens);
  const normalized = entry.normalizedName;
  let score = 0;

  if (normalized === slotId || normalized.startsWith(`${slotId}_`) || normalized.endsWith(`_${slotId}`)) {
    score += 1000;
  }

  if (slotId === 'HEAD' && entry.y > 0) score += 20;
  if ((slotId === 'TORSO' || slotId === 'BODY') && Math.abs(entry.x) < 0.8) score += 10;

  (SIDELESS_KEYWORDS_BY_SLOT[slotId] || []).forEach((keyword) => {
    if (tokens.has(keyword) || normalized.includes(keyword)) score += 120;
  });

  (SIDE_KEYWORDS_BY_SLOT[slotId] || []).forEach((keyword) => {
    if (tokens.has(keyword) || normalized.includes(keyword)) score += 80;
  });

  if (slotId.endsWith('_L')) {
    if (side === 'L') score += 60;
    if (side === 'R') score -= 120;
  }
  if (slotId.endsWith('_R')) {
    if (side === 'R') score += 60;
    if (side === 'L') score -= 120;
  }

  if (slotId === 'WEAPON_MAIN' || slotId === 'WEAPON_SECONDARY') {
    const offhand = tokens.has('OFFHAND') || tokens.has('SECONDARY') || tokens.has('SHIELD');
    if (slotId === 'WEAPON_MAIN' && !offhand) score += 25;
    if (slotId === 'WEAPON_SECONDARY' && offhand) score += 50;
    if (slotId === 'WEAPON_MAIN' && side === 'R') score += 15;
    if (slotId === 'WEAPON_SECONDARY' && side === 'L') score += 15;
  }

  if ((slotId === 'WHEEL_FL' || slotId === 'WHEEL_FR' || slotId === 'WHEEL_RL' || slotId === 'WHEEL_RR') && (tokens.has('FRONT') || tokens.has('REAR') || tokens.has('BACK'))) {
    if ((slotId === 'WHEEL_FL' || slotId === 'WHEEL_FR') && tokens.has('FRONT')) score += 70;
    if ((slotId === 'WHEEL_RL' || slotId === 'WHEEL_RR') && (tokens.has('REAR') || tokens.has('BACK'))) score += 70;
  } else if ((slotId === 'WHEEL_FL' || slotId === 'WHEEL_FR') && entry.z < 0) {
    score += 25;
  } else if ((slotId === 'WHEEL_RL' || slotId === 'WHEEL_RR') && entry.z > 0) {
    score += 25;
  }

  if (slotId === 'BODY' && (archetype === 'PROP' || archetype === 'CAR')) score += 40;

  return score;
}

function pickBestSlot(entry, archetype, allowedSlots) {
  let bestSlot = null;
  let bestScore = 0;

  allowedSlots.forEach((slotId) => {
    const score = scoreSlotForEntry(slotId, entry, archetype);
    if (score > bestScore) {
      bestScore = score;
      bestSlot = slotId;
    }
  });

  return bestScore > 0 ? bestSlot : null;
}

export function autoAssignSlotsToGroup(group, archetype = group?.userData?.archetype) {
  const slots = getSlots(archetype) || [];
  if (!group?.isGroup || slots.length === 0) return {};

  const entries = buildNamedNodeEntries(group);
  const assignedSlotByName = new Map();
  const slotMap = Object.fromEntries(slots.map((slotId) => [slotId, []]));

  entries.forEach((entry) => {
    const slotId = pickBestSlot(entry, archetype, slots);
    if (!slotId) return;
    assignedSlotByName.set(entry.name, slotId);
    slotMap[slotId].push(entry.name);
  });

  let changed = true;
  while (changed) {
    changed = false;
    entries.forEach((entry) => {
      if (assignedSlotByName.has(entry.name) || !entry.parentName) return;
      const inheritedSlot = assignedSlotByName.get(entry.parentName);
      if (!inheritedSlot) return;
      assignedSlotByName.set(entry.name, inheritedSlot);
      slotMap[inheritedSlot].push(entry.name);
      changed = true;
    });
  }

  if (archetype === 'PROP' && slotMap.BODY.length === 0) {
    slotMap.BODY.push(group.userData?.name || group.name || 'GROUP');
  }

  Object.keys(slotMap).forEach((slotId) => {
    slotMap[slotId] = [...new Set(slotMap[slotId])];
  });

  return slotMap;
}

export function pickDefaultAnimationProfileId(archetype, skeletonId, preferredProfileId = null) {
  if (preferredProfileId) {
    const resolved = resolveAnimationProfile(preferredProfileId);
    if (resolved?.skeleton?.id === skeletonId) return preferredProfileId;
  }

  const bySkeleton = getProfilesBySkeletonId(skeletonId);
  if (bySkeleton.length > 0) return bySkeleton[0].id;

  const byArchetype = getProfilesByArchetype(archetype);
  if (byArchetype.length > 0) return byArchetype[0].id;

  return null;
}

export function rebuildRigAnimationsForGroup(group, options = {}) {
  if (!group?.isGroup) return { animations: [], profileId: null, skeleton: null };

  const preservedAnimations = (group.userData.animations || [])
    .filter((animDef) => !isRigGeneratedAnimation(animDef))
    .map((animDef) => cloneAnimationDef(animDef));

  const skeletonId = options.skeletonId ?? group.userData?.skeletonId ?? null;
  const skeleton = skeletonId ? getSkeletonById(skeletonId) : null;
  if (!skeleton || !Array.isArray(skeleton.animations)) {
    if (preservedAnimations.length > 0) {
      group.userData.animations = preservedAnimations;
      group.userData.animationClips = preservedAnimations
        .map((animDef) => compileAnimation(animDef, group))
        .filter(Boolean);
    } else {
      delete group.userData.animations;
      delete group.userData.animationClips;
    }
    group.userData.skeletonId = skeletonId || null;
    if (options.animationProfile !== undefined) {
      group.userData.animationProfile = options.animationProfile;
    }
    return { animations: preservedAnimations, profileId: group.userData.animationProfile || null, skeleton: null };
  }

  if (!group.userData.slotBindings) {
    group.userData.slotBindings = skeleton.defaultBindings ? { ...skeleton.defaultBindings } : {};
  }
  if (!group.userData.slotMap) {
    group.userData.slotMap = {};
  }

  const profileId = options.animationProfile === undefined
    ? pickDefaultAnimationProfileId(group.userData.archetype, skeleton.id, group.userData.animationProfile)
    : options.animationProfile;

  let sourceAnimations = skeleton.animations;
  if (profileId) {
    const resolved = resolveAnimationProfile(profileId);
    if (resolved?.skeleton?.id === skeleton.id && resolved.animations.length > 0) {
      sourceAnimations = resolved.animations;
      group.userData.animationProfile = profileId;
    } else {
      group.userData.animationProfile = null;
    }
  } else {
    group.userData.animationProfile = null;
  }

  const effectiveSlotBindings = mergeSlotBindings(
    skeleton.defaultBindings || {},
    group.userData.slotBindings || {}
  );
  const boneToTarget = buildBoneToTargetMap(group, group.userData.slotMap, effectiveSlotBindings);
  const positionScale = resolveSkeletonPositionScale(skeleton, group, boneToTarget);
  const translated = sourceAnimations
    .map((animDef) => translateAnimForMesh(animDef, group, boneToTarget, { positionScale }))
    .filter(Boolean)
    .map((animDef) => markRigGeneratedAnimation(animDef, {
      profileId: group.userData.animationProfile || null,
      skeletonId: skeleton.id,
    }));

  const mergedAnimations = mergeAnimationDefs(
    preservedAnimations,
    translated,
    group.userData.animationProfile || skeleton.id || 'rig'
  );

  group.userData.skeletonId = skeleton.id;
  group.userData.animations = mergedAnimations;
  group.userData.animationClips = mergedAnimations
    .map((animDef) => compileAnimation(animDef, group))
    .filter(Boolean);

  return { animations: mergedAnimations, profileId: group.userData.animationProfile || null, skeleton };
}
