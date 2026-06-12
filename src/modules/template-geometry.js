import * as THREE from 'three';

const GEOMETRY_BUILDERS = {
  cube: (params) => new THREE.BoxGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2),
  sphere: (params) => new THREE.SphereGeometry(params.radius ?? 1, params.widthSegments ?? 8, params.heightSegments ?? 6),
  cylinder: (params) => new THREE.CylinderGeometry(params.radiusTop ?? 1, params.radiusBottom ?? 1, params.height ?? 2, params.radialSegments ?? 8),
  cone: (params) => new THREE.ConeGeometry(params.radius ?? 1, params.height ?? 2, params.radialSegments ?? 8),
  plane: (params) => new THREE.PlaneGeometry(params.width ?? 3, params.height ?? 3),
  capsule: (params) => new THREE.CapsuleGeometry(params.radius ?? 0.8, params.length ?? 2, params.capSegments ?? 4, params.radialSegments ?? 8),
  torus: (params) => new THREE.TorusGeometry(params.radius ?? 1, params.tube ?? 0.1, params.radialSegments ?? 4, params.tubularSegments ?? 8),
};

export function createTemplateGeometry(type, params = {}) {
  const builder = GEOMETRY_BUILDERS[type];
  return builder ? builder(params) : null;
}

export function isSupportedTemplateGeometry(type) {
  return Boolean(GEOMETRY_BUILDERS[type]);
}
