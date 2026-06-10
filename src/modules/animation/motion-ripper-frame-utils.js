import * as THREE from 'three';
import {
  MOTION_TIME_STEP,
  POSE_JOINTS,
  PREVIEW_RIG_JOINTS,
} from './motion-ripper-constants.js';

export function roundTime(value) {
  return Math.round(((value || 0) + Number.EPSILON) / MOTION_TIME_STEP) * MOTION_TIME_STEP;
}

export function cloneLandmarks(landmarks = []) {
  return landmarks.map((landmark) => (landmark ? { ...landmark } : null));
}

export function cloneFrameLandmarkData(frame = {}) {
  return cloneLandmarks(frame.landmarks || []);
}

export function getFrameKey(time) {
  return roundTime(time).toFixed(1);
}

function cloneSerializedTransform(transform = {}) {
  return {
    position: Array.isArray(transform.position) ? [...transform.position] : [0, 0, 0],
    quaternion: Array.isArray(transform.quaternion) ? [...transform.quaternion] : [0, 0, 0, 1],
    confidence: Number.isFinite(transform.confidence) ? transform.confidence : 0,
  };
}

export function cloneSerializedPose(pose = {}) {
  const clonedPose = {};
  POSE_JOINTS.forEach((jointName) => {
    clonedPose[jointName] = cloneSerializedTransform(pose[jointName]);
  });
  return clonedPose;
}

function cloneCapturedRigData(capturedRig = null) {
  if (!capturedRig) return null;
  const clonedRig = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    clonedRig[jointName] = Array.isArray(capturedRig[jointName]) ? [...capturedRig[jointName]] : null;
  });
  return clonedRig;
}

export function cloneRecordedFrame(frame = {}) {
  return {
    time: roundTime(frame.time || 0),
    pose: cloneSerializedPose(frame.pose),
    capturedRig: cloneCapturedRigData(frame.capturedRig),
    landmarks: cloneFrameLandmarkData(frame),
  };
}

export function reindexRecordedFrames(frames) {
  return (frames || [])
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((frame, index) => ({
      ...cloneRecordedFrame(frame),
      time: roundTime(index * MOTION_TIME_STEP),
    }));
}

function interpolateNumberArray(a, b, t) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.map((value, index) => THREE.MathUtils.lerp(value, b[index], t));
  }
  if (Array.isArray(a)) return [...a];
  if (Array.isArray(b)) return [...b];
  return null;
}

function interpolateQuaternionArray(a, b, t) {
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return [0, 0, 0, 1];
  }
  if (!Array.isArray(a)) return [...b];
  if (!Array.isArray(b)) return [...a];
  const qa = new THREE.Quaternion(a[0], a[1], a[2], a[3]);
  const qb = new THREE.Quaternion(b[0], b[1], b[2], b[3]);
  qa.slerp(qb, t).normalize();
  return [qa.x, qa.y, qa.z, qa.w];
}

export function buildRepairedFrame(currentFrame, previousFrame, nextFrame) {
  if (!currentFrame) return null;
  const targetTime = roundTime(currentFrame.time || 0);

  if (!previousFrame && !nextFrame) {
    return cloneRecordedFrame(currentFrame);
  }

  if (!previousFrame || !nextFrame) {
    const sourceFrame = cloneRecordedFrame(previousFrame || nextFrame);
    sourceFrame.time = targetTime;
    return sourceFrame;
  }

  const timeSpan = Math.max(nextFrame.time - previousFrame.time, MOTION_TIME_STEP);
  const blend = THREE.MathUtils.clamp((targetTime - previousFrame.time) / timeSpan, 0, 1);
  const repairedPose = {};
  POSE_JOINTS.forEach((jointName) => {
    repairedPose[jointName] = {
      position: interpolateNumberArray(previousFrame.pose?.[jointName]?.position, nextFrame.pose?.[jointName]?.position, blend) || [0, 0, 0],
      quaternion: interpolateQuaternionArray(previousFrame.pose?.[jointName]?.quaternion, nextFrame.pose?.[jointName]?.quaternion, blend),
      confidence: THREE.MathUtils.lerp(
        previousFrame.pose?.[jointName]?.confidence ?? nextFrame.pose?.[jointName]?.confidence ?? 0,
        nextFrame.pose?.[jointName]?.confidence ?? previousFrame.pose?.[jointName]?.confidence ?? 0,
        blend
      ),
    };
  });

  const repairedRig = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    repairedRig[jointName] = interpolateNumberArray(previousFrame.capturedRig?.[jointName], nextFrame.capturedRig?.[jointName], blend);
  });

  const repairedLandmarks = [];
  const maxLandmarks = Math.max(previousFrame.landmarks?.length || 0, nextFrame.landmarks?.length || 0);
  for (let index = 0; index < maxLandmarks; index += 1) {
    const previousLandmark = previousFrame.landmarks?.[index];
    const nextLandmark = nextFrame.landmarks?.[index];
    if (!previousLandmark && !nextLandmark) {
      repairedLandmarks[index] = null;
      continue;
    }
    repairedLandmarks[index] = {
      ...(previousLandmark || nextLandmark || {}),
      x: THREE.MathUtils.lerp(previousLandmark?.x ?? nextLandmark?.x ?? 0, nextLandmark?.x ?? previousLandmark?.x ?? 0, blend),
      y: THREE.MathUtils.lerp(previousLandmark?.y ?? nextLandmark?.y ?? 0, nextLandmark?.y ?? previousLandmark?.y ?? 0, blend),
      z: THREE.MathUtils.lerp(previousLandmark?.z ?? nextLandmark?.z ?? 0, nextLandmark?.z ?? previousLandmark?.z ?? 0, blend),
      visibility: THREE.MathUtils.lerp(previousLandmark?.visibility ?? nextLandmark?.visibility ?? 1, nextLandmark?.visibility ?? previousLandmark?.visibility ?? 1, blend),
    };
  }

  return {
    time: targetTime,
    pose: repairedPose,
    capturedRig: repairedRig,
    landmarks: repairedLandmarks,
  };
}
