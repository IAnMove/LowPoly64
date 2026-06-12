import * as THREE from 'three';
import { buildGroupFromDefinition } from '../viewport/templates.js';
import { serializeGroupAsImportJSON } from '../viewport/persistence.js';
import { rebuildRigAnimationsForGroup } from '../animation/rigging-utils.js';
import {
  buildSvgModelPayload,
  createSvgGroupFromSource,
  findSvgMountTarget,
  mountSvgGroupToTarget,
} from './svg-model.js';
import { cloneSvgImportSettings, cloneSvgSourceMetadata } from './svg-metadata.js';

const HEAD_SLOT_ID = 'HEAD';

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneValue(entry);
    });
    return clone;
  }
  return value;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function findNodeByName(root, targetName) {
  let match = null;
  root?.traverse?.((node) => {
    if (match) return;
    const nodeName = node.userData?.name || node.name || '';
    if (nodeName === targetName) {
      match = node;
    }
  });
  return match;
}

function createBoundsFromExtents(min, max) {
  if (!Number.isFinite(min.x) || !Number.isFinite(max.x)) return null;
  return new THREE.Box3(min.clone(), max.clone());
}

function unionBounds(target, source) {
  if (!source) return target;
  if (!target) return source.clone();
  return target.union(source);
}

function computeGeometryBounds(customGeometry) {
  if (!customGeometry?.vertices?.length) return null;
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  customGeometry.vertices.forEach((vertex) => {
    if (!Array.isArray(vertex) || vertex.length !== 3) return;
    min.x = Math.min(min.x, vertex[0]);
    min.y = Math.min(min.y, vertex[1]);
    min.z = Math.min(min.z, vertex[2]);
    max.x = Math.max(max.x, vertex[0]);
    max.y = Math.max(max.y, vertex[1]);
    max.z = Math.max(max.z, vertex[2]);
  });

  return createBoundsFromExtents(min, max);
}

function isValidCustomGeometry(customGeometry) {
  return !!(
    customGeometry
    && Array.isArray(customGeometry.vertices)
    && customGeometry.vertices.length > 0
    && Array.isArray(customGeometry.faces)
    && customGeometry.faces.length > 0
  );
}

function computeLocalBoundsForNames(group, names = []) {
  if (!group?.isGroup || !Array.isArray(names) || names.length === 0) return null;

  group.updateWorldMatrix(true, true);
  const inverseWorld = group.matrixWorld.clone().invert();
  let bounds = null;

  names.forEach((name) => {
    const node = findNodeByName(group, name);
    if (!node) return;
    node.traverse?.((child) => {
      if (!child.isMesh || !child.geometry) return;
      child.geometry.computeBoundingBox?.();
      if (!child.geometry.boundingBox) return;
      const localMatrix = inverseWorld.clone().multiply(child.matrixWorld);
      const childBounds = child.geometry.boundingBox.clone().applyMatrix4(localMatrix);
      bounds = unionBounds(bounds, childBounds);
    });
  });

  return bounds;
}

function computeLocalBoundsForPivotMeshes(group, names = []) {
  if (!group?.isGroup || !Array.isArray(names) || names.length === 0) return null;

  group.updateWorldMatrix(true, true);
  const inverseWorld = group.matrixWorld.clone().invert();
  let bounds = null;

  names.forEach((name) => {
    const node = findNodeByName(group, name);
    if (!node?.children?.length) return;

    node.children.forEach((child) => {
      if (!child.isMesh || !child.geometry) return;
      child.geometry.computeBoundingBox?.();
      if (!child.geometry.boundingBox) return;
      const localMatrix = inverseWorld.clone().multiply(child.matrixWorld);
      const childBounds = child.geometry.boundingBox.clone().applyMatrix4(localMatrix);
      bounds = unionBounds(bounds, childBounds);
    });
  });

  return bounds;
}

