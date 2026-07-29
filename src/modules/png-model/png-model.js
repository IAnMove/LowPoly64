import * as THREE from 'three';
import { state } from '../shared/state.js';
import { createMaterial } from '../shared/materials.js';
import { configureTexture, rememberTextureTransform } from '../shared/textures.js';
import { pushAction } from '../shared/undo.js';
import { showToast } from '../shared/ui-helpers.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { createCustomGeometry } from '../viewport/custom-geometries.js';
import { emit } from '../../event-bus.js';
import { buildSilhouetteGrid } from './png-model-analysis.js';
import { generateInflatedPngGeometry } from './png-model-geometry.js';
import { deserializeDepthMap, serializeDepthMap } from './png-model-depth-map.js';
import { loadPngModelSource } from './png-model-source.js';
import {
  markPngModelGroup,
  normalizePngModelSettings,
  normalizePngModelSource,
} from './png-model-metadata.js';

const PNG_MODEL_GROUP_USER_DATA_KEYS = new Set([
  'name',
  'pngModelSource',
  'pngModelSettings',
  'pngModelAnalysis',
  'pngModelDepthMap',
  'pngModelVersion',
  'pngModelAlgorithmVersion',
]);

const PNG_MODEL_MESH_USER_DATA_KEYS = new Set([
  'name',
  'pngModelRole',
  'geometryType',
  'geometryParams',
  'texture',
  'textureEnabled',
  'colorBeforeTexture',
  'textureTransform',
]);

const PNG_MODEL_GENERATED_ROLES = new Set(['surface', 'sides']);

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (value instanceof THREE.AnimationClip || value instanceof THREE.KeyframeTrack) {
    return value.clone();
  }
  if (value?.isTexture || value?.isObject3D || value?.isMaterial || value?.isBufferGeometry) return value;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function isGeneratedPngModelChild(child) {
  return PNG_MODEL_GENERATED_ROLES.has(child?.userData?.pngModelRole);
}

function disposeMaterial(material) {
  if (Array.isArray(material)) return material.forEach(disposeMaterial);
  if (!material) return;
  material.map?.dispose?.();
  material.dispose?.();
}

function disposeGroupChildren(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry?.dispose?.();
      disposeMaterial(node.material);
    });
  }
}

function cloneTexture(texture) {
  if (!texture?.clone) return texture || null;
  const clone = texture.clone();
  clone.needsUpdate = true;
  return clone;
}

function cloneMaterial(material) {
  if (Array.isArray(material)) return material.map(cloneMaterial);
  if (!material?.clone) return material || null;
  const clone = material.clone();
  if (material.map) clone.map = cloneTexture(material.map);
  clone.needsUpdate = true;
  return clone;
}

function cloneHierarchy(source) {
  const clone = source.isMesh ? new THREE.Mesh() : new THREE.Group();
  clone.name = source.name;
  clone.position.copy(source.position);
  clone.rotation.copy(source.rotation);
  clone.scale.copy(source.scale);
  clone.visible = source.visible;
  clone.renderOrder = source.renderOrder;
  if (source.isMesh) {
    clone.geometry = source.geometry?.clone?.() || source.geometry;
    // CustomGeometry already owns an immutable recipe in `parameters`. Share
    // that recipe with snapshot userData instead of cloning the same large
    // vertices/faces/UV arrays a second time for every undo state.
    const geometryParams = source.geometry?.parameters || source.userData?.geometryParams || {};
    if (clone.geometry) clone.geometry.parameters = geometryParams;
    clone.userData = {
      ...cloneValue(Object.fromEntries(
        Object.entries(source.userData || {}).filter(([key]) => key !== 'geometryParams'),
      )),
      geometryParams,
    };
    clone.material = cloneMaterial(source.material);
    if (source.userData?.textureEnabled && clone.material?.map) {
      clone.userData.texture = clone.material.map;
    }
  } else {
    clone.userData = cloneValue(source.userData);
  }
  source.children.forEach((child) => clone.add(cloneHierarchy(child)));
  return clone;
}

