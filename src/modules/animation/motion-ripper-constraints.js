import * as THREE from 'three';
import {
  CAPTURE_JOINTS,
  LATERAL_RUNNER_FOOT_LOCK_BLEND,
  LATERAL_RUNNER_FOOT_RELEASE_BLEND,
  LATERAL_RUNNER_MAX_ROTATION_STEP,
  LATERAL_RUNNER_ROOT_DEPTH_RATIO,
  LATERAL_RUNNER_ROOT_MAX_STEP_RATIO,
  LATERAL_RUNNER_ROOT_SMOOTHING,
  LATERAL_RUNNER_ROOT_VERTICAL_RATIO,
  LATERAL_RUNNER_ROTATION_LIMITS,
  LATERAL_RUNNER_ROTATION_SMOOTHING,
} from './motion-ripper-constants.js';
import {
  buildSkeletonWorldPositionMap,
  getCaptureSkeletonParentName,
  getVectorBounds,
} from './motion-ripper-skeleton-utils.js';

function isLateralRunnerCapture(captureFacingMode) {
  return captureFacingMode === 'left' || captureFacingMode === 'right';
}

function getLateralRunnerLimitKey(targetName) {
  if (targetName === 'CHEST' || targetName === 'NECK' || targetName === 'HEAD') return targetName;
  if (targetName === 'CLAVICLE_L' || targetName === 'CLAVICLE_R') return 'CLAVICLE';
  if (targetName === 'ARM_L_UPPER' || targetName === 'ARM_R_UPPER') return 'ARM_UPPER';
  if (targetName === 'ARM_L_LOWER' || targetName === 'ARM_R_LOWER') return 'ARM_LOWER';
  if (targetName === 'HAND_L' || targetName === 'HAND_R') return 'HAND';
  if (targetName === 'LEG_L_UPPER' || targetName === 'LEG_R_UPPER') return 'LEG_UPPER';
  if (targetName === 'LEG_L_LOWER' || targetName === 'LEG_R_LOWER') return 'LEG_LOWER';
  if (targetName === 'FOOT_L' || targetName === 'FOOT_R') return 'FOOT';
  return null;
}

function normalizeAngleForConstraint(angle) {
  return Math.atan2(Math.sin(angle || 0), Math.cos(angle || 0));
}

function clampAngleToRange(angle, range) {
  const normalized = normalizeAngleForConstraint(angle);
  if (!Array.isArray(range) || range.length !== 2) return normalized;
  return THREE.MathUtils.clamp(normalized, range[0], range[1]);
}

function constrainEulerValue(value, limits) {
  const source = Array.isArray(value) ? value : [0, 0, 0];
  return [0, 1, 2].map((axis) => clampAngleToRange(source[axis] || 0, limits?.[axis]));
}

export function unwrapEulerAngle(angle, previousAngle) {
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

function smoothConstrainedRotationKeyframes(keyframes) {
  let previous = null;
  return (keyframes || []).map((keyframe) => {
    let value = Array.isArray(keyframe.value) ? [...keyframe.value] : [0, 0, 0];
    if (previous) {
      value = value.map((axisValue, axis) => {
        const unwrapped = unwrapEulerAngle(axisValue, previous[axis]);
        const maxStep = LATERAL_RUNNER_MAX_ROTATION_STEP;
        const stepped = THREE.MathUtils.clamp(unwrapped, previous[axis] - maxStep, previous[axis] + maxStep);
        return previous[axis] + ((stepped - previous[axis]) * (1 - LATERAL_RUNNER_ROTATION_SMOOTHING));
      });
    }
    previous = value;
    return {
      ...keyframe,
      value,
    };
  });
}

function applyLateralRunnerRotationLimits(animDef) {
  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => {
      if (track?.property !== 'rotation') {
        return {
          ...track,
          keyframes: (track.keyframes || []).map((keyframe) => ({
            ...keyframe,
            value: Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value,
          })),
        };
      }

      const limitKey = getLateralRunnerLimitKey(track.target);
      const limits = limitKey ? LATERAL_RUNNER_ROTATION_LIMITS[limitKey] : null;
      const keyframes = (track.keyframes || []).map((keyframe) => ({
        ...keyframe,
        value: limits
          ? constrainEulerValue(keyframe.value, limits)
          : (Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value),
      }));

      return {
        ...track,
        interpolation: track.interpolation === 'step' ? track.interpolation : 'linear',
        keyframes: limits ? smoothConstrainedRotationKeyframes(keyframes) : keyframes,
      };
    }),
  };
}

