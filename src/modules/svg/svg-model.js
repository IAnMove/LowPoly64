import * as THREE from 'three';
import { state } from '../shared/state.js';
import { createMaterial } from '../shared/materials.js';
import { pushAction } from '../shared/undo.js';
import { showToast } from '../shared/ui-helpers.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { createCustomGeometry, cloneGeometryParams } from '../viewport/custom-geometries.js';
import { emit } from '../../event-bus.js';
import {
  markSvgDerivedGroup,
  cloneSvgImportSettings,
  createSvgSourceMetadata,
  SVG_DEFAULT_IMPORT_SETTINGS,
} from './svg-metadata.js';
import { extrudeSvgToCustomGeometry } from './svg-extrusion.js';

function cloneUserDataValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneUserDataValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneUserDataValue(entry);
    });
    return clone;
  }
  return value;
}

function disposeGroupChildren(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((node) => {
      if (node.isMesh) {
        node.geometry?.dispose?.();
        if (Array.isArray(node.material)) {
          node.material.forEach((material) => material?.dispose?.());
        } else {
          node.material?.dispose?.();
        }
      }
    });
  }
}

function cloneTextureValue(texture) {
  if (!texture?.clone) return texture || null;
  const clone = texture.clone();
  clone.needsUpdate = true;
  return clone;
}

function cloneMaterialValue(material) {
  if (Array.isArray(material)) return material.map((entry) => cloneMaterialValue(entry));
  if (!material?.clone) return material || null;

  const clone = material.clone();
  ['map', 'alphaMap', 'aoMap', 'bumpMap', 'displacementMap', 'emissiveMap', 'lightMap', 'metalnessMap', 'normalMap', 'roughnessMap']
    .forEach((key) => {
      if (material[key]) clone[key] = cloneTextureValue(material[key]);
    });
  clone.needsUpdate = true;
  return clone;
}

function normalizeAnchorName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getNodeLabel(node) {
  return node?.userData?.name || node?.name || '';
}

function scoreMountTarget(node, targetName) {
  const normalizedTarget = normalizeAnchorName(targetName);
  if (!normalizedTarget) return 0;

  const nodeLabel = getNodeLabel(node);
  const normalizedNode = normalizeAnchorName(nodeLabel);
  if (!normalizedNode) return 0;

  let score = 0;
  if (normalizedNode === normalizedTarget) score += 1000;
  if (normalizedNode.startsWith(`${normalizedTarget}_`) || normalizedNode.endsWith(`_${normalizedTarget}`)) score += 240;
  if (normalizedNode.includes(normalizedTarget)) score += 180;

  if (node.userData?.isPivot) score += 40;
  else if (node.isGroup) score += 20;

  return score;
}

function findNodeByName(root, targetName) {
  if (!root || !targetName) return null;

  let bestNode = null;
  let bestScore = 0;
  const registerCandidate = (node) => {
    const score = scoreMountTarget(node, targetName);
    if (score > bestScore) {
      bestNode = node;
      bestScore = score;
    }
  };

  registerCandidate(root);
  root.traverse?.((node) => {
    if (node === root) return;
    registerCandidate(node);
  });

  return bestScore > 0 ? bestNode : null;
}

function findMountTargetInSelection(selection, targetName = '') {
  if (!selection) return null;

  const normalizedTarget = normalizeAnchorName(targetName);
  if (normalizedTarget && selection.userData?.slotMap?.[normalizedTarget]?.length) {
    for (const pieceName of selection.userData.slotMap[normalizedTarget]) {
      const pieceTarget = findNodeByName(selection, pieceName);
      if (pieceTarget) return pieceTarget;
    }
  }

  if (normalizedTarget) {
    const namedTarget = findNodeByName(selection, normalizedTarget);
    if (namedTarget) return namedTarget;
  }

  return normalizedTarget ? null : selection;
}

