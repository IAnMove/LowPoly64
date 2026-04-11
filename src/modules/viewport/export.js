import * as THREE from 'three';
import JSZip from 'jszip';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { state } from '../shared/state.js';
import { compileAnimation } from '../animation/animation.js';
import { cloneTexture } from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import { resolveAnimationProfile } from '../animation/animation-profiles.js';
import { TEMPLATE_REGISTRY } from './template-registry.js';
import { instantiateTemplateDefinition } from './templates.js';

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

function parseGLB(exportGroup, clips = [], filename = 'lowpoly64-scene.glb') {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    const options = { binary: true };
    if (clips.length > 0) {
      options.animations = clips;
    }

    exporter.parse(
      exportGroup,
      (result) => resolve({ filename, buffer: result }),
      (error) => reject(error),
      options
    );
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeSegment(value, fallback = 'asset') {
  const safe = String(value || fallback)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  return safe || fallback;
}

export function exportGLB() {
  if (state.userObjects.children.length === 0) {
    alert(t('noObjectsToExport'));
    return;
  }

  const exportGroup = getExportSource();
  const clips = prepareForExport(exportGroup);
  parseGLB(exportGroup, clips)
    .then(({ buffer, filename }) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      downloadBlob(blob, filename);
    })
    .catch((error) => {
      console.error('Export error:', error);
      alert(t('exportError') + error.message);
    });
}

export async function exportAllTemplatesGLBZip() {
  if (!Array.isArray(TEMPLATE_REGISTRY) || TEMPLATE_REGISTRY.length === 0) {
    alert(t('noObjectsToExport'));
    return;
  }

  try {
    const zip = new JSZip();
    const manifest = [];

    for (const def of TEMPLATE_REGISTRY) {
      const group = instantiateTemplateDefinition(def);
      const clips = prepareForExport(group);
      const filename = `${sanitizeSegment(def.id, 'template')}.glb`;
      const category = sanitizeSegment(def.category, 'uncategorized');
      const { buffer } = await parseGLB(group, clips, filename);
      zip.file(`${category}/${filename}`, buffer, { binary: true });
      manifest.push({
        id: def.id,
        name: def.name,
        category: def.category,
        filename: `${category}/${filename}`,
        animations: Array.isArray(group.userData.animations)
          ? group.userData.animations.map((anim) => anim.name)
          : [],
      });
    }

    zip.file('manifest.json', JSON.stringify({
      exportedAt: new Date().toISOString(),
      count: manifest.length,
      assets: manifest,
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'retrovisor-templates-glb.zip');
  } catch (error) {
    console.error('Export all templates error:', error);
    alert(t('exportError') + error.message);
  }
}
