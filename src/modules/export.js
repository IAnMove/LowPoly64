import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { state } from './state.js';

export function exportGLB() {
  if (state.userObjects.children.length === 0) {
    alert('No hay objetos para exportar.');
    return;
  }

  const exportGroup = state.userObjects.clone(true);

  exportGroup.traverse((child) => {
    if (child.isMesh && child.material) {
      const old = child.material;

      // Convert non-Standard materials to Standard for glTF compatibility
      if (!old.isMeshStandardMaterial && !old.isMeshPhysicalMaterial) {
        const std = new THREE.MeshStandardMaterial({
          color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
          flatShading: old.flatShading || false,
          wireframe: false,
          roughness: 0.8,
          metalness: 0.1,
        });
        // Transfer texture if present
        if (old.map) {
          std.map = old.map.clone();
          std.map.flipY = false;
          std.map.colorSpace = THREE.SRGBColorSpace;
          std.map.needsUpdate = true;
        }
        child.material = std;
      }

      // Ensure textures have correct glTF settings
      if (child.material.map) {
        child.material.map.flipY = false;
        child.material.map.colorSpace = THREE.SRGBColorSpace;
        child.material.map.needsUpdate = true;
      }

      // Remove selection highlight
      if (child.material.emissive) {
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
      }
    }
  });

  const exporter = new GLTFExporter();
  exporter.parse(
    exportGroup,
    (result) => {
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lowpoly64-scene.glb';
      link.click();
      URL.revokeObjectURL(url);
    },
    (error) => {
      console.error('Export error:', error);
      alert('Error al exportar: ' + error.message);
    },
    { binary: true }
  );
}
