import * as THREE from 'three';
import { state } from '../shared/state.js';
import { createMaterial } from '../shared/materials.js';
import { deselect } from './selection.js';
import { showToast } from './ui.js';
import { compileAnimation } from '../animation/animation.js';
import { configureTexture, applyTextureTransform, getTextureTransform, rememberTextureTransform } from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import {
  cloneGeometryParams,
  createCustomGeometry,
  createWedgeGeometry,
  createPyramidGeometry,
  normalizeGeometryType,
  serializeGeometryDefinition,
} from './custom-geometries.js';
import { applyVertexColors, serializeVertexColors } from './vertex-colors.js';
import { applyFaceColors, serializeFaceColors } from './retro-effects.js';
import { piecesToCharacterModel } from './character-model.js';

const STORAGE_KEY = 'lowpoly64-scene';
const MAX_SCENE_OBJECTS = 400;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVector3(value, maxAbs = 10000) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => isFiniteNumber(entry) && Math.abs(entry) <= maxAbs);
}

function isSerializedMaterialColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function validateSerializedObject(data, depth = 0) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || depth > 16) return false;

  if (data.type === 'pivot') {
    const mesh = data.mesh;
    const childrenValid = Array.isArray(data.children) && data.children.every((child) => validateSerializedObject(child, depth + 1));
    const meshValid = !mesh || (
      typeof mesh.geometryType === 'string'
      && typeof mesh.materialType === 'string'
      && isVector3(mesh.position)
      && (!mesh.color || isSerializedMaterialColor(mesh.color))
      && (!mesh.texture || typeof mesh.texture === 'object')
    );
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && childrenValid
      && meshValid;
  }

  if (data.type === 'group') {
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && Array.isArray(data.children)
      && data.children.every((child) => validateSerializedObject(child, depth + 1))
      && (!data.animations || Array.isArray(data.animations));
  }

  if (data.type === 'mesh') {
    return typeof data.name === 'string'
      && typeof data.geometryType === 'string'
      && typeof data.materialType === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && (!data.color || isSerializedMaterialColor(data.color))
      && (!data.texture || typeof data.texture === 'object');
  }

  return false;
}

function validateSerializedScene(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && Array.isArray(data.objects)
    && data.objects.length <= MAX_SCENE_OBJECTS
    && data.objects.every((objectData) => validateSerializedObject(objectData));
}

function clearUserObjects() {
  while (state.userObjects.children.length > 0) {
    const child = state.userObjects.children[0];
    state.userObjects.remove(child);
    child.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }
}

function getGeometryType(mesh) {
  const g = mesh.geometry;
  if (!g) return null;
  if (g.type === 'BoxGeometry') return 'cube';
  if (g.type === 'SphereGeometry') return 'sphere';
  if (g.type === 'CylinderGeometry') return 'cylinder';
  if (g.type === 'ConeGeometry') return 'cone';
  if (g.type === 'PlaneGeometry') return 'plane';
  if (g.type === 'CapsuleGeometry') return 'capsule';
  if (g.type === 'TorusGeometry') return 'torus';
  if (g.type === 'WedgeGeometry') return 'wedge';
  if (g.type === 'PyramidGeometry') return 'pyramid';
  if (g.type === 'CustomGeometry') return 'custom';
  return 'unknown';
}

function getGeometryParams(mesh) {
  if (mesh?.userData?.geometryParams) {
    return cloneGeometryParams(mesh.userData.geometryParams);
  }
  const g = mesh.geometry;
  if (!g || !g.parameters) return {};
  return cloneGeometryParams(g.parameters);
}

