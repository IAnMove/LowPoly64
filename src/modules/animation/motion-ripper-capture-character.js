import * as THREE from 'three';
import { state } from '../shared/state.js';
import { buildGroupFromDefinition } from '../viewport/templates.js';
import { getSkeletonById } from './skeleton-registry.js';
import {
  CAPTURE_CHARACTER_FLOOR_Y,
  CAPTURE_CHARACTER_MAX_SCALE,
  CAPTURE_CHARACTER_MIN_SCALE,
  CAPTURE_CHARACTER_REFERENCE_HEIGHT,
  CAPTURE_CHARACTER_TARGET_HEIGHT,
  CAPTURE_JOINTS,
  CAPTURE_MIRROR_JOINTS,
  HUMANOID_CAPTURE_SKELETON_ID,
  LATERAL_RUNNER_FLATNESS_RATIO,
} from './motion-ripper-constants.js';
import {
  buildSkeletonWorldPositionMap,
  getCaptureRigJointNames,
  getCaptureSkeletonParentName,
  getVectorBounds,
  roundSkeletonValue,
  vectorToRoundedArray,
} from './motion-ripper-skeleton-utils.js';

function cloneJsonValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function sanitizeDebugFileStem(name) {
  return String(name || 'motion-ripper')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'motion-ripper';
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

function getCaptureDefaultBindings(sourceSkeleton = null) {
  const fallbackSkeleton = getSkeletonById(HUMANOID_CAPTURE_SKELETON_ID);
  return cloneJsonValue(
    sourceSkeleton?.defaultBindings
    || fallbackSkeleton?.defaultBindings
    || {
      HEAD: ['HEAD'],
      TORSO: ['PELVIS', 'CHEST', 'NECK'],
      ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
      ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
      LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
      LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
      WEAPON_MAIN: [],
      WEAPON_SECONDARY: [],
    }
  );
}

function roundGeometryValue(value) {
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 10000) / 10000 : 0;
}

function vectorToGeometryArray(vector) {
  return [
    roundGeometryValue(vector?.x ?? 0),
    roundGeometryValue(vector?.y ?? 0),
    roundGeometryValue(vector?.z ?? 0),
  ];
}

function createCuboidGeometryBetween(start, end, width = 0.24, depth = width) {
  if (!start || !end) return null;

  const segment = end.clone().sub(start);
  const length = segment.length();
  if (length < 1e-5) return null;

  const axis = segment.clone().normalize();
  const reference = Math.abs(axis.dot(new THREE.Vector3(0, 1, 0))) < 0.92
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const sideA = new THREE.Vector3().crossVectors(axis, reference).normalize().multiplyScalar(width * 0.5);
  const sideB = new THREE.Vector3().crossVectors(axis, sideA).normalize().multiplyScalar(depth * 0.5);
  const localEnd = segment;

  const makeCorners = (point) => [
    point.clone().add(sideA).add(sideB),
    point.clone().add(sideA).sub(sideB),
    point.clone().sub(sideA).sub(sideB),
    point.clone().sub(sideA).add(sideB),
  ];

  return {
    type: 'custom',
    vertices: [
      ...makeCorners(new THREE.Vector3()),
      ...makeCorners(localEnd),
    ].map(vectorToGeometryArray),
    faces: [
      [0, 1, 2], [0, 2, 3],
      [4, 6, 5], [4, 7, 6],
      [0, 4, 5], [0, 5, 1],
      [1, 5, 6], [1, 6, 2],
      [2, 6, 7], [2, 7, 3],
      [3, 7, 4], [3, 4, 0],
    ],
  };
}

function getCaptureCharacterSpace(sourceSkeleton) {
  const sourceWorld = buildSkeletonWorldPositionMap(sourceSkeleton);
  const sourceBounds = getVectorBounds(CAPTURE_JOINTS.map((jointName) => sourceWorld.get(jointName)));
  const sourceHeight = Math.max(sourceBounds?.size?.y || 0, 1e-5);
  const scale = THREE.MathUtils.clamp(
    CAPTURE_CHARACTER_TARGET_HEIGHT / sourceHeight,
    CAPTURE_CHARACTER_MIN_SCALE,
    CAPTURE_CHARACTER_MAX_SCALE
  );
  const center = sourceBounds
    ? new THREE.Vector3(
        (sourceBounds.min.x + sourceBounds.max.x) * 0.5,
        sourceBounds.min.y,
        (sourceBounds.min.z + sourceBounds.max.z) * 0.5
      )
    : new THREE.Vector3();
  const floorOffset = new THREE.Vector3(0, CAPTURE_CHARACTER_FLOOR_Y, 0);
  const points = {};

  CAPTURE_JOINTS.forEach((jointName) => {
    const source = sourceWorld.get(jointName) || new THREE.Vector3();
    points[jointName] = source.clone().sub(center).multiplyScalar(scale).add(floorOffset);
  });

  return { points, scale };
}

