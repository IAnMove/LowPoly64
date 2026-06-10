import * as THREE from 'three';
import {
  cloneFrameLandmarkData,
  cloneLandmarks,
  cloneRecordedFrame,
  getFrameKey,
  roundTime,
} from './motion-ripper-frame-utils.js';
import {
  buildCapturedPreviewRigFromLandmarks,
  serializePose,
} from './motion-ripper-pose-solver.js';

export function getCanonicalCapturedFrames(recordedFrames = []) {
  const uniqueFrames = new Map();
  recordedFrames.forEach((frame) => {
    uniqueFrames.set(frame.time.toFixed(1), {
      time: roundTime(frame.time),
      pose: frame.pose,
      capturedRig: frame.capturedRig || null,
      landmarks: cloneFrameLandmarkData(frame),
    });
  });
  return Array.from(uniqueFrames.values()).sort((a, b) => a.time - b.time);
}

export function replaceRecordedFrameByKey(recordedFrames, frameKey, nextFrame) {
  let replaced = false;
  const frames = recordedFrames.map((frame) => {
    if (getFrameKey(frame.time) !== frameKey) return frame;
    replaced = true;
    return {
      ...cloneRecordedFrame(nextFrame),
      time: roundTime(frame.time),
    };
  });
  return { frames, replaced };
}

export function samplePoseIfRecording(context, nowMs, landmarks = context.getLatestLandmarks()) {
  if (!context.isRecording() || !context.getCurrentPoseState()) return;

  const interval = 1 / (Number.parseInt(context.ui.sampleRate?.value || '10', 10) || 10);
  const elapsedSeconds = context.getRecordingElapsedSeconds(nowMs);
  if (elapsedSeconds + 1e-6 < context.getLastSampledAt() + interval) {
    return;
  }

  const roundedTime = roundTime(elapsedSeconds);
  const currentPoseState = context.getCurrentPoseState();
  const serializedPose = serializePose(currentPoseState);
  const rootPosition = currentPoseState?.ROOT?.positionTracked ? currentPoseState.ROOT.position.clone() : new THREE.Vector3();
  const capturedRig = buildCapturedPreviewRigFromLandmarks(landmarks, rootPosition);
  const recordedFrames = context.getRecordedFrames();
  const lastFrame = recordedFrames[recordedFrames.length - 1];

  if (lastFrame && Math.abs(lastFrame.time - roundedTime) < 1e-6) {
    lastFrame.pose = serializedPose;
    lastFrame.capturedRig = capturedRig;
    lastFrame.landmarks = cloneLandmarks(landmarks);
  } else {
    recordedFrames.push({
      time: roundedTime,
      pose: serializedPose,
      capturedRig,
      landmarks: cloneLandmarks(landmarks),
    });
  }

  context.setLastSampledAt(roundedTime);
  context.updateStats();
}
