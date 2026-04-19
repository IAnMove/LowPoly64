const BONE_TARGET_ALIASES = Object.freeze({
  PELVIS: Object.freeze([
    'HIP',
    'HIPS',
    'WAIST',
    'PELVIS_CENTER',
    'BODY_LOWER',
  ]),
  CHEST: Object.freeze([
    'TORSO',
    'BODY',
    'UPPER_BODY',
    'UPPER_TORSO',
    'CHEST_CORE',
  ]),
  NECK: Object.freeze([
    'COLLAR',
    'NECK_BASE',
    'THROAT',
  ]),
  CLAVICLE_L: Object.freeze([
    'LEFT_CLAVICLE',
    'CLAVICLE_LEFT',
    'ARM_L_SHOULDER',
    'LEFT_SHOULDER',
    'SHOULDER_L',
    'PAULDRON_L',
  ]),
  ARM_L_UPPER: Object.freeze([
    'LEFT_ARM_UPPER',
    'ARM_L',
    'LEFT_ARM',
    'UPPER_ARM_L',
    'L_UPPER_ARM',
  ]),
  ARM_L_LOWER: Object.freeze([
    'LEFT_ARM_LOWER',
    'ARM_L_LOWER',
    'ARM_L_FOREARM',
    'LEFT_FOREARM',
    'FOREARM_L',
    'LOWER_ARM_L',
  ]),
  HAND_L: Object.freeze([
    'LEFT_HAND',
    'HAND_LEFT',
    'GLOVE_L',
  ]),
  CLAVICLE_R: Object.freeze([
    'RIGHT_CLAVICLE',
    'CLAVICLE_RIGHT',
    'ARM_R_SHOULDER',
    'RIGHT_SHOULDER',
    'SHOULDER_R',
    'PAULDRON_R',
  ]),
  ARM_R_UPPER: Object.freeze([
    'RIGHT_ARM_UPPER',
    'ARM_R',
    'RIGHT_ARM',
    'UPPER_ARM_R',
    'R_UPPER_ARM',
  ]),
  ARM_R_LOWER: Object.freeze([
    'RIGHT_ARM_LOWER',
    'ARM_R_LOWER',
    'ARM_R_FOREARM',
    'RIGHT_FOREARM',
    'FOREARM_R',
    'LOWER_ARM_R',
  ]),
  HAND_R: Object.freeze([
    'RIGHT_HAND',
    'HAND_RIGHT',
    'GLOVE_R',
  ]),
  LEG_L_UPPER: Object.freeze([
    'LEFT_LEG_THIGH',
    'LEG_L',
    'LEFT_LEG',
    'THIGH_L',
    'LEFT_THIGH',
    'UPPER_LEG_L',
  ]),
  LEG_L_LOWER: Object.freeze([
    'LEFT_LEG_SHIN',
    'LEG_L_SHIN',
    'LEFT_SHIN',
    'SHIN_L',
    'LOWER_LEG_L',
  ]),
  FOOT_L: Object.freeze([
    'LEFT_FOOT',
    'LEFT_BOOT',
    'LEFT_SHOE',
    'BOOT_L',
    'SHOE_L',
  ]),
  LEG_R_UPPER: Object.freeze([
    'RIGHT_LEG_THIGH',
    'LEG_R',
    'RIGHT_LEG',
    'THIGH_R',
    'RIGHT_THIGH',
    'UPPER_LEG_R',
  ]),
  LEG_R_LOWER: Object.freeze([
    'RIGHT_LEG_SHIN',
    'LEG_R_SHIN',
    'RIGHT_SHIN',
    'SHIN_R',
    'LOWER_LEG_R',
  ]),
  FOOT_R: Object.freeze([
    'RIGHT_FOOT',
    'RIGHT_BOOT',
    'RIGHT_SHOE',
    'BOOT_R',
    'SHOE_R',
  ]),
});

