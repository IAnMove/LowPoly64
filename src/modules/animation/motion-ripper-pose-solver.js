import * as THREE from 'three';
import {
  CAPTURED_RIG_DEPTH_SCALE,
  DOWN_AXIS,
  JOINT_CONFIDENCE_SOURCES,
  JOINT_CONFIDENCE_THRESHOLDS,
  JOINT_PARENTS,
  JOINT_SMOOTHING_FACTORS,
  LIMB_DEPTH_SCALE,
  LM,
  POSE_JOINTS,
  RIGHT_AXIS,
  TORSO_DEPTH_SCALE,
} from './motion-ripper-constants.js';

function toWorldVector(landmark, depthScale = 1) {
  if (!landmark) return null;
  const z = Number.isFinite(landmark.z) ? landmark.z : 0;
  return new THREE.Vector3(landmark.x, -landmark.y, -z * depthScale);
}

function midpointVector(a, b) {
  if (!a || !b) return null;
  return a.clone().add(b).multiplyScalar(0.5);
}

export function averagePointVector(points) {
  const sum = new THREE.Vector3();
  let count = 0;
  points.forEach((point) => {
    if (!point) return;
    sum.add(point);
    count += 1;
  });
  if (count === 0) return null;
  return sum.multiplyScalar(1 / count);
}

export function midpointLandmark(a, b) {
  return {
    x: ((a?.x ?? 0) + (b?.x ?? 0)) * 0.5,
    y: ((a?.y ?? 0) + (b?.y ?? 0)) * 0.5,
  };
}

function directionBetween(start, end) {
  if (!start || !end) return null;
  const direction = end.clone().sub(start);
  if (direction.lengthSq() < 1e-8) return null;
  return direction.normalize();
}

function averageDirection(vectors) {
  const sum = new THREE.Vector3();
  let count = 0;
  vectors.forEach((vector) => {
    if (!vector || vector.lengthSq() < 1e-8) return;
    sum.add(vector);
    count += 1;
  });
  if (count === 0 || sum.lengthSq() < 1e-8) return null;
  return sum.normalize();
}

export function isReliableLandmark(landmark) {
  return !!landmark && (landmark.visibility ?? 1) >= 0.45;
}

export function hasReliableTracking(landmarks) {
  return hasReliablePair(landmarks, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER)
    && hasReliablePair(landmarks, LM.LEFT_HIP, LM.RIGHT_HIP);
}

function hasReliablePair(landmarks, firstIndex, secondIndex) {
  return isReliableLandmark(landmarks[firstIndex]) && isReliableLandmark(landmarks[secondIndex]);
}

export function getPoseConfidence(landmarks) {
  const trackedIndices = [
    LM.LEFT_SHOULDER,
    LM.RIGHT_SHOULDER,
    LM.LEFT_ELBOW,
    LM.RIGHT_ELBOW,
    LM.LEFT_WRIST,
    LM.RIGHT_WRIST,
    LM.LEFT_HIP,
    LM.RIGHT_HIP,
    LM.LEFT_KNEE,
    LM.RIGHT_KNEE,
    LM.LEFT_ANKLE,
    LM.RIGHT_ANKLE,
  ];

  const scores = trackedIndices
    .map((index) => landmarks[index]?.visibility)
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function createEmptyPoseState() {
  const pose = {};
  POSE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      positionTracked: false,
      rotationTracked: false,
      confidence: 0,
    };
  });
  return pose;
}

function clonePoseState(source) {
  const pose = {};
  POSE_JOINTS.forEach((jointName) => {
    pose[jointName] = {
      position: source[jointName].position.clone(),
      quaternion: source[jointName].quaternion.clone(),
      positionTracked: !!source[jointName].positionTracked,
      rotationTracked: !!source[jointName].rotationTracked,
      confidence: source[jointName].confidence || 0,
    };
  });
  return pose;
}

function applyBoneDirection(pose, worldQuaternionMap, jointName, direction, sourceAxis = DOWN_AXIS, confidence = 1) {
  if (!direction || !canTrackJoint(jointName, confidence)) return;
  const worldQuaternion = new THREE.Quaternion().setFromUnitVectors(sourceAxis, direction);
  setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence);
}

