import * as THREE from 'three';

export function createMeshMaterial(type = 'Lambert', options = {}) {
  const color = options.color || 0xffcc00;
  const flatShading = options.flatShading ?? false;
  const wireframe = options.wireframe ?? false;
  const map = options.map || null;

  let material;
  switch (type) {
    case 'Basic':
      material = new THREE.MeshBasicMaterial({ color, wireframe });
      break;
    case 'Phong':
      material = new THREE.MeshPhongMaterial({ color, flatShading, wireframe, shininess: 2 });
      break;
    case 'Standard':
      material = new THREE.MeshStandardMaterial({ color, flatShading, wireframe });
      break;
    case 'Lambert':
    default:
      material = new THREE.MeshLambertMaterial({ color, flatShading, wireframe });
      break;
  }

  if (map) {
    material.map = map;
    material.needsUpdate = true;
  }
  return material;
}
