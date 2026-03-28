import * as THREE from 'three';
import { state } from './state.js';

export function createMaterial(type, options = {}) {
  const color = options.color || 0xffcc00;
  const flat = options.flatShading !== undefined ? options.flatShading : state.flatShadingEnabled;
  const wire = options.wireframe !== undefined ? options.wireframe : state.wireframeEnabled;
  const map = options.map || null;

  let material;
  switch (type || state.currentMaterialType) {
    case 'Basic':
      material = new THREE.MeshBasicMaterial({ color, wireframe: wire });
      break;
    case 'Phong':
      material = new THREE.MeshPhongMaterial({ color, flatShading: flat, wireframe: wire, shininess: 2 });
      break;
    case 'Standard':
      material = new THREE.MeshStandardMaterial({ color, flatShading: flat, wireframe: wire });
      break;
    case 'Lambert':
    default:
      material = new THREE.MeshLambertMaterial({ color, flatShading: flat, wireframe: wire });
      break;
  }

  if (map) {
    material.map = map;
    material.needsUpdate = true;
  }
  return material;
}

export function updateMaterialType(mesh, newType) {
  if (!mesh || !mesh.material) return;
  const old = mesh.material;
  const mat = createMaterial(newType, {
    color: old.color ? old.color.getHex() : 0xffcc00,
    flatShading: old.flatShading,
    wireframe: old.wireframe,
    map: old.map,
  });
  // Preserve emissive if selected
  if (state.selectedMesh === mesh && old.emissive) {
    mat.emissive = old.emissive.clone();
    mat.emissiveIntensity = old.emissiveIntensity;
  }
  mesh.material = mat;
  old.dispose();
}

export function toggleFlatShading() {
  state.flatShadingEnabled = !state.flatShadingEnabled;
  state.userObjects.traverse((child) => {
    if (child.isMesh && child.material) {
      if (child.material.flatShading !== undefined) {
        child.material.flatShading = state.flatShadingEnabled;
        child.material.needsUpdate = true;
      }
      if (child.geometry) {
        child.geometry.computeVertexNormals();
      }
    }
  });
  return state.flatShadingEnabled;
}

export function toggleWireframe() {
  state.wireframeEnabled = !state.wireframeEnabled;
  state.userObjects.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.wireframe = state.wireframeEnabled;
    }
  });
  return state.wireframeEnabled;
}

export function setColor(mesh, hexColor) {
  if (!mesh || !mesh.material) return;
  mesh.material.color.set(hexColor);
}

export function randomRetroColor() {
  const palette = state.retroPalette;
  return palette[Math.floor(Math.random() * palette.length)];
}

export function quickColor(hex) {
  if (state.selectedMesh) {
    setColor(state.selectedMesh, hex);
  }
}
