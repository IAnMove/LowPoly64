import * as THREE from 'three';

export const FAST_POSER_ASSET_FORMAT = 'fast-poser-asset';

const FAST_POSER_TYPE_ANIMATION = 'animation';

const OUTPUT_JOINTS = Object.freeze([
  'PELVIS',
  'SPINE',
  'CHEST',
  'NECK',
  'HEAD',
  'CLAVICLE_L',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'HAND_L',
  'CLAVICLE_R',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'HAND_R',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);

const TARGET_NAME_CANDIDATES = Object.freeze({
  PELVIS: Object.freeze(['PELVIS', 'HIPS', 'HIP', 'WAIST']),
  SPINE: Object.freeze(['SPINE']),
  CHEST: Object.freeze(['CHEST']),
  NECK: Object.freeze(['NECK']),
  HEAD: Object.freeze(['HEAD']),
  CLAVICLE_L: Object.freeze(['CLAVICLE_L', 'LEFT_CLAVICLE']),
  ARM_L_UPPER: Object.freeze(['ARM_L_UPPER', 'LEFT_ARM_UPPER', 'LEFT_ARM']),
  ARM_L_LOWER: Object.freeze(['ARM_L_LOWER', 'LEFT_ARM_LOWER', 'LEFT_FOREARM']),
  HAND_L: Object.freeze(['HAND_L', 'LEFT_HAND', 'HAND_LEFT']),
  CLAVICLE_R: Object.freeze(['CLAVICLE_R', 'RIGHT_CLAVICLE']),
  ARM_R_UPPER: Object.freeze(['ARM_R_UPPER', 'RIGHT_ARM_UPPER', 'RIGHT_ARM']),
  ARM_R_LOWER: Object.freeze(['ARM_R_LOWER', 'RIGHT_ARM_LOWER', 'RIGHT_FOREARM']),
  HAND_R: Object.freeze(['HAND_R', 'RIGHT_HAND', 'HAND_RIGHT']),
  LEG_L_UPPER: Object.freeze(['LEG_L_UPPER', 'LEFT_LEG_THIGH', 'LEFT_LEG', 'LEFT_THIGH']),
  LEG_L_LOWER: Object.freeze(['LEG_L_LOWER', 'LEFT_LEG_SHIN', 'LEFT_SHIN']),
  FOOT_L: Object.freeze(['FOOT_L', 'LEFT_FOOT', 'LEFT_BOOT', 'LEFT_SHOE']),
  LEG_R_UPPER: Object.freeze(['LEG_R_UPPER', 'RIGHT_LEG_THIGH', 'RIGHT_LEG', 'RIGHT_THIGH']),
  LEG_R_LOWER: Object.freeze(['LEG_R_LOWER', 'RIGHT_LEG_SHIN', 'RIGHT_SHIN']),
  FOOT_R: Object.freeze(['FOOT_R', 'RIGHT_FOOT', 'RIGHT_BOOT', 'RIGHT_SHOE']),
});

function normalizeNodeName(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseJointKey(jointKey) {
  const match = /^(.*?)(?:_(\d+))?$/.exec(String(jointKey || '').trim());
  return {
    baseName: match?.[1] || '',
    characterIndex: match?.[2] != null ? Number.parseInt(match[2], 10) : null,
  };
}

function chooseCharacterIndex(asset) {
  const explicitIndex = asset?.effects?.targetCharacter;
  if (Number.isInteger(explicitIndex) && explicitIndex >= 0) {
    return explicitIndex;
  }

  const frame = Array.isArray(asset?.keyframes) ? asset.keyframes[0] : null;
  const indices = new Set();
  Object.keys(frame?.pose || {}).forEach((jointKey) => {
    const { characterIndex } = parseJointKey(jointKey);
    if (Number.isInteger(characterIndex) && characterIndex >= 0) {
      indices.add(characterIndex);
    }
  });

  if (indices.has(0)) return 0;
  const sorted = Array.from(indices).sort((a, b) => a - b);
  return sorted[0] ?? 0;
}

function buildPoseForCharacter(frame, characterIndex) {
  const pose = {};
  Object.entries(frame?.pose || {}).forEach(([jointKey, transform]) => {
    const { baseName, characterIndex: jointIndex } = parseJointKey(jointKey);
    if (!baseName) return;
    if (jointIndex != null && jointIndex !== characterIndex) return;
    pose[baseName] = transform;
  });
  return pose;
}

function getQuaternion(pose, jointName) {
  const quaternion = pose?.[jointName]?.quaternion;
  if (!Array.isArray(quaternion) || quaternion.length !== 4) {
    return null;
  }

  return new THREE.Quaternion(
    quaternion[0] ?? 0,
    quaternion[1] ?? 0,
    quaternion[2] ?? 0,
    quaternion[3] ?? 1
  ).normalize();
}

function getPosition(pose, jointName) {
  const position = pose?.[jointName]?.position;
  if (!Array.isArray(position) || position.length !== 3) {
    return null;
  }

  return new THREE.Vector3(
    position[0] ?? 0,
    position[1] ?? 0,
    position[2] ?? 0
  );
}

function blendQuaternion(a, b, alpha) {
  if (a && b) {
    return a.clone().slerp(b, THREE.MathUtils.clamp(alpha, 0, 1)).normalize();
  }
  if (a) return a.clone();
  if (b) return b.clone();
  return new THREE.Quaternion();
}

function resolveOutputQuaternion(pose, outputJointName) {
  switch (outputJointName) {
    case 'PELVIS':
      return getQuaternion(pose, 'Hips') || new THREE.Quaternion();
    case 'SPINE':
      return getQuaternion(pose, 'Spine')
        || getQuaternion(pose, 'Chest')
        || new THREE.Quaternion();
    case 'CHEST':
      return getQuaternion(pose, 'Chest')
        || blendQuaternion(getQuaternion(pose, 'Spine'), getQuaternion(pose, 'Head'), 0.35);
    case 'NECK':
      return getQuaternion(pose, 'Neck')
        || blendQuaternion(
          getQuaternion(pose, 'Chest') || getQuaternion(pose, 'Spine'),
          getQuaternion(pose, 'Head'),
          0.65
        );
    case 'HEAD':
      return getQuaternion(pose, 'Head') || new THREE.Quaternion();
    case 'CLAVICLE_L':
      return getQuaternion(pose, 'Left_Clavicle') || new THREE.Quaternion();
    case 'ARM_L_UPPER':
      return getQuaternion(pose, 'Left_Upper_Arm') || new THREE.Quaternion();
    case 'ARM_L_LOWER':
      return getQuaternion(pose, 'Left_Lower_Arm') || new THREE.Quaternion();
    case 'HAND_L':
      return getQuaternion(pose, 'Left_Hand') || new THREE.Quaternion();
    case 'CLAVICLE_R':
      return getQuaternion(pose, 'Right_Clavicle') || new THREE.Quaternion();
    case 'ARM_R_UPPER':
      return getQuaternion(pose, 'Right_Upper_Arm') || new THREE.Quaternion();
    case 'ARM_R_LOWER':
      return getQuaternion(pose, 'Right_Lower_Arm') || new THREE.Quaternion();
    case 'HAND_R':
      return getQuaternion(pose, 'Right_Hand') || new THREE.Quaternion();
    case 'LEG_L_UPPER':
      return getQuaternion(pose, 'Left_Upper_Leg') || new THREE.Quaternion();
    case 'LEG_L_LOWER':
      return getQuaternion(pose, 'Left_Lower_Leg') || new THREE.Quaternion();
    case 'FOOT_L':
      return getQuaternion(pose, 'Left_Foot') || new THREE.Quaternion();
    case 'LEG_R_UPPER':
      return getQuaternion(pose, 'Right_Upper_Leg') || new THREE.Quaternion();
    case 'LEG_R_LOWER':
      return getQuaternion(pose, 'Right_Lower_Leg') || new THREE.Quaternion();
    case 'FOOT_R':
      return getQuaternion(pose, 'Right_Foot') || new THREE.Quaternion();
    default:
      return new THREE.Quaternion();
  }
}

function unwrapEulerAngle(angle, previousAngle) {
  if (!Number.isFinite(previousAngle)) return angle;

  let unwrapped = angle;
  while ((unwrapped - previousAngle) > Math.PI) {
    unwrapped -= Math.PI * 2;
  }
  while ((unwrapped - previousAngle) < -Math.PI) {
    unwrapped += Math.PI * 2;
  }
  return unwrapped;
}

function buildNodeLookup(group) {
  const lookup = new Map();
  group?.traverse((node) => {
    const rawName = String(node?.userData?.name || node?.name || '').trim();
    const normalized = normalizeNodeName(rawName);
    if (normalized && !lookup.has(normalized)) {
      lookup.set(normalized, rawName);
    }
  });
  return lookup;
}

function resolveTargetName(groupLookup, outputJointName) {
  const candidates = TARGET_NAME_CANDIDATES[outputJointName] || [outputJointName];
  for (const candidate of candidates) {
    const resolved = groupLookup.get(normalizeNodeName(candidate));
    if (resolved) {
      return resolved;
    }
  }
  return null;
}

function resolveRootTargetName(group) {
  return String(group?.userData?.name || group?.name || 'GROUP').trim() || 'GROUP';
}

function applyFacingYaw(delta, group) {
  const facingYaw = Number.isFinite(group?.userData?.defaultFacingYaw)
    ? group.userData.defaultFacingYaw
    : (Number.isFinite(group?.rotation?.y) ? group.rotation.y : 0);

  if (Math.abs(facingYaw) < 1e-6) {
    return delta;
  }

  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw);
}

function buildRotationTrack(frames, outputJointName, targetName, characterIndex) {
  const restPose = buildPoseForCharacter(frames[0], characterIndex);
  const restQuaternion = resolveOutputQuaternion(restPose, outputJointName);
  const inverseRestQuaternion = restQuaternion.clone().invert();
  let previousEuler = null;

  return {
    target: targetName,
    property: 'rotation',
    interpolation: 'linear',
    keyframes: frames.map((frame) => {
      const pose = buildPoseForCharacter(frame, characterIndex);
      const deltaQuaternion = inverseRestQuaternion
        .clone()
        .multiply(resolveOutputQuaternion(pose, outputJointName))
        .normalize();
      const euler = new THREE.Euler().setFromQuaternion(deltaQuaternion, 'XYZ');
      const value = previousEuler
        ? [
            unwrapEulerAngle(euler.x, previousEuler[0]),
            unwrapEulerAngle(euler.y, previousEuler[1]),
            unwrapEulerAngle(euler.z, previousEuler[2]),
          ]
        : [euler.x, euler.y, euler.z];

      previousEuler = value;
      return {
        time: frame.time,
        value,
      };
    }),
  };
}

function buildRootPositionTrack(frames, group, characterIndex) {
  const rootTargetName = resolveRootTargetName(group);
  const basePosition = group?.position?.clone?.() || new THREE.Vector3();
  const restPose = buildPoseForCharacter(frames[0], characterIndex);
  const restPosition = getPosition(restPose, 'Hips') || new THREE.Vector3();

  return {
    target: rootTargetName,
    property: 'position',
    interpolation: 'linear',
    keyframes: frames.map((frame) => {
      const pose = buildPoseForCharacter(frame, characterIndex);
      const currentPosition = getPosition(pose, 'Hips') || restPosition.clone();
      const delta = applyFacingYaw(currentPosition.clone().sub(restPosition), group);
      return {
        time: frame.time,
        value: [
          basePosition.x + delta.x,
          basePosition.y + delta.y,
          basePosition.z + delta.z,
        ],
      };
    }),
  };
}

export function isFastPoserAnimationAsset(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && data.format === FAST_POSER_ASSET_FORMAT
    && data.type === FAST_POSER_TYPE_ANIMATION
    && Array.isArray(data.keyframes);
}

export function convertFastPoserAnimationAsset(data, group) {
  if (!isFastPoserAnimationAsset(data)) {
    return {
      success: false,
      error: 'Not a Fast Poser animation asset.',
    };
  }

  const frames = data.keyframes
    .filter((frame) => Number.isFinite(frame?.time) && frame.time >= 0)
    .slice()
    .sort((a, b) => a.time - b.time);

  if (frames.length === 0) {
    return {
      success: false,
      error: 'The Fast Poser animation has no valid keyframes.',
    };
  }

  const characterIndex = chooseCharacterIndex(data);
  const groupLookup = buildNodeLookup(group);
  const tracks = [];

  tracks.push(buildRootPositionTrack(frames, group, characterIndex));

  OUTPUT_JOINTS.forEach((outputJointName) => {
    const targetName = resolveTargetName(groupLookup, outputJointName);
    if (!targetName) return;
    tracks.push(buildRotationTrack(frames, outputJointName, targetName, characterIndex));
  });

  if (tracks.length === 0) {
    return {
      success: false,
      error: 'No compatible tracks were generated for the selected group.',
    };
  }

  return {
    success: true,
    data: {
      name: data.name || 'Fast Poser Animation',
      duration: frames[frames.length - 1]?.time || 0.1,
      loop: true,
      source: 'fast-poser',
      sourceFormat: data.format,
      sourceCharacterIndex: characterIndex,
      sourcePlaybackSpeed: Number.isFinite(data.playbackSpeed) ? data.playbackSpeed : 1,
      tracks,
    },
  };
}