export function clonePngModelSnapshot(group) {
  return group?.isGroup ? cloneHierarchy(group) : null;
}

function externalUserData(userData, ownedKeys) {
  return cloneValue(Object.fromEntries(
    Object.entries(userData || {}).filter(([key]) => !ownedKeys.has(key)),
  ));
}

function childExternalUserData(group) {
  const result = new Map();
  group.children.filter(isGeneratedPngModelChild).forEach((child) => {
    const identity = child.userData?.pngModelRole || child.name;
    if (!identity) return;
    result.set(identity, externalUserData(child.userData, PNG_MODEL_MESH_USER_DATA_KEYS));
  });
  return result;
}

export function applyPngModelSnapshot(target, snapshot) {
  if (!target?.isGroup || !snapshot?.isGroup) return target;
  const preservedGroupData = externalUserData(target.userData, PNG_MODEL_GROUP_USER_DATA_KEYS);
  const preservedChildData = childExternalUserData(target);
  const externalChildren = target.children.filter((child) => !isGeneratedPngModelChild(child));
  externalChildren.forEach((child) => target.remove(child));
  disposeGroupChildren(target);
  target.name = snapshot.name;
  target.userData = {
    ...cloneValue(snapshot.userData),
    ...preservedGroupData,
  };
  target.position.copy(snapshot.position);
  target.rotation.copy(snapshot.rotation);
  target.scale.copy(snapshot.scale);
  snapshot.children.filter(isGeneratedPngModelChild).forEach((child) => {
    const clone = cloneHierarchy(child);
    const identity = clone.userData?.pngModelRole || clone.name;
    if (identity && preservedChildData.has(identity)) {
      clone.userData = { ...clone.userData, ...preservedChildData.get(identity) };
    }
    target.add(clone);
  });
  externalChildren.forEach((child) => target.add(child));
  return target;
}

function disposePngModelSnapshot(snapshot) {
  if (!snapshot?.isGroup) return;
  disposeGroupChildren(snapshot);
  snapshot.userData = {};
}

function createTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  return texture;
}

function createGeneratedMesh(customGeometry, material, name, role) {
  const geometry = createCustomGeometry(customGeometry.vertices, customGeometry.faces, customGeometry.uvs);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData.name = name;
  mesh.userData.pngModelRole = role;
  mesh.userData.geometryType = 'custom';
  mesh.userData.geometryParams = geometry.parameters;
  return mesh;
}

export function buildPngModelPayloadFromLoaded(loaded, rawSettings = {}, depthMap) {
  const settings = normalizePngModelSettings(rawSettings);
  const grid = buildSilhouetteGrid(loaded.imageData, loaded.canvas.width, loaded.canvas.height, settings);
  const runtimeDepthMap = depthMap?.values instanceof Float32Array ? depthMap : deserializeDepthMap(depthMap);
  const generated = generateInflatedPngGeometry(grid, settings, runtimeDepthMap);
  return {
    source: normalizePngModelSource(loaded.source),
    settings,
    depthMap: serializeDepthMap(runtimeDepthMap),
    canvas: loaded.canvas,
    surface: generated.surface,
    sides: generated.sides,
    analysis: {
      ...generated.analysis,
      sourceWidth: loaded.canvas.width,
      sourceHeight: loaded.canvas.height,
      alphaThreshold: settings.alphaThreshold,
    },
  };
}

export async function buildPngModelPayload(source, rawSettings = {}, depthMap) {
  return buildPngModelPayloadFromLoaded(await loadPngModelSource(source), rawSettings, depthMap);
}

