import * as THREE from 'three';
import {
  AVATAR_HEAD_BUILD_MODE_MOLD,
  resolveAvatarRecipe,
} from './avatar-recipe.js';

export const PREVIEW_FOCUS_FULL = 'full';
export const PREVIEW_FOCUS_HEAD = 'head';
export const HEAD_SLOT_ID = 'HEAD';

const HEAD_ROOT_NAME_PATTERN = /^HEAD_BASE$/i;
const FEATURE_SLAB_NAME_PATTERN = /(^|_)(EYE|BROW|MOUTH|FULL_FACE)_SLAB(_[LR])?$/i;
const FEATURE_AUTHORING_DIAGNOSTIC_CONFIG = Object.freeze({
  eyes: Object.freeze({
    namePattern: /(EYE|IRIS|PUPIL|LID)/i,
    leftPattern: /_L($|_)/i,
    rightPattern: /_R($|_)/i,
  }),
  mouth: Object.freeze({
    namePattern: /(MOUTH|LIP|TEETH|TOOTH)/i,
  }),
  ears: Object.freeze({
    namePattern: /(^|_)EAR(_|$)/i,
    leftPattern: /_L($|_)/i,
    rightPattern: /_R($|_)/i,
  }),
  accessory: Object.freeze({
    namePattern: /(^|_)ACC(_|$)/i,
  }),
  hair: Object.freeze({
    namePattern: /(^|_)HAIR(_|$)/i,
  }),
});

function findNodeByName(root, targetName) {
  if (!root || !targetName) return null;
  let found = null;
  root.traverse((node) => {
    if (found) return;
    const nodeName = node.userData?.name || node.name;
    if (nodeName === targetName) found = node;
  });
  return found;
}

export function computeBoundsForNames(root, names = []) {
  const box = new THREE.Box3();
  let hasBounds = false;
  names.forEach((name) => {
    const node = findNodeByName(root, name);
    if (!node) return;
    const nodeBox = new THREE.Box3().setFromObject(node);
    if (nodeBox.isEmpty()) return;
    box.union(nodeBox);
    hasBounds = true;
  });
  return hasBounds ? box : null;
}

function resolveNodeName(node) {
  return node?.userData?.name || node?.name || '';
}

function findFirstMesh(root) {
  if (!root?.traverse) return null;
  let mesh = null;
  root.traverse((node) => {
    if (mesh) return;
    if (node.isMesh) mesh = node;
  });
  return mesh;
}

export function collectFeatureSlabDebugNodes(root) {
  const primary = [];
  const fallback = [];
  const seen = new Set();

  root?.traverse?.((node) => {
    const nodeName = resolveNodeName(node);
    const hasSlabName = FEATURE_SLAB_NAME_PATTERN.test(String(nodeName || ''));
    const hasSlabMeta = !!node.userData?.featureSlab;
    if (!hasSlabName && !hasSlabMeta) return;

    const key = nodeName || node.uuid;
    if (node.userData?.isPivot) {
      if (!seen.has(key)) {
        primary.push(node);
        seen.add(key);
      }
      return;
    }

    if (!node.parent?.userData?.featureSlab) {
      fallback.push(node);
    }
  });

  return primary.length > 0 ? primary : fallback;
}

function readFeatureSlabSpriteId(node) {
  const mesh = findFirstMesh(node);
  const layer = mesh?.userData?.decalSpec?.layers?.[0] || null;
  return typeof layer?.sprite === 'string' ? layer.sprite : null;
}

export function resolveFeatureSlabDebugDiagnostics(object3D) {
  return collectFeatureSlabDebugNodes(object3D).map((node) => {
    const meta = node.userData?.featureSlab || {};
    const box = new THREE.Box3().setFromObject(node);
    const protrusionRatio = Number.isFinite(meta.protrusionRatio)
      ? meta.protrusionRatio
      : meta.frontProtrusionRatio;
    return {
      name: resolveNodeName(node),
      kind: meta.kind || null,
      side: meta.side || null,
      presetId: meta.presetId || null,
      spriteId: readFeatureSlabSpriteId(node),
      surfaceZ: roundDiagnosticValue(meta.surfaceZ),
      centerSurfaceZ: roundDiagnosticValue(meta.centerSurfaceZ),
      frontZ: roundDiagnosticValue(meta.frontZ),
      depth: roundDiagnosticValue(meta.depth),
      headDepth: roundDiagnosticValue(meta.headDepth),
      headDepthRatio: roundDiagnosticValue(meta.headDepthRatio),
      depthSource: meta.depthSource || null,
      embeddedRatio: roundDiagnosticValue(meta.embeddedRatio),
      frontProtrusionRatio: roundDiagnosticValue(protrusionRatio),
      sidePadding: roundDiagnosticValue(meta.sidePadding),
      bounds: serializeDiagnosticBox(box),
    };
  });
}

