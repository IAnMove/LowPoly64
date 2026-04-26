import * as THREE from 'three';

export const CAPTURE_SKINNED_RIG_MODE = 'capture-skinned';
export const CAPTURE_SKINNED_VERSION = 1;

const HUMANOID_CAPTURE_SKELETON_ID = 'HUMANOID_CAPTURE';
const CAPTURE_REFERENCE_HEIGHT = 4.18;
const CAPTURE_TARGET_HEIGHT = CAPTURE_REFERENCE_HEIGHT;
const CAPTURE_FLOOR_Y = 0.08;
const CAPTURE_MIN_SCALE = 0.25;
const CAPTURE_MAX_SCALE = 32;

const CAPTURE_JOINTS = Object.freeze([
  'PELVIS',
  'CHEST',
  'NECK',
  'HEAD',
  'CLAVICLE_L',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'HAND_L',
  'CLAVICLE_R',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'HAND_R',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
]);

const CAPTURE_BONE_ORDER = Object.freeze([
  'ROOT',
  ...CAPTURE_JOINTS,
]);

const CAPTURE_BONE_PARENTS = Object.freeze({
  ROOT: null,
  PELVIS: 'ROOT',
  CHEST: 'PELVIS',
  NECK: 'CHEST',
  HEAD: 'NECK',
  CLAVICLE_L: 'CHEST',
  ARM_L_UPPER: 'CLAVICLE_L',
  ARM_L_LOWER: 'ARM_L_UPPER',
  HAND_L: 'ARM_L_LOWER',
  CLAVICLE_R: 'CHEST',
  ARM_R_UPPER: 'CLAVICLE_R',
  ARM_R_LOWER: 'ARM_R_UPPER',
  HAND_R: 'ARM_R_LOWER',
  LEG_L_UPPER: 'PELVIS',
  LEG_L_LOWER: 'LEG_L_UPPER',
  FOOT_L: 'LEG_L_LOWER',
  LEG_R_UPPER: 'PELVIS',
  LEG_R_LOWER: 'LEG_R_UPPER',
  FOOT_R: 'LEG_R_LOWER',
});

const CAPTURE_DEFAULT_BINDINGS = Object.freeze({
  HEAD: Object.freeze(['HEAD']),
  TORSO: Object.freeze(['ROOT', 'PELVIS', 'CHEST', 'NECK']),
  ARM_L: Object.freeze(['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L']),
  ARM_R: Object.freeze(['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R']),
  LEG_L: Object.freeze(['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L']),
  LEG_R: Object.freeze(['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R']),
  WEAPON_MAIN: Object.freeze([]),
  WEAPON_SECONDARY: Object.freeze([]),
});

const SEGMENT_COLORS = Object.freeze({
  pelvis: '#26364f',
  torso: '#2f7fd1',
  torsoDark: '#255f9f',
  skin: '#d8b08f',
  sleeve: '#2f7fd1',
  glove: '#324258',
  pants: '#273856',
  shin: '#1f2d44',
  boot: '#101820',
});

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneJsonValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]));
  }
  return value;
}

function isFiniteVectorArray(value) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function vectorFromArray(value, fallback = new THREE.Vector3()) {
  return isFiniteVectorArray(value)
    ? new THREE.Vector3(value[0], value[1], value[2])
    : fallback.clone();
}

function vectorToArray(vector) {
  return [
    roundValue(vector?.x ?? 0),
    roundValue(vector?.y ?? 0),
    roundValue(vector?.z ?? 0),
  ];
}

function roundValue(value) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 1000000) / 1000000 : 0;
}

function getCaptureParentName(boneName) {
  return CAPTURE_BONE_PARENTS[boneName] || null;
}

function normalizeSourceSkeleton(sourceSkeleton = null) {
  const sourceBones = Array.isArray(sourceSkeleton?.bones) ? sourceSkeleton.bones : [];
  const sourceByName = new Map(sourceBones.map((bone) => [bone.name, bone]));

  return {
    id: sourceSkeleton?.id || HUMANOID_CAPTURE_SKELETON_ID,
    archetype: sourceSkeleton?.archetype || 'HUMANOID',
    generatedFrom: sourceSkeleton?.generatedFrom || 'motion-ripper-captured-rig',
    bones: CAPTURE_BONE_ORDER.map((boneName) => {
      const source = sourceByName.get(boneName);
      return {
        name: boneName,
        parent: source?.parent !== undefined ? source.parent : getCaptureParentName(boneName),
        position: isFiniteVectorArray(source?.position) ? [...source.position] : [0, 0, 0],
      };
    }),
    defaultBindings: cloneJsonValue(sourceSkeleton?.defaultBindings || CAPTURE_DEFAULT_BINDINGS),
    animations: Array.isArray(sourceSkeleton?.animations) ? cloneJsonValue(sourceSkeleton.animations) : [],
  };
}

