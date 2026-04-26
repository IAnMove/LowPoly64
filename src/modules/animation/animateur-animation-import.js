import * as THREE from 'three';

export const FAST_POSER_ASSET_FORMAT = 'fast-poser-asset';
export const FAST_POSER_POSE_LIBRARY_FORMAT = 'fast-poser:pose-library';

const FAST_POSER_TYPE_ANIMATION = 'animation';
const FAST_POSER_TYPE_POSE_LIBRARY = 'pose-library';

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
  CLAVICLE_L: Object.freeze(['CLAVICLE_L', 'LEFT_SHOULDER', 'LEFT_CLAVICLE']),
  ARM_L_UPPER: Object.freeze(['ARM_L_UPPER', 'LEFT_ARM_UPPER', 'LEFT_ARM']),
  ARM_L_LOWER: Object.freeze(['ARM_L_LOWER', 'LEFT_ARM_LOWER', 'LEFT_FOREARM']),
  HAND_L: Object.freeze(['HAND_L', 'LEFT_HAND', 'HAND_LEFT']),
  CLAVICLE_R: Object.freeze(['CLAVICLE_R', 'RIGHT_SHOULDER', 'RIGHT_CLAVICLE']),
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

const OUTPUT_JOINT_TO_FAST_POSER_NAME = Object.freeze({
  PELVIS: 'Hips',
  SPINE: 'Spine',
  CHEST: 'Chest',
  NECK: 'Neck',
  HEAD: 'Head',
  CLAVICLE_L: 'Left_Shoulder',
  ARM_L_UPPER: 'Left_Upper_Arm',
  ARM_L_LOWER: 'Left_Lower_Arm',
  HAND_L: 'Left_Hand',
  CLAVICLE_R: 'Right_Shoulder',
  ARM_R_UPPER: 'Right_Upper_Arm',
  ARM_R_LOWER: 'Right_Lower_Arm',
  HAND_R: 'Right_Hand',
  LEG_L_UPPER: 'Left_Upper_Leg',
  LEG_L_LOWER: 'Left_Lower_Leg',
  FOOT_L: 'Left_Foot',
  LEG_R_UPPER: 'Right_Upper_Leg',
  LEG_R_LOWER: 'Right_Lower_Leg',
  FOOT_R: 'Right_Foot',
});

export const FAST_POSER_OUTPUT_JOINTS = OUTPUT_JOINTS;

