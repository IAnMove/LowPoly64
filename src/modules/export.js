import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { state } from './state.js';
import { compileAnimation } from './animation.js';
import { cloneTexture } from './textures.js';
import { t } from './i18n.js';
import { resolveAnimationProfile } from './animation-profiles.js';

function getExportSource() {
  // In animation mode, always export the animation mode object
  if (state.animationMode && state.animationModeObject) {
    const group = new THREE.Group();
    group.add(state.animationModeObject.clone(true));
    return group;
  }
  // Selective export: selected objects first, then all
  if (state.selectedMeshes.size > 0) {
    const group = new THREE.Group();
    state.selectedMeshes.forEach((obj) => group.add(obj.clone(true)));
    return group;
  }
  if (state.selectedMesh) {
    const group = new THREE.Group();
    group.add(state.selectedMesh.clone(true));
    return group;
  }
  return state.userObjects.clone(true);
}

function prepareForExport(exportGroup) {
  const clips = [];

  exportGroup.traverse((child) => {
    // Set node.name from userData for animation track targeting in glTF
    // Skip child meshes inside PivotGroups to avoid name conflicts with the PivotGroup itself
    if (child.userData && child.userData.name && !(child.isMesh && child.parent && child.parent.userData.isPivot)) {
      child.name = child.userData.name;
    }

    if (child.isMesh && child.material) {
      const old = child.material;

      if (!old.isMeshStandardMaterial && !old.isMeshPhysicalMaterial) {
        const std = new THREE.MeshStandardMaterial({
          color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
          flatShading: old.flatShading || false,
          wireframe: false,
          roughness: 0.8,
          metalness: 0.1,
          vertexColors: old.vertexColors || false,
          transparent: old.transparent || false,
          opacity: old.opacity !== undefined ? old.opacity : 1,
        });
        if (old.transparent) {
          std.depthWrite = old.opacity < 1 ? false : true;
          std.side = old.opacity < 1 ? THREE.DoubleSide : THREE.FrontSide;
        }
        if (old.map) {
          std.map = cloneTexture(old.map);
        }
        child.material = std;
      }

      if (child.material.map) {
        child.material.map = cloneTexture(child.material.map);
      }

      if (child.material.emissive) {
        child.material.emissive.set(0x000000);
        child.material.emissiveIntensity = 0;
      }
    }

    // Recompile animation clips from raw definitions (clone destroys AnimationClip instances)
    if (child.userData && Array.isArray(child.userData.animations) && child.userData.animations.length > 0) {
      for (const animDef of child.userData.animations) {
        const clip = compileAnimation(animDef, child);
        if (clip) clips.push(clip);
      }
    }

    // Include animations from animation profile if present and no inline animations
    if (child.userData && child.userData.animationProfile && (!child.userData.animations || child.userData.animations.length === 0)) {
      const resolved = resolveAnimationProfile(child.userData.animationProfile);
      if (resolved) {
        for (const animDef of resolved.animations) {
          const clip = compileAnimation(animDef, child);
          if (clip) clips.push(clip);
        }
      }
    }
  });

  return clips;
}

export function exportGLB() {
  if (state.userObjects.children.length === 0) {
    alert(t('noObjectsToExport'));
    return;
  }

  const exportGroup = getExportSource();
  const clips = prepareForExport(exportGroup);

  const exporter = new GLTFExporter();
  const options = { binary: true };
  if (clips.length > 0) {
    options.animations = clips;
  }

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
      alert(t('exportError') + error.message);
    },
    options
  );
}
