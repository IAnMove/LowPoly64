import * as THREE from 'three';
import { state } from './state.js';
import { pushAction } from './undo.js';
import { applyRetroShaderMods } from '../viewport/retro-effects.js';
import { t } from './i18n.js';
import { collectEditableMeshes, getEditableMeshes } from './ui-helpers.js';

export function createMaterial(type, options = {}) {
  const color = options.color || 0xffcc00;
  const flat = options.flatShading !== undefined ? options.flatShading : state.flatShadingEnabled;
  const wire = options.wireframe !== undefined ? options.wireframe : state.wireframeEnabled;
  const map = options.map || null;
  const useVertexColors = options.vertexColors || false;
  const opacity = options.opacity !== undefined ? options.opacity : 1;
  const transparent = opacity < 1;

  let material;
  switch (type || state.currentMaterialType) {
    case 'Basic':
      material = new THREE.MeshBasicMaterial({ color, wireframe: wire, vertexColors: useVertexColors, transparent, opacity });
      break;
    case 'Phong':
      material = new THREE.MeshPhongMaterial({ color, flatShading: flat, wireframe: wire, shininess: 2, vertexColors: useVertexColors, transparent, opacity });
      break;
    case 'Standard':
      material = new THREE.MeshStandardMaterial({ color, flatShading: flat, wireframe: wire, vertexColors: useVertexColors, transparent, opacity });
      break;
    case 'Lambert':
    default:
      material = new THREE.MeshLambertMaterial({ color, flatShading: flat, wireframe: wire, vertexColors: useVertexColors, transparent, opacity });
      break;
  }

  if (transparent) {
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
  }

  if (map) {
    material.map = map;
    material.needsUpdate = true;
  }
  applyRetroShaderMods(material);
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
    vertexColors: old.vertexColors || false,
    opacity: old.opacity !== undefined ? old.opacity : 1,
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

/**
 * Enable vertex colors on a mesh's material (call after applying vertex color attribute).
 */
export function enableVertexColors(mesh) {
  if (!mesh || !mesh.material) return;
  mesh.material.vertexColors = true;
  mesh.material.needsUpdate = true;
}

/**
 * Disable vertex colors on a mesh's material and restore base color.
 */
export function disableVertexColors(mesh) {
  if (!mesh || !mesh.material) return;
  mesh.material.vertexColors = false;
  mesh.material.needsUpdate = true;
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

export function setOpacity(mesh, value) {
  if (!mesh || !mesh.material) return;
  const numericValue = Number.isFinite(value) ? value : 1;
  const opacity = Math.max(0, Math.min(1, numericValue));
  mesh.material.opacity = opacity;
  mesh.material.transparent = opacity < 1;
  mesh.material.depthWrite = opacity >= 1;
  mesh.material.side = opacity < 1 ? THREE.DoubleSide : THREE.FrontSide;
  mesh.material.needsUpdate = true;
}

export function randomRetroColor() {
  const palette = state.retroPalette;
  return palette[Math.floor(Math.random() * palette.length)];
}

export function quickColor(hex) {
  const meshes = state.selectedMeshes.size > 0
    ? collectEditableMeshes(Array.from(state.selectedMeshes))
    : getEditableMeshes(state.selectedMesh);
  const editableMeshes = meshes.filter((mesh) => mesh.material?.color);
  if (editableMeshes.length === 0) return;

  const previous = editableMeshes.map((mesh) => ({ mesh, color: '#' + mesh.material.color.getHexString() }));
  const oldColor = previous[0]?.color || hex;
  previous.forEach(({ mesh }) => setColor(mesh, hex));
  // Sync color pickers
  const palettePicker = document.getElementById('palette-color-picker');
  if (palettePicker) palettePicker.value = hex;
  const propColor = document.getElementById('prop-color');
  if (propColor) propColor.value = hex;
  pushAction({
    type: t('actionChangeColor'),
    undo: () => {
      previous.forEach(({ mesh, color }) => setColor(mesh, color));
      if (palettePicker) palettePicker.value = oldColor;
      if (propColor) propColor.value = oldColor;
    },
    redo: () => {
      previous.forEach(({ mesh }) => setColor(mesh, hex));
      if (palettePicker) palettePicker.value = hex;
      if (propColor) propColor.value = hex;
    },
  });
}
