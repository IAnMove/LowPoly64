import * as THREE from 'three';
import { state } from './state.js';
import { createMaterial } from './materials.js';
import { deselect } from './selection.js';
import { showToast } from './ui.js';
import { compileAnimation } from './animation.js';
import { t } from './i18n.js';

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
      && (!data.color || isSerializedMaterialColor(data.color));
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
  return 'unknown';
}

function getGeometryParams(mesh) {
  const g = mesh.geometry;
  if (!g || !g.parameters) return {};
  return { ...g.parameters };
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
        color: childMesh.material && childMesh.material.color ? '#' + childMesh.material.color.getHexString() : '#ffcc00',
        position: childMesh.position.toArray(),
      };
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
    return data;
  }
  if (obj.isMesh) {
    return {
      type: 'mesh',
      name: obj.userData.name || 'Mesh',
      geometryType: obj.userData.geometryType || getGeometryType(obj),
      geometryParams: getGeometryParams(obj),
      materialType: getMaterialType(obj),
      color: obj.material && obj.material.color ? '#' + obj.material.color.getHexString() : '#ffcc00',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
    };
  }
  return null;
}

function rebuildGeometry(geoType, params) {
  switch (geoType) {
    case 'cube': return new THREE.BoxGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2);
    case 'sphere': return new THREE.SphereGeometry(params.radius ?? 1.5, params.widthSegments ?? 8, params.heightSegments ?? 6);
    case 'cylinder': return new THREE.CylinderGeometry(params.radiusTop ?? 1, params.radiusBottom ?? 1, params.height ?? 2.5, params.radialSegments ?? 8);
    case 'cone': return new THREE.ConeGeometry(params.radius ?? 1.5, params.height ?? 3, params.radialSegments ?? 8);
    case 'plane': return new THREE.PlaneGeometry(params.width ?? 3, params.height ?? 3);
    case 'capsule': return new THREE.CapsuleGeometry(params.radius ?? 0.8, params.length ?? 2, params.capSegments ?? 4, params.radialSegments ?? 8);
    case 'torus': return new THREE.TorusGeometry(params.radius ?? 1, params.tube ?? 0.08, params.radialSegments ?? 4, params.tubularSegments ?? 8);
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
      const material = createMaterial(data.mesh.materialType, { color: data.mesh.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.geometryType = data.mesh.geometryType;
      mesh.position.fromArray(data.mesh.position);
      pivotGroup.add(mesh);
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
    return group;
  }
  if (data.type === 'mesh') {
    const geometry = rebuildGeometry(data.geometryType, data.geometryParams || {});
    const material = createMaterial(data.materialType, { color: data.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.name = data.name;
    mesh.userData.geometryType = data.geometryType;
    mesh.position.fromArray(data.position);
    mesh.rotation.set(...data.rotation);
    mesh.scale.fromArray(data.scale);
    return mesh;
  }
  return null;
}

// Serialize a group (or mesh) as the import-compatible JSON format:
// { name, pieces: [...], animations: [...] }
export function serializeGroupAsImportJSON(obj) {
  if (!obj) return null;

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
  const geometryType = childMesh ? (childMesh.userData.geometryType || getGeometryType(childMesh)) : 'cube';
  // Convert local position to absolute root-group-space
  const absPivot = getAbsPivotPos(pivotGroup);
  const pivotPos = absPivot.toArray();
  const meshOffset = childMesh ? childMesh.position.toArray() : [0, 0, 0];

  const piece = {
    name: pivotGroup.userData.name || 'PIECE',
    geometry: {
      type: geometryType,
      params: childMesh ? cleanGeometryParams(geometryType, getGeometryParams(childMesh)) : {},
    },
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

  return piece;
}

function serializeMeshAsPiece(mesh) {
  const geometryType = mesh.userData.geometryType || getGeometryType(mesh);
  const piece = {
    name: mesh.userData.name || 'PIECE',
    geometry: {
      type: geometryType,
      params: cleanGeometryParams(geometryType, getGeometryParams(mesh)),
    },
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
  };

  const allowedKeys = allowedKeysByType[type] || [];
  const clean = {};
  for (const key of allowedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      clean[key] = value;
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
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      deserializeScene(data);
      showToast(t('sceneLoaded'));
    } catch (error) {
      showToast(t('sceneImportError') + (error?.message || t('sceneInvalidData')));
    }
  };
  reader.onerror = () => {
    showToast(t('sceneImportError') + t('jsonFileReadError'));
  };
  reader.readAsText(file);
}