function buildSkeletonWorldPositionMap(skeleton) {
  const bones = new Map((skeleton?.bones || []).map((bone) => [bone.name, bone]));
  const result = new Map();

  function resolve(name) {
    if (result.has(name)) return result.get(name).clone();
    const bone = bones.get(name);
    if (!bone) return null;

    const position = vectorFromArray(bone.position);
    const parentName = bone.parent || getCaptureParentName(name);
    if (parentName) {
      const parent = resolve(parentName);
      if (parent) position.add(parent);
    }
    result.set(name, position.clone());
    return position;
  }

  CAPTURE_BONE_ORDER.forEach((name) => resolve(name));
  return result;
}

function getVectorBounds(vectors) {
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

function computeCaptureFit(sourceSkeleton) {
  const sourceWorld = buildSkeletonWorldPositionMap(sourceSkeleton);
  const sourceBounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => sourceWorld.get(jointName)));
  const sourceHeight = Math.max(sourceBounds?.size?.y || 0, 1e-5);
  const scale = THREE.MathUtils.clamp(
    CAPTURE_TARGET_HEIGHT / sourceHeight,
    CAPTURE_MIN_SCALE,
    CAPTURE_MAX_SCALE
  );
  const center = sourceBounds
    ? new THREE.Vector3(
        (sourceBounds.min.x + sourceBounds.max.x) * 0.5,
        sourceBounds.min.y,
        (sourceBounds.min.z + sourceBounds.max.z) * 0.5
      )
    : new THREE.Vector3();
  const floorOffset = new THREE.Vector3(0, CAPTURE_FLOOR_Y, 0);
  const fittedWorld = new Map();

  CAPTURE_BONE_ORDER.forEach((boneName) => {
    const source = sourceWorld.get(boneName) || new THREE.Vector3();
    fittedWorld.set(boneName, source.clone().sub(center).multiplyScalar(scale).add(floorOffset));
  });

  const humanizedWorld = humanizeCaptureRestWorld(fittedWorld);

  return {
    scale,
    fittedWorld: humanizedWorld,
    rootBasePosition: humanizedWorld.get('ROOT')?.clone() || new THREE.Vector3(),
  };
}

function getPoint(points, name) {
  return points.get(name) || null;
}

function getPairCenter(points, leftName, rightName, fallbackName = null) {
  const left = getPoint(points, leftName);
  const right = getPoint(points, rightName);
  if (left && right) return left.clone().add(right).multiplyScalar(0.5);
  return fallbackName ? getPoint(points, fallbackName)?.clone() || null : null;
}

function getAxisSpan(points, leftName, rightName, axis = 'x') {
  const left = getPoint(points, leftName);
  const right = getPoint(points, rightName);
  if (!left || !right) return 0;
  return Math.abs((right[axis] ?? 0) - (left[axis] ?? 0));
}

function setSymmetricSpan(points, leftName, rightName, center, minSpan, options = {}) {
  const left = getPoint(points, leftName);
  const right = getPoint(points, rightName);
  if (!left || !right || !center || !Number.isFinite(minSpan) || minSpan <= 0) return false;

  const currentSpan = getAxisSpan(points, leftName, rightName, 'x');
  if (currentSpan >= minSpan) return false;

  const span = minSpan;
  const originalPairCenter = left.clone().add(right).multiplyScalar(0.5);
  const yCenter = options.preserveY === false ? center.y : originalPairCenter.y;
  const zCenter = options.preserveZ === false ? center.z : originalPairCenter.z;
  const leftY = options.preserveY === false ? yCenter : left.y;
  const rightY = options.preserveY === false ? yCenter : right.y;
  const leftZ = options.preserveZ === false ? zCenter : left.z;
  const rightZ = options.preserveZ === false ? zCenter : right.z;

  left.set(center.x - span * 0.5, leftY, leftZ);
  right.set(center.x + span * 0.5, rightY, rightZ);
  return true;
}

