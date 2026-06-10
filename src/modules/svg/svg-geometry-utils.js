import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function roundNumber(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function buildNormalizationTransformFromBounds(bounds, targetSize) {
  if (!bounds) throw new Error('Invalid SVG bounds');
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const scale = targetSize / maxDimension;
  const groundOffsetY = (bounds.max.y - center.y) * scale;

  return { center, scale, groundOffsetY };
}

function flipGeometryWinding(geometry) {
  const index = geometry.getIndex();
  if (index) {
    const array = index.array;
    for (let faceIndex = 0; faceIndex < array.length; faceIndex += 3) {
      const temp = array[faceIndex + 1];
      array[faceIndex + 1] = array[faceIndex + 2];
      array[faceIndex + 2] = temp;
    }
    index.needsUpdate = true;
    return;
  }

  const position = geometry.getAttribute('position');
  if (!position) return;

  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 3) {
    for (let componentIndex = 0; componentIndex < position.itemSize; componentIndex++) {
      const temp = position.array[(vertexIndex + 1) * position.itemSize + componentIndex];
      position.array[(vertexIndex + 1) * position.itemSize + componentIndex] = position.array[(vertexIndex + 2) * position.itemSize + componentIndex];
      position.array[(vertexIndex + 2) * position.itemSize + componentIndex] = temp;
    }
  }
  position.needsUpdate = true;
}

export function applyNormalizationTransform(geometry, transform) {
  geometry.translate(-transform.center.x, -transform.center.y, -transform.center.z);
  geometry.scale(transform.scale, -transform.scale, transform.scale);
  flipGeometryWinding(geometry);
  geometry.translate(0, transform.groundOffsetY, 0);
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
}

export function bufferGeometryToCustomData(geometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!position) throw new Error('Extruded geometry is missing positions');

  const vertices = [];
  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex++) {
    vertices.push([
      roundNumber(position.getX(vertexIndex)),
      roundNumber(position.getY(vertexIndex)),
      roundNumber(position.getZ(vertexIndex)),
    ]);
  }

  const faces = [];
  if (index) {
    const array = index.array;
    for (let faceIndex = 0; faceIndex < array.length; faceIndex += 3) {
      faces.push([array[faceIndex], array[faceIndex + 1], array[faceIndex + 2]]);
    }
  } else {
    for (let faceIndex = 0; faceIndex < position.count; faceIndex += 3) {
      faces.push([faceIndex, faceIndex + 1, faceIndex + 2]);
    }
  }

  return { vertices, faces };
}

export function mergeLayerShapeGeometries(geometries) {
  if (geometries.length === 0) return null;
  if (geometries.length === 1) return geometries[0];
  const merged = BufferGeometryUtils.mergeGeometries(geometries, false);
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
}

export function computeCombinedGeometryBounds(geometries) {
  const combinedBounds = new THREE.Box3();
  let hasBounds = false;

  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    if (!hasBounds) {
      combinedBounds.copy(geometry.boundingBox);
      hasBounds = true;
    } else {
      combinedBounds.union(geometry.boundingBox);
    }
  });

  return hasBounds ? combinedBounds : null;
}
