import * as THREE from 'three';
import {
  CAPTURE_TARGET_ALIASES,
  HUMANOID_CAPTURE_SKELETON_ID,
} from './motion-ripper-constants.js';

function cloneKeyframeValue(value) {
  return Array.isArray(value) ? [...value] : value;
}

function cloneKeyframes(keyframes = []) {
  return keyframes.map((keyframe) => ({
    ...keyframe,
    value: cloneKeyframeValue(keyframe?.value),
  }));
}

export function retimeAnimationDefinition(animDef, speedMultiplier = 1) {
  const clampedSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0 ? speedMultiplier : 1;
  if (!animDef || Math.abs(clampedSpeed - 1) < 1e-6) {
    return animDef;
  }

  return {
    ...animDef,
    duration: (animDef.duration || 0) / clampedSpeed,
    tracks: (animDef.tracks || []).map((track) => ({
      ...track,
      keyframes: (track.keyframes || []).map((keyframe) => ({
        ...keyframe,
        time: keyframe.time / clampedSpeed,
        value: cloneKeyframeValue(keyframe?.value),
      })),
    })),
  };
}

function getStandardTargetName(captureTargetName) {
  return CAPTURE_TARGET_ALIASES[captureTargetName]?.[0] || null;
}

function rotateRootDelta(delta, captureFacingYaw = 0) {
  if (!Number.isFinite(captureFacingYaw) || Math.abs(captureFacingYaw) < 1e-6) {
    return delta;
  }
  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), captureFacingYaw);
}

function convertRootPositionTrack(track, captureFacingYaw = 0) {
  const keyframes = track.keyframes || [];
  if (keyframes.length === 0) return null;

  const rest = keyframes[0]?.value || [0, 0, 0];
  return {
    ...track,
    target: 'Hips',
    property: 'position',
    keyframes: keyframes.map((keyframe) => {
      const value = keyframe.value || [0, 0, 0];
      const delta = new THREE.Vector3(
        (value[0] ?? 0) - (rest[0] ?? 0),
        (value[1] ?? 0) - (rest[1] ?? 0),
        (value[2] ?? 0) - (rest[2] ?? 0)
      );
      const rotatedDelta = rotateRootDelta(delta, captureFacingYaw);
      return {
        ...keyframe,
        value: [rotatedDelta.x, rotatedDelta.y, rotatedDelta.z],
      };
    }),
  };
}

export function convertCaptureAnimationToStandardClip(animDef, { captureFacingYaw = 0 } = {}) {
  if (!animDef?.tracks?.length) return null;

  const tracks = [];
  for (const track of animDef.tracks) {
    if (!track?.target || !track.property) continue;

    const isRootPositionTrack = (track.target === 'PELVIS' || track.target === 'ROOT')
      && track.property === 'position';
    if (isRootPositionTrack) {
      const converted = convertRootPositionTrack(track, captureFacingYaw);
      if (converted) tracks.push(converted);
      continue;
    }

    if (track.property === 'position') {
      continue;
    }

    const targetName = getStandardTargetName(track.target);
    if (!targetName) continue;
    tracks.push({
      ...track,
      target: targetName,
      keyframes: cloneKeyframes(track.keyframes || []),
    });
  }

  if (tracks.length === 0) return null;

  const {
    sourceSkeleton,
    sourceSkeletonId,
    ...rest
  } = animDef;

  return {
    ...rest,
    tracks,
    source: 'motion-ripper-standard',
    sourceSkeletonId: 'HUMANOID_STANDARD',
    motionRipperSourceSkeletonId: sourceSkeletonId || HUMANOID_CAPTURE_SKELETON_ID,
    motionRipperSourceSkeleton: sourceSkeleton || null,
  };
}