function liftIfTooClose(points, upperName, lowerName, minDistance) {
  const upper = getPoint(points, upperName);
  const lower = getPoint(points, lowerName);
  if (!upper || !lower || !Number.isFinite(minDistance) || minDistance <= 0) return false;
  if (upper.y - lower.y >= minDistance) return false;
  upper.y = lower.y + minDistance;
  return true;
}

function humanizeCaptureRestWorld(fittedWorld) {
  const points = new Map(
    CAPTURE_BONE_ORDER.map((name) => [name, (fittedWorld.get(name) || new THREE.Vector3()).clone()])
  );
  const bounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => points.get(jointName)));
  const height = Math.max(bounds?.size?.y || CAPTURE_TARGET_HEIGHT, 1);
  const pelvis = getPoint(points, 'PELVIS') || new THREE.Vector3();
  const chest = getPoint(points, 'CHEST') || pelvis.clone().add(new THREE.Vector3(0, height * 0.28, 0));
  const shoulderCenter = getPairCenter(points, 'ARM_L_UPPER', 'ARM_R_UPPER', 'CHEST')
    || getPairCenter(points, 'CLAVICLE_L', 'CLAVICLE_R', 'CHEST')
    || chest.clone();
  const hipCenter = getPairCenter(points, 'LEG_L_UPPER', 'LEG_R_UPPER', 'PELVIS') || pelvis.clone();

  const shoulderSpan = Math.max(
    getAxisSpan(points, 'ARM_L_UPPER', 'ARM_R_UPPER', 'x'),
    getAxisSpan(points, 'CLAVICLE_L', 'CLAVICLE_R', 'x'),
    THREE.MathUtils.clamp(height * 0.2, 1.05, 1.42)
  );
  const clavicleSpan = Math.max(shoulderSpan * 0.72, THREE.MathUtils.clamp(height * 0.15, 0.78, 1.05));
  const hipSpan = Math.max(
    getAxisSpan(points, 'LEG_L_UPPER', 'LEG_R_UPPER', 'x'),
    THREE.MathUtils.clamp(height * 0.12, 0.64, 0.92)
  );

  setSymmetricSpan(points, 'CLAVICLE_L', 'CLAVICLE_R', shoulderCenter, clavicleSpan, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'ARM_L_UPPER', 'ARM_R_UPPER', shoulderCenter, shoulderSpan, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'ARM_L_LOWER', 'ARM_R_LOWER', shoulderCenter, shoulderSpan * 0.9, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'HAND_L', 'HAND_R', shoulderCenter, shoulderSpan * 0.82, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'LEG_L_UPPER', 'LEG_R_UPPER', hipCenter, hipSpan, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'LEG_L_LOWER', 'LEG_R_LOWER', hipCenter, hipSpan * 0.88, { preserveY: true, preserveZ: true });
  setSymmetricSpan(points, 'FOOT_L', 'FOOT_R', hipCenter, hipSpan * 0.9, { preserveY: true, preserveZ: true });

  liftIfTooClose(points, 'CHEST', 'PELVIS', height * 0.18);
  liftIfTooClose(points, 'NECK', 'CHEST', height * 0.1);
  liftIfTooClose(points, 'HEAD', 'NECK', height * 0.08);

  const root = getPoint(points, 'ROOT');
  if (root) {
    root.x = pelvis.x;
    root.z = pelvis.z;
  }

  return points;
}

function createBoneHierarchy(sourceSkeleton) {
  const { scale, fittedWorld, rootBasePosition } = computeCaptureFit(sourceSkeleton);
  const bonesByName = new Map();
  let rootBone = null;

  CAPTURE_BONE_ORDER.forEach((boneName) => {
    const bone = new THREE.Bone();
    const parentName = getCaptureParentName(boneName);
    const worldPosition = fittedWorld.get(boneName) || new THREE.Vector3();
    const localPosition = parentName
      ? worldPosition.clone().sub(fittedWorld.get(parentName) || new THREE.Vector3())
      : worldPosition.clone();

    bone.name = boneName;
    bone.userData.name = boneName;
    bone.position.copy(localPosition);
    bonesByName.set(boneName, bone);

    if (parentName) {
      bonesByName.get(parentName)?.add(bone);
    } else {
      rootBone = bone;
    }
  });

  const orderedBones = CAPTURE_BONE_ORDER.map((boneName) => bonesByName.get(boneName)).filter(Boolean);
  return {
    rootBone,
    orderedBones,
    bonesByName,
    restWorld: fittedWorld,
    rootBasePosition,
    scale,
  };
}

