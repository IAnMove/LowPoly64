import * as THREE from 'three';
import { getSkeletonById } from './skeleton-registry.js';
import {
  CAPTURE_JOINTS,
  CAPTURE_MIRROR_JOINTS,
  HUMANOID_CAPTURE_SKELETON_ID,
  LATERAL_RUNNER_FLATNESS_RATIO,
} from './motion-ripper-constants.js';
import {
  getCaptureRigJointNames,
  getCaptureSkeletonParentName,
  getVectorBounds,
  vectorToRoundedArray,
} from './motion-ripper-skeleton-utils.js';

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isLateralRunnerCapture(captureFacingMode = 'front') {
  return captureFacingMode === 'left' || captureFacingMode === 'right';
}

function getCaptureRigVector(frame, jointName) {
  const position = frame?.capturedRig?.[jointName];
  if (!Array.isArray(position) || position.length !== 3) return null;
  if (!position.every((value) => Number.isFinite(value))) return null;
  return new THREE.Vector3(position[0], position[1], position[2]);
}

function averageVectors(vectors) {
  if (!vectors.length) return null;
  const sum = new THREE.Vector3();
  vectors.forEach((vector) => sum.add(vector));
  return sum.multiplyScalar(1 / vectors.length);
}

function mirrorCaptureLocalVector(vector) {
  return vector ? new THREE.Vector3(-vector.x, vector.y, vector.z) : null;
}

function findCaptureSkeletonRestFrame(frames) {
  return (Array.isArray(frames) ? frames : []).find((frame) => (
    getCaptureRigVector(frame, 'PELVIS')
    && getCaptureRigVector(frame, 'CHEST')
  )) || null;
}

function computeCapturedLocalOffsetFromFrame(frame, jointName) {
  if (jointName === 'PELVIS') {
    return new THREE.Vector3();
  }

  const parentName = getCaptureSkeletonParentName(jointName);
  const joint = getCaptureRigVector(frame, jointName);
  const parent = parentName ? getCaptureRigVector(frame, parentName) : null;
  if (!joint || !parent) return null;

  return joint.clone().sub(parent);
}

function computeAverageCapturedLocalOffset(frames, jointName) {
  if (jointName === 'PELVIS') {
    return new THREE.Vector3();
  }

  const samples = [];
  (Array.isArray(frames) ? frames : []).forEach((frame) => {
    const offset = computeCapturedLocalOffsetFromFrame(frame, jointName);
    if (offset) samples.push(offset);
  });
  return averageVectors(samples);
}

function buildCapturedLocalOffsetMap(frames) {
  const restFrame = findCaptureSkeletonRestFrame(frames);
  const localOffsets = new Map();
  const joints = [...CAPTURE_JOINTS];

  joints.forEach((jointName) => {
    localOffsets.set(
      jointName,
      computeAverageCapturedLocalOffset(frames, jointName)
        || computeCapturedLocalOffsetFromFrame(restFrame, jointName)
        || null
    );
  });

  joints.forEach((jointName) => {
    if (localOffsets.get(jointName)) return;
    const mirrorJointName = CAPTURE_MIRROR_JOINTS[jointName];
    const mirrorOffset = mirrorJointName ? localOffsets.get(mirrorJointName) : null;
    if (mirrorOffset) {
      localOffsets.set(jointName, mirrorCaptureLocalVector(mirrorOffset));
    }
  });

  return localOffsets;
}

function buildCaptureSkeletonWorldMapFromLocalOffsets(localOffsets) {
  const world = new Map();

  function resolve(jointName) {
    if (world.has(jointName)) return world.get(jointName).clone();
    const local = localOffsets.get(jointName)?.clone?.() || new THREE.Vector3();
    const parentName = getCaptureSkeletonParentName(jointName);
    const position = local.clone();
    if (parentName) {
      const parent = resolve(parentName);
      if (parent) position.add(parent);
    }
    world.set(jointName, position.clone());
    return position;
  }

  getCaptureRigJointNames().forEach((jointName) => resolve(jointName));
  return world;
}

function getWorldMapSpan(world, leftName, rightName, axis = 'x') {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (!left || !right) return 0;
  return Math.abs((right[axis] ?? 0) - (left[axis] ?? 0));
}

function getWorldMapPairCenter(world, leftName, rightName, fallbackName = null) {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (left && right) return left.clone().add(right).multiplyScalar(0.5);
  return fallbackName ? world.get(fallbackName)?.clone() || null : null;
}

function setWorldMapSymmetricSpan(world, leftName, rightName, center, minSpan) {
  const left = world.get(leftName);
  const right = world.get(rightName);
  if (!left || !right || !center || !Number.isFinite(minSpan) || minSpan <= 0) return false;
  if (getWorldMapSpan(world, leftName, rightName, 'x') >= minSpan) return false;

  const pairCenter = left.clone().add(right).multiplyScalar(0.5);
  left.x = center.x - (minSpan * 0.5);
  right.x = center.x + (minSpan * 0.5);
  left.y = Number.isFinite(left.y) ? left.y : pairCenter.y;
  right.y = Number.isFinite(right.y) ? right.y : pairCenter.y;
  return true;
}