function collectNamedNodes(root) {
  const names = [];
  const seen = new Set();
  root?.traverse?.((node) => {
    const nodeName = node.userData?.name || node.name || '';
    if (!nodeName || seen.has(nodeName)) return;
    seen.add(nodeName);
    names.push(nodeName);
  });
  return names;
}

export function getPreviewHeadSlotNames(object3D) {
  const slotNames = object3D?.userData?.slotMap?.[HEAD_SLOT_ID];
  return Array.isArray(slotNames) ? slotNames : [];
}

export function resolveHeadRootNames(object3D) {
  const headSlotNames = getPreviewHeadSlotNames(object3D);
  const rootNames = headSlotNames.filter((name) => HEAD_ROOT_NAME_PATTERN.test(name));
  return rootNames.length > 0
    ? rootNames
    : collectNamedNodes(object3D).filter((name) => HEAD_ROOT_NAME_PATTERN.test(name));
}

function filterNamesByPattern(names, pattern) {
  if (!Array.isArray(names) || !pattern) return [];
  return names.filter((name) => pattern.test(String(name || '')));
}

export function resolvePreviewFocusMode(value) {
  return value === PREVIEW_FOCUS_HEAD ? PREVIEW_FOCUS_HEAD : PREVIEW_FOCUS_FULL;
}

export function resolveHeadPreviewFrontDirection(object3D, fallbackRecipe = null) {
  void object3D;
  void fallbackRecipe;
  return new THREE.Vector3(0, 0.2, 1);
}