function getDistance(points, aName, bName, fallback = 0.4) {
  const a = points.get(aName);
  const b = points.get(bName);
  if (!a || !b) return fallback;
  const distance = a.distanceTo(b);
  return Number.isFinite(distance) && distance > 1e-5 ? distance : fallback;
}

function colorToRgb(colorValue) {
  const color = new THREE.Color(colorValue);
  return [color.r, color.g, color.b];
}

function createGeometryAccumulator(boneIndexByName) {
  const positions = [];
  const colors = [];
  const indices = [];
  const skinIndices = [];
  const skinWeights = [];

  function pushVertex(position, colorValue, influences) {
    const normalizedInfluences = normalizeInfluences(influences, boneIndexByName);
    const color = colorToRgb(colorValue);
    const index = positions.length / 3;

    positions.push(position.x, position.y, position.z);
    colors.push(color[0], color[1], color[2]);
    skinIndices.push(
      normalizedInfluences[0].index,
      normalizedInfluences[1].index,
      normalizedInfluences[2].index,
      normalizedInfluences[3].index
    );
    skinWeights.push(
      normalizedInfluences[0].weight,
      normalizedInfluences[1].weight,
      normalizedInfluences[2].weight,
      normalizedInfluences[3].weight
    );
    return index;
  }

  return {
    pushVertex,
    pushTriangle: (a, b, c) => indices.push(a, b, c),
    toGeometry: () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    },
  };
}

function normalizeInfluences(influences, boneIndexByName) {
  const valid = (influences || [])
    .map((entry) => ({
      index: boneIndexByName.get(entry.bone) ?? 0,
      weight: Number.isFinite(entry.weight) ? Math.max(0, entry.weight) : 0,
    }))
    .filter((entry) => entry.weight > 0)
    .slice(0, 4);

  if (valid.length === 0) {
    valid.push({ index: boneIndexByName.get('ROOT') ?? 0, weight: 1 });
  }

  const total = valid.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const normalized = valid.map((entry) => ({ ...entry, weight: entry.weight / total }));
  while (normalized.length < 4) {
    normalized.push({ index: normalized[0].index, weight: 0 });
  }
  return normalized;
}

function getSegmentInfluences(t, startBone, endBone, blend = 0.26) {
  const safeBlend = THREE.MathUtils.clamp(blend, 0.05, 0.45);
  if (!endBone || startBone === endBone) {
    return [{ bone: startBone, weight: 1 }];
  }
  if (t <= 1 - safeBlend) {
    return [{ bone: startBone, weight: 1 }];
  }
  const endWeight = THREE.MathUtils.clamp((t - (1 - safeBlend)) / safeBlend, 0, 1);
  return [
    { bone: startBone, weight: 1 - endWeight },
    { bone: endBone, weight: endWeight },
  ];
}

function addSegmentPrism(acc, {
  start,
  end,
  width,
  depth = width,
  startBone,
  endBone,
  color,
  divisions = 6,
  blend = 0.26,
}) {
  if (!start || !end) return false;
  const segment = end.clone().sub(start);
  const length = segment.length();
  if (length < 1e-5) return false;

  const axis = segment.clone().normalize();
  const reference = Math.abs(axis.dot(new THREE.Vector3(0, 1, 0))) < 0.92
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const sideA = new THREE.Vector3().crossVectors(axis, reference).normalize().multiplyScalar(width * 0.5);
  const sideB = new THREE.Vector3().crossVectors(axis, sideA).normalize().multiplyScalar(depth * 0.5);
  const rings = [];
  const ringCount = Math.max(1, Math.round(divisions)) + 1;

  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const t = ringIndex / (ringCount - 1);
    const center = start.clone().lerp(end, t);
    const influences = getSegmentInfluences(t, startBone, endBone, blend);
    rings.push([
      acc.pushVertex(center.clone().add(sideA).add(sideB), color, influences),
      acc.pushVertex(center.clone().add(sideA).sub(sideB), color, influences),
      acc.pushVertex(center.clone().sub(sideA).sub(sideB), color, influences),
      acc.pushVertex(center.clone().sub(sideA).add(sideB), color, influences),
    ]);
  }

  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
    const a = rings[ringIndex];
    const b = rings[ringIndex + 1];
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      acc.pushTriangle(a[side], b[side], b[next]);
      acc.pushTriangle(a[side], b[next], a[next]);
    }
  }

  acc.pushTriangle(rings[0][0], rings[0][1], rings[0][2]);
  acc.pushTriangle(rings[0][0], rings[0][2], rings[0][3]);
  const last = rings[rings.length - 1];
  acc.pushTriangle(last[0], last[2], last[1]);
  acc.pushTriangle(last[0], last[3], last[2]);
  return true;
}