function getMaterialType(mesh) {
  const m = mesh.material;
  if (!m) return 'Lambert';
  if (m.isMeshBasicMaterial) return 'Basic';
  if (m.isMeshLambertMaterial) return 'Lambert';
  if (m.isMeshPhongMaterial) return 'Phong';
  if (m.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

function extractTextureDataURL(mesh) {
  const tex = mesh.userData.texture || mesh.material.map;
  if (!tex || !tex.image) return null;
  try {
    const img = tex.image;
    // If the image is already a canvas, use toDataURL directly
    if (img instanceof HTMLCanvasElement) {
      return img.toDataURL('image/png');
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.width || img.naturalWidth || 256;
    canvas.height = img.height || img.naturalHeight || 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch (_) {
    return null;
  }
}

function serializeTextureData(mesh) {
  if (!mesh.userData.textureEnabled) return null;
  const dataURL = extractTextureDataURL(mesh);
  if (!dataURL) return null;
  const data = {
    dataURL,
    colorBeforeTexture: mesh.userData.colorBeforeTexture !== undefined
      ? '#' + new THREE.Color(mesh.userData.colorBeforeTexture).getHexString()
      : null,
    transform: mesh.userData.textureTransform || getTextureTransform(mesh.userData.texture || mesh.material.map),
  };
  if (mesh.userData.faceUVs) {
    data.faceUVs = mesh.userData.faceUVs.map((d) => ({ ...d }));
  }
  return data;
}

function restoreTexture(mesh, texData) {
  if (!texData || !texData.dataURL) return;
  const img = new Image();
  img.onload = () => {
    const texture = new THREE.Texture(img);
    configureTexture(texture);
    if (texData.transform) {
      applyTextureTransform(texture, texData.transform);
    }
    mesh.userData.texture = texture;
    mesh.userData.textureEnabled = true;
    rememberTextureTransform(mesh, texture);
    if (texData.colorBeforeTexture) {
      mesh.userData.colorBeforeTexture = new THREE.Color(texData.colorBeforeTexture).getHex();
    }
    mesh.material.map = texture;
    mesh.material.color.set(0xffffff);
    mesh.material.needsUpdate = true;
    if (texData.faceUVs && mesh.userData.geometryType === 'cube') {
      mesh.userData.faceUVs = texData.faceUVs.map((d) => ({ ...d }));
      const uvAttr = mesh.geometry.attributes.uv;
      if (uvAttr) {
        for (let face = 0; face < 6; face++) {
          const d = texData.faceUVs[face];
          if (!d) continue;
          const base = face * 4;
          const rad = THREE.MathUtils.degToRad(d.rot || 0);
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
          corners.forEach((c, i) => {
            const cx = c[0] - 0.5;
            const cy = c[1] - 0.5;
            const rx = cx * cos - cy * sin + 0.5;
            const ry = cx * sin + cy * cos + 0.5;
            uvAttr.setXY(base + i, d.ou + rx * d.su, d.ov + ry * d.sv);
          });
        }
        uvAttr.needsUpdate = true;
      }
    }
  };
  img.src = texData.dataURL;
}

function serializeObject(obj) {
  if (obj.isGroup && obj.userData.isPivot) {
    // PivotGroup: serialize pivot position, child mesh, and nested PivotGroup children
    const childMesh = obj.children.find((c) => c.isMesh);
    const data = {
      type: 'pivot',
      name: obj.userData.name || 'Pivot',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      children: obj.children.filter((c) => c.isGroup).map(serializeObject),
    };
    if (childMesh) {
      data.mesh = {
        geometryType: childMesh.userData.geometryType || getGeometryType(childMesh),
        geometryParams: getGeometryParams(childMesh),
        materialType: getMaterialType(childMesh),
        color: childMesh.userData.textureEnabled && childMesh.userData.colorBeforeTexture !== undefined
          ? '#' + new THREE.Color(childMesh.userData.colorBeforeTexture).getHexString()
          : (childMesh.material && childMesh.material.color ? '#' + childMesh.material.color.getHexString() : '#ffcc00'),
        position: childMesh.position.toArray(),
      };
      if (childMesh.material && childMesh.material.opacity < 1) {
        data.mesh.opacity = Math.round(childMesh.material.opacity * 1000) / 1000;
      }
      const texData = serializeTextureData(childMesh);
      if (texData) data.mesh.texture = texData;
      const vcData = serializeVertexColors(childMesh);
      if (vcData) data.mesh.vertexColors = vcData;
      const fcData = serializeFaceColors(childMesh);
      if (fcData) data.mesh.faceColors = fcData;
    }
    return data;
  }
  if (obj.isGroup) {
    const data = {
      type: 'group',
      name: obj.userData.name || 'Group',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      children: obj.children.map(serializeObject),
    };
    if (obj.userData.animations && obj.userData.animations.length > 0) {
      data.animations = obj.userData.animations;
    }
    // CharacterModel metadata
    if (obj.userData.archetype) {
      data.archetype = obj.userData.archetype;
      if (obj.userData.slotMap) data.slotMap = obj.userData.slotMap;
      if (obj.userData.animationProfile) data.animationProfile = obj.userData.animationProfile;
      if (obj.userData.skeletonId) data.skeletonId = obj.userData.skeletonId;
      if (obj.userData.slotBindings) data.slotBindings = obj.userData.slotBindings;
    }
    return data;
  }
  if (obj.isMesh) {
    const meshData = {
      type: 'mesh',
      name: obj.userData.name || 'Mesh',
      geometryType: obj.userData.geometryType || getGeometryType(obj),
      geometryParams: getGeometryParams(obj),
      materialType: getMaterialType(obj),
      color: obj.userData.textureEnabled && obj.userData.colorBeforeTexture !== undefined
        ? '#' + new THREE.Color(obj.userData.colorBeforeTexture).getHexString()
        : (obj.material && obj.material.color ? '#' + obj.material.color.getHexString() : '#ffcc00'),
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
    };
    if (obj.material && obj.material.opacity < 1) {
      meshData.opacity = Math.round(obj.material.opacity * 1000) / 1000;
    }
    const texData = serializeTextureData(obj);
    if (texData) meshData.texture = texData;
    const vcData = serializeVertexColors(obj);
    if (vcData) meshData.vertexColors = vcData;
    const fcData = serializeFaceColors(obj);
    if (fcData) meshData.faceColors = fcData;
    return meshData;
  }
  return null;
}

function rebuildGeometry(geoType, params) {
  switch (normalizeGeometryType(geoType)) {
    case 'cube': return new THREE.BoxGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2);
    case 'sphere': return new THREE.SphereGeometry(params.radius ?? 1.5, params.widthSegments ?? 8, params.heightSegments ?? 6);
    case 'cylinder': return new THREE.CylinderGeometry(params.radiusTop ?? 1, params.radiusBottom ?? 1, params.height ?? 2.5, params.radialSegments ?? 8);
    case 'cone': return new THREE.ConeGeometry(params.radius ?? 1.5, params.height ?? 3, params.radialSegments ?? 8);
    case 'plane': return new THREE.PlaneGeometry(params.width ?? 3, params.height ?? 3);
    case 'capsule': return new THREE.CapsuleGeometry(params.radius ?? 0.8, params.length ?? 2, params.capSegments ?? 4, params.radialSegments ?? 8);
    case 'torus': return new THREE.TorusGeometry(params.radius ?? 1, params.tube ?? 0.08, params.radialSegments ?? 4, params.tubularSegments ?? 8);
    case 'wedge': return createWedgeGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2);
    case 'pyramid': return createPyramidGeometry(params.width ?? 2, params.height ?? 2);
    case 'custom': return createCustomGeometry(params.vertices || [], params.faces || []);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function deserializeObject(data) {
  if (data.type === 'pivot') {
    const pivotGroup = new THREE.Group();
    pivotGroup.userData.name = data.name;
    pivotGroup.userData.isPivot = true;
    pivotGroup.name = data.name;
    pivotGroup.position.fromArray(data.position);
    pivotGroup.rotation.set(...data.rotation);
    pivotGroup.scale.fromArray(data.scale);
    // Restore child mesh
    if (data.mesh) {
      const geometry = rebuildGeometry(data.mesh.geometryType, data.mesh.geometryParams || {});
      const hasFC = data.mesh.faceColors && applyFaceColors(geometry, data.mesh.faceColors);
      const hasVC = (data.mesh.vertexColors && applyVertexColors(geometry, data.mesh.vertexColors)) || hasFC;
      const material = createMaterial(data.mesh.materialType, {
        color: data.mesh.color,
        vertexColors: hasVC,
        opacity: data.mesh.opacity !== undefined ? data.mesh.opacity : 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.geometryType = normalizeGeometryType(data.mesh.geometryType) || data.mesh.geometryType;
      mesh.userData.geometryParams = cloneGeometryParams(data.mesh.geometryParams || geometry.parameters || {});
      if (hasVC) mesh.userData.vertexColors = data.mesh.vertexColors;
      if (hasFC) mesh.userData.faceColorArray = data.mesh.faceColors;
      mesh.position.fromArray(data.mesh.position);
      pivotGroup.add(mesh);
      if (data.mesh.texture) restoreTexture(mesh, data.mesh.texture);
    }
    // Recurse for nested PivotGroup children
    if (data.children) {
      data.children.forEach((childData) => {
        const child = deserializeObject(childData);
        if (child) pivotGroup.add(child);
      });
    }
    return pivotGroup;
  }
  if (data.type === 'group') {
    const group = new THREE.Group();
    group.userData.name = data.name;
    group.position.fromArray(data.position);
    group.rotation.set(...data.rotation);
    group.scale.fromArray(data.scale);
    data.children.forEach((childData) => {
      const child = deserializeObject(childData);
      if (child) group.add(child);
    });
    // Restore animations
    if (data.animations && data.animations.length > 0) {
      group.userData.animations = data.animations;
      group.userData.animationClips = data.animations
        .map((animDef) => compileAnimation(animDef, group))
        .filter(Boolean);
    }
    // Restore CharacterModel metadata
    if (data.archetype) {
      group.userData.archetype = data.archetype;
      if (data.slotMap) group.userData.slotMap = data.slotMap;
      if (data.animationProfile) group.userData.animationProfile = data.animationProfile;
      if (data.skeletonId) group.userData.skeletonId = data.skeletonId;
      if (data.slotBindings) group.userData.slotBindings = data.slotBindings;
    }
    return group;
  }
  if (data.type === 'mesh') {
    const geometry = rebuildGeometry(data.geometryType, data.geometryParams || {});
    const hasFC = data.faceColors && applyFaceColors(geometry, data.faceColors);
    const hasVC = (data.vertexColors && applyVertexColors(geometry, data.vertexColors)) || hasFC;
    const material = createMaterial(data.materialType, {
      color: data.color,
      vertexColors: hasVC,
      opacity: data.opacity !== undefined ? data.opacity : 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.name = data.name;
    mesh.userData.geometryType = normalizeGeometryType(data.geometryType) || data.geometryType;
    mesh.userData.geometryParams = cloneGeometryParams(data.geometryParams || geometry.parameters || {});
    if (hasVC) mesh.userData.vertexColors = data.vertexColors;
    if (hasFC) mesh.userData.faceColorArray = data.faceColors;
    mesh.position.fromArray(data.position);
    mesh.rotation.set(...data.rotation);
    mesh.scale.fromArray(data.scale);
    if (data.texture) restoreTexture(mesh, data.texture);
    return mesh;
  }
  return null;
}

// Serialize a group (or mesh) as the import-compatible JSON format:
// { name, pieces: [...], animations: [...] }
export function serializeGroupAsImportJSON(obj, { format = 'legacy' } = {}) {
  if (!obj) return null;

  // CharacterModel format if requested and metadata present
  if (format === 'character-model' && obj.isGroup && obj.userData.archetype) {
    return serializeAsCharacterModel(obj);
  }

  // Single mesh — wrap it
  if (obj.isMesh) {
    return {
      name: obj.userData.name || 'OBJECT',
      pieces: [serializeMeshAsPiece(obj)],
    };
  }

  if (!obj.isGroup) return null;

  const data = { name: obj.userData.name || 'GROUP' };
  data.pieces = [];

  // Collect pieces from children, handling PivotGroups recursively
  function collectPieces(parent, parentName) {
    for (const child of parent.children) {
      if (child.isGroup && child.userData.isPivot) {
        data.pieces.push(serializePivotAsPiece(child, parentName));
        // Recurse into nested PivotGroups
        collectPieces(child, child.userData.name);
      } else if (child.isMesh && !parent.userData.isPivot) {
        // Plain mesh (not a child of a PivotGroup — those are handled by serializePivotAsPiece)
        data.pieces.push(serializeMeshAsPiece(child));
      }
    }
  }

  collectPieces(obj, null);

  // Animations (raw definitions, already in import-ready format)
  if (obj.userData.animations && obj.userData.animations.length > 0) {
    data.animations = obj.userData.animations;
  }

  return data;
}

function serializeAsCharacterModel(obj) {
  // First get the legacy pieces
  const legacyData = serializeGroupAsImportJSON(obj, { format: 'legacy' });
  if (!legacyData) return null;

  return piecesToCharacterModel(legacyData.pieces, {
    name: legacyData.name,
    archetype: obj.userData.archetype,
    slotMap: obj.userData.slotMap,
    animationProfile: obj.userData.animationProfile,
    skeletonId: obj.userData.skeletonId,
  });
}

// Accumulate position up through PivotGroup ancestors to get root-group-space position
function getAbsPivotPos(pivotGroup) {
  const pos = pivotGroup.position.clone();
  let parent = pivotGroup.parent;
  while (parent && parent.userData.isPivot) {
    pos.add(parent.position);
    parent = parent.parent;
  }
  return pos;
}

function serializePivotAsPiece(pivotGroup, parentName) {
  const childMesh = pivotGroup.children.find((c) => c.isMesh);
  const geometryType = childMesh ? normalizeGeometryType(childMesh.userData.geometryType || getGeometryType(childMesh)) : 'cube';
  // Convert local position to absolute root-group-space
  const absPivot = getAbsPivotPos(pivotGroup);
  const pivotPos = absPivot.toArray();
  const meshOffset = childMesh ? childMesh.position.toArray() : [0, 0, 0];
  const geometryParams = childMesh ? cleanGeometryParams(geometryType, getGeometryParams(childMesh)) : {};

  const piece = {
    name: pivotGroup.userData.name || 'PIECE',
    geometry: serializeGeometryDefinition(geometryType, geometryParams),
    color: childMesh && childMesh.material && childMesh.material.color
      ? '#' + childMesh.material.color.getHexString() : '#ffcc00',
    // Visual position = absolute pivot + mesh offset
    position: roundArray([pivotPos[0] + meshOffset[0], pivotPos[1] + meshOffset[1], pivotPos[2] + meshOffset[2]]),
    pivot: roundArray(pivotPos),
  };

  if (parentName) {
    piece.parent = parentName;
  }

  const rot = pivotGroup.rotation.toArray().slice(0, 3);
  if (rot.some((v) => Math.abs(v) > 0.001)) {
    piece.rotation = roundArray(rot);
  }

  const sc = pivotGroup.scale.toArray();
  if (sc.some((v) => Math.abs(v - 1) > 0.001)) {
    piece.scale = roundArray(sc);
  }

  if (childMesh) {
    if (childMesh.material && childMesh.material.opacity < 1) {
      piece.opacity = Math.round(childMesh.material.opacity * 1000) / 1000;
    }
    const vcData = serializeVertexColors(childMesh);
    if (vcData) piece.vertexColors = vcData;
    const fcData = serializeFaceColors(childMesh);
    if (fcData) piece.faceColors = fcData;
  }

  return piece;
}

function serializeMeshAsPiece(mesh) {
  const geometryType = normalizeGeometryType(mesh.userData.geometryType || getGeometryType(mesh));
  const geometryParams = cleanGeometryParams(geometryType, getGeometryParams(mesh));
  const piece = {
    name: mesh.userData.name || 'PIECE',
    geometry: serializeGeometryDefinition(geometryType, geometryParams),
    color: mesh.material && mesh.material.color ? '#' + mesh.material.color.getHexString() : '#ffcc00',
    position: roundArray(mesh.position.toArray()),
  };

  // Only include rotation/scale if non-default
  const rot = mesh.rotation.toArray().slice(0, 3);
  if (rot.some((v) => Math.abs(v) > 0.001)) {
    piece.rotation = roundArray(rot);
  }

  const sc = mesh.scale.toArray();
  if (sc.some((v) => Math.abs(v - 1) > 0.001)) {
    piece.scale = roundArray(sc);
  }

  if (mesh.material && mesh.material.opacity < 1) {
    piece.opacity = Math.round(mesh.material.opacity * 1000) / 1000;
  }
  const vcData = serializeVertexColors(mesh);
  if (vcData) piece.vertexColors = vcData;
  const fcData = serializeFaceColors(mesh);
  if (fcData) piece.faceColors = fcData;

  return piece;
}

function roundArray(arr) {
  return arr.map((v) => Math.round(v * 1000) / 1000);
}

function cleanGeometryParams(type, params) {
  const allowedKeysByType = {
    cube: ['width', 'height', 'depth'],
    sphere: ['radius', 'widthSegments', 'heightSegments'],
    cylinder: ['radiusTop', 'radiusBottom', 'height', 'radialSegments'],
    cone: ['radius', 'height', 'radialSegments'],
    plane: ['width', 'height'],
    capsule: ['radius', 'length', 'capSegments', 'radialSegments'],
    torus: ['radius', 'tube', 'radialSegments', 'tubularSegments'],
    wedge: ['width', 'height', 'depth'],
    pyramid: ['width', 'height'],
    custom: ['vertices', 'faces'],
  };

  const allowedKeys = allowedKeysByType[type] || [];
  const clean = {};
  for (const key of allowedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      clean[key] = Array.isArray(value) ? value.map((entry) => (Array.isArray(entry) ? [...entry] : entry)) : value;
    }
  }
  return clean;
}

export function serializeScene() {
  const objects = [];
  state.userObjects.children.forEach((child) => {
    const data = serializeObject(child);
    if (data) objects.push(data);
  });
  return { version: 1, objects };
}

export function deserializeScene(json) {
  deselect();
  if (!validateSerializedScene(json)) {
    throw new Error(t('sceneInvalidData'));
  }

  const rebuiltObjects = json.objects.map((data) => deserializeObject(data)).filter(Boolean);
  clearUserObjects();
  rebuiltObjects.forEach((obj) => state.userObjects.add(obj));
}

export function saveToLocalStorage() {
  try {
    const data = serializeScene();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast(t('sceneSaved'));
  } catch (error) {
    showToast(t('sceneSaveError') + (error?.message || ''));
  }
}

export function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    showToast(t('noSavedScene'));
    return;
  }
  if (!confirm(t('confirmLoadScene'))) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    deserializeScene(data);
    showToast(t('sceneLoaded'));
  } catch (error) {
    showToast(t('sceneLoadError') + (error?.message || t('sceneInvalidData')));
  }
}

export function exportSceneJSON() {
  const data = serializeScene();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lowpoly64-scene.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function importSceneJSON(file) {
  if (!file) {
    return Promise.resolve({ success: false, error: t('jsonFileReadError') });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        deserializeScene(data);
        showToast(t('sceneLoaded'));
        resolve({ success: true });
      } catch (error) {
        showToast(t('sceneImportError') + (error?.message || t('sceneInvalidData')));
        resolve({ success: false, error: error?.message || t('sceneInvalidData') });
      }
    };
    reader.onerror = () => {
      showToast(t('sceneImportError') + t('jsonFileReadError'));
      resolve({ success: false, error: t('jsonFileReadError') });
    };
    reader.readAsText(file);
  });
}