function computeScaleFactor(targetBounds, sourceBounds, options = {}) {
  if (!targetBounds || !sourceBounds) return 1;

  const targetSize = new THREE.Vector3();
  const sourceSize = new THREE.Vector3();
  targetBounds.getSize(targetSize);
  sourceBounds.getSize(sourceSize);

  const widthRatio = targetSize.x / Math.max(sourceSize.x, 0.01);
  const heightRatio = targetSize.y / Math.max(sourceSize.y, 0.01);
  const depthRatio = targetSize.z / Math.max(sourceSize.z, 0.01);
  const depthAllowance = Number.isFinite(options.depthAllowance) ? options.depthAllowance : 1.2;
  const depthGuard = Math.max(depthRatio * depthAllowance, 0.01);

  const scale = Math.min(widthRatio, heightRatio, depthGuard);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function resolveScaleVector(value) {
  const x = Number.isFinite(value?.x) ? value.x : 1;
  const y = Number.isFinite(value?.y) ? value.y : 1;
  const z = Number.isFinite(value?.z) ? value.z : 1;
  return {
    x: x > 0 ? x : 1,
    y: y > 0 ? y : 1,
    z: z > 0 ? z : 1,
  };
}

function isIdentityScaleVector(scaleVector) {
  return !!scaleVector
    && Math.abs(scaleVector.x - 1) < 0.0001
    && Math.abs(scaleVector.y - 1) < 0.0001
    && Math.abs(scaleVector.z - 1) < 0.0001;
}

function multiplyScaleVector(scaleVector, factor) {
  if (!Number.isFinite(factor) || factor === 1) return scaleVector;
  return {
    x: scaleVector.x * factor,
    y: scaleVector.y * factor,
    z: scaleVector.z * factor,
  };
}

function resolvePartScaleVector(part, settings = {}) {
  const headScale = resolveScaleVector(settings.headScale);
  const featureScale = resolveScaleVector(settings.featureScale);
  // Parts authored directly in canonical head space (e.g. the procedural hair
  // helmet) must ride the skull scale, never the feature plaque scale.
  if (part?.scaleWithHead) return headScale;
  if (isIdentityScaleVector(headScale)) return headScale;

  const scaleMode = String(settings.headScaleMode || '').trim().toLowerCase();
  if (!scaleMode) return headScale;
  if (scaleMode !== 'cranium') return headScale;

  const partRole = normalizeName(part?.role);
  if (isHeadRootPart(part)) {
    return headScale;
  }

  // In cranium mode the imported mesh head is the canonical skull.
  // Detached facial features and hair should follow the feature scale so
  // legacy SVG-authored parts shrink into the smaller portrait mask instead
  // of inheriting the full cranium scale.
  if (
    partRole === 'EAR'
    || partRole === 'NOSE'
    || partRole === 'MOUTH'
    || partRole === 'HAIR'
    || partRole === 'HAIR_BACK'
  ) {
    return featureScale;
  }

  return featureScale;
}

function computeMountTranslation(rootGeometry, targetRootBounds, headRootPosition, mountMode = '') {
  if (!rootGeometry || !targetRootBounds || !mountMode) return new THREE.Vector3();

  const normalizedMode = String(mountMode).trim().toLowerCase();
  if (normalizedMode !== 'root-bottom-center') return new THREE.Vector3();

  const rootBounds = computeGeometryBounds(rootGeometry);
  if (!rootBounds) return new THREE.Vector3();

  const headRootPositionVector = Array.isArray(headRootPosition)
    ? new THREE.Vector3(...headRootPosition)
    : new THREE.Vector3();
  const targetLocalBounds = targetRootBounds.clone().translate(headRootPositionVector.clone().negate());
  const targetCenter = targetLocalBounds.getCenter(new THREE.Vector3());
  const rootCenter = rootBounds.getCenter(new THREE.Vector3());

  return new THREE.Vector3(
    targetCenter.x - rootCenter.x,
    targetLocalBounds.min.y - rootBounds.min.y,
    targetCenter.z - rootCenter.z,
  );
}

function transformCustomGeometry(customGeometry, rootCenter, scale, options = {}) {
  const mirrorZ = !!options.mirrorZ;
  const scaleVector = resolveScaleVector(options.scaleVector);
  const translation = options.translation instanceof THREE.Vector3
    ? options.translation
    : new THREE.Vector3(
      Number.isFinite(options.translation?.x) ? options.translation.x : 0,
      Number.isFinite(options.translation?.y) ? options.translation.y : 0,
      Number.isFinite(options.translation?.z) ? options.translation.z : 0,
    );
  const xScale = scale * scaleVector.x;
  const yScale = scale * scaleVector.y;
  const zScale = (mirrorZ ? -scale : scale) * scaleVector.z;
  return {
    vertices: (customGeometry?.vertices || []).map((vertex) => ([
      (vertex[0] - rootCenter.x) * xScale + translation.x,
      (vertex[1] - rootCenter.y) * yScale + translation.y,
      (vertex[2] - rootCenter.z) * zScale + translation.z,
    ])),
    // Mirroring a single axis flips winding, so reverse faces to keep normals outward.
    faces: (customGeometry?.faces || []).map((face) => (mirrorZ ? [face[0], face[2], face[1]] : [...face])),
  };
}

function transformHeadSpacePoint(point, rootCenter, scale, options = {}) {
  // Mirrors the math in transformCustomGeometry for a single [x, y, z] point.
  const scaleVector = resolveScaleVector(options.scaleVector);
  const translation = options.translation || new THREE.Vector3();
  const zSign = options.mirrorZ ? -1 : 1;
  return new THREE.Vector3(
    (point[0] - rootCenter.x) * scale * scaleVector.x + translation.x,
    (point[1] - rootCenter.y) * scale * scaleVector.y + translation.y,
    (point[2] - rootCenter.z) * scale * zSign * scaleVector.z + translation.z,
  );
}

function computeTransformedPartBounds(part, rootCenter, scale, scaleVector, mirrorZ) {
  const bounds = computeGeometryBounds(part?.customGeometry);
  if (!bounds) return null;
  const corners = [
    [bounds.min.x, bounds.min.y, bounds.min.z],
    [bounds.max.x, bounds.max.y, bounds.max.z],
  ];
  const transformed = corners.map((corner) => transformHeadSpacePoint(corner, rootCenter, scale, { scaleVector, mirrorZ }));
  const min = transformed[0].clone().min(transformed[1]);
  const max = transformed[0].clone().max(transformed[1]);
  return new THREE.Box3(min, max);
}

const LANDMARK_SIDE_SPLIT_FEATURES = new Set(['eyes', 'brows', 'ears']);

// Mounts each detached facial feature onto the per-head 3D landmarks instead
// of trusting the shared 2D SVG anchors. Returns a Map of
// part -> { delta, scaleMultiplier } (delta applied on top of the head mount
// translation, scaleMultiplier folded into the part's scale vector), or null
// when the head declares no landmarks.
function buildLandmarkMountPlan(parts, sourceRootPart, landmarks, context) {
  if (!landmarks || typeof landmarks !== 'object') return null;

  const { sourceRootCenter, scale, headScaleSettings } = context;
  const headScaleVector = resolvePartScaleVector(sourceRootPart, headScaleSettings);
  // Landmarks and part bounds are both kept in pre-mount space here; the mount
  // translation is applied exactly once later, on top of the returned deltas.
  const finalLandmarks = {};
  Object.entries(landmarks).forEach(([key, point]) => {
    if (!Array.isArray(point) || point.length !== 3) return;
    finalLandmarks[key] = transformHeadSpacePoint(point, sourceRootCenter, scale, {
      scaleVector: headScaleVector,
      mirrorZ: true,
    });
  });
  if (!finalLandmarks.eyeL || !finalLandmarks.eyeR) return null;

  const headBounds = computeTransformedPartBounds(
    { customGeometry: context.sourceRootGeometry },
    sourceRootCenter,
    scale,
    headScaleVector,
    true
  );
  const headHeight = headBounds ? Math.max(headBounds.max.y - headBounds.min.y, 0.0001) : 1;
  const surfaceEmbed = headHeight * 0.02;
  // Features arrive squashed into thin plaques (featureScale.z), so never bury
  // more than a quarter of their depth or they vanish inside the skull.
  const embedFor = (bounds) => Math.min(surfaceEmbed, Math.max(bounds.max.z - bounds.min.z, 0.0001) * 0.25);
  const eyeMidY = (finalLandmarks.eyeL.y + finalLandmarks.eyeR.y) * 0.5;
  const browLift = finalLandmarks.hairline ? (finalLandmarks.hairline.y - eyeMidY) * 0.15 : headHeight * 0.04;

  // Mii-style per-feature deltas from the recipe. Slider throws are SVG-unit
  // ranges (offsets ±48, eye spacing ±32); map the full throw to a fraction of
  // this head's interocular distance so the same slider value moves a feature
  // the same visual amount on every skull.
  const interocular = Math.max(finalLandmarks.eyeL.distanceTo(finalLandmarks.eyeR), headHeight * 0.1);
  const placements = context.featurePlacements && typeof context.featurePlacements === 'object'
    ? context.featurePlacements
    : {};
  const placementShiftFor = (featureKey) => {
    const placement = placements[featureKey];
    const offsetX = Number.isFinite(placement?.offsetX) ? placement.offsetX : 0;
    const offsetY = Number.isFinite(placement?.offsetY) ? placement.offsetY : 0;
    // SVG y grows downward; head space y grows upward.
    return new THREE.Vector3(
      (offsetX / 48) * interocular * 0.5,
      -(offsetY / 48) * interocular * 0.5,
      0,
    );
  };
  const eyeSpacingShift = (() => {
    const spacing = Number.isFinite(placements.eyes?.spacing) ? placements.eyes.spacing : 0;
    return (spacing / 32) * interocular * 0.25;
  })();
  // Skull-relative feature sizing: facial features were calibrated against the
  // reference head's eye spacing, so heads with closer or wider-set eyes scale
  // them by the same ratio (clamped so extreme skulls stay readable).
  const relativeSizeFactor = Math.min(Math.max(
    Number.isFinite(context.relativeSizeFactor) ? context.relativeSizeFactor : 1,
    0.75,
  ), 1.35);
  const FACIAL_RELATIVE_SCALE_FEATURES = new Set(['eyes', 'brows', 'nose', 'mouth']);

  const groups = new Map();
  parts.forEach((part) => {
    if (part === sourceRootPart || isHeadRootPart(part)) return;
    const featureKey = String(part?.featureKey || '').trim().toLowerCase();
    if (!featureKey || featureKey === 'accessories') return;
    if (!groups.has(featureKey)) groups.set(featureKey, []);
    groups.get(featureKey).push(part);
  });

  const plan = new Map();

  function placeSubgroup(subgroupParts, resolveTarget, { scaleMultiplier = 1, shift = null } = {}) {
    let bounds = null;
    const partBounds = new Map();
    subgroupParts.forEach((part) => {
      const featureScaleVector = multiplyScaleVector(
        resolvePartScaleVector(part, headScaleSettings),
        scaleMultiplier,
      );
      const box = computeTransformedPartBounds(part, sourceRootCenter, scale, featureScaleVector, true);
      if (!box) return;
      partBounds.set(part, box);
      bounds = bounds ? bounds.union(box) : box.clone();
    });
    if (!bounds) return;

    const center = bounds.getCenter(new THREE.Vector3());
    const target = resolveTarget(bounds, center);
    if (!target) return;
    if (shift) target.add(shift);
    const delta = new THREE.Vector3(
      Number.isFinite(target.x) ? target.x - center.x : 0,
      Number.isFinite(target.y) ? target.y - center.y : 0,
      Number.isFinite(target.z) ? target.z - center.z : 0,
    );
    subgroupParts.forEach((part) => {
      if (partBounds.has(part)) plan.set(part, { delta, scaleMultiplier });
    });
  }

  function splitBySide(groupParts) {
    const left = [];
    const right = [];
    groupParts.forEach((part) => {
      const bounds = computeGeometryBounds(part?.customGeometry);
      if (!bounds) return;
      const centerX = (bounds.min.x + bounds.max.x) * 0.5;
      (centerX < 0 ? left : right).push(part);
    });
    return { left, right };
  }

  groups.forEach((groupParts, featureKey) => {
    const scaleMultiplier = FACIAL_RELATIVE_SCALE_FEATURES.has(featureKey) ? relativeSizeFactor : 1;
    const shift = placementShiftFor(featureKey);

    if (featureKey === 'eyes' || featureKey === 'brows') {
      const lift = featureKey === 'brows' ? browLift : 0;
      const { left, right } = LANDMARK_SIDE_SPLIT_FEATURES.has(featureKey)
        ? splitBySide(groupParts)
        : { left: [], right: [] };
      const sides = [
        { parts: left, landmark: finalLandmarks.eyeL, spacingSign: -1 },
        { parts: right, landmark: finalLandmarks.eyeR, spacingSign: 1 },
      ];
      const splitWorked = left.length > 0 && right.length > 0;
      // Both eyes and brows ride the eye spacing slider so brows stay over
      // the eyes when the user spreads them.
      const apart = finalLandmarks.eyeR.x >= finalLandmarks.eyeL.x ? 1 : -1;
      if (splitWorked) {
        sides.forEach(({ parts: sideParts, landmark, spacingSign }) => {
          const sideShift = shift.clone();
          sideShift.x += spacingSign * apart * eyeSpacingShift;
          placeSubgroup(sideParts, (bounds) => new THREE.Vector3(
            landmark.x,
            landmark.y + lift,
            landmark.z + embedFor(bounds) - (bounds.max.z - bounds.min.z) * 0.5,
          ), { scaleMultiplier, shift: sideShift });
        });
      } else {
        const mid = finalLandmarks.eyeL.clone().lerp(finalLandmarks.eyeR, 0.5);
        placeSubgroup(groupParts, (bounds) => new THREE.Vector3(
          mid.x,
          mid.y + lift,
          mid.z + embedFor(bounds) - (bounds.max.z - bounds.min.z) * 0.5,
        ), { scaleMultiplier, shift });
      }
      return;
    }

    if (featureKey === 'nose' && finalLandmarks.noseTip) {
      placeSubgroup(groupParts, (bounds) => new THREE.Vector3(
        finalLandmarks.noseTip.x,
        finalLandmarks.noseTip.y,
        finalLandmarks.noseTip.z + embedFor(bounds) - (bounds.max.z - bounds.min.z) * 0.5,
      ), { scaleMultiplier, shift });
      return;
    }

    if (featureKey === 'mouth' && finalLandmarks.mouth) {
      placeSubgroup(groupParts, (bounds) => new THREE.Vector3(
        finalLandmarks.mouth.x,
        finalLandmarks.mouth.y,
        finalLandmarks.mouth.z + embedFor(bounds) - (bounds.max.z - bounds.min.z) * 0.5,
      ), { scaleMultiplier, shift });
      return;
    }

    if (featureKey === 'ears' && finalLandmarks.earL && finalLandmarks.earR) {
      const { left, right } = splitBySide(groupParts);
      if (left.length > 0 && right.length > 0) {
        // Ears move symmetrically: offsetX pushes both ears outward, offsetY
        // slides both up or down the skull.
        const apart = finalLandmarks.earR.x >= finalLandmarks.earL.x ? 1 : -1;
        const leftShift = new THREE.Vector3(-apart * shift.x, shift.y, 0);
        const rightShift = new THREE.Vector3(apart * shift.x, shift.y, 0);
        placeSubgroup(left, () => finalLandmarks.earL.clone(), { shift: leftShift });
        placeSubgroup(right, () => finalLandmarks.earR.clone(), { shift: rightShift });
      }
      return;
    }

    if (featureKey === 'hair' && finalLandmarks.crown) {
      // Hair arrives as thin plaques too, so anchor each half to the surface
      // it dresses: bangs hug the forehead (hairline), the back curtain hugs
      // the rear of the skull. Both tops ride just above the crown.
      const front = [];
      const back = [];
      groupParts.forEach((part) => {
        const bounds = computeGeometryBounds(part?.customGeometry);
        if (!bounds) return;
        // Source space keeps the face toward +z (mirrored to -z later).
        ((bounds.min.z + bounds.max.z) * 0.5 >= 0 ? front : back).push(part);
      });
      const topY = (bounds, center) => finalLandmarks.crown.y + headHeight * 0.04 - (bounds.max.y - center.y);
      // Unlike facial decals, hair plaques must sink into the skull so the
      // strands wrap the curved surface instead of floating off the forehead.
      if (front.length > 0) {
        placeSubgroup(front, (bounds, center) => new THREE.Vector3(
          finalLandmarks.crown.x,
          topY(bounds, center),
          (finalLandmarks.hairline ? finalLandmarks.hairline.z : (headBounds ? headBounds.min.z : center.z))
            + (bounds.max.z - bounds.min.z) * (0.45 - 0.5),
        ), { shift });
      }
      if (back.length > 0 && headBounds) {
        placeSubgroup(back, (bounds, center) => new THREE.Vector3(
          finalLandmarks.crown.x,
          topY(bounds, center),
          headBounds.max.z - (bounds.max.z - bounds.min.z) * (0.6 - 0.5),
        ), { shift });
      }
    }
  });

  return plan.size > 0 ? plan : null;
}

function offsetVector3Array(source, offset = null) {
  const base = Array.isArray(source) ? source : [0, 0, 0];
  const delta = offset && typeof offset === 'object' ? offset : {};
  return [
    base[0] + (Number.isFinite(delta.x) ? delta.x : 0),
    base[1] + (Number.isFinite(delta.y) ? delta.y : 0),
    base[2] + (Number.isFinite(delta.z) ? delta.z : 0),
  ];
}

function resolveRotationArrayFromDegrees(rotationDegrees = null) {
  if (!rotationDegrees || typeof rotationDegrees !== 'object') return null;
  return [
    THREE.MathUtils.degToRad(Number.isFinite(rotationDegrees.x) ? rotationDegrees.x : 0),
    THREE.MathUtils.degToRad(Number.isFinite(rotationDegrees.y) ? rotationDegrees.y : 0),
    THREE.MathUtils.degToRad(Number.isFinite(rotationDegrees.z) ? rotationDegrees.z : 0),
  ];
}

function isHeadRootPart(part) {
  const partId = normalizeName(part?.id);
  const partRole = normalizeName(part?.role);
  return partRole === 'HEAD' || partId === 'HEAD_BASE' || partId === 'HEAD';
}

function makeUniquePieceName(rootName, part, usedNames) {
  const candidates = [
    part?.id,
    part?.role,
    `${rootName}_LAYER_${part?.order ?? ''}`,
  ].map((value) => normalizeName(value)).filter(Boolean);

  let base = candidates[0] || `${rootName}_DETAIL`;
  if (base === rootName) {
    base = candidates[1] && candidates[1] !== rootName ? candidates[1] : `${rootName}_DETAIL`;
  }
  if (!base.startsWith(`${rootName}_`)) {
    base = `${rootName}_${base}`;
  }

  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  usedNames.add(candidate);
  return candidate;
}

function buildStoredSlotSource(source, settings, analysis, slotId = HEAD_SLOT_ID) {
  return {
    slotId,
    svgSource: cloneSvgSourceMetadata(source),
    svgImportSettings: cloneSvgImportSettings(settings || {}),
    svgImportAnalysis: cloneValue(analysis || {}),
  };
}

async function applySvgAttachmentsToGroup(group, attachments = [], renamedHeadTarget = null) {
  if (!group?.isGroup || !Array.isArray(attachments) || attachments.length === 0) return;

  for (const attachment of attachments) {
    if (attachment?.type !== 'svg' || !attachment.object?.svgSource?.markup) continue;

    const attachTo = attachment.attachTo === HEAD_SLOT_ID
      ? renamedHeadTarget || HEAD_SLOT_ID
      : attachment.attachTo;

    const attachmentGroup = await createSvgGroupFromSource(
      attachment.object.svgSource,
      {
        ...(attachment.object.svgImportSettings || {}),
        name: attachment.object.name || attachment.object.svgImportSettings?.name || 'SVG MODEL',
      }
    );

    if (attachment.object.svgImportAnalysis) {
      attachmentGroup.userData.svgImportAnalysis = cloneValue(attachment.object.svgImportAnalysis);
    }
    if (attachTo) {
      attachmentGroup.userData.svgImportAnalysis = {
        ...(attachmentGroup.userData.svgImportAnalysis || {}),
        mountTarget: attachTo,
      };
    }

    const mountTarget = findSvgMountTarget(group, attachmentGroup);
    if (mountTarget) {
      if (attachment.transform) {
        mountTarget.add(attachmentGroup);
        if (Array.isArray(attachment.transform.position)) attachmentGroup.position.fromArray(attachment.transform.position);
        if (Array.isArray(attachment.transform.rotation)) attachmentGroup.rotation.set(...attachment.transform.rotation);
        if (Array.isArray(attachment.transform.scale)) attachmentGroup.scale.fromArray(attachment.transform.scale);
      } else {
        mountSvgGroupToTarget(attachmentGroup, mountTarget, attachmentGroup.userData?.svgImportSettings || {});
        mountTarget.add(attachmentGroup);
      }
    } else {
      group.add(attachmentGroup);
      if (attachment.transform) {
        if (Array.isArray(attachment.transform.position)) attachmentGroup.position.fromArray(attachment.transform.position);
        if (Array.isArray(attachment.transform.rotation)) attachmentGroup.rotation.set(...attachment.transform.rotation);
        if (Array.isArray(attachment.transform.scale)) attachmentGroup.scale.fromArray(attachment.transform.scale);
      }
    }
  }
}

export function canApplySvgHeadToGroup(group) {
  return !!(
    group?.isGroup
    && group.userData?.archetype === 'HUMANOID'
    && Array.isArray(group.userData?.slotMap?.[HEAD_SLOT_ID])
    && group.userData.slotMap[HEAD_SLOT_ID].length > 0
  );
}

export function getStoredHeadSlotSource(group) {
  if (!group?.isGroup || !group.userData?.slotSvgSources?.[HEAD_SLOT_ID]) return null;
  return cloneValue(group.userData.slotSvgSources[HEAD_SLOT_ID]);
}

export async function buildGroupWithSvgHead(targetGroup, source, settings = {}, options = {}) {
  if (!canApplySvgHeadToGroup(targetGroup)) {
    throw new Error('Select a humanoid with a HEAD slot first.');
  }

  const legacyData = serializeGroupAsImportJSON(targetGroup, { format: 'legacy' });
  if (!legacyData?.pieces?.length) {
    throw new Error('Unable to read the target model pieces.');
  }

  const slotMap = cloneValue(legacyData.slotMap || {});
  const headPieceNames = Array.isArray(slotMap[HEAD_SLOT_ID]) ? [...slotMap[HEAD_SLOT_ID]] : [];
  if (headPieceNames.length === 0) {
    throw new Error('The selected humanoid has no HEAD slot pieces.');
  }

  const headRootName = headPieceNames[0];
  const headRootPiece = legacyData.pieces.find((piece) => piece.name === headRootName);
  if (!headRootPiece) {
    throw new Error('Unable to resolve the HEAD root piece.');
  }

  const payload = await buildSvgModelPayload(source, settings, options);
  if (!Array.isArray(payload.parts) || payload.parts.length === 0) {
    throw new Error('The SVG head did not generate any geometry.');
  }

  // Optionally drop extruded SVG feature groups (e.g. flat hair plaques when a
  // procedural hair helmet replaces them) and append extra parts authored
  // directly in canonical head space.
  const suppressFeatureKeys = new Set(
    (Array.isArray(settings?.suppressFeatureKeys) ? settings.suppressFeatureKeys : [])
      .map((key) => String(key || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const extraHeadParts = (Array.isArray(settings?.headExtraParts) ? settings.headExtraParts : [])
    .filter((part) => isValidCustomGeometry(part?.customGeometry));
  const headParts = [
    ...payload.parts.filter((part) => (
      isHeadRootPart(part)
      || !suppressFeatureKeys.has(String(part?.featureKey || '').trim().toLowerCase())
    )),
    ...extraHeadParts,
  ];

  const targetRootBounds = computeLocalBoundsForPivotMeshes(targetGroup, [headRootName]);
  const targetHeadBounds = computeLocalBoundsForNames(targetGroup, headPieceNames);
  const sourceRootPart = headParts.find((part) => isHeadRootPart(part)) || headParts[0];
  const sourceRootGeometry = isValidCustomGeometry(settings?.headGeometryOverride)
    ? settings.headGeometryOverride
    : sourceRootPart.customGeometry;
  const sourceRootBounds = computeGeometryBounds(sourceRootGeometry);
  const sourceHeadBounds = headParts.reduce((acc, part) => {
    const geometry = part === sourceRootPart ? sourceRootGeometry : part.customGeometry;
    return unionBounds(acc, computeGeometryBounds(geometry));
  }, null);
  const scale = computeScaleFactor(targetRootBounds || targetHeadBounds, sourceRootBounds || sourceHeadBounds, {
    // Allow the replacement head to keep extra rear volume instead of collapsing back to the legacy depth.
    depthAllowance: 1.8,
  });
  const sourceRootCenter = (sourceRootBounds || sourceHeadBounds)?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
  const headRootPosition = Array.isArray(headRootPiece.position) ? [...headRootPiece.position] : [0, 0, 0];
  const headRootPivot = Array.isArray(headRootPiece.pivot) ? [...headRootPiece.pivot] : [...headRootPosition];

  const rootFirstParts = [
    sourceRootPart,
    ...headParts.filter((part) => part !== sourceRootPart),
  ];
  const headScaleSettings = {
    headScale: settings?.headScale || null,
    featureScale: settings?.featureScale || null,
    headScaleMode: settings?.headScaleMode || '',
  };
  const scaledRootGeometry = transformCustomGeometry(sourceRootGeometry, sourceRootCenter, scale, {
    // Humanoid molds in this editor read their "front" toward negative Z.
    mirrorZ: true,
    scaleVector: resolvePartScaleVector(sourceRootPart, headScaleSettings),
  });
  const mountTranslation = computeMountTranslation(
    scaledRootGeometry,
    targetRootBounds || targetHeadBounds,
    headRootPosition,
    settings?.headMountMode || '',
  );
  const landmarkPlan = buildLandmarkMountPlan(headParts, sourceRootPart, settings?.headLandmarks || null, {
    sourceRootCenter,
    sourceRootGeometry,
    scale,
    headScaleSettings,
    featurePlacements: settings?.featurePlacements || null,
    relativeSizeFactor: Number.isFinite(settings?.featureRelativeSizeFactor)
      ? settings.featureRelativeSizeFactor
      : 1,
  });

  const keptPieces = legacyData.pieces
    .filter((piece) => !headPieceNames.includes(piece.name))
    .map((piece) => cloneValue(piece));
  const usedNames = new Set(keptPieces.map((piece) => piece.name));
  const generatedPieces = [];
  const generatedNames = [];
  const headLabelName = headRootName;

  generatedPieces.push({
    name: headLabelName,
    geometry: { type: 'label' },
    position: [...headRootPosition],
    parent: headRootPiece.parent,
    pivot: [...headRootPivot],
  });
  generatedNames.push(headLabelName);
  usedNames.add(headLabelName);

  rootFirstParts.forEach((part, index) => {
    const partGeometry = index === 0 ? sourceRootGeometry : part.customGeometry;
    const landmarkEntry = landmarkPlan?.get(part) || null;
    const partTranslation = landmarkEntry
      ? mountTranslation.clone().add(landmarkEntry.delta)
      : mountTranslation;
    const transformedGeometry = transformCustomGeometry(partGeometry, sourceRootCenter, scale, {
      // Humanoid molds in this editor read their "front" toward negative Z.
      mirrorZ: true,
      scaleVector: multiplyScaleVector(
        resolvePartScaleVector(part, headScaleSettings),
        landmarkEntry?.scaleMultiplier ?? 1,
      ),
      translation: partTranslation,
    });
    const isHeadMeshPiece = index === 0;
    const pieceName = makeUniquePieceName(headLabelName, part, usedNames);
    const rootTransform = isHeadMeshPiece && settings?.headGeometryRootTransform && typeof settings.headGeometryRootTransform === 'object'
      ? settings.headGeometryRootTransform
      : null;
    const piecePosition = isHeadMeshPiece
      ? offsetVector3Array(headRootPosition, rootTransform?.position)
      : [...headRootPosition];
    const piecePivot = isHeadMeshPiece
      ? offsetVector3Array(headRootPivot, rootTransform?.position)
      : [...headRootPosition];
    const pieceRotation = isHeadMeshPiece
      ? resolveRotationArrayFromDegrees(rootTransform?.rotationDegrees)
      : null;

    const piece = {
      name: pieceName,
      geometry: {
        type: 'custom',
        vertices: cloneValue(transformedGeometry.vertices),
        faces: cloneValue(transformedGeometry.faces),
      },
      color: part.color || settings.color || '#ffcc00',
      position: piecePosition,
      parent: headLabelName,
      pivot: piecePivot,
    };

    if (pieceRotation) {
      piece.rotation = pieceRotation;
    }

    if (!isHeadMeshPiece && Number.isFinite(part.opacity) && part.opacity < 1) {
      piece.opacity = Math.max(0, Math.min(part.opacity, 1));
    }

    generatedPieces.push(piece);
    generatedNames.push(pieceName);
    usedNames.add(pieceName);
  });

  const nextGroup = buildGroupFromDefinition({
    name: legacyData.name || targetGroup.userData?.name || 'GROUP',
    pieces: [...keptPieces, ...generatedPieces],
  }, { compileAnimations: false });

  nextGroup.userData.name = legacyData.name || targetGroup.userData?.name || 'GROUP';
  nextGroup.name = nextGroup.userData.name;
  nextGroup.position.copy(targetGroup.position);
  nextGroup.rotation.copy(targetGroup.rotation);
  nextGroup.scale.copy(targetGroup.scale);

  nextGroup.userData.archetype = targetGroup.userData.archetype;
  nextGroup.userData.slotMap = {
    ...slotMap,
    [HEAD_SLOT_ID]: generatedNames,
  };
  nextGroup.userData.animationProfile = targetGroup.userData.animationProfile || null;
  nextGroup.userData.skeletonId = targetGroup.userData.skeletonId || null;

  if (targetGroup.userData.slotBindings) {
    nextGroup.userData.slotBindings = cloneValue(targetGroup.userData.slotBindings);
  }
  if (Array.isArray(targetGroup.userData.animations) && targetGroup.userData.animations.length > 0) {
    nextGroup.userData.animations = cloneValue(targetGroup.userData.animations);
  }

  const slotSvgSources = cloneValue(targetGroup.userData.slotSvgSources || {});
  slotSvgSources[HEAD_SLOT_ID] = buildStoredSlotSource(
    source,
    {
      ...(settings || {}),
      name: settings?.name || payload.name || 'SVG HEAD',
    },
    payload.analysis,
    HEAD_SLOT_ID
  );
  nextGroup.userData.slotSvgSources = slotSvgSources;

  await applySvgAttachmentsToGroup(nextGroup, legacyData.attachments || [], headRootName);

  rebuildRigAnimationsForGroup(nextGroup, {
    skeletonId: nextGroup.userData.skeletonId,
    animationProfile: nextGroup.userData.animationProfile,
  });

  return nextGroup;
}