function addCuboid(acc, { center, size, bone, color }) {
  if (!center || !size) return false;
  const half = size.clone().multiplyScalar(0.5);
  const corners = [
    new THREE.Vector3(-half.x, -half.y, half.z),
    new THREE.Vector3(half.x, -half.y, half.z),
    new THREE.Vector3(half.x, -half.y, -half.z),
    new THREE.Vector3(-half.x, -half.y, -half.z),
    new THREE.Vector3(-half.x, half.y, half.z),
    new THREE.Vector3(half.x, half.y, half.z),
    new THREE.Vector3(half.x, half.y, -half.z),
    new THREE.Vector3(-half.x, half.y, -half.z),
  ].map((corner) => acc.pushVertex(center.clone().add(corner), color, [{ bone, weight: 1 }]));

  [
    [0, 2, 1], [0, 3, 2],
    [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4],
    [1, 2, 6], [1, 6, 5],
    [2, 3, 7], [2, 7, 6],
    [3, 0, 4], [3, 4, 7],
  ].forEach(([a, b, c]) => acc.pushTriangle(corners[a], corners[b], corners[c]));
  return true;
}

function midpoint(points, aName, bName, fallbackName = aName) {
  const a = points.get(aName);
  const b = points.get(bName);
  if (a && b) return a.clone().lerp(b, 0.5);
  return (points.get(fallbackName) || new THREE.Vector3()).clone();
}

function captureGeometryScale() {
  return CAPTURE_TARGET_HEIGHT / CAPTURE_REFERENCE_HEIGHT;
}

function captureDimension(value) {
  return value * captureGeometryScale();
}

function captureSize(x, y, z) {
  const scale = captureGeometryScale();
  return new THREE.Vector3(x * scale, y * scale, z * scale);
}

