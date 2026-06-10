import * as THREE from 'three';
import { CAPTURE_JOINTS, JOINT_PARENTS } from './motion-ripper-constants.js';

export function getCaptureSkeletonParentName(jointName) {
  if (jointName === 'PELVIS') return null;
  return JOINT_PARENTS[jointName] || null;
}

export function getCaptureRigJointNames() {
  return [...CAPTURE_JOINTS];
}

export function roundSkeletonValue(value) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 1000000) / 1000000 : 0;
}

export function vectorToRoundedArray(vector) {
  return [
    roundSkeletonValue(vector?.x ?? 0),
    roundSkeletonValue(vector?.y ?? 0),
    roundSkeletonValue(vector?.z ?? 0),
  ];
}

export function buildSkeletonWorldPositionMap(skeleton) {
  const bones = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolve(name) {
    if (result.has(name)) return result.get(name).clone();
    const bone = bones.get(name);
    if (!bone) return null;

    const position = new THREE.Vector3(...(bone.position || [0, 0, 0]));
    if (bone.parent) {
      const parent = resolve(bone.parent);
      if (parent) position.add(parent);
    }
    result.set(name, position.clone());
    return position;
  }

  (skeleton?.bones || []).forEach((bone) => resolve(bone.name));
  return result;
}

export function getVectorBounds(vectors) {
  const valid = vectors.filter((vector) => (
    vector
    && Number.isFinite(vector.x)
    && Number.isFinite(vector.y)
    && Number.isFinite(vector.z)
  ));
  if (valid.length === 0) return null;
  const min = valid[0].clone();
  const max = valid[0].clone();
  valid.forEach((vector) => {
    min.min(vector);
    max.max(vector);
  });
  return { min, max, size: max.clone().sub(min) };
}