const BONES_WITHOUT_SLOT_FALLBACK = new Set([
  'CLAVICLE_L',
  'CLAVICLE_R',
]);

function findTargetNode(group, targetName) {
  let targetNode = null;
  group.traverse((child) => {
    if (!targetNode && (child.userData?.name === targetName || child.name === targetName)) {
      targetNode = child;
    }
  });
  return targetNode;
}

function normalizeTargetName(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildPieceNameLookup(pieces = []) {
  const exact = new Set();
  const normalized = new Map();

  (pieces || []).forEach((pieceName) => {
    if (!pieceName) return;
    exact.add(pieceName);
    const normalizedName = normalizeTargetName(pieceName);
    if (normalizedName && !normalized.has(normalizedName)) {
      normalized.set(normalizedName, pieceName);
    }
  });

  return { exact, normalized };
}

function resolveBoneTargetName(boneName, pieceLookup, defaultTargetName = null) {
  if (pieceLookup.exact.has(boneName)) {
    return boneName;
  }

  const normalizedBoneName = normalizeTargetName(boneName);
  if (normalizedBoneName && pieceLookup.normalized.has(normalizedBoneName)) {
    return pieceLookup.normalized.get(normalizedBoneName);
  }

  const aliases = BONE_TARGET_ALIASES[boneName] || [];
  for (const alias of aliases) {
    const normalizedAlias = normalizeTargetName(alias);
    if (normalizedAlias && pieceLookup.normalized.has(normalizedAlias)) {
      return pieceLookup.normalized.get(normalizedAlias);
    }
  }

  if (BONES_WITHOUT_SLOT_FALLBACK.has(boneName)) {
    return null;
  }

  return defaultTargetName;
}

export function buildBoneToTargetMap(group, slotMap = {}, slotBindings = {}, { wholeGroupSlots = [] } = {}) {
  const map = {};
  const groupTarget = group?.userData?.name || group?.name || 'GROUP';
  const wholeGroupSlotSet = new Set(wholeGroupSlots);
  const archetype = group?.userData?.archetype || null;

  for (const [slotId, boneNames] of Object.entries(slotBindings || {})) {
    const pieces = slotMap?.[slotId] || [];
    const pieceLookup = buildPieceNameLookup(pieces);
    let defaultTargetName = null;

    if (wholeGroupSlotSet.has(slotId)) {
      defaultTargetName = groupTarget;
    } else if (slotId === 'BODY' && (archetype === 'PROP' || archetype === 'CAR')) {
      // For whole-object props, animating the root group is usually the right default.
      defaultTargetName = groupTarget;
    } else {
      if (pieces.length > 0) defaultTargetName = pieces[0];
    }

    for (const boneName of boneNames || []) {
      const resolvedTargetName = resolveBoneTargetName(boneName, pieceLookup, defaultTargetName);
      if (resolvedTargetName) {
        map[boneName] = resolvedTargetName;
      }
    }
  }

  return map;
}

export function translateAnimForMesh(animDef, group, boneToTarget) {
  const tracks = [];

  for (const track of animDef?.tracks || []) {
    const targetName = boneToTarget?.[track.target];
    if (!targetName) continue;

    if (track.property !== 'position') {
      tracks.push({ ...track, target: targetName });
      continue;
    }

    const targetNode = findTargetNode(group, targetName);
    if (!targetNode) continue;

    const rest = track.keyframes?.[0]?.value || [0, 0, 0];
    const base = targetNode.position;
    tracks.push({
      ...track,
      target: targetName,
      keyframes: (track.keyframes || []).map((kf) => ({
        time: kf.time,
        value: [
          base.x + (kf.value[0] - rest[0]),
          base.y + (kf.value[1] - rest[1]),
          base.z + (kf.value[2] - rest[2]),
        ],
      })),
    });
  }

  return tracks.length > 0 ? { ...animDef, tracks } : null;
}
