import * as THREE from 'three';
import { PREVIEW_RIG_JOINTS } from './motion-ripper-constants.js';
import { averagePointVector, vectorToArray } from './motion-ripper-pose-solver.js';

function distanceBetweenVectorsSquared(a, b) {
  if (!a || !b) return Infinity;
  return a.distanceToSquared(b);
}

function buildPreviewClaviclePoint(chest, shoulder) {
  if (!chest || !shoulder) return null;
  return chest.clone().lerp(shoulder, 0.62);
}

export function coercePreviewRigVectors(vectors, suppressedBones = null) {
  const coerced = { ...vectors };
  const isSuppressed = (jointName) => suppressedBones?.has?.(jointName);
  const pelvisFromLegs = averagePointVector([coerced.LEG_L_UPPER, coerced.LEG_R_UPPER]);
  if (!coerced.PELVIS) {
    coerced.PELVIS = pelvisFromLegs;
  }

  const shoulderCenter = averagePointVector([
    coerced.ARM_L_UPPER,
    coerced.ARM_R_UPPER,
    coerced.CLAVICLE_L,
    coerced.CLAVICLE_R,
  ]);
  if (
    !coerced.CHEST
    || isSuppressed('CHEST')
    || distanceBetweenVectorsSquared(coerced.CHEST, coerced.PELVIS) < 1e-8
  ) {
    coerced.CHEST = coerced.PELVIS && shoulderCenter
      ? coerced.PELVIS.clone().lerp(shoulderCenter, 0.72)
      : (shoulderCenter || coerced.CHEST || coerced.PELVIS || null);
  }

  if (
    (!coerced.CLAVICLE_L || isSuppressed('CLAVICLE_L') || distanceBetweenVectorsSquared(coerced.CLAVICLE_L, coerced.ARM_L_UPPER) < 1e-8)
    && coerced.CHEST
    && coerced.ARM_L_UPPER
  ) {
    coerced.CLAVICLE_L = buildPreviewClaviclePoint(coerced.CHEST, coerced.ARM_L_UPPER);
  }
  if (
    (!coerced.CLAVICLE_R || isSuppressed('CLAVICLE_R') || distanceBetweenVectorsSquared(coerced.CLAVICLE_R, coerced.ARM_R_UPPER) < 1e-8)
    && coerced.CHEST
    && coerced.ARM_R_UPPER
  ) {
    coerced.CLAVICLE_R = buildPreviewClaviclePoint(coerced.CHEST, coerced.ARM_R_UPPER);
  }

  const neckBase = averagePointVector([
    shoulderCenter,
    averagePointVector([coerced.CLAVICLE_L, coerced.CLAVICLE_R]),
  ]) || shoulderCenter;
  if (
    !coerced.NECK
    || isSuppressed('NECK')
    || distanceBetweenVectorsSquared(coerced.NECK, coerced.CHEST) < 1e-8
    || distanceBetweenVectorsSquared(coerced.NECK, coerced.HEAD) < 1e-8
  ) {
    coerced.NECK = neckBase && coerced.HEAD
      ? neckBase.clone().lerp(coerced.HEAD, 0.35)
      : (neckBase || coerced.CHEST || coerced.HEAD || null);
  }

  return coerced;
}

export function normalizePreviewRigFrame(frame, suppressedBones = null) {
  if (!frame) return null;

  const vectors = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const position = frame[jointName];
    if (!Array.isArray(position) || position.length !== 3) return;
    vectors[jointName] = new THREE.Vector3(position[0], position[1], position[2]);
  });
  const coercedVectors = coercePreviewRigVectors(vectors, suppressedBones);

  const hipCenter = coercedVectors.PELVIS || averagePointVector([coercedVectors.LEG_L_UPPER, coercedVectors.LEG_R_UPPER]);
  const minY = Object.values(coercedVectors).reduce((acc, vector) => Math.min(acc, vector.y), Infinity);
  const maxY = Object.values(coercedVectors).reduce((acc, vector) => Math.max(acc, vector.y), -Infinity);
  const height = Number.isFinite(maxY - minY) ? Math.max(maxY - minY, 0.001) : 1;
  const scale = 8 / height;
  const origin = hipCenter || new THREE.Vector3();

  const normalized = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const vector = coercedVectors[jointName];
    normalized[jointName] = vector
      ? vectorToArray(vector.clone().sub(origin).multiplyScalar(scale))
      : null;
  });
  return normalized;
}

export function collectResolvedPreviewRigFrame({ targetMap, nodeLookup, suppressedBones }) {
  const frame = {};
  PREVIEW_RIG_JOINTS.forEach((jointName) => {
    const targetName = targetMap?.[jointName];
    const node = targetName ? nodeLookup?.[targetName] : null;
    frame[jointName] = vectorToArray(node?.getWorldPosition(new THREE.Vector3()));
  });
  return normalizePreviewRigFrame(frame, suppressedBones);
}
