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
import { waitForFaceDecalTextures } from '../texture/texture-generator.js';
import { getNativeAnimationJSON } from './native-gltf.js';

const EXPORT_USER_DATA_OMIT = new Set([
  'geometryParams',
  'texture',
  'textureDefinition',
  'textureProcessing',
  'textureTransform',
  'faceUVs',
  'pngModelSource',
  'pngModelSettings',
  'pngModelAnalysis',
  'pngModelDepthMap',
  'pngModelVersion',
  'pngModelAlgorithmVersion',
  'pngModelMigrations',
  'animations',
  'animationClips',
  'gltfAnimations',
  'nativeGltf',
  'decalTextureReady',
]);

function sanitizeExportValue(value, key = '', depth = 0) {
  if (EXPORT_USER_DATA_OMIT.has(key) || /dataurl/i.test(key)) return undefined;
  if (typeof value === 'string') return value.startsWith('data:image/') ? undefined : value;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 8 || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return undefined;
  if (value?.isTexture || value?.isObject3D || value?.isMaterial || value?.isBufferGeometry) return undefined;
  if (value && typeof value.then === 'function') return undefined;
  if (ArrayBuffer.isView(value)) {
    return value.length <= 512 ? Array.from(value) : undefined;
  }
  if (Array.isArray(value)) {
    if (value.length > 512) return undefined;
    return value
      .map((entry) => sanitizeExportValue(entry, '', depth + 1))
      .filter((entry) => entry !== undefined);
  }
  if (value && typeof value === 'object') {
    const result = {};
    Object.entries(value).forEach(([entryKey, entryValue]) => {
      const sanitized = sanitizeExportValue(entryValue, entryKey, depth + 1);
      if (sanitized !== undefined) result[entryKey] = sanitized;
    });
    return result;
  }
  return undefined;
}

export function sanitizeExportUserData(userData = {}) {
  return sanitizeExportValue(userData, '', 0) || {};
}

function createWeldedPngShell(group, surface, sides) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];
  const vertexByPosition = new Map();
  const point = new THREE.Vector3();
  const quantize = (value) => Math.round(value * 1e6);

  const append = (mesh, materialIndex) => {
    const position = mesh.geometry?.getAttribute?.('position');
    if (!position) return;
    const uv = mesh.geometry.getAttribute('uv');
    const sourceIndex = mesh.geometry.getIndex();
    const order = sourceIndex
      ? Array.from(sourceIndex.array)
      : Array.from({ length: position.count }, (_, index) => index);
    mesh.updateMatrix();
    const start = indices.length;
    order.forEach((sourceVertex) => {
      point.fromBufferAttribute(position, sourceVertex).applyMatrix4(mesh.matrix);
      const key = `${quantize(point.x)},${quantize(point.y)},${quantize(point.z)}`;
      let targetVertex = vertexByPosition.get(key);
      if (targetVertex === undefined) {
        targetVertex = positions.length / 3;
        vertexByPosition.set(key, targetVertex);
        positions.push(point.x, point.y, point.z);
        uvs.push(uv ? uv.getX(sourceVertex) : 0, uv ? uv.getY(sourceVertex) : 0);
      }
      indices.push(targetVertex);
    });
    geometry.addGroup(start, indices.length - start, materialIndex);
  };

  append(surface, 0);
  append(sides, 1);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.type = 'PngModelShellGeometry';

  const shell = new THREE.Mesh(geometry, [surface.material, sides.material]);
  shell.name = `${group.name || group.userData?.name || 'PNG MODEL'} SHELL`;
  shell.userData = { name: shell.name, pngModelRole: 'shell', manifoldShell: true };
  return shell;
}