function getTrackByTargetAndProperty(animDef, target, property) {
  return (animDef?.tracks || []).find((track) => track?.target === target && track?.property === property) || null;
}

function getSourceSkeletonHeight(sourceSkeleton) {
  const world = buildSkeletonWorldPositionMap(sourceSkeleton);
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => world.get(jointName)));
  return Math.max(bounds?.size?.y || 1, 1);
}

function applyLateralRunnerRootMotionLimits(animDef) {
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  const sourceKeyframes = rootTrack?.keyframes || [];
  if (!rootTrack || sourceKeyframes.length < 2) return animDef;

  const height = getSourceSkeletonHeight(animDef.sourceSkeleton);
  const rest = Array.isArray(sourceKeyframes[0]?.value) ? sourceKeyframes[0].value : [0, 0, 0];
  const maxVertical = Math.max(height * LATERAL_RUNNER_ROOT_VERTICAL_RATIO, 0.025);
  const maxDepth = Math.max(height * LATERAL_RUNNER_ROOT_DEPTH_RATIO, 0.02);
  const maxStep = Math.max(height * LATERAL_RUNNER_ROOT_MAX_STEP_RATIO, 0.012);
  let previous = [...rest];

  const keyframes = sourceKeyframes.map((keyframe, index) => {
    const source = Array.isArray(keyframe.value) ? keyframe.value : rest;
    if (index === 0) {
      previous = [source[0] || 0, rest[1] || 0, rest[2] || 0];
      return {
        ...keyframe,
        value: [...previous],
      };
    }

    const clampedY = (rest[1] || 0) + THREE.MathUtils.clamp((source[1] || 0) - (rest[1] || 0), -maxVertical, maxVertical);
    const clampedZ = (rest[2] || 0) + THREE.MathUtils.clamp((source[2] || 0) - (rest[2] || 0), -maxDepth, maxDepth);
    const limitedY = previous[1] + THREE.MathUtils.clamp(clampedY - previous[1], -maxStep, maxStep);
    const limitedZ = previous[2] + THREE.MathUtils.clamp(clampedZ - previous[2], -maxStep, maxStep);
    previous = [
      source[0] || 0,
      previous[1] + ((limitedY - previous[1]) * (1 - LATERAL_RUNNER_ROOT_SMOOTHING)),
      previous[2] + ((limitedZ - previous[2]) * (1 - LATERAL_RUNNER_ROOT_SMOOTHING)),
    ];

    return {
      ...keyframe,
      value: [...previous],
    };
  });

  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => (
      track === rootTrack
        ? { ...track, keyframes }
        : track
    )),
  };
}

function getTrackValueAtIndex(track, index, fallback) {
  const keyframe = track?.keyframes?.[index];
  if (Array.isArray(keyframe?.value)) return [...keyframe.value];
  return Array.isArray(fallback) ? [...fallback] : fallback;
}

function getBoneDefinitionMap(sourceSkeleton) {
  return new Map((sourceSkeleton?.bones || []).map((bone) => [bone.name, bone]));
}

function computeAnimationBoneWorldPose(animDef, frameIndex) {
  const sourceSkeleton = animDef?.sourceSkeleton;
  const boneDefs = getBoneDefinitionMap(sourceSkeleton);
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  const rotationTracks = new Map(
    (animDef?.tracks || [])
      .filter((track) => track?.property === 'rotation')
      .map((track) => [track.target, track])
  );
  const worldPose = new Map();

  function resolve(boneName) {
    if (worldPose.has(boneName)) return worldPose.get(boneName);
    const boneDef = boneDefs.get(boneName);
    if (!boneDef) return null;

    const parentName = boneDef.parent || getCaptureSkeletonParentName(boneName);
    const localPosition = (boneName === 'PELVIS' && rootTrack)
      ? new THREE.Vector3(...getTrackValueAtIndex(rootTrack, frameIndex, boneDef.position || [0, 0, 0]))
      : new THREE.Vector3(...(boneDef.position || [0, 0, 0]));
    const rotationValue = getTrackValueAtIndex(rotationTracks.get(boneName), frameIndex, [0, 0, 0]);
    const localRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      rotationValue[0] || 0,
      rotationValue[1] || 0,
      rotationValue[2] || 0,
      'XYZ'
    ));

    let position = localPosition.clone();
    let quaternion = localRotation.clone();
    if (parentName) {
      const parentPose = resolve(parentName);
      if (parentPose) {
        position = parentPose.position.clone().add(localPosition.clone().applyQuaternion(parentPose.quaternion));
        quaternion = parentPose.quaternion.clone().multiply(localRotation).normalize();
      }
    }

    const pose = { position, quaternion };
    worldPose.set(boneName, pose);
    return pose;
  }

  CAPTURE_JOINTS.forEach((boneName) => resolve(boneName));
  return worldPose;
}

