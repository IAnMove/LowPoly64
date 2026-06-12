import * as THREE from 'three';

const SELECTION_COLOR = 0x4488ff;
const SELECTION_INTENSITY = 0.4;

function forEachHighlightableMesh(target, callback) {
  if (!target) return;
  if (target.isMesh) {
    callback(target);
    return;
  }
  if (target.isGroup) {
    target.traverse((child) => {
      if (child.isMesh) callback(child);
    });
  }
}

export function highlightSelection(target, originalEmissive) {
  forEachHighlightableMesh(target, (mesh) => {
    if (!mesh.material?.emissive) return;
    originalEmissive.set(mesh.uuid, mesh.material.emissive.clone());
    mesh.material.emissive = new THREE.Color(SELECTION_COLOR);
    mesh.material.emissiveIntensity = SELECTION_INTENSITY;
  });
}

export function unhighlightSelection(target, originalEmissive) {
  forEachHighlightableMesh(target, (mesh) => {
    const original = originalEmissive.get(mesh.uuid);
    if (original && mesh.material?.emissive) {
      mesh.material.emissive.copy(original);
      mesh.material.emissiveIntensity = 0;
    }
    originalEmissive.delete(mesh.uuid);
  });
}