function isCapturedSkeletonFlat(world) {
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => world.get(jointName)));
  const height = Math.max(bounds?.size?.y || 0, 1e-5);
  const horizontalSpan = Math.max(bounds?.size?.x || 0, bounds?.size?.z || 0);
  return horizontalSpan / height < LATERAL_RUNNER_FLATNESS_RATIO;
}

function humanizeCapturedSkeletonWorldMap(world) {
  const next = new Map(
    getCaptureRigJointNames().map((jointName) => [
      jointName,
      world.get(jointName)?.clone?.() || new THREE.Vector3(),
    ])
  );
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => next.get(jointName)));
  const height = Math.max(bounds?.size?.y || 1, 1e-5);
  const chest = next.get('CHEST') || next.get('PELVIS') || new THREE.Vector3();
  const pelvis = next.get('PELVIS') || new THREE.Vector3();
  const shoulderCenter = getWorldMapPairCenter(next, 'ARM_L_UPPER', 'ARM_R_UPPER', 'CHEST')
    || getWorldMapPairCenter(next, 'CLAVICLE_L', 'CLAVICLE_R', 'CHEST')
    || chest.clone();
  const hipCenter = getWorldMapPairCenter(next, 'LEG_L_UPPER', 'LEG_R_UPPER', 'PELVIS') || pelvis.clone();

  const shoulderSpan = Math.max(
    getWorldMapSpan(next, 'ARM_L_UPPER', 'ARM_R_UPPER', 'x'),
    getWorldMapSpan(next, 'CLAVICLE_L', 'CLAVICLE_R', 'x'),
    height * 0.22
  );
  const clavicleSpan = Math.max(shoulderSpan * 0.72, height * 0.16);
  const hipSpan = Math.max(
    getWorldMapSpan(next, 'LEG_L_UPPER', 'LEG_R_UPPER', 'x'),
    height * 0.13
  );

  setWorldMapSymmetricSpan(next, 'CLAVICLE_L', 'CLAVICLE_R', shoulderCenter, clavicleSpan);
  setWorldMapSymmetricSpan(next, 'ARM_L_UPPER', 'ARM_R_UPPER', shoulderCenter, shoulderSpan);
  setWorldMapSymmetricSpan(next, 'ARM_L_LOWER', 'ARM_R_LOWER', shoulderCenter, shoulderSpan * 0.9);
  setWorldMapSymmetricSpan(next, 'HAND_L', 'HAND_R', shoulderCenter, shoulderSpan * 0.82);
  setWorldMapSymmetricSpan(next, 'LEG_L_UPPER', 'LEG_R_UPPER', hipCenter, hipSpan);
  setWorldMapSymmetricSpan(next, 'LEG_L_LOWER', 'LEG_R_LOWER', hipCenter, hipSpan * 0.88);
  setWorldMapSymmetricSpan(next, 'FOOT_L', 'FOOT_R', hipCenter, hipSpan * 0.9);

  return next;
}

function constrainCapturedSkeletonWorldMap(world, captureFacingMode) {
  if (!isLateralRunnerCapture(captureFacingMode) && !isCapturedSkeletonFlat(world)) {
    return world;
  }
  return humanizeCapturedSkeletonWorldMap(world);
}

function buildCaptureLocalOffsetMapFromWorld(world) {
  const localOffsets = new Map();
  getCaptureRigJointNames().forEach((jointName) => {
    const position = world.get(jointName);
    const parentName = getCaptureSkeletonParentName(jointName);
    const parent = parentName ? world.get(parentName) : null;
    localOffsets.set(
      jointName,
      position
        ? (parent ? position.clone().sub(parent) : position.clone())
        : null
    );
  });
  return localOffsets;
}

export function buildCapturedSkeletonDefinition(frames, { captureFacingMode = 'front' } = {}) {
  const fallbackSkeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  const fallbackPositions = new Map((fallbackSkeleton?.bones || []).map((bone) => [bone.name, bone.position || [0, 0, 0]]));
  const joints = getCaptureRigJointNames();
  const rawLocalOffsets = buildCapturedLocalOffsetMap(frames);
  const constrainedWorld = constrainCapturedSkeletonWorldMap(buildCaptureSkeletonWorldMapFromLocalOffsets(rawLocalOffsets), captureFacingMode);
  const localOffsets = buildCaptureLocalOffsetMapFromWorld(constrainedWorld);

  return {
    id: HUMANOID_CAPTURE_SKELETON_ID,
    archetype: 'HUMANOID',
    generatedFrom: isLateralRunnerCapture(captureFacingMode) ? 'motion-ripper-constrained-lateral-rig' : 'motion-ripper-captured-rig',
    bones: joints.map((jointName) => {
      const parentName = getCaptureSkeletonParentName(jointName);
      const position = localOffsets.get(jointName);

      return {
        name: jointName,
        parent: parentName,
        position: position
          ? vectorToRoundedArray(position)
          : [...(fallbackPositions.get(jointName) || [0, 0, 0])],
      };
    }),
    defaultBindings: fallbackSkeleton?.defaultBindings ? cloneJsonValue(fallbackSkeleton.defaultBindings) : {},
    animations: [],
  };
}