function computeLocalBounds(object) {
  if (!object) return null;
  object.updateWorldMatrix(true, true);
  const inverseWorld = object.matrixWorld.clone().invert();
  const bounds = new THREE.Box3();
  let hasBounds = false;

  object.traverse?.((node) => {
    if (!node.isMesh || !node.geometry) return;
    node.geometry.computeBoundingBox?.();
    if (!node.geometry.boundingBox) return;
    const localMatrix = inverseWorld.clone().multiply(node.matrixWorld);
    const box = node.geometry.boundingBox.clone().applyMatrix4(localMatrix);
    if (!hasBounds) {
      bounds.copy(box);
      hasBounds = true;
    } else {
      bounds.union(box);
    }
  });

  return hasBounds ? bounds : null;
}

function placeMountedSvgGroup(group, mountTarget, settings = {}) {
  if (!group || !mountTarget) return false;

  const bounds = computeLocalBounds(mountTarget);
  if (!bounds) return false;

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);

  const gap = Math.max(0.01, (settings.targetSize || 4) * 0.03, size.z * 0.04);
  group.position.set(center.x, center.y, bounds.max.z + gap);
  group.rotation.set(0, 0, 0);

  group.userData.svgMount = {
    parentName: getNodeLabel(mountTarget) || '',
    mode: settings.renderMode || 'solid',
  };
  return true;
}

export function findSvgMountTarget(selection, group) {
  const settings = cloneSvgImportSettings(group?.userData?.svgImportSettings || {});
  const analysis = group?.userData?.svgImportAnalysis || {};
  if (!selection || settings.autoMount === false || (analysis.renderMode || settings.renderMode) !== 'plane') {
    return null;
  }

  const requestedTarget = analysis.mountTarget || '';
  if (requestedTarget) {
    return findMountTargetInSelection(selection, requestedTarget);
  }

  const isDirectRootGroup = selection.isGroup && selection.parent === state.userObjects && !selection.userData?.isPivot;
  return isDirectRootGroup ? null : selection;
}