function normalizeNodeName(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function roundFloat(value, precision = 6) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
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
      return getQuaternion(pose, 'Left_Shoulder')
        || getQuaternion(pose, 'Left_Clavicle')
        || new THREE.Quaternion();
    case 'ARM_L_UPPER':
      return getQuaternion(pose, 'Left_Upper_Arm') || new THREE.Quaternion();
    case 'ARM_L_LOWER':
      return getQuaternion(pose, 'Left_Lower_Arm') || new THREE.Quaternion();
    case 'HAND_L':
      return getQuaternion(pose, 'Left_Hand') || new THREE.Quaternion();
    case 'CLAVICLE_R':
      return getQuaternion(pose, 'Right_Shoulder')
        || getQuaternion(pose, 'Right_Clavicle')
        || new THREE.Quaternion();
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

function hasOutputQuaternionData(pose, outputJointName) {
  switch (outputJointName) {
    case 'PELVIS':
      return !!getQuaternion(pose, 'Hips');
    case 'SPINE':
      return !!(getQuaternion(pose, 'Spine') || getQuaternion(pose, 'Chest'));
    case 'CHEST':
      return !!(getQuaternion(pose, 'Chest') || (getQuaternion(pose, 'Spine') && getQuaternion(pose, 'Head')));
    case 'NECK':
      return !!(getQuaternion(pose, 'Neck') || ((getQuaternion(pose, 'Chest') || getQuaternion(pose, 'Spine')) && getQuaternion(pose, 'Head')));
    case 'HEAD':
      return !!getQuaternion(pose, 'Head');
    case 'CLAVICLE_L':
      return !!(getQuaternion(pose, 'Left_Shoulder') || getQuaternion(pose, 'Left_Clavicle'));
    case 'ARM_L_UPPER':
      return !!getQuaternion(pose, 'Left_Upper_Arm');
    case 'ARM_L_LOWER':
      return !!getQuaternion(pose, 'Left_Lower_Arm');
    case 'HAND_L':
      return !!getQuaternion(pose, 'Left_Hand');
    case 'CLAVICLE_R':
      return !!(getQuaternion(pose, 'Right_Shoulder') || getQuaternion(pose, 'Right_Clavicle'));
    case 'ARM_R_UPPER':
      return !!getQuaternion(pose, 'Right_Upper_Arm');
    case 'ARM_R_LOWER':
      return !!getQuaternion(pose, 'Right_Lower_Arm');
    case 'HAND_R':
      return !!getQuaternion(pose, 'Right_Hand');
    case 'LEG_L_UPPER':
      return !!getQuaternion(pose, 'Left_Upper_Leg');
    case 'LEG_L_LOWER':
      return !!getQuaternion(pose, 'Left_Lower_Leg');
    case 'FOOT_L':
      return !!getQuaternion(pose, 'Left_Foot');
    case 'LEG_R_UPPER':
      return !!getQuaternion(pose, 'Right_Upper_Leg');
    case 'LEG_R_LOWER':
      return !!getQuaternion(pose, 'Right_Lower_Leg');
    case 'FOOT_R':
      return !!getQuaternion(pose, 'Right_Foot');
    default:
      return false;
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

function findTargetNodeByName(group, targetName) {
  if (!group || !targetName) return null;
  let result = null;
  group.traverse((node) => {
    if (result) return;
    const rawName = String(node?.userData?.name || node?.name || '').trim();
    if (rawName === targetName) {
      result = node;
    }
  });
  return result;
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

function getFacingYaw(group) {
  return Number.isFinite(group?.userData?.defaultFacingYaw)
    ? group.userData.defaultFacingYaw
    : (Number.isFinite(group?.rotation?.y) ? group.rotation.y : 0);
}

function applyFacingYaw(delta, group) {
  const facingYaw = getFacingYaw(group);

  if (Math.abs(facingYaw) < 1e-6) {
    return delta;
  }

  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), facingYaw);
}

function removeFacingYaw(delta, group) {
  const facingYaw = getFacingYaw(group);

  if (Math.abs(facingYaw) < 1e-6) {
    return delta;
  }

  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), -facingYaw);
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

export function isFastPoserPoseLibrary(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && data.format === FAST_POSER_POSE_LIBRARY_FORMAT
    && data.type === FAST_POSER_TYPE_POSE_LIBRARY
    && Array.isArray(data.poses);
}

export function resolveFastPoserTargetsForGroup(group) {
  const groupLookup = buildNodeLookup(group);
  return Object.fromEntries(
    OUTPUT_JOINTS.map((outputJointName) => [outputJointName, resolveTargetName(groupLookup, outputJointName)])
  );
}

export function hasFastPoserPoseOutputJoint(pose, outputJointName) {
  return hasOutputQuaternionData(pose, outputJointName);
}

export function getFastPoserPoseQuaternion(pose, outputJointName) {
  if (!hasOutputQuaternionData(pose, outputJointName)) {
    return null;
  }
  return resolveOutputQuaternion(pose, outputJointName).clone();
}

export function buildFastPoserPoseEntryFromGroup(group, options = {}) {
  if (!group?.isGroup) {
    return {
      success: false,
      error: 'A target group is required to capture a Fast Poser pose.',
    };
  }

  const characterIndex = Number.isInteger(options.characterIndex) && options.characterIndex >= 0 ? options.characterIndex : 0;
  const resolvedTargets = resolveFastPoserTargetsForGroup(group);
  const pose = {};

  OUTPUT_JOINTS.forEach((outputJointName) => {
    const fastPoserJointName = OUTPUT_JOINT_TO_FAST_POSER_NAME[outputJointName];
    const targetName = resolvedTargets[outputJointName];
    const targetNode = targetName ? findTargetNodeByName(group, targetName) : null;
    if (!fastPoserJointName || !targetNode) return;

    pose[`${fastPoserJointName}_${characterIndex}`] = {
      position: vectorToArray(targetNode.position?.clone?.() || new THREE.Vector3()),
      quaternion: quaternionToArray(targetNode.quaternion?.clone?.() || new THREE.Quaternion()),
    };
  });

  return {
    success: true,
    data: {
      name: String(options.name || 'Pose').trim() || 'Pose',
      characterIndex,
      pose,
    },
  };
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
  const resolvedTargets = Object.fromEntries(
    OUTPUT_JOINTS.map((outputJointName) => [outputJointName, resolveTargetName(groupLookup, outputJointName)])
  );
  const resolvedJointCount = Object.values(resolvedTargets).filter(Boolean).length;
  if (resolvedJointCount === 0) {
    return {
      success: false,
      error: 'No compatible humanoid tracks were found for the selected group.',
    };
  }

  const tracks = [];

  tracks.push(buildRootPositionTrack(frames, group, characterIndex));

  OUTPUT_JOINTS.forEach((outputJointName) => {
    const targetName = resolvedTargets[outputJointName];
    if (!targetName) return;
    tracks.push(buildRotationTrack(frames, outputJointName, targetName, characterIndex));
  });

  const missingJointCount = OUTPUT_JOINTS.length - resolvedJointCount;
  const warnings = missingJointCount > 0
    ? [`Imported partial humanoid animation: ${resolvedJointCount}/${OUTPUT_JOINTS.length} humanoid joints mapped.`]
    : null;

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
    ...(warnings ? { warnings } : {}),
  };
}

