import {
  HALF_BODY_CONFIDENCE_GAP,
  HALF_BODY_LOWER_RELIABLE_FRAME_RATIO,
  HALF_BODY_LOWER_RELIABLE_JOINT_COUNT,
  HALF_BODY_MIN_FRAME_COUNT,
  HALF_BODY_RELIABILITY_GAP,
  HALF_BODY_UPPER_RELIABLE_FRAME_RATIO,
  HALF_BODY_UPPER_RELIABLE_JOINT_COUNT,
  LOWER_BODY_CAPTURE_JOINTS,
  UPPER_BODY_CAPTURE_JOINTS,
} from './motion-ripper-constants.js';

export function createEmptyCaptureAnalysis(frameCount = 0) {
  return {
    frameCount,
    upperReliableRatio: 0,
    lowerReliableRatio: 0,
    upperAverageConfidence: 0,
    lowerAverageConfidence: 0,
    isHalfBodyDetected: false,
    missingLowerBody: false,
    shouldFreezeLowerBody: false,
  };
}

function averageJointConfidence(frameOrPose, jointNames) {
  if (!frameOrPose || !Array.isArray(jointNames) || jointNames.length === 0) return 0;
  const total = jointNames.reduce((sum, jointName) => sum + (frameOrPose.pose?.[jointName]?.confidence ?? frameOrPose[jointName]?.confidence ?? 0), 0);
  return total / jointNames.length;
}

function countReliableCaptureJoints(frameOrPose, jointNames) {
  if (!frameOrPose || !Array.isArray(jointNames)) return 0;
  return jointNames.reduce((count, jointName) => {
    const confidence = frameOrPose.pose?.[jointName]?.confidence ?? frameOrPose[jointName]?.confidence ?? 0;
    return count + (confidence >= 0.35 ? 1 : 0);
  }, 0);
}

export function analyzeCaptureCoverage(frames = []) {
  if (!Array.isArray(frames) || frames.length < HALF_BODY_MIN_FRAME_COUNT) {
    return createEmptyCaptureAnalysis(Array.isArray(frames) ? frames.length : 0);
  }

  let upperReliableFrames = 0;
  let lowerReliableFrames = 0;
  let upperAverageConfidence = 0;
  let lowerAverageConfidence = 0;

  frames.forEach((frame) => {
    const upperReliableCount = countReliableCaptureJoints(frame, UPPER_BODY_CAPTURE_JOINTS);
    const lowerReliableCount = countReliableCaptureJoints(frame, LOWER_BODY_CAPTURE_JOINTS);
    if (upperReliableCount >= HALF_BODY_UPPER_RELIABLE_JOINT_COUNT) {
      upperReliableFrames += 1;
    }
    if (lowerReliableCount >= HALF_BODY_LOWER_RELIABLE_JOINT_COUNT) {
      lowerReliableFrames += 1;
    }
    upperAverageConfidence += averageJointConfidence(frame, UPPER_BODY_CAPTURE_JOINTS);
    lowerAverageConfidence += averageJointConfidence(frame, LOWER_BODY_CAPTURE_JOINTS);
  });

  const frameCount = frames.length;
  const upperReliableRatio = upperReliableFrames / frameCount;
  const lowerReliableRatio = lowerReliableFrames / frameCount;
  upperAverageConfidence /= frameCount;
  lowerAverageConfidence /= frameCount;

  const missingLowerBody = (
    upperReliableRatio >= HALF_BODY_UPPER_RELIABLE_FRAME_RATIO
    && lowerReliableRatio <= HALF_BODY_LOWER_RELIABLE_FRAME_RATIO
    && (upperReliableRatio - lowerReliableRatio) >= HALF_BODY_RELIABILITY_GAP
    && (upperAverageConfidence - lowerAverageConfidence) >= HALF_BODY_CONFIDENCE_GAP
  );

  return {
    frameCount,
    upperReliableRatio,
    lowerReliableRatio,
    upperAverageConfidence,
    lowerAverageConfidence,
    isHalfBodyDetected: missingLowerBody,
    missingLowerBody,
    shouldFreezeLowerBody: missingLowerBody,
  };
}

export function resolveCaptureTrackOptions(frames = [], { freezeLowerBody = null } = {}) {
  const analysis = analyzeCaptureCoverage(frames);
  const suppressedCaptureJoints = new Set();
  const shouldFreezeLowerBody = typeof freezeLowerBody === 'boolean'
    ? freezeLowerBody
    : analysis.shouldFreezeLowerBody;
  if (shouldFreezeLowerBody) {
    LOWER_BODY_CAPTURE_JOINTS.forEach((jointName) => suppressedCaptureJoints.add(jointName));
  }
  return {
    analysis,
    suppressedCaptureJoints,
  };
}