function buildSkinnedCaptureGeometry(restWorld, orderedBones) {
  const boneIndexByName = new Map(orderedBones.map((bone, index) => [bone.name, index]));
  const acc = createGeometryAccumulator(boneIndexByName);
  const headHeight = Math.max(getDistance(restWorld, 'NECK', 'HEAD', 0.75), 0.55);
  const pelvisSize = captureSize(1.0, 0.42, 0.6);
  const torsoWidth = captureDimension(0.9);
  const torsoDepth = captureDimension(0.5);
  const upperTorsoWidth = captureDimension(0.86);
  const upperTorsoDepth = captureDimension(0.46);
  const neckSize = captureDimension(0.34);
  const headSize = new THREE.Vector3(
    captureDimension(0.7),
    Math.max(headHeight * 0.82, captureDimension(0.8)),
    captureDimension(0.7)
  );
  const shoulderWidth = captureDimension(0.34);
  const shoulderDepth = captureDimension(0.32);
  const upperArmWidth = captureDimension(0.25);
  const forearmWidth = captureDimension(0.22);
  const upperLegWidth = captureDimension(0.35);
  const shinWidth = captureDimension(0.31);

  addCuboid(acc, {
    center: restWorld.get('PELVIS'),
    size: pelvisSize,
    bone: 'PELVIS',
    color: SEGMENT_COLORS.pelvis,
  });

  addSegmentPrism(acc, {
    start: restWorld.get('PELVIS'),
    end: restWorld.get('CHEST'),
    width: torsoWidth,
    depth: torsoDepth,
    startBone: 'PELVIS',
    endBone: 'CHEST',
    color: SEGMENT_COLORS.torsoDark,
    divisions: 8,
  });
  addSegmentPrism(acc, {
    start: restWorld.get('CHEST'),
    end: restWorld.get('NECK'),
    width: upperTorsoWidth,
    depth: upperTorsoDepth,
    startBone: 'CHEST',
    endBone: 'NECK',
    color: SEGMENT_COLORS.torso,
    divisions: 6,
  });
  addSegmentPrism(acc, {
    start: restWorld.get('NECK'),
    end: restWorld.get('HEAD'),
    width: neckSize,
    depth: neckSize,
    startBone: 'NECK',
    endBone: 'HEAD',
    color: SEGMENT_COLORS.skin,
    divisions: 2,
  });
  addCuboid(acc, {
    center: midpoint(restWorld, 'NECK', 'HEAD', 'HEAD').lerp(restWorld.get('HEAD') || new THREE.Vector3(), 0.65),
    size: headSize,
    bone: 'HEAD',
    color: SEGMENT_COLORS.skin,
  });

  [
    ['CLAVICLE_L', 'ARM_L_UPPER', shoulderWidth, shoulderDepth, 'CLAVICLE_L', 'ARM_L_UPPER', SEGMENT_COLORS.sleeve, 2],
    ['ARM_L_UPPER', 'ARM_L_LOWER', upperArmWidth, upperArmWidth, 'ARM_L_UPPER', 'ARM_L_LOWER', SEGMENT_COLORS.sleeve, 6],
    ['ARM_L_LOWER', 'HAND_L', forearmWidth, forearmWidth, 'ARM_L_LOWER', 'HAND_L', SEGMENT_COLORS.glove, 6],
    ['CLAVICLE_R', 'ARM_R_UPPER', shoulderWidth, shoulderDepth, 'CLAVICLE_R', 'ARM_R_UPPER', SEGMENT_COLORS.sleeve, 2],
    ['ARM_R_UPPER', 'ARM_R_LOWER', upperArmWidth, upperArmWidth, 'ARM_R_UPPER', 'ARM_R_LOWER', SEGMENT_COLORS.sleeve, 6],
    ['ARM_R_LOWER', 'HAND_R', forearmWidth, forearmWidth, 'ARM_R_LOWER', 'HAND_R', SEGMENT_COLORS.glove, 6],
    ['LEG_L_UPPER', 'LEG_L_LOWER', upperLegWidth, upperLegWidth, 'LEG_L_UPPER', 'LEG_L_LOWER', SEGMENT_COLORS.pants, 7],
    ['LEG_L_LOWER', 'FOOT_L', shinWidth, shinWidth, 'LEG_L_LOWER', 'FOOT_L', SEGMENT_COLORS.shin, 7],
    ['LEG_R_UPPER', 'LEG_R_LOWER', upperLegWidth, upperLegWidth, 'LEG_R_UPPER', 'LEG_R_LOWER', SEGMENT_COLORS.pants, 7],
    ['LEG_R_LOWER', 'FOOT_R', shinWidth, shinWidth, 'LEG_R_LOWER', 'FOOT_R', SEGMENT_COLORS.shin, 7],
  ].forEach(([startName, endName, width, depth, startBone, endBone, color, divisions]) => {
    addSegmentPrism(acc, {
      start: restWorld.get(startName),
      end: restWorld.get(endName),
      width,
      depth,
      startBone,
      endBone,
      color,
      divisions,
    });
  });

  [
    ['HAND_L', 'ARM_L_LOWER', captureSize(0.26, 0.22, 0.28), SEGMENT_COLORS.skin],
    ['HAND_R', 'ARM_R_LOWER', captureSize(0.26, 0.22, 0.28), SEGMENT_COLORS.skin],
    ['FOOT_L', 'LEG_L_LOWER', captureSize(0.32, 0.22, 0.54), SEGMENT_COLORS.boot],
    ['FOOT_R', 'LEG_R_LOWER', captureSize(0.32, 0.22, 0.54), SEGMENT_COLORS.boot],
  ].forEach(([bone, parentBone, size, color]) => {
    const center = midpoint(restWorld, bone, parentBone, bone).lerp(restWorld.get(bone) || new THREE.Vector3(), 0.72);
    addCuboid(acc, { center, size, bone, color });
  });

  return acc.toGeometry();
}

function buildSlotMap() {
  return {
    HEAD: ['HEAD'],
    TORSO: ['ROOT', 'PELVIS', 'CHEST', 'NECK'],
    ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
    ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
    LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
    LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
    WEAPON_MAIN: [],
    WEAPON_SECONDARY: [],
  };
}

export function isSkinnedCaptureGroup(group) {
  return !!(
    group?.isGroup
    && (
      group.userData?.humanoidRigMode === CAPTURE_SKINNED_RIG_MODE
      || group.userData?.captureSkinned?.version
    )
  );
}