function weldPngShellsForExport(root) {
  const candidates = [];
  root?.traverse?.((node) => {
    if (!node?.isGroup) return;
    const surface = node.children.find((child) => child.isMesh && child.userData?.pngModelRole === 'surface');
    const sides = node.children.find((child) => child.isMesh && child.userData?.pngModelRole === 'sides');
    if (surface && sides) candidates.push({ group: node, surface, sides });
  });
  candidates.forEach(({ group, surface, sides }) => {
    const shell = createWeldedPngShell(group, surface, sides);
    group.remove(surface, sides);
    group.add(shell);
  });
}

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
  const clone = containsSkinnedMesh(object) ? SkeletonUtils.clone(object) : object.clone(true);
  const pairs = [];
  const clonedNodes = new Map();
  const pairNodes = (source, target) => {
    pairs.push([source, target]);
    clonedNodes.set(source, target);
    source.children.forEach((child, index) => pairNodes(child, target.children[index]));
  };
  pairNodes(object, clone);
  for (const [source, target] of pairs) {
    if (!source.userData?.nativeGltf) continue;
    target.userData.gltfAnimations = getNativeAnimationJSON(source);
    // Bind native tracks within their own character. Multiple characters can
    // share bone names such as Hips without exporting tracks onto the first one.
    for (const clip of target.userData.gltfAnimations) {
      for (const track of clip.tracks) {
        const binding = THREE.PropertyBinding.parseTrackName(track.name);
        if (binding.objectName) continue;
        const sourceNode = THREE.PropertyBinding.findNode(source, binding.nodeName);
        const cloneNode = clonedNodes.get(sourceNode);
        if (!cloneNode) continue;
        const index = binding.propertyIndex === undefined ? '' : '[' + binding.propertyIndex + ']';
        track.name = cloneNode.uuid + '.' + binding.propertyName + index;
      }
    }
  }
  return clone;
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

function getAttributeComponent(attribute, index, component) {
  // Read the backing array directly. BufferAttribute.getX/Y/Z/W applies the
  // normalized conversion, which would turn e.g. a Uint8 color 255 into 1
  // when copying it back into another Uint8 normalized attribute.
  const stride = attribute.isInterleavedBufferAttribute ? attribute.data.stride : attribute.itemSize;
  const offset = attribute.isInterleavedBufferAttribute ? attribute.offset : 0;
  const sourceArray = attribute.array || attribute.data?.array;
  if (sourceArray) return sourceArray[offset + index * stride + component] ?? 0;
  if (component === 0) return attribute.getX(index);
  if (component === 1) return attribute.getY(index);
  if (component === 2) return attribute.getZ(index);
  if (component === 3) return attribute.getW(index);
  return 0;
}

function expandAttributeForTriangles(attribute, sourceIndices) {
  const itemSize = attribute.itemSize;
  const ArrayType = attribute.array?.constructor || Float32Array;
  const array = new ArrayType(sourceIndices.length * itemSize);
  for (let targetIndex = 0; targetIndex < sourceIndices.length; targetIndex += 1) {
    const sourceIndex = sourceIndices[targetIndex];
    for (let component = 0; component < itemSize; component += 1) {
      array[targetIndex * itemSize + component] = getAttributeComponent(attribute, sourceIndex, component);
    }
  }
  const expanded = new THREE.BufferAttribute(array, itemSize, attribute.normalized);
  expanded.name = attribute.name || '';
  if (attribute.usage !== undefined && typeof expanded.setUsage === 'function') expanded.setUsage(attribute.usage);
  if (attribute.gpuType !== undefined) expanded.gpuType = attribute.gpuType;
  return expanded;
}

function faceNormalForTriangle(position, sourceIndices, offset) {
  const a = new THREE.Vector3().fromBufferAttribute(position, sourceIndices[offset]);
  const b = new THREE.Vector3().fromBufferAttribute(position, sourceIndices[offset + 1]);
  const c = new THREE.Vector3().fromBufferAttribute(position, sourceIndices[offset + 2]);
  const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  if (normal.lengthSq() < 1e-12) return new THREE.Vector3(0, 0, 1);
  return normal.normalize();
}

