import * as THREE from 'three';
import { createMaterial } from './materials.js';
import { compileAnimation } from './animation-compiler.js';
import {
  cleanGeometryParams,
  getGeometryParams,
  getGeometryType,
  getMaterialType,
  rebuildGeometry,
} from './persistence-geometry.js';
import {
  restoreTexture,
  serializeTextureData,
} from './persistence-textures.js';

export function serializeObject(obj) {
  if (obj.isGroup && obj.userData.isPivot) {
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
      const texData = serializeTextureData(childMesh);
      if (texData) data.mesh.texture = texData;
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
    const texData = serializeTextureData(obj);
    if (texData) meshData.texture = texData;
    return meshData;
  }

  return null;
}

export function deserializeObject(data, options = {}) {
  if (data.type === 'pivot') {
    const pivotGroup = new THREE.Group();
    pivotGroup.userData.name = data.name;
    pivotGroup.userData.isPivot = true;
    pivotGroup.name = data.name;
    pivotGroup.position.fromArray(data.position);
    pivotGroup.rotation.set(...data.rotation);
    pivotGroup.scale.fromArray(data.scale);

    if (data.mesh) {
      const geometry = rebuildGeometry(data.mesh.geometryType, data.mesh.geometryParams || {});
      const material = createMaterial(data.mesh.materialType, { color: data.mesh.color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.geometryType = data.mesh.geometryType;
      mesh.position.fromArray(data.mesh.position);
      pivotGroup.add(mesh);
      if (data.mesh.texture) restoreTexture(mesh, data.mesh.texture, options);
    }

    if (data.children) {
      data.children.forEach((childData) => {
        const child = deserializeObject(childData, options);
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
      const child = deserializeObject(childData, options);
      if (child) group.add(child);
    });

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
    if (data.texture) restoreTexture(mesh, data.texture, options);
    return mesh;
  }

  return null;
}

export function serializeGroupAsImportJSON(obj) {
  if (!obj) return null;

  if (obj.isMesh) {
    return {
      name: obj.userData.name || 'OBJECT',
      pieces: [serializeMeshAsPiece(obj)],
    };
  }

  if (!obj.isGroup) return null;

  const data = { name: obj.userData.name || 'GROUP', pieces: [] };

  function collectPieces(parent, parentName) {
    for (const child of parent.children) {
      if (child.isGroup && child.userData.isPivot) {
        data.pieces.push(serializePivotAsPiece(child, parentName));
        collectPieces(child, child.userData.name);
      } else if (child.isMesh && !parent.userData.isPivot) {
        data.pieces.push(serializeMeshAsPiece(child));
      }
    }
  }

  collectPieces(obj, null);

  if (obj.userData.animations && obj.userData.animations.length > 0) {
    data.animations = obj.userData.animations;
  }

  return data;
}

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
      ? '#' + childMesh.material.color.getHexString()
      : '#ffcc00',
    position: roundArray([pivotPos[0] + meshOffset[0], pivotPos[1] + meshOffset[1], pivotPos[2] + meshOffset[2]]),
    pivot: roundArray(pivotPos),
  };

  if (parentName) piece.parent = parentName;

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