export function createSkinnedCaptureCharacter(sourceSkeleton, options = {}) {
  const skeletonDefinition = normalizeSourceSkeleton(sourceSkeleton);
  const {
    rootBone,
    orderedBones,
    bonesByName,
    restWorld,
    rootBasePosition,
    scale,
  } = createBoneHierarchy(skeletonDefinition);
  const group = new THREE.Group();
  const safeName = String(options.name || 'Motion Ripper Skinned Human').trim() || 'Motion Ripper Skinned Human';
  const geometry = buildSkinnedCaptureGeometry(restWorld, orderedBones);
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.52,
    metalness: 0.06,
    vertexColors: true,
    flatShading: true,
  });
  const mesh = new THREE.SkinnedMesh(geometry, material);

  group.name = safeName;
  group.userData.name = safeName;
  mesh.name = 'CAPTURE_SKINNED_MESH';
  mesh.userData.name = 'CAPTURE_SKINNED_MESH';
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.add(rootBone);

  const skeleton = new THREE.Skeleton(orderedBones);
  mesh.bind(skeleton);
  mesh.normalizeSkinWeights();
  group.add(mesh);
  group.updateMatrixWorld(true);

  group.userData.templateId = options.templateId || null;
  group.userData.archetype = 'HUMANOID';
  group.userData.skeletonId = HUMANOID_CAPTURE_SKELETON_ID;
  group.userData.animationProfile = null;
  group.userData.slotMap = buildSlotMap();
  group.userData.slotBindings = cloneJsonValue(skeletonDefinition.defaultBindings || buildSlotMap());
  group.userData.humanoidRigMode = CAPTURE_SKINNED_RIG_MODE;
  group.userData.motionRipperGenerated = {
    generatedFrom: 'motion-ripper-video-skinned',
    sourceSkeletonId: skeletonDefinition.id || HUMANOID_CAPTURE_SKELETON_ID,
    captureRigScale: roundValue(scale),
  };
  group.userData.captureSkinned = {
    version: CAPTURE_SKINNED_VERSION,
    sourceSkeleton: cloneJsonValue(skeletonDefinition),
    rootBasePosition: vectorToArray(rootBasePosition),
    boneNames: orderedBones.map((bone) => bone.name),
    captureRigScale: roundValue(scale),
  };

  group.userData.captureSkinned.boneWorldPositions = Object.fromEntries(
    CAPTURE_BONE_ORDER.map((boneName) => [boneName, vectorToArray(restWorld.get(boneName) || new THREE.Vector3())])
  );
  group.userData.captureSkinned.boneLocalPositions = Object.fromEntries(
    CAPTURE_BONE_ORDER.map((boneName) => [boneName, vectorToArray(bonesByName.get(boneName)?.position || new THREE.Vector3())])
  );

  return group;
}

export function getSkinnedCaptureRootBase(group) {
  const stored = group?.userData?.captureSkinned?.rootBasePosition;
  if (isFiniteVectorArray(stored)) {
    return new THREE.Vector3(stored[0], stored[1], stored[2]);
  }

  let rootBone = null;
  group?.traverse?.((node) => {
    if (!rootBone && (node.userData?.name === 'ROOT' || node.name === 'ROOT')) {
      rootBone = node;
    }
  });
  return rootBone?.position?.clone?.() || new THREE.Vector3();
}

function rotateRootDelta(delta, captureFacingYaw = 0) {
  if (!Number.isFinite(captureFacingYaw) || Math.abs(captureFacingYaw) < 1e-6) {
    return delta;
  }
  return delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), captureFacingYaw);
}

function unwrapEulerAngle(angle, previousAngle) {
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

function rotationValueToQuaternion(value) {
  if (Array.isArray(value) && value.length >= 4) {
    return new THREE.Quaternion(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      value[3] ?? 1
    ).normalize();
  }
  if (Array.isArray(value) && value.length >= 3) {
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(
      value[0] ?? 0,
      value[1] ?? 0,
      value[2] ?? 0,
      'XYZ'
    )).normalize();
  }
  return new THREE.Quaternion();
}

function quaternionToRotationValue(quaternion, previousValue = null) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  const value = [euler.x, euler.y, euler.z];
  if (!Array.isArray(previousValue)) return value;
  return value.map((axisValue, axis) => unwrapEulerAngle(axisValue, previousValue[axis]));
}

function findSkinnedCaptureBone(group, boneName) {
  let targetBone = null;
  group?.traverse?.((node) => {
    if (targetBone) return;
    if (node.userData?.name === boneName || node.name === boneName) {
      targetBone = node;
    }
  });
  return targetBone;
}

function getNodeRestQuaternion(node) {
  const quaternion = node?.quaternion?.clone?.() || new THREE.Quaternion();
  return quaternion.normalize();
}

function shouldUseIdentityRotationReference(track, animDef) {
  const firstValue = track?.keyframes?.[0]?.value;
  return track?.rotationSpace === 'rest-delta'
    || (
      animDef?.source === 'motion-ripper'
      && Array.isArray(firstValue)
      && firstValue.length <= 3
    );
}