function applyBoneDirectionWithReference(pose, worldQuaternionMap, jointName, direction, referenceQuaternion, confidence = 1) {
  if (!direction || !canTrackJoint(jointName, confidence)) return;
  if (!referenceQuaternion) {
    applyBoneDirection(pose, worldQuaternionMap, jointName, direction, DOWN_AXIS, confidence);
    return;
  }

  const upAxis = direction.clone().multiplyScalar(-1);
  const referenceSideAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(referenceQuaternion);
  if (referenceSideAxis.lengthSq() < 1e-8) {
    applyBoneDirection(pose, worldQuaternionMap, jointName, direction, DOWN_AXIS, confidence);
    return;
  }

  const worldQuaternion = quaternionFromBasis(referenceSideAxis, upAxis);
  setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence);
}

function setWorldQuaternionOnPose(pose, worldQuaternionMap, jointName, worldQuaternion, confidence = 1) {
  const parentName = JOINT_PARENTS[jointName];
  if (parentName) {
    if (!worldQuaternionMap[parentName]) return;
    pose[jointName].quaternion.copy(
      worldQuaternionMap[parentName].clone().invert().multiply(worldQuaternion)
    ).normalize();
  } else {
    pose[jointName].quaternion.copy(worldQuaternion).normalize();
  }
  pose[jointName].rotationTracked = true;
  pose[jointName].confidence = Math.max(pose[jointName].confidence, confidence);
  worldQuaternionMap[jointName] = worldQuaternion.clone();
}

