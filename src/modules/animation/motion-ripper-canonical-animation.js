import * as THREE from 'three';
import {
  CAPTURE_JOINTS,
  HUMANOID_CAPTURE_SKELETON_ID,
  JOINT_CONFIDENCE_THRESHOLDS,
} from './motion-ripper-constants.js';
import { applyCaptureAnimationConstraints, unwrapEulerAngle } from './motion-ripper-constraints.js';
import { buildCapturedSkeletonDefinition } from './motion-ripper-capture-character.js';
import {
  getPoseConfidenceValue,
  getPoseQuaternion,
} from './motion-ripper-pose-solver.js';

function computeCaptureRestPose(frames, captureRestPose = null) {
  const restFrame = captureRestPose || (Array.isArray(frames) && frames.length > 0 ? frames[0] : null);
  const restPose = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    restPose[jointName] = getPoseQuaternion(restFrame, jointName);
  });

  return restPose;
}

function buildNormalizedRotationKeyframes(frames, jointName, restQuaternion) {
  const inverseRestQuaternion = restQuaternion.clone().invert();
  let previousEuler = null;

  return frames.map((frame) => {
    const currentQuaternion = getPoseQuaternion(frame, jointName);
    const deltaQuaternion = inverseRestQuaternion.clone().multiply(currentQuaternion).normalize();
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
  });
}

function pickPelvisPosition(pose) {
  const rootPos = pose?.ROOT?.position;
  const rootIsNonZero = Array.isArray(rootPos) && rootPos.some((value) => Number.isFinite(value) && Math.abs(value) > 1e-6);
  if (rootIsNonZero) return rootPos;
  const pelvisPos = pose?.PELVIS?.position;
  if (Array.isArray(pelvisPos)) return pelvisPos;
  return Array.isArray(rootPos) ? rootPos : null;
}

function shouldEmitCapturedJointTrack(frames, jointName) {
  const threshold = JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45;
  return frames.some((frame) => getPoseConfidenceValue(frame, jointName) >= threshold);
}

export function buildCanonicalCaptureAnimationDefinition({
  frames,
  name,
  captureTrackOptions,
  captureFacingMode = 'front',
  captureRestPose = null,
}) {
  const duration = frames[frames.length - 1]?.time || 0.1;
  const tracks = [];
  const restPose = computeCaptureRestPose(frames, captureRestPose);
  const sourceSkeleton = buildCapturedSkeletonDefinition(frames, { captureFacingMode });
  const suppressedCaptureJoints = captureTrackOptions?.suppressedCaptureJoints || new Set();

  CAPTURE_JOINTS.forEach((jointName) => {
    if (suppressedCaptureJoints.has(jointName)) {
      return;
    }
    if (!shouldEmitCapturedJointTrack(frames, jointName)) {
      return;
    }
    tracks.push({
      target: jointName,
      property: 'rotation',
      rotationSpace: 'rest-delta',
      interpolation: 'linear',
      keyframes: buildNormalizedRotationKeyframes(frames, jointName, restPose[jointName] || new THREE.Quaternion()),
    });
  });

  tracks.push({
    target: 'PELVIS',
    property: 'position',
    interpolation: 'linear',
    keyframes: frames.map((frame) => ({
      time: frame.time,
      value: pickPelvisPosition(frame.pose) || [0, 0, 0],
    })),
  });

  const animation = {
    name,
    duration,
    loop: true,
    source: 'motion-ripper',
    sourceSkeletonId: HUMANOID_CAPTURE_SKELETON_ID,
    sourceSkeleton,
    tracks,
  };

  return applyCaptureAnimationConstraints(animation, frames, captureTrackOptions, {
    captureFacingMode,
  });
}