function materialAtIndex(material, materialIndex) {
  if (Array.isArray(material)) return material[materialIndex] || material[0] || null;
  return materialIndex === 0 ? material : null;
}

function materialIndexForOffset(groups, offset) {
  const group = groups.find((entry) => offset >= entry.start && offset < entry.start + entry.count);
  return group?.materialIndex ?? 0;
}

function bakeFlatShadedGeometry(mesh) {
  const sourceGeometry = mesh?.geometry;
  const position = sourceGeometry?.getAttribute?.('position');
  if (!sourceGeometry || !position) return null;

  const sourceIndex = sourceGeometry.getIndex();
  const sourceIndices = sourceIndex
    ? Array.from(sourceIndex.array)
    : Array.from({ length: position.count }, (_, index) => index);
  const triangleCount = Math.floor(sourceIndices.length / 3);
  const groups = sourceGeometry.groups || [];
  const flatTriangles = new Array(triangleCount).fill(false);
  let hasFlatTriangle = false;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const materialIndex = materialIndexForOffset(groups, offset);
    const flat = Boolean(materialAtIndex(mesh.material, materialIndex)?.flatShading);
    flatTriangles[triangle] = flat;
    hasFlatTriangle ||= flat;
  }
  if (!hasFlatTriangle) return null;

  const expanded = new THREE.BufferGeometry();
  Object.entries(sourceGeometry.attributes || {}).forEach(([name, attribute]) => {
    expanded.setAttribute(name, expandAttributeForTriangles(attribute, sourceIndices));
  });

  const sourceNormal = sourceGeometry.getAttribute('normal');
  const normalArray = new Float32Array(sourceIndices.length * 3);
  const normal = new THREE.Vector3();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = triangle * 3;
    const triangleNormal = flatTriangles[triangle] ? faceNormalForTriangle(position, sourceIndices, offset) : null;
    for (let corner = 0; corner < 3; corner += 1) {
      const targetIndex = offset + corner;
      const sourceIndexValue = sourceIndices[targetIndex];
      if (triangleNormal) {
        normal.copy(triangleNormal);
      } else if (sourceNormal) {
        normal.set(
          getAttributeComponent(sourceNormal, sourceIndexValue, 0),
          getAttributeComponent(sourceNormal, sourceIndexValue, 1),
          getAttributeComponent(sourceNormal, sourceIndexValue, 2),
        );
      } else {
        normal.set(0, 0, 1);
      }
      normalArray[targetIndex * 3] = normal.x;
      normalArray[targetIndex * 3 + 1] = normal.y;
      normalArray[targetIndex * 3 + 2] = normal.z;
    }
  }
  expanded.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));

  Object.entries(sourceGeometry.morphAttributes || {}).forEach(([name, attributes]) => {
    expanded.morphAttributes[name] = attributes.map((attribute) => expandAttributeForTriangles(attribute, sourceIndices));
  });
  expanded.morphTargetsRelative = sourceGeometry.morphTargetsRelative;
  expanded.clearGroups();
  groups.forEach((group) => expanded.addGroup(group.start, group.count, group.materialIndex));
  expanded.drawRange.start = sourceGeometry.drawRange.start;
  expanded.drawRange.count = sourceGeometry.drawRange.count;
  expanded.name = sourceGeometry.name;
  expanded.type = sourceGeometry.type;
  expanded.parameters = sourceGeometry.parameters;
  expanded.userData = { ...sourceGeometry.userData };
  expanded.computeBoundingBox();
  expanded.computeBoundingSphere();
  return expanded;
}

function sanitizeMeshGeometryForExport(mesh) {
  const baked = bakeFlatShadedGeometry(mesh);
  if (baked) {
    mesh.geometry = baked;
    return true;
  }
  const normalAttr = mesh?.geometry?.getAttribute?.('normal');
  if (!normalAttr || hasNormalizedNormalLengths(normalAttr)) return false;
  const nextGeometry = mesh.geometry.clone();
  nextGeometry.setAttribute('normal', createNormalizedNormalAttribute(normalAttr));
  mesh.geometry = nextGeometry;
  return false;
}

