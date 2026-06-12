import * as THREE from 'three';

export function getGeometryType(mesh) {
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

export function getGeometryParams(mesh) {
  const g = mesh.geometry;
  if (!g || !g.parameters) return {};
  return { ...g.parameters };
}

export function getMaterialType(mesh) {
  const m = mesh.material;
  if (!m) return 'Lambert';
  if (m.isMeshBasicMaterial) return 'Basic';
  if (m.isMeshLambertMaterial) return 'Lambert';
  if (m.isMeshPhongMaterial) return 'Phong';
  if (m.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

export function rebuildGeometry(geoType, params) {
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

export function cleanGeometryParams(type, params) {
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