function buildAnimationTrackLookup(animationDef) {
  const lookup = new Map();
  (animationDef?.tracks || []).forEach((track) => {
    const targetName = String(track?.target || '').trim();
    const property = String(track?.property || '').trim();
    if (!targetName || !property) return;
    lookup.set(`${targetName}|${property}`, track);
  });
  return lookup;
}

function collectAnimationSampleTimes(animationDef, resolvedTargets = []) {
  const times = new Set();
  const allowedTargets = new Set(resolvedTargets.filter(Boolean));

  (animationDef?.tracks || []).forEach((track) => {
    const targetName = String(track?.target || '').trim();
    if (!allowedTargets.has(targetName)) return;
    (track.keyframes || []).forEach((keyframe) => {
      if (!Number.isFinite(keyframe?.time)) return;
      times.add(roundFloat(keyframe.time, 5));
    });
  });

  if (times.size === 0) {
    times.add(0);
    if (Number.isFinite(animationDef?.duration) && animationDef.duration > 0) {
      times.add(roundFloat(animationDef.duration, 5));
    }
  }

  return Array.from(times).sort((a, b) => a - b);
}

function sampleTrackValue(track, time) {
  const keyframes = track?.keyframes || [];
  if (!keyframes.length) return null;
  if (time <= keyframes[0].time) {
    return Array.isArray(keyframes[0].value) ? [...keyframes[0].value] : keyframes[0].value;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const next = keyframes[index];
    if (time > next.time) continue;

    if (Math.abs(time - next.time) < 1e-6) {
      return Array.isArray(next.value) ? [...next.value] : next.value;
    }

    if (track.interpolation === 'step') {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    if (!Array.isArray(previous.value) || !Array.isArray(next.value) || previous.value.length !== next.value.length) {
      return Array.isArray(previous.value) ? [...previous.value] : previous.value;
    }

    const span = Math.max(next.time - previous.time, 1e-6);
    const alpha = THREE.MathUtils.clamp((time - previous.time) / span, 0, 1);
    return previous.value.map((value, valueIndex) => THREE.MathUtils.lerp(value ?? 0, next.value[valueIndex] ?? 0, alpha));
  }

  const last = keyframes[keyframes.length - 1];
  return Array.isArray(last.value) ? [...last.value] : last.value;
}

function quaternionToArray(quaternion) {
  return [
    roundFloat(quaternion.x),
    roundFloat(quaternion.y),
    roundFloat(quaternion.z),
    roundFloat(quaternion.w),
  ];
}

function vectorToArray(vector) {
  return [
    roundFloat(vector.x),
    roundFloat(vector.y),
    roundFloat(vector.z),
  ];
}

function buildFastPoserPoseFrame(time, animationDef, group, options = {}) {
  const characterIndex = Number.isInteger(options.characterIndex) && options.characterIndex >= 0 ? options.characterIndex : 0;
  const rootTargetName = resolveRootTargetName(group);
  const rootTrack = options.trackLookup.get(`${rootTargetName}|position`) || null;
  const groupBasePosition = group?.position?.clone?.() || new THREE.Vector3();
  const rootSample = Array.isArray(sampleTrackValue(rootTrack, time))
    ? sampleTrackValue(rootTrack, time)
    : [groupBasePosition.x, groupBasePosition.y, groupBasePosition.z];

  const pose = {};
  const pelvisTargetName = options.resolvedTargets.PELVIS || null;
  const pelvisNode = pelvisTargetName ? findTargetNodeByName(group, pelvisTargetName) : null;
  const pelvisRestPosition = pelvisNode?.position?.clone?.() || new THREE.Vector3();
  const pelvisSourceDelta = removeFacingYaw(new THREE.Vector3(
    (rootSample[0] ?? groupBasePosition.x) - groupBasePosition.x,
    (rootSample[1] ?? groupBasePosition.y) - groupBasePosition.y,
    (rootSample[2] ?? groupBasePosition.z) - groupBasePosition.z
  ), group);

  OUTPUT_JOINTS.forEach((outputJointName) => {
    const fastPoserJointName = OUTPUT_JOINT_TO_FAST_POSER_NAME[outputJointName];
    if (!fastPoserJointName) return;

    const targetName = options.resolvedTargets[outputJointName] || null;
    const targetNode = targetName ? findTargetNodeByName(group, targetName) : null;
    const rotationTrack = targetName ? options.trackLookup.get(`${targetName}|rotation`) : null;
    const rotationValue = Array.isArray(sampleTrackValue(rotationTrack, time))
      ? sampleTrackValue(rotationTrack, time)
      : [0, 0, 0];
    const restQuaternion = targetNode?.quaternion?.clone?.() || new THREE.Quaternion();
    const deltaQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      rotationValue[0] ?? 0,
      rotationValue[1] ?? 0,
      rotationValue[2] ?? 0,
      'XYZ'
    ));
    const absoluteQuaternion = restQuaternion.clone().multiply(deltaQuaternion).normalize();
    const restPosition = targetNode?.position?.clone?.() || new THREE.Vector3();
    const position = outputJointName === 'PELVIS'
      ? pelvisRestPosition.clone().add(pelvisSourceDelta)
      : restPosition;

    pose[`${fastPoserJointName}_${characterIndex}`] = {
      position: vectorToArray(position),
      quaternion: quaternionToArray(absoluteQuaternion),
    };
  });

  return {
    time: roundFloat(time, 5),
    pose,
  };
}