export function roundDiagnosticValue(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

export function serializeDiagnosticVector(vector) {
  return vector
    ? vector.toArray().map((value) => roundDiagnosticValue(value))
    : null;
}

export function serializeDiagnosticBox(box) {
  if (!box || box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return {
    min: serializeDiagnosticVector(box.min),
    max: serializeDiagnosticVector(box.max),
    center: serializeDiagnosticVector(center),
    size: serializeDiagnosticVector(size),
  };
}

export function resolvePreviewHeadBounds(object3D) {
  const headNames = resolveHeadRootNames(object3D);
  return computeBoundsForNames(object3D, headNames);
}

export function resolvePreviewCameraSide(camera, controls, object3D, fallbackRecipe = null) {
  if (!camera || !controls) return 'unknown';

  const frontDirection = resolveHeadPreviewFrontDirection(object3D, fallbackRecipe);
  frontDirection.y = 0;
  if (frontDirection.lengthSq() <= 0.0001) return 'unknown';
  frontDirection.normalize();

  const cameraOffset = camera.position.clone().sub(controls.target);
  cameraOffset.y = 0;
  if (cameraOffset.lengthSq() <= 0.0001) return 'unknown';
  cameraOffset.normalize();

  return cameraOffset.dot(frontDirection) >= 0 ? 'front' : 'back';
}

function safeDiagnosticRatio(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || Math.abs(denominator) <= 0.0001) {
    return null;
  }
  return roundDiagnosticValue(numerator / denominator);
}

export function resolveFeatureAuthoringDiagnostics(object3D, featureKey = 'eyes', fallbackRecipe = null) {
  const config = FEATURE_AUTHORING_DIAGNOSTIC_CONFIG[featureKey];
  const headRootNames = resolveHeadRootNames(object3D);
  const headSlotNames = getPreviewHeadSlotNames(object3D);
  const searchableNames = [...new Set([...headSlotNames, ...collectNamedNodes(object3D)])];
  const featureNames = filterNamesByPattern(searchableNames, config?.namePattern);
  const leftNames = filterNamesByPattern(featureNames, config?.leftPattern);
  const rightNames = filterNamesByPattern(featureNames, config?.rightPattern);
  const headBounds = computeBoundsForNames(object3D, headRootNames);
  const featureBounds = computeBoundsForNames(object3D, featureNames);
  const leftBounds = computeBoundsForNames(object3D, leftNames);
  const rightBounds = computeBoundsForNames(object3D, rightNames);
  const eyeNames = featureKey === 'mouth'
    ? filterNamesByPattern(searchableNames, FEATURE_AUTHORING_DIAGNOSTIC_CONFIG.eyes.namePattern)
    : [];
  const eyeBounds = computeBoundsForNames(object3D, eyeNames);
  const resolved = resolveAvatarRecipe(object3D?.userData?.avatarRecipe || fallbackRecipe || undefined);

  let metrics = null;
  if (headBounds && featureBounds) {
    const headCenter = headBounds.getCenter(new THREE.Vector3());
    const headSize = headBounds.getSize(new THREE.Vector3());
    const featureCenter = featureBounds.getCenter(new THREE.Vector3());
    const featureSize = featureBounds.getSize(new THREE.Vector3());
    const frontDirection = resolveHeadPreviewFrontDirection(object3D, fallbackRecipe);
    frontDirection.y = 0;
    if (frontDirection.lengthSq() > 0.0001) frontDirection.normalize();
    const featureOffset = featureCenter.clone().sub(headCenter);
    const leftCenter = leftBounds?.getCenter(new THREE.Vector3()) || null;
    const rightCenter = rightBounds?.getCenter(new THREE.Vector3()) || null;
    const leftDistance = leftCenter ? Math.abs(leftCenter.x - headCenter.x) : null;
    const rightDistance = rightCenter ? Math.abs(rightCenter.x - headCenter.x) : null;

    metrics = {
      centerXAbs: safeDiagnosticRatio(Math.abs(featureCenter.x - headCenter.x), headSize.x),
      centerXSigned: safeDiagnosticRatio(featureCenter.x - headCenter.x, headSize.x),
      widthRatio: safeDiagnosticRatio(featureSize.x, headSize.x),
      heightRatio: safeDiagnosticRatio(featureSize.y, headSize.y),
      verticalCenterRatio: safeDiagnosticRatio(featureCenter.y - headBounds.min.y, headSize.y),
      spacingRatio: leftCenter && rightCenter
        ? safeDiagnosticRatio(Math.abs(rightCenter.x - leftCenter.x), headSize.x)
        : null,
      sideSymmetryRatio: Number.isFinite(leftDistance) && Number.isFinite(rightDistance)
        ? safeDiagnosticRatio(Math.abs(leftDistance - rightDistance), headSize.x)
        : null,
      frontOffsetRatio: safeDiagnosticRatio(featureOffset.dot(frontDirection), headSize.z),
      eyeMouthGapRatio: featureKey === 'mouth' && eyeBounds
        ? safeDiagnosticRatio(eyeBounds.min.y - featureBounds.max.y, headSize.y)
        : null,
      topExtensionRatio: safeDiagnosticRatio(featureBounds.max.y - headBounds.max.y, headSize.y),
      bottomDropRatio: safeDiagnosticRatio(headBounds.max.y - featureBounds.min.y, headSize.y),
      frontReachRatio: safeDiagnosticRatio(featureBounds.max.z - headBounds.max.z, headSize.z),
      backReachRatio: safeDiagnosticRatio(headBounds.min.z - featureBounds.min.z, headSize.z),
    };
  }

  return {
    featureKey,
    featurePresetId: featureKey === 'accessory'
      ? resolved.accessories?.[0]?.id || null
      : resolved.features?.[featureKey]?.presetId || null,
    featureVariant: featureKey === 'accessory'
      ? resolved.accessories?.[0]?.mountVariant || null
      : featureKey === 'hair'
        ? [resolved.hairPreset?.mountVariantFront, resolved.hairPreset?.mountVariantBack].filter(Boolean).join('/') || null
      : null,
    headBuildMode: resolved.headBuildMode,
    slotNames: {
      headRoot: headRootNames,
      feature: featureNames,
      left: leftNames,
      right: rightNames,
    },
    bounds: {
      head: serializeDiagnosticBox(headBounds),
      feature: serializeDiagnosticBox(featureBounds),
      left: serializeDiagnosticBox(leftBounds),
      right: serializeDiagnosticBox(rightBounds),
      eyes: serializeDiagnosticBox(eyeBounds),
    },
    metrics,
  };
}

export function buildHeadSourceKey(resolved) {
  const recipe = resolved?.recipe || {};
  const params = recipe.headParams && typeof recipe.headParams === 'object'
    ? Object.entries(recipe.headParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${Number(value || 0).toFixed(3)}`)
      .join(',')
    : '';
  return `${AVATAR_HEAD_BUILD_MODE_MOLD}:${recipe.headMoldId || resolved?.headMold?.id || ''}:${params}`;
}