function createMeshFromCustomGeometry(customGeometry, color, options = {}) {
  const geometry = createCustomGeometry(customGeometry.vertices, customGeometry.faces);
  const material = createMaterial(state.currentMaterialType, {
    color: color || SVG_DEFAULT_IMPORT_SETTINGS.color,
    flatShading: false,
    opacity: options.opacity ?? 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  if (options.renderMode === 'plane') {
    mesh.material.side = THREE.DoubleSide;
    mesh.material.needsUpdate = true;
  }
  mesh.userData.geometryType = 'custom';
  mesh.userData.geometryParams = cloneGeometryParams(customGeometry);
  mesh.userData.name = 'SVG MESH';
  mesh.userData.svgLayerId = options.id || '';
  mesh.userData.svgLayerKind = options.kind || 'fill';
  mesh.userData.svgLayerOrder = options.order ?? 0;
  mesh.userData.svgLayerRole = options.role || '';
  mesh.userData.svgRenderMode = options.renderMode || 'solid';
  return mesh;
}

function cloneObjectHierarchy(source) {
  const clone = source.clone(false);
  clone.name = source.name;
  clone.userData = cloneUserDataValue(source.userData);
  clone.position.copy(source.position);
  clone.rotation.copy(source.rotation);
  clone.scale.copy(source.scale);
  clone.visible = source.visible;
  clone.renderOrder = source.renderOrder;

  if (source.isMesh) {
    clone.geometry = source.geometry?.clone?.() || source.geometry;
    clone.material = cloneMaterialValue(source.material);
  }

  source.children.forEach((child) => {
    clone.add(cloneObjectHierarchy(child));
  });

  return clone;
}

export function cloneSvgGroupSnapshot(group) {
  if (!group?.isGroup) return null;
  return cloneObjectHierarchy(group);
}

export function applySvgGroupSnapshot(targetGroup, snapshot) {
  if (!targetGroup || !snapshot || !targetGroup.isGroup || !snapshot.isGroup) return targetGroup;
  disposeGroupChildren(targetGroup);
  targetGroup.userData = cloneUserDataValue(snapshot.userData);
  targetGroup.name = snapshot.name;
  targetGroup.position.copy(snapshot.position);
  targetGroup.rotation.copy(snapshot.rotation);
  targetGroup.scale.copy(snapshot.scale);
  snapshot.children.forEach((child) => {
    targetGroup.add(cloneObjectHierarchy(child));
  });
  return targetGroup;
}

function resolveSvgObjectName(source, settings) {
  if (settings?.name) return settings.name;
  if (source?.filename) return source.filename.replace(/\.svg$/i, '').trim() || 'SVG MODEL';
  if (source?.inputs?.text) return source.inputs.text.trim().slice(0, 48) || 'SVG MODEL';
  return 'SVG MODEL';
}

export async function buildSvgModelPayload(source, settings = {}, options = {}) {
  const resolvedSettings = cloneSvgImportSettings(settings);
  const sourceMetadata = createSvgSourceMetadata(source);
  const extrusion = await extrudeSvgToCustomGeometry(sourceMetadata.markup, resolvedSettings, options);

  return {
    name: resolveSvgObjectName(source, resolvedSettings),
    color: resolvedSettings.color,
    source: {
      ...sourceMetadata,
      markup: sourceMetadata.markup,
      resolvedMarkup: extrusion.resolvedSvg,
      rasterized: extrusion.rasterized,
    },
    settings: {
      ...resolvedSettings,
      renderMode: extrusion.analysis.renderMode || resolvedSettings.renderMode || 'solid',
    },
    analysis: extrusion.analysis,
    customGeometry: extrusion.parts?.[0]?.customGeometry || null,
    parts: extrusion.parts,
  };
}

export function createSvgGroupFromPayload(payload) {
  const group = new THREE.Group();
  group.userData.name = payload.name || 'SVG MODEL';
  group.name = group.userData.name;

  const parts = Array.isArray(payload.parts) && payload.parts.length > 0
    ? payload.parts
    : [{
      color: payload.color,
      customGeometry: payload.customGeometry,
      kind: 'fill',
      opacity: 1,
      order: 0,
      renderMode: payload.settings?.renderMode || 'solid',
    }];

  parts.forEach((part, index) => {
    if (!part?.customGeometry) return;
    const mesh = createMeshFromCustomGeometry(part.customGeometry, part.color || payload.color, {
      id: part.id,
      kind: part.kind,
      opacity: part.opacity,
      order: part.order ?? index,
      renderMode: part.renderMode || payload.settings?.renderMode || 'solid',
      role: part.role,
    });
    mesh.userData.name = `${group.userData.name} LAYER ${index + 1}`;
    mesh.renderOrder = part.order ?? index;
    group.add(mesh);
  });

  markSvgDerivedGroup(group, {
    source: payload.source,
    settings: payload.settings,
    analysis: payload.analysis,
  });

  return group;
}

export async function createSvgGroupFromSource(source, settings = {}, options = {}) {
  const payload = await buildSvgModelPayload(source, settings, options);
  return createSvgGroupFromPayload(payload);
}

export function insertSvgGroup(group, options = {}) {
  if (!group) return null;

  const select = options.select !== false;
  const actionType = options.actionType || 'Import SVG';
  const parent = options.parent || state.userObjects;
  parent.add(group);
  emit('scene:objects-changed');
  if (select) selectMesh(group);

  pushAction({
    type: actionType,
    undo: () => {
      if (state.selectedMesh === group) deselect();
      parent.remove(group);
      emit('scene:objects-changed');
    },
    redo: () => {
      parent.add(group);
      emit('scene:objects-changed');
      if (select) selectMesh(group);
    },
  });

  if (options.toast !== false) showToast(options.toastMessage || 'SVG imported');
  return group;
}

export function updateSvgGroup(targetGroup, nextGroup) {
  if (!targetGroup || !nextGroup || !targetGroup.isGroup || !nextGroup.isGroup) return targetGroup;
  applySvgGroupSnapshot(targetGroup, nextGroup);
  return targetGroup;
}

export function mountSvgGroupToTarget(group, mountTarget, settings = {}) {
  return !!(group && mountTarget && placeMountedSvgGroup(group, mountTarget, settings));
}
