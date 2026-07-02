import * as THREE from 'three';
import JSZip from 'jszip';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { state } from '../shared/state.js';
import { compileAnimation } from '../animation/animation.js';
import { cloneTexture } from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import { resolveAnimationProfile } from '../animation/animation-profiles.js';
import { TEMPLATE_REGISTRY } from './template-registry.js';
import { instantiateTemplateDefinition } from './templates.js';

function findNodeByName(root, targetName) {
  let match = null;
  root?.traverse?.((child) => {
    if (!match && (child.userData?.name === targetName || child.name === targetName)) {
      match = child;
    }
  });
  return match;
}

function containsSkinnedMesh(object) {
  let found = false;
  object?.traverse?.((child) => {
    if (child?.isSkinnedMesh) {
      found = true;
    }
  });
  return found;
}

function cloneObjectForExport(object) {
  return containsSkinnedMesh(object) ? SkeletonUtils.clone(object) : object.clone(true);
}

function hasNormalizedNormalLengths(attribute) {
  if (!attribute) return true;
  const vector = new THREE.Vector3();
  for (let index = 0; index < attribute.count; index += 1) {
    if (Math.abs(vector.fromBufferAttribute(attribute, index).length() - 1) > 0.0005) {
      return false;
    }
  }
  return true;
}

function createNormalizedNormalAttribute(attribute) {
  const nextAttribute = attribute.clone();
  const vector = new THREE.Vector3();

  for (let index = 0; index < nextAttribute.count; index += 1) {
    vector.fromBufferAttribute(nextAttribute, index);
    if (vector.x === 0 && vector.y === 0 && vector.z === 0) {
      vector.set(1, 0, 0);
    } else {
      vector.normalize();
    }
    nextAttribute.setXYZ(index, vector.x, vector.y, vector.z);
  }

  return nextAttribute;
}

function sanitizeMeshGeometryForExport(mesh) {
  const normalAttr = mesh?.geometry?.getAttribute?.('normal');
  if (!normalAttr || hasNormalizedNormalLengths(normalAttr)) return;
  const nextGeometry = mesh.geometry.clone();
  nextGeometry.setAttribute('normal', createNormalizedNormalAttribute(normalAttr));
  mesh.geometry = nextGeometry;
}

function buildQuaternionTrackForExport(exportGroup, group) {
  const targetNode = findNodeByName(exportGroup, group.targetName);
  const baseRotation = targetNode?.rotation || new THREE.Euler(0, 0, 0, 'XYZ');
  const times = group.times;
  const xValues = group.x ?? new Array(times.length).fill(baseRotation.x);
  const yValues = group.y ?? new Array(times.length).fill(baseRotation.y);
  const zValues = group.z ?? new Array(times.length).fill(baseRotation.z);
  const values = [];

  for (let index = 0; index < times.length; index += 1) {
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      xValues[index] ?? baseRotation.x,
      yValues[index] ?? baseRotation.y,
      zValues[index] ?? baseRotation.z,
      'XYZ'
    ));
    values.push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  }

  return new THREE.QuaternionKeyframeTrack(
    `${group.targetName}.quaternion`,
    times,
    values,
    group.interpolation === THREE.InterpolateDiscrete
      ? THREE.InterpolateDiscrete
      : THREE.InterpolateLinear
  );
}

function sanitizeClipsForExport(exportGroup, clips = []) {
  return clips.map((clip) => {
    const passthroughTracks = [];
    const rotationGroups = new Map();

    for (const track of clip.tracks || []) {
      const match = /^(.*)\.rotation\[(x|y|z)\]$/.exec(track.name);
      if (!match) {
        passthroughTracks.push(track.clone());
        continue;
      }

      const [, targetName, axis] = match;
      const times = Array.from(track.times);
      const groupKey = `${targetName}::${times.join(',')}`;
      if (!rotationGroups.has(groupKey)) {
        rotationGroups.set(groupKey, {
          targetName,
          times,
          interpolation: typeof track.getInterpolation === 'function'
            ? track.getInterpolation()
            : THREE.InterpolateLinear,
          x: null,
          y: null,
          z: null,
        });
      }

      rotationGroups.get(groupKey)[axis] = Array.from(track.values);
    }

    const nextTracks = [...passthroughTracks];
    rotationGroups.forEach((group) => {
      nextTracks.push(buildQuaternionTrackForExport(exportGroup, group));
    });

    const nextClip = new THREE.AnimationClip(clip.name, clip.duration, nextTracks);
    if (clip.userData) {
      nextClip.userData = { ...clip.userData };
    }
    return nextClip;
  });
}

function getExportSource() {
  // In animation mode, always export the animation mode object
  if (state.animationMode && state.animationModeObject) {
    const group = new THREE.Group();
    group.add(cloneObjectForExport(state.animationModeObject));
    return group;
  }
  // Selective export: selected objects first, then all
  if (state.selectedMeshes.size > 0) {
    const group = new THREE.Group();
    state.selectedMeshes.forEach((obj) => group.add(cloneObjectForExport(obj)));
    return group;
  }
  if (state.selectedMesh) {
    const group = new THREE.Group();
    group.add(cloneObjectForExport(state.selectedMesh));
    return group;
  }
  return cloneObjectForExport(state.userObjects);
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
      sanitizeMeshGeometryForExport(child);
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

  return sanitizeClipsForExport(exportGroup, clips);
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

  exportGLBToBuffer()
    .then(({ buffer, filename }) => {
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      downloadBlob(blob, filename);
    })
    .catch((error) => {
      console.error('Export error:', error);
      alert(t('exportError') + error.message);
    });
}

export function exportGLBToBuffer(filename = 'lowpoly64-scene.glb') {
  const exportGroup = getExportSource();
  const clips = prepareForExport(exportGroup);
  return parseGLB(exportGroup, clips, filename);
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