function quaternionFromBasis(leftAxis, upAxis) {
  const yAxis = upAxis.clone().normalize();
  let xAxis = leftAxis.clone();
  xAxis.sub(yAxis.clone().multiplyScalar(xAxis.dot(yAxis)));

  if (xAxis.lengthSq() < 1e-8) {
    xAxis = Math.abs(yAxis.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    xAxis.sub(yAxis.clone().multiplyScalar(xAxis.dot(yAxis)));
  }

  if (xAxis.lengthSq() < 1e-8) {
    return new THREE.Quaternion();
  }

  xAxis.normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  const correctedXAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  const matrix = new THREE.Matrix4().makeBasis(correctedXAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

export function computePoseFromLandmarks(landmarks, { rootPosition = null } = {}) {
  const pose = createEmptyPoseState();
  const worldQuaternionMap = {};

  const torso = landmarks.map((landmark) => (isReliableLandmark(landmark) ? toWorldVector(landmark, TORSO_DEPTH_SCALE) : null));
  const limbs = landmarks.map((landmark) => (isReliableLandmark(landmark) ? toWorldVector(landmark, LIMB_DEPTH_SCALE) : null));
  const shouldersCenter = midpointVector(torso[LM.LEFT_SHOULDER], torso[LM.RIGHT_SHOULDER]);
  const hipsCenter = midpointVector(torso[LM.LEFT_HIP], torso[LM.RIGHT_HIP]);
  const earsCenter = midpointVector(torso[LM.LEFT_EAR], torso[LM.RIGHT_EAR]);

  const torsoUp = averageDirection([
    directionBetween(hipsCenter, shouldersCenter),
    directionBetween(torso[LM.LEFT_HIP], torso[LM.LEFT_SHOULDER]),
    directionBetween(torso[LM.RIGHT_HIP], torso[LM.RIGHT_SHOULDER]),
  ]);

  const pelvisLeft = averageDirection([
    directionBetween(torso[LM.RIGHT_HIP], torso[LM.LEFT_HIP]),
  ]);
  const chestUp = averageDirection([
    torsoUp,
    directionBetween(hipsCenter, shouldersCenter),
    directionBetween(shouldersCenter, torso[LM.NOSE]),
  ]);
  const neckUp = averageDirection([
    directionBetween(shouldersCenter, torso[LM.NOSE]),
    directionBetween(shouldersCenter, earsCenter),
    chestUp,
  ]);

  const pelvisConfidence = getJointConfidence(landmarks, 'PELVIS');
  if (torsoUp && pelvisLeft && canTrackJoint('PELVIS', pelvisConfidence)) {
    const pelvisWorldQuaternion = quaternionFromBasis(pelvisLeft, torsoUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'PELVIS', pelvisWorldQuaternion, pelvisConfidence);
    worldQuaternionMap.CHEST = pelvisWorldQuaternion.clone();
    worldQuaternionMap.NECK = pelvisWorldQuaternion.clone();
    worldQuaternionMap.CLAVICLE_L = pelvisWorldQuaternion.clone();
    worldQuaternionMap.CLAVICLE_R = pelvisWorldQuaternion.clone();
  }

  const headLeft = averageDirection([
    directionBetween(torso[LM.RIGHT_EAR], torso[LM.LEFT_EAR]),
    directionBetween(torso[LM.RIGHT_SHOULDER], torso[LM.LEFT_SHOULDER]),
  ]);
  const headUp = averageDirection([
    directionBetween(earsCenter, torso[LM.NOSE]),
    directionBetween(shouldersCenter, torso[LM.NOSE]),
    neckUp,
  ]);
  const headConfidence = getJointConfidence(landmarks, 'HEAD');
  if (headLeft && headUp && canTrackJoint('HEAD', headConfidence)) {
    const headWorldQuaternion = quaternionFromBasis(headLeft, headUp);
    setWorldQuaternionOnPose(pose, worldQuaternionMap, 'HEAD', headWorldQuaternion, headConfidence);
  }

  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_L_UPPER',
    directionBetween(limbs[LM.LEFT_SHOULDER], limbs[LM.LEFT_ELBOW]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_L_UPPER')
  );
  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_L_LOWER',
    directionBetween(limbs[LM.LEFT_ELBOW], limbs[LM.LEFT_WRIST]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_L_LOWER')
  );
  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_R_UPPER',
    directionBetween(limbs[LM.RIGHT_SHOULDER], limbs[LM.RIGHT_ELBOW]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_R_UPPER')
  );
  applyBoneDirection(
    pose,
    worldQuaternionMap,
    'ARM_R_LOWER',
    directionBetween(limbs[LM.RIGHT_ELBOW], limbs[LM.RIGHT_WRIST]),
    DOWN_AXIS,
    getJointConfidence(landmarks, 'ARM_R_LOWER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_L_UPPER',
    directionBetween(limbs[LM.LEFT_HIP], limbs[LM.LEFT_KNEE]),
    worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_L_UPPER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_L_LOWER',
    directionBetween(limbs[LM.LEFT_KNEE], limbs[LM.LEFT_ANKLE]),
    worldQuaternionMap.LEG_L_UPPER || worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_L_LOWER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_R_UPPER',
    directionBetween(limbs[LM.RIGHT_HIP], limbs[LM.RIGHT_KNEE]),
    worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_R_UPPER')
  );
  applyBoneDirectionWithReference(
    pose,
    worldQuaternionMap,
    'LEG_R_LOWER',
    directionBetween(limbs[LM.RIGHT_KNEE], limbs[LM.RIGHT_ANKLE]),
    worldQuaternionMap.LEG_R_UPPER || worldQuaternionMap.PELVIS,
    getJointConfidence(landmarks, 'LEG_R_LOWER')
  );

  if (rootPosition) {
    pose.PELVIS.position.copy(rootPosition);
    pose.PELVIS.positionTracked = true;
  }
  return pose;
}

function distance2D(a, b) {
  if (!a || !b) return 0;
  return Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
}

export function computeRootPositionFromLandmarks(
  landmarks,
  { rootMotionEnabled = false, rootBaseline = null } = {}
) {
  const rootPosition = new THREE.Vector3(0, 0, 0);
  if (!rootMotionEnabled) {
    return { rootPosition, rootBaseline };
  }

  const leftHip = landmarks[LM.LEFT_HIP];
  const rightHip = landmarks[LM.RIGHT_HIP];
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];
  if (!isReliableLandmark(leftHip) || !isReliableLandmark(rightHip) || !isReliableLandmark(leftShoulder) || !isReliableLandmark(rightShoulder)) {
    return { rootPosition: null, rootBaseline };
  }

  const hipCenter = midpointLandmark(leftHip, rightHip);
  const shoulderSpan = distance2D(leftShoulder, rightShoulder);
  const nextRootBaseline = rootBaseline || {
    x: hipCenter.x,
    y: hipCenter.y,
    shoulderSpan: shoulderSpan || 0.2,
  };

  const deltaX = (hipCenter.x - nextRootBaseline.x) * 8;
  const deltaY = (nextRootBaseline.y - hipCenter.y) * 2.5;
  const depthDelta = (shoulderSpan - nextRootBaseline.shoulderSpan) * 8;

  rootPosition.x = THREE.MathUtils.clamp(deltaX, -4.5, 4.5);
  rootPosition.y = THREE.MathUtils.clamp(deltaY, -0.9, 1.5);
  rootPosition.z = THREE.MathUtils.clamp(depthDelta, -3.25, 3.25);

  return { rootPosition, rootBaseline: nextRootBaseline };
}

export function smoothPoseState(previousPose, nextPose, smoothing) {
  if (!previousPose) {
    return clonePoseState(nextPose);
  }

  const alpha = THREE.MathUtils.clamp(1 - smoothing, 0.05, 1);
  const pose = clonePoseState(previousPose);
  POSE_JOINTS.forEach((jointName) => {
    const jointAlpha = getJointBlendAlpha(jointName, alpha, nextPose[jointName].confidence);
    if (nextPose[jointName].positionTracked) {
      pose[jointName].position.lerp(nextPose[jointName].position, jointAlpha);
      pose[jointName].positionTracked = true;
    }
    if (nextPose[jointName].rotationTracked) {
      pose[jointName].quaternion.slerp(nextPose[jointName].quaternion, jointAlpha).normalize();
      pose[jointName].rotationTracked = true;
    }
    pose[jointName].confidence = nextPose[jointName].positionTracked || nextPose[jointName].rotationTracked
      ? nextPose[jointName].confidence
      : (previousPose[jointName].confidence || 0) * 0.92;
  });
  return pose;
}

export function serializePose(pose) {
  const serialized = {};
  POSE_JOINTS.forEach((jointName) => {
    const transform = pose[jointName];
    serialized[jointName] = {
      position: [transform.position.x, transform.position.y, transform.position.z],
      quaternion: [
        transform.quaternion.x,
        transform.quaternion.y,
        transform.quaternion.z,
        transform.quaternion.w,
      ],
      confidence: transform.confidence || 0,
    };
  });
  return serialized;
}

function getPoseTransform(frameOrPose, jointName) {
  if (frameOrPose?.pose?.[jointName]) {
    return frameOrPose.pose[jointName];
  }
  return frameOrPose?.[jointName] || null;
}

export function getPoseQuaternion(frameOrPose, jointName) {
  const quaternion = getPoseTransform(frameOrPose, jointName)?.quaternion;
  if (!Array.isArray(quaternion) || quaternion.length !== 4) {
    return new THREE.Quaternion();
  }

  return new THREE.Quaternion(
    quaternion[0] ?? 0,
    quaternion[1] ?? 0,
    quaternion[2] ?? 0,
    quaternion[3] ?? 1
  ).normalize();
}

export function getPoseConfidenceValue(frameOrPose, jointName) {
  const confidence = getPoseTransform(frameOrPose, jointName)?.confidence;
  if (Number.isFinite(confidence)) {
    return confidence;
  }
  return 1;
}

function buildPreviewClaviclePoint(chest, shoulder) {
  if (!chest || !shoulder) return null;
  return chest.clone().lerp(shoulder, 0.62);
}

export function vectorToArray(vector) {
  if (!vector) return null;
  return [vector.x, vector.y, vector.z];
}

export function buildCapturedPreviewRigFromLandmarks(landmarks, rootPosition = new THREE.Vector3()) {
  if (!Array.isArray(landmarks) || landmarks.length === 0) return null;

  const points = landmarks.map((landmark) => {
    if (!isReliableLandmark(landmark)) return null;
    return toWorldVector(landmark, CAPTURED_RIG_DEPTH_SCALE);
  });

  const hipsCenter = midpointVector(points[LM.LEFT_HIP], points[LM.RIGHT_HIP]);
  const shouldersCenter = midpointVector(points[LM.LEFT_SHOULDER], points[LM.RIGHT_SHOULDER]);
  if (!hipsCenter || !shouldersCenter) return null;

  const headPoint = averagePointVector([
    points[LM.NOSE],
    midpointVector(points[LM.LEFT_EAR], points[LM.RIGHT_EAR]),
    shouldersCenter.clone().add(new THREE.Vector3(0, 0.32, 0)),
  ]);
  const chestPoint = hipsCenter.clone().lerp(shouldersCenter, 0.72);
  const neckPoint = headPoint
    ? shouldersCenter.clone().lerp(headPoint, 0.35)
    : shouldersCenter.clone().add(new THREE.Vector3(0, 0.12, 0));
  const leftClaviclePoint = buildPreviewClaviclePoint(chestPoint, points[LM.LEFT_SHOULDER]);
  const rightClaviclePoint = buildPreviewClaviclePoint(chestPoint, points[LM.RIGHT_SHOULDER]);

  const leftFootPoint = averagePointVector([
    points[LM.LEFT_ANKLE],
    points[LM.LEFT_HEEL],
    points[LM.LEFT_FOOT_INDEX],
  ]);
  const rightFootPoint = averagePointVector([
    points[LM.RIGHT_ANKLE],
    points[LM.RIGHT_HEEL],
    points[LM.RIGHT_FOOT_INDEX],
  ]);

  const offset = (point) => {
    if (!point) return null;
    return point.clone()
      .sub(hipsCenter)
      .add(rootPosition);
  };

  return {
    PELVIS: vectorToArray(offset(hipsCenter)),
    CHEST: vectorToArray(offset(chestPoint)),
    NECK: vectorToArray(offset(neckPoint)),
    HEAD: vectorToArray(offset(headPoint)),
    CLAVICLE_L: vectorToArray(offset(leftClaviclePoint)),
    ARM_L_UPPER: vectorToArray(offset(points[LM.LEFT_SHOULDER])),
    ARM_L_LOWER: vectorToArray(offset(points[LM.LEFT_ELBOW])),
    HAND_L: vectorToArray(offset(points[LM.LEFT_WRIST])),
    CLAVICLE_R: vectorToArray(offset(rightClaviclePoint)),
    ARM_R_UPPER: vectorToArray(offset(points[LM.RIGHT_SHOULDER])),
    ARM_R_LOWER: vectorToArray(offset(points[LM.RIGHT_ELBOW])),
    HAND_R: vectorToArray(offset(points[LM.RIGHT_WRIST])),
    LEG_L_UPPER: vectorToArray(offset(points[LM.LEFT_HIP])),
    LEG_L_LOWER: vectorToArray(offset(points[LM.LEFT_KNEE])),
    FOOT_L: vectorToArray(offset(leftFootPoint)),
    LEG_R_UPPER: vectorToArray(offset(points[LM.RIGHT_HIP])),
    LEG_R_LOWER: vectorToArray(offset(points[LM.RIGHT_KNEE])),
    FOOT_R: vectorToArray(offset(rightFootPoint)),
  };
}

function getJointConfidence(landmarks, jointName) {
  const sourceIndices = JOINT_CONFIDENCE_SOURCES[jointName];
  if (!sourceIndices?.length) return 1;

  const scores = sourceIndices
    .map((index) => landmarks[index]?.visibility)
    .filter((score) => Number.isFinite(score));

  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function canTrackJoint(jointName, confidence) {
  return confidence >= (JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45);
}

function getJointBlendAlpha(jointName, baseAlpha, confidence) {
  const smoothingFactor = JOINT_SMOOTHING_FACTORS[jointName] ?? 1;
  const confidenceFloor = JOINT_CONFIDENCE_THRESHOLDS[jointName] ?? 0.45;
  const confidenceAlpha = THREE.MathUtils.clamp(
    THREE.MathUtils.mapLinear(confidence || 0, confidenceFloor, 1, 0.3, 1),
    0.3,
    1
  );
  return THREE.MathUtils.clamp(baseAlpha * smoothingFactor * confidenceAlpha, 0.02, 1);
}