function retargetRotationTrackToRest(track, targetName, restQuaternion, options = {}) {
  const keyframes = track.keyframes || [];
  if (keyframes.length === 0) return null;

  const referenceQuaternion = options.useIdentityReference
    ? new THREE.Quaternion()
    : rotationValueToQuaternion(keyframes[0]?.value);
  const inverseReferenceQuaternion = referenceQuaternion.clone().invert();
  let previousValue = null;

  return {
    ...track,
    target: targetName,
    property: 'rotation',
    keyframes: keyframes.map((keyframe) => {
      const sourceQuaternion = rotationValueToQuaternion(keyframe.value);
      const deltaQuaternion = sourceQuaternion.multiply(inverseReferenceQuaternion).normalize();
      const retargetedQuaternion = restQuaternion.clone().multiply(deltaQuaternion).normalize();
      const value = quaternionToRotationValue(retargetedQuaternion, previousValue);
      previousValue = value;
      return {
        ...keyframe,
        value,
      };
    }),
  };
}

export function buildSkinnedCaptureAnimationDefinition(animDef, group, options = {}) {
  if (!animDef?.tracks?.length || !isSkinnedCaptureGroup(group)) return null;

  const rootBase = getSkinnedCaptureRootBase(group);
  const boneNames = new Set(group.userData?.captureSkinned?.boneNames || CAPTURE_BONE_ORDER);
  const tracks = [];

  for (const track of animDef.tracks) {
    if (!track?.target || !track.property) continue;

    if (track.target === 'ROOT') {
      if (track.property !== 'position') continue;
      const rest = track.keyframes?.[0]?.value || [0, 0, 0];
      tracks.push({
        ...track,
        target: 'ROOT',
        keyframes: (track.keyframes || []).map((keyframe) => {
          const value = keyframe.value || [0, 0, 0];
          const delta = new THREE.Vector3(
            (value[0] ?? 0) - (rest[0] ?? 0),
            (value[1] ?? 0) - (rest[1] ?? 0),
            (value[2] ?? 0) - (rest[2] ?? 0)
          );
          const rotatedDelta = rotateRootDelta(delta, options.captureFacingYaw || 0);
          return {
            ...keyframe,
            value: [
              rootBase.x + rotatedDelta.x,
              rootBase.y + rotatedDelta.y,
              rootBase.z + rotatedDelta.z,
            ],
          };
        }),
      });
      continue;
    }

    if (boneNames.has(track.target)) {
      if (track.property === 'position') {
        continue;
      }

      if (track.property === 'rotation') {
        const targetBone = findSkinnedCaptureBone(group, track.target);
        const translatedTrack = retargetRotationTrackToRest(
          track,
          track.target,
          getNodeRestQuaternion(targetBone),
          { useIdentityReference: shouldUseIdentityRotationReference(track, animDef) }
        );
        if (translatedTrack) {
          tracks.push(translatedTrack);
        }
        continue;
      }

      tracks.push({
        ...track,
        target: track.target,
        keyframes: (track.keyframes || []).map((keyframe) => ({
          ...keyframe,
          value: Array.isArray(keyframe.value) ? [...keyframe.value] : keyframe.value,
        })),
      });
    }
  }

  if (tracks.length === 0) return null;

  return {
    ...animDef,
    tracks,
    name: animDef.name,
    duration: animDef.duration,
    loop: animDef.loop,
    source: animDef.source,
    sourceSkeletonId: animDef.sourceSkeletonId || HUMANOID_CAPTURE_SKELETON_ID,
    sourceAuthor: 'motion-ripper-skinned',
  };
}

export function serializeSkinnedCaptureGroup(group) {
  if (!isSkinnedCaptureGroup(group)) return null;

  return {
    type: 'skinned-capture',
    version: CAPTURE_SKINNED_VERSION,
    name: group.userData?.name || group.name || 'Motion Ripper Skinned Human',
    position: group.position.toArray(),
    rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
    scale: group.scale.toArray(),
    sourceSkeleton: cloneJsonValue(group.userData?.captureSkinned?.sourceSkeleton),
    animations: cloneJsonValue(group.userData?.animations || []),
    templateId: group.userData?.templateId || null,
  };
}

export function isSerializedSkinnedCapture(data) {
  return !!(
    data
    && data.type === 'skinned-capture'
    && data.sourceSkeleton
    && Array.isArray(data.sourceSkeleton.bones)
  );
}