export function createPngModelGroupFromPayload(payload) {
  const settings = normalizePngModelSettings(payload.settings);
  const group = new THREE.Group();
  group.name = settings.name;
  group.userData.name = settings.name;

  const texture = createTexture(payload.canvas);
  const surfaceMaterial = createMaterial('Lambert', {
    color: '#ffffff',
    map: texture,
    flatShading: false,
  });
  surfaceMaterial.transparent = true;
  surfaceMaterial.alphaTest = Math.max(0.003, settings.alphaThreshold / 255);
  surfaceMaterial.depthWrite = true;
  surfaceMaterial.side = THREE.FrontSide;
  surfaceMaterial.needsUpdate = true;
  const surfaceMesh = createGeneratedMesh(payload.surface, surfaceMaterial, `${settings.name} SURFACE`, 'surface');
  surfaceMesh.userData.texture = texture;
  surfaceMesh.userData.textureEnabled = true;
  surfaceMesh.userData.colorBeforeTexture = 0xffffff;
  rememberTextureTransform(surfaceMesh, texture);

  const sampledSides = settings.sideStyle === 'sampled';
  const sideTexture = sampledSides ? cloneTexture(texture) : null;
  const sideMaterial = createMaterial('Lambert', {
    // In sampled mode the colour remains a useful tint/multiplier instead of
    // becoming an ignored control.
    color: settings.sideColor,
    map: sideTexture,
    flatShading: false,
  });
  // Alpha is intentionally ignored on the rim: UVs sample the nearest source
  // colour while keeping thin antialiased silhouettes from punching holes into
  // the side wall.
  sideMaterial.transparent = false;
  sideMaterial.alphaTest = 0;
  sideMaterial.depthWrite = true;
  sideMaterial.side = THREE.DoubleSide;
  sideMaterial.needsUpdate = true;
  const sideMesh = createGeneratedMesh(payload.sides, sideMaterial, `${settings.name} SIDES`, 'sides');
  if (sideTexture) {
    sideMesh.userData.texture = sideTexture;
    sideMesh.userData.textureEnabled = true;
    sideMesh.userData.colorBeforeTexture = 0xffffff;
    rememberTextureTransform(sideMesh, sideTexture);
  }
  group.add(surfaceMesh, sideMesh);
  markPngModelGroup(group, {
    source: payload.source,
    settings,
    analysis: payload.analysis,
    depthMap: payload.depthMap,
  });
  return group;
}

export async function createPngModelGroup(source, settings = {}, depthMap) {
  return createPngModelGroupFromPayload(await buildPngModelPayload(source, settings, depthMap));
}

export function insertPngModelGroup(group, options = {}) {
  if (!group) return null;
  const parent = options.parent || state.userObjects;
  const shouldSelect = options.select !== false;
  if (options.placeOnGround !== false) {
    const height = Number(group.userData?.pngModelAnalysis?.height) || 0;
    group.position.y = height / 2;
  }
  parent.add(group);
  emit('scene:objects-changed');
  if (shouldSelect) selectMesh(group);
  pushAction({
    type: 'Create PNG flat model',
    undo: () => {
      if (state.selectedMesh === group) deselect();
      parent.remove(group);
      emit('scene:objects-changed');
    },
    redo: () => {
      parent.add(group);
      emit('scene:objects-changed');
      if (shouldSelect) selectMesh(group);
    },
  });
  if (options.toast !== false) showToast('PNG flat model created');
  return group;
}

export function updatePngModelGroup(target, generated, options = {}) {
  if (!target?.isGroup || !generated?.isGroup) return null;
  const before = clonePngModelSnapshot(target);
  const transform = {
    position: target.position.clone(),
    rotation: target.rotation.clone(),
    scale: target.scale.clone(),
  };
  applyPngModelSnapshot(target, generated);
  if (options.disposeGenerated !== false) disposePngModelSnapshot(generated);
  target.position.copy(transform.position);
  target.rotation.copy(transform.rotation);
  target.scale.copy(transform.scale);
  const after = clonePngModelSnapshot(target);
  emit('scene:objects-changed');
  selectMesh(target);
  pushAction({
    type: 'Update PNG flat model',
    undo: () => {
      applyPngModelSnapshot(target, before);
      emit('scene:objects-changed');
      selectMesh(target);
    },
    redo: () => {
      applyPngModelSnapshot(target, after);
      emit('scene:objects-changed');
      selectMesh(target);
    },
    dispose: () => {
      disposePngModelSnapshot(before);
      disposePngModelSnapshot(after);
    },
  });
  if (options.toast !== false) showToast('PNG flat model updated');
  return target;
}
