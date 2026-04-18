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

function computeScaleFactor(targetBounds, sourceBounds) {
  if (!targetBounds || !sourceBounds) return 1;

  const targetSize = new THREE.Vector3();
  const sourceSize = new THREE.Vector3();
  targetBounds.getSize(targetSize);
  sourceBounds.getSize(sourceSize);

  const widthRatio = targetSize.x / Math.max(sourceSize.x, 0.01);
  const heightRatio = targetSize.y / Math.max(sourceSize.y, 0.01);
  const depthRatio = targetSize.z / Math.max(sourceSize.z, 0.01);
  const depthGuard = Math.max(depthRatio * 1.2, 0.01);

  const scale = Math.min(widthRatio, heightRatio, depthGuard);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function transformCustomGeometry(customGeometry, rootCenter, scale) {
  return {
    vertices: (customGeometry?.vertices || []).map((vertex) => ([
      (vertex[0] - rootCenter.x) * scale,
      (vertex[1] - rootCenter.y) * scale,
      (vertex[2] - rootCenter.z) * scale,
    ])),
    faces: (customGeometry?.faces || []).map((face) => [...face]),
  };
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

  const targetRootBounds = computeLocalBoundsForNames(targetGroup, [headRootName]);
  const targetHeadBounds = computeLocalBoundsForNames(targetGroup, headPieceNames);
  const sourceRootPart = payload.parts.find((part) => isHeadRootPart(part)) || payload.parts[0];
  const sourceRootBounds = computeGeometryBounds(sourceRootPart.customGeometry);
  const sourceHeadBounds = payload.parts.reduce((acc, part) => unionBounds(acc, computeGeometryBounds(part.customGeometry)), null);
  const scale = computeScaleFactor(targetRootBounds || targetHeadBounds, sourceRootBounds || sourceHeadBounds);
  const sourceRootCenter = (sourceRootBounds || sourceHeadBounds)?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
  const headRootPosition = Array.isArray(headRootPiece.position) ? [...headRootPiece.position] : [0, 0, 0];
  const headRootPivot = Array.isArray(headRootPiece.pivot) ? [...headRootPiece.pivot] : [...headRootPosition];

  const rootFirstParts = [
    sourceRootPart,
    ...payload.parts.filter((part) => part !== sourceRootPart),
  ];

  const keptPieces = legacyData.pieces
    .filter((piece) => !headPieceNames.includes(piece.name))
    .map((piece) => cloneValue(piece));
  const usedNames = new Set(keptPieces.map((piece) => piece.name));
  const generatedPieces = [];
  const generatedNames = [];

  rootFirstParts.forEach((part, index) => {
    const transformedGeometry = transformCustomGeometry(part.customGeometry, sourceRootCenter, scale);
    const isRootPiece = index === 0;
    const pieceName = isRootPiece
      ? headRootName
      : makeUniquePieceName(headRootName, part, usedNames);

    const piece = {
      template: 'CUSTOM',
      name: pieceName,
      offset: [...headRootPosition],
      material: part.color || settings.color || '#ffcc00',
      params: transformedGeometry,
      parent: isRootPiece ? headRootPiece.parent : headRootName,
      pivot: isRootPiece ? [...headRootPivot] : [...headRootPosition],
    };

    if (!isRootPiece && Number.isFinite(part.opacity) && part.opacity < 1) {
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