function chooseFootLockCandidate(samples, index, groundY, threshold) {
  const sample = samples[index];
  if (!sample) return null;
  const candidates = ['FOOT_L', 'FOOT_R']
    .map((footName) => {
      const position = sample[footName];
      if (!position) return null;
      const groundDistance = position.y - groundY;
      if (groundDistance > threshold) return null;
      const previous = samples[Math.max(0, index - 1)]?.[footName];
      const next = samples[Math.min(samples.length - 1, index + 1)]?.[footName];
      const verticalMotion = previous && next ? Math.abs(next.y - previous.y) : 0;
      return {
        footName,
        position,
        score: groundDistance + (verticalMotion * 0.75),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score);
  return candidates[0] || null;
}

function applyLateralRunnerFootLock(animDef) {
  const rootTrack = (getTrackByTargetAndProperty(animDef, 'PELVIS', 'position') || getTrackByTargetAndProperty(animDef, 'ROOT', 'position'));
  if (!rootTrack || !animDef?.sourceSkeleton?.bones?.length || (rootTrack.keyframes || []).length < 3) {
    return animDef;
  }

  const height = getSourceSkeletonHeight(animDef.sourceSkeleton);
  const samples = (rootTrack.keyframes || []).map((_, index) => {
    const pose = computeAnimationBoneWorldPose(animDef, index);
    return {
      FOOT_L: pose.get('FOOT_L')?.position?.clone?.() || null,
      FOOT_R: pose.get('FOOT_R')?.position?.clone?.() || null,
    };
  });
  const footPositions = samples.flatMap((sample) => [sample.FOOT_L, sample.FOOT_R]).filter(Boolean);
  if (footPositions.length < 4) return animDef;

  const groundY = footPositions.reduce((min, position) => Math.min(min, position.y), Infinity);
  if (!Number.isFinite(groundY)) return animDef;

  const contactThreshold = Math.max(height * 0.035, 0.045);
  let activeFoot = null;
  let lockPoint = null;
  const runningOffset = new THREE.Vector3();

  const keyframes = rootTrack.keyframes.map((keyframe, index) => {
    const candidate = chooseFootLockCandidate(samples, index, groundY, contactThreshold);
    let targetOffset = new THREE.Vector3();
    let blend = LATERAL_RUNNER_FOOT_RELEASE_BLEND;

    if (candidate) {
      if (activeFoot !== candidate.footName || !lockPoint) {
        activeFoot = candidate.footName;
        lockPoint = candidate.position.clone().add(runningOffset);
      }
      targetOffset = lockPoint.clone().sub(candidate.position);
      targetOffset.y = THREE.MathUtils.clamp(targetOffset.y, -height * 0.025, height * 0.05);
      blend = LATERAL_RUNNER_FOOT_LOCK_BLEND;
    } else {
      activeFoot = null;
      lockPoint = null;
    }

    runningOffset.lerp(targetOffset, blend);
    const source = Array.isArray(keyframe.value) ? keyframe.value : [0, 0, 0];
    return {
      ...keyframe,
      value: [
        (source[0] || 0) + runningOffset.x,
        (source[1] || 0) + runningOffset.y,
        (source[2] || 0) + runningOffset.z,
      ],
    };
  });

  return {
    ...animDef,
    tracks: (animDef.tracks || []).map((track) => (
      track === rootTrack
        ? { ...track, keyframes }
        : track
    )),
  };
}

export function applyCaptureAnimationConstraints(
  animDef,
  frames,
  captureTrackOptions = null,
  { captureFacingMode = 'front' } = {}
) {
  if (!animDef || !isLateralRunnerCapture(captureFacingMode)) {
    return animDef;
  }

  const constrainedRotations = applyLateralRunnerRotationLimits(animDef);
  const constrainedRootMotion = applyLateralRunnerRootMotionLimits(constrainedRotations);
  const constrainedMotion = applyLateralRunnerFootLock(constrainedRootMotion);
  return {
    ...constrainedMotion,
    constraints: {
      ...(constrainedMotion.constraints || {}),
      profile: 'lateral-runner',
      captureFacing: captureFacingMode,
      footLock: true,
      rotationLimits: true,
      rootMotionLimits: true,
      suppressedCaptureJoints: Array.from(captureTrackOptions?.suppressedCaptureJoints || []),
      frameCount: Array.isArray(frames) ? frames.length : 0,
    },
  };
}