function prepareMaterialForExport(old) {
  if (!old) return old;
  const alphaTest = Number(old.alphaTest) > 0 ? Number(old.alphaTest) : 0;
  const material = old.isMeshBasicMaterial || old.isMeshStandardMaterial || old.isMeshPhysicalMaterial
    ? old.clone()
    : new THREE.MeshStandardMaterial({
        color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
        flatShading: old.flatShading || false,
        wireframe: false,
        roughness: 0.8,
        metalness: 0.1,
        vertexColors: old.vertexColors || false,
        transparent: alphaTest > 0 ? false : (old.transparent || false),
        opacity: old.opacity !== undefined ? old.opacity : 1,
        alphaTest,
        side: old.side,
        depthWrite: old.depthWrite,
        depthTest: old.depthTest,
      });
  material.wireframe = false;
  material.alphaTest = alphaTest;
  if (alphaTest > 0) {
    material.transparent = false;
    material.depthWrite = true;
  } else if (old.transparent) {
    material.transparent = true;
    material.depthWrite = old.opacity < 1 ? false : old.depthWrite;
    material.side = old.opacity < 1 ? THREE.DoubleSide : old.side;
  }
  if (old.map) material.map = cloneTexture(old.map);
  if (material.emissive) {
    material.emissive.set(0x000000);
    material.emissiveIntensity = 0;
  }
  material.needsUpdate = true;
  return material;
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
  weldPngShellsForExport(exportGroup);

  exportGroup.traverse((child) => {
    // Set node.name from userData for animation track targeting in glTF
    // Skip child meshes inside PivotGroups to avoid name conflicts with the PivotGroup itself
    if (child.userData && child.userData.name && !(child.isMesh && child.parent && child.parent.userData.isPivot)) {
      child.name = child.userData.name;
    }

    if (child.isMesh && child.material) {
      sanitizeMeshGeometryForExport(child);
      child.material = Array.isArray(child.material)
        ? child.material.map(prepareMaterialForExport)
        : prepareMaterialForExport(child.material);
    }

    if (Array.isArray(child.userData?.gltfAnimations)) {
      clips.push(...child.userData.gltfAnimations.map((clip) => THREE.AnimationClip.parse(clip)));
    }
    // Recompile animation clips from raw definitions (clone destroys AnimationClip instances)
    if (!child.userData?.nativeGltf && child.userData && Array.isArray(child.userData.animations) && child.userData.animations.length > 0) {
      for (const animDef of child.userData.animations) {
        const clip = compileAnimation(animDef, child);
        if (clip) clips.push(clip);
      }
    }

    // Include animations from animation profile if present and no inline animations
    if (!child.userData?.nativeGltf && child.userData && child.userData.animationProfile && (!child.userData.animations || child.userData.animations.length === 0)) {
      const resolved = resolveAnimationProfile(child.userData.animationProfile);
      if (resolved) {
        for (const animDef of resolved.animations) {
          const clip = compileAnimation(animDef, child);
          if (clip) clips.push(clip);
        }
      }
    }

    // GLTFExporter serializes userData as node extras. Keep integration-facing
    // identifiers, but remove editable recipes, data URLs and duplicate custom
    // geometry arrays from the export clone.
    child.userData = sanitizeExportUserData(child.userData);
  });

  return sanitizeClipsForExport(exportGroup, clips);
}

export function prepareObjectForGlbExport(object) {
  const exportObject = cloneObjectForExport(object);
  const clips = prepareForExport(exportObject);
  return { object: exportObject, clips };
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

export async function exportGLBToBuffer(filename = 'lowpoly64-scene.glb') {
  await waitForFaceDecalTextures(state.userObjects);
  if (state.animationModeObject) {
    await waitForFaceDecalTextures(state.animationModeObject);
  }
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
      await waitForFaceDecalTextures(group);
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