function distanceBetweenPoints(points, aName, bName, fallback = 0.4) {
  const a = points[aName];
  const b = points[bName];
  if (!a || !b) return fallback;
  const distance = a.distanceTo(b);
  return Number.isFinite(distance) && distance > 1e-5 ? distance : fallback;
}

function capturePointArray(points, jointName) {
  return vectorToRoundedArray(points[jointName] || new THREE.Vector3());
}

function makeCaptureLabelPiece(points, name, parent = null) {
  return {
    name,
    geometry: { type: 'label', params: {} },
    position: capturePointArray(points, name),
    pivot: capturePointArray(points, name),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureBoxPiece(points, name, parent, size, color, offset = new THREE.Vector3()) {
  const pivot = points[name] || new THREE.Vector3();
  const position = pivot.clone().add(offset);
  return {
    name,
    geometry: {
      type: 'cube',
      params: {
        width: roundGeometryValue(size.x),
        height: roundGeometryValue(size.y),
        depth: roundGeometryValue(size.z),
      },
    },
    color,
    position: vectorToRoundedArray(position),
    pivot: vectorToRoundedArray(pivot),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureSegmentPiece(points, name, parent, childName, width, depth, color) {
  const start = points[name] || new THREE.Vector3();
  const end = points[childName] || null;
  const geometry = createCuboidGeometryBetween(start, end, width, depth);
  if (!geometry) {
    return makeCaptureLabelPiece(points, name, parent);
  }

  return {
    name,
    geometry,
    color,
    position: vectorToRoundedArray(start),
    pivot: vectorToRoundedArray(start),
    ...(parent ? { parent } : {}),
  };
}

function makeCaptureVisualSegmentPiece(points, name, parent, startName, endName, width, depth, color) {
  const start = points[startName] || new THREE.Vector3();
  const end = points[endName] || null;
  const geometry = createCuboidGeometryBetween(start, end, width, depth);
  if (!geometry) {
    return null;
  }

  return {
    name,
    geometry,
    color,
    position: vectorToRoundedArray(start),
    pivot: vectorToRoundedArray(start),
    ...(parent ? { parent } : {}),
  };
}

function captureCharacterGeometryScale() {
  return CAPTURE_CHARACTER_TARGET_HEIGHT / CAPTURE_CHARACTER_REFERENCE_HEIGHT;
}

function captureCharacterDimension(value) {
  return value * captureCharacterGeometryScale();
}

function captureCharacterSize(x, y, z) {
  const scale = captureCharacterGeometryScale();
  return new THREE.Vector3(x * scale, y * scale, z * scale);
}

export function buildCaptureCharacterDefinition(sourceSkeleton, animationName) {
  const { points, scale } = getCaptureCharacterSpace(sourceSkeleton);
  const headHeight = Math.max(distanceBetweenPoints(points, 'NECK', 'HEAD', 0.75), 0.55);
  const pelvisSize = captureCharacterSize(1.0, 0.42, 0.6);
  const torsoWidth = captureCharacterDimension(0.9);
  const torsoDepth = captureCharacterDimension(0.5);
  const upperTorsoWidth = captureCharacterDimension(0.86);
  const upperTorsoDepth = captureCharacterDimension(0.46);
  const neckSize = captureCharacterDimension(0.34);
  const headSize = new THREE.Vector3(
    captureCharacterDimension(0.7),
    Math.max(headHeight * 0.82, captureCharacterDimension(0.8)),
    captureCharacterDimension(0.7)
  );
  const shoulderWidth = captureCharacterDimension(0.34);
  const shoulderDepth = captureCharacterDimension(0.32);
  const upperArmWidth = captureCharacterDimension(0.25);
  const forearmWidth = captureCharacterDimension(0.22);
  const upperLegWidth = captureCharacterDimension(0.35);
  const shinWidth = captureCharacterDimension(0.31);
  const safeName = sanitizeDebugFileStem(animationName || 'capture').replace(/-/g, '_');
  const bindings = getCaptureDefaultBindings(sourceSkeleton);

  const pieces = [
    makeCaptureBoxPiece(
      points,
      'PELVIS',
      null,
      pelvisSize,
      '#273856'
    ),
    makeCaptureVisualSegmentPiece(points, 'TORSO_CORE', 'PELVIS', 'PELVIS', 'CHEST', torsoWidth, torsoDepth, '#245f9f'),
    makeCaptureSegmentPiece(points, 'CHEST', 'PELVIS', 'NECK', upperTorsoWidth, upperTorsoDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'NECK', 'CHEST', 'HEAD', neckSize, neckSize, '#d8b08f'),
    makeCaptureBoxPiece(
      points,
      'HEAD',
      'NECK',
      headSize,
      '#d8b08f',
      new THREE.Vector3(0, headHeight * 0.15, 0)
    ),
    makeCaptureSegmentPiece(points, 'CLAVICLE_L', 'CHEST', 'ARM_L_UPPER', shoulderWidth, shoulderDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_L_UPPER', 'CLAVICLE_L', 'ARM_L_LOWER', upperArmWidth, upperArmWidth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_L_LOWER', 'ARM_L_UPPER', 'HAND_L', forearmWidth, forearmWidth, '#324258'),
    makeCaptureBoxPiece(points, 'HAND_L', 'ARM_L_LOWER', captureCharacterSize(0.26, 0.22, 0.28), '#d8b08f'),
    makeCaptureSegmentPiece(points, 'CLAVICLE_R', 'CHEST', 'ARM_R_UPPER', shoulderWidth, shoulderDepth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_R_UPPER', 'CLAVICLE_R', 'ARM_R_LOWER', upperArmWidth, upperArmWidth, '#2f7fd1'),
    makeCaptureSegmentPiece(points, 'ARM_R_LOWER', 'ARM_R_UPPER', 'HAND_R', forearmWidth, forearmWidth, '#324258'),
    makeCaptureBoxPiece(points, 'HAND_R', 'ARM_R_LOWER', captureCharacterSize(0.26, 0.22, 0.28), '#d8b08f'),
    makeCaptureSegmentPiece(points, 'LEG_L_UPPER', 'PELVIS', 'LEG_L_LOWER', upperLegWidth, upperLegWidth, '#273856'),
    makeCaptureSegmentPiece(points, 'LEG_L_LOWER', 'LEG_L_UPPER', 'FOOT_L', shinWidth, shinWidth, '#1f2d44'),
    makeCaptureBoxPiece(points, 'FOOT_L', 'LEG_L_LOWER', captureCharacterSize(0.32, 0.22, 0.54), '#101820'),
    makeCaptureSegmentPiece(points, 'LEG_R_UPPER', 'PELVIS', 'LEG_R_LOWER', upperLegWidth, upperLegWidth, '#273856'),
    makeCaptureSegmentPiece(points, 'LEG_R_LOWER', 'LEG_R_UPPER', 'FOOT_R', shinWidth, shinWidth, '#1f2d44'),
    makeCaptureBoxPiece(points, 'FOOT_R', 'LEG_R_LOWER', captureCharacterSize(0.32, 0.22, 0.54), '#101820'),
  ].filter(Boolean);

  return {
    id: `motion_ripper_capture_${safeName}`,
    name: `${animationName || 'Capture'} Character`,
    assetRole: 'playable',
    pieces,
    _captureRigScale: scale,
    _archetypeMeta: {
      archetype: 'HUMANOID',
      skeletonId: HUMANOID_CAPTURE_SKELETON_ID,
      animationProfile: null,
      slotMap: bindings,
    },
  };
}

function getCaptureCharacterSpawnPosition(referenceGroup = null) {
  const position = new THREE.Vector3();
  if (referenceGroup?.isObject3D) {
    referenceGroup.getWorldPosition(position);
    state.userObjects?.worldToLocal?.(position);
    position.x += 6;
    return position;
  }

  const existingCount = state.userObjects?.children?.length || 0;
  return new THREE.Vector3(existingCount * 6, 0, 0);
}

export function buildCaptureCharacterGroup(sourceSkeleton, animationName, referenceGroup = null) {
  const def = buildCaptureCharacterDefinition(sourceSkeleton, animationName);
  const group = buildGroupFromDefinition(def, { compileAnimations: false });
  const bindings = getCaptureDefaultBindings(sourceSkeleton);
  group.name = def.name;
  group.userData.name = def.name;
  group.userData.templateId = def.id;
  group.userData.archetype = 'HUMANOID';
  group.userData.slotMap = cloneJsonValue(bindings);
  group.userData.slotBindings = cloneJsonValue(bindings);
  group.userData.animationProfile = null;
  group.userData.skeletonId = HUMANOID_CAPTURE_SKELETON_ID;
  group.userData.humanoidRigMode = 'capture-generated';
  group.userData.motionRipperGenerated = {
    generatedFrom: 'motion-ripper-video',
    sourceSkeletonId: sourceSkeleton?.id || HUMANOID_CAPTURE_SKELETON_ID,
    captureRigScale: roundSkeletonValue(def._captureRigScale || 1),
  };
  group.position.copy(getCaptureCharacterSpawnPosition(referenceGroup));
  group.updateMatrixWorld(true);
  return group;
}
