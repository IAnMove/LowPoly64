import * as THREE from 'three';
import { state } from './state.js';
import { createMaterial } from './materials.js';
import { deselect } from './selection.js';
import { showToast } from './ui.js';
import { compileAnimation } from './animation.js';

const STORAGE_KEY = 'lowpoly64-scene';

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
    case 'cube': return new THREE.BoxGeometry(params.width || 2, params.height || 2, params.depth || 2);
    case 'sphere': return new THREE.SphereGeometry(params.radius || 1.5, params.widthSegments || 8, params.heightSegments || 6);
    case 'cylinder': return new THREE.CylinderGeometry(params.radiusTop || 1, params.radiusBottom || 1, params.height || 2.5, params.radialSegments || 8);
    case 'cone': return new THREE.ConeGeometry(params.radius || 1.5, params.height || 3, params.radialSegments || 8);
    case 'plane': return new THREE.PlaneGeometry(params.width || 3, params.height || 3);
    case 'capsule': return new THREE.CapsuleGeometry(params.radius || 0.8, params.length || 2, params.capSegments || 4, params.radialSegments || 8);
    case 'torus': return new THREE.TorusGeometry(params.radius || 1, params.tube || 0.08, params.radialSegments || 4, params.tubularSegments || 8);
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

function serializePivotAsPiece(pivotGroup, parentName) {
  const childMesh = pivotGroup.children.find((c) => c.isMesh);
  const pivotPos = pivotGroup.position.toArray();
  const meshOffset = childMesh ? childMesh.position.toArray() : [0, 0, 0];

  const piece = {
    name: pivotGroup.userData.name || 'PIECE',
    geometry: {
      type: childMesh ? (childMesh.userData.geometryType || getGeometryType(childMesh)) : 'cube',
      params: childMesh ? cleanGeometryParams(getGeometryParams(childMesh)) : {},
    },
    color: childMesh && childMesh.material && childMesh.material.color
      ? '#' + childMesh.material.color.getHexString() : '#ffcc00',
    // Visual position = pivot + mesh offset
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
  const piece = {
    name: mesh.userData.name || 'PIECE',
    geometry: {
      type: mesh.userData.geometryType || getGeometryType(mesh),
      params: cleanGeometryParams(getGeometryParams(mesh)),
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

function cleanGeometryParams(params) {
  // Remove undefined/null values for cleaner JSON
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) clean[k] = v;
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
  // Clear scene
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
  // Rebuild
  if (json && json.objects) {
    json.objects.forEach((data) => {
      const obj = deserializeObject(data);
      if (obj) state.userObjects.add(obj);
    });
  }
}

export function saveToLocalStorage() {
  const data = serializeScene();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  showToast('Escena guardada');
}

export function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    showToast('No hay escena guardada');
    return;
  }
  if (!confirm('Cargar escena guardada? Se perderan los cambios actuales.')) {
    return;
  }
  const data = JSON.parse(raw);
  deserializeScene(data);
  showToast('Escena cargada');
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
    const data = JSON.parse(e.target.result);
    deserializeScene(data);
  };
  reader.readAsText(file);
}