export function convertAnimationDefinitionToFastPoserAsset(animationDef, group, options = {}) {
  if (!animationDef || typeof animationDef !== 'object' || Array.isArray(animationDef)) {
    return {
      success: false,
      error: 'Animation definition is missing or invalid.',
    };
  }

  if (!group?.isGroup) {
    return {
      success: false,
      error: 'A target group is required to export a Fast Poser animation.',
    };
  }

  const characterIndex = Number.isInteger(options.characterIndex) && options.characterIndex >= 0 ? options.characterIndex : 0;
  const groupLookup = buildNodeLookup(group);
  const resolvedTargets = Object.fromEntries(
    OUTPUT_JOINTS.map((outputJointName) => [outputJointName, resolveTargetName(groupLookup, outputJointName)])
  );
  const resolvedJointCount = Object.values(resolvedTargets).filter(Boolean).length;
  if (resolvedJointCount === 0) {
    return {
      success: false,
      error: 'No compatible humanoid tracks were found for the selected group.',
    };
  }

  const rootTargetName = resolveRootTargetName(group);
  const trackLookup = buildAnimationTrackLookup(animationDef);
  const sampleTimes = collectAnimationSampleTimes(animationDef, [...Object.values(resolvedTargets), rootTargetName]);

  if (sampleTimes.length === 0) {
    return {
      success: false,
      error: 'The animation has no keyframes to export.',
    };
  }

  const missingJointCount = OUTPUT_JOINTS.length - resolvedJointCount;
  const warnings = missingJointCount > 0
    ? [`Exported partial humanoid animation: ${resolvedJointCount}/${OUTPUT_JOINTS.length} humanoid joints mapped.`]
    : null;

  return {
    success: true,
    data: {
      format: FAST_POSER_ASSET_FORMAT,
      version: 1,
      type: FAST_POSER_TYPE_ANIMATION,
      name: animationDef.name || 'Fast Poser Export',
      playbackSpeed: Number.isFinite(animationDef.sourcePlaybackSpeed) ? animationDef.sourcePlaybackSpeed : 1,
      duration: Number.isFinite(animationDef.duration) ? roundFloat(animationDef.duration, 5) : sampleTimes[sampleTimes.length - 1],
      effects: {
        targetCharacter: characterIndex,
      },
      keyframes: sampleTimes.map((time) => buildFastPoserPoseFrame(time, animationDef, group, {
        characterIndex,
        resolvedTargets,
        trackLookup,
      })),
    },
    ...(warnings ? { warnings } : {}),
  };
}
