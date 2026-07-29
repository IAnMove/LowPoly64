import * as THREE from 'three';
import { state } from '../shared/state.js';
import { createMaterial } from '../shared/materials.js';
import { deselect } from './selection.js';
import { showToast } from './ui.js';
import { compileAnimation } from '../animation/animation.js';
import { configureTexture, applyTextureTransform, getTextureTransform, rememberTextureTransform } from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import {
  cloneGeometryParams,
  createCustomGeometry,
  createLatheGeometry,
  createLimbLoftGeometry,
  createWedgeGeometry,
  createPyramidGeometry,
  createTaperedBoxGeometry,
  normalizeGeometryType,
  serializeGeometryDefinition,
} from './custom-geometries.js';
import { applyVertexColors, serializeVertexColors } from './vertex-colors.js';
import { applyFaceColors, serializeFaceColors } from './retro-effects.js';
import { applyFaceDecalTexture, cloneFaceDecalSpec } from '../texture/texture-generator.js';
import { piecesToCharacterModel } from './character-model.js';
import { cloneSvgImportSettings, cloneSvgSourceMetadata, isSvgDerivedGroup } from '../svg/svg-metadata.js';
import {
  PNG_MODEL_ALGORITHM_VERSION,
  PNG_MODEL_VERSION,
  clonePngModelRecipe,
  isPngModelGroup,
  normalizePngModelRecipe,
  validatePngModelSource,
} from '../png-model/png-model-metadata.js';
import { createPngModelGroup } from '../png-model/png-model.js';
import { buildAvatarGroup } from '../avatar/avatar-builder.js';
import {
  createSkinnedCaptureCharacter,
  isSerializedSkinnedCapture,
  isSkinnedCaptureGroup,
  serializeSkinnedCaptureGroup,
} from '../animation/capture-skinned-character.js';
import {
  isValidAgentId,
  normalizeAgentIds,
  setRestoredAgentId,
} from '../agent/agent-object-ids.js';

const STORAGE_KEY = 'lowpoly64-scene';
const MAX_SCENE_OBJECTS = 400;
const PNG_MODEL_GENERATED_ROLES = new Set(['surface', 'sides']);
const PNG_MODEL_GENERATED_OWNED_USER_DATA_KEYS = new Set([
  'name',
  'pngModelRole',
  'geometryType',
  'geometryParams',
  'texture',
  'textureEnabled',
  'colorBeforeTexture',
  'textureTransform',
]);
const PNG_MODEL_METADATA_MAX_DEPTH = 6;
const PNG_MODEL_METADATA_MAX_ENTRIES = 256;
const PNG_MODEL_METADATA_MAX_KEYS = 64;
const PNG_MODEL_METADATA_MAX_STRING_LENGTH = 16384;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVector3(value, maxAbs = 10000) {
  return Array.isArray(value)
    && value.length === 3
    && value.every((entry) => isFiniteNumber(entry) && Math.abs(entry) <= maxAbs);
}

function isSerializedMaterialColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function cloneStructuredValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneStructuredValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneStructuredValue(entry);
    });
    return clone;
  }
  return value;
}

function isSupportedPngRecipeVersion(value, maximum) {
  return value === undefined
    || (Number.isInteger(value) && value >= 1 && value <= maximum);
}

function validatePngRecipeVersions(data) {
  return isSupportedPngRecipeVersion(data.pngModelVersion, PNG_MODEL_VERSION)
    && isSupportedPngRecipeVersion(data.pngModelSource?.version, PNG_MODEL_VERSION)
    && isSupportedPngRecipeVersion(
      data.pngModelAlgorithmVersion,
      PNG_MODEL_ALGORITHM_VERSION,
    )
    && isSupportedPngRecipeVersion(
      data.pngModelSettings?.algorithmVersion,
      PNG_MODEL_ALGORITHM_VERSION,
    );
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePngExternalMetadataValue(value, depth = 0, seen = new WeakSet()) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length <= PNG_MODEL_METADATA_MAX_STRING_LENGTH ? value : undefined;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (depth >= PNG_MODEL_METADATA_MAX_DEPTH || !value || typeof value !== 'object') {
    return undefined;
  }
  if (seen.has(value)) return undefined;
  seen.add(value);
  let cloned;
  if (Array.isArray(value)) {
    if (value.length > PNG_MODEL_METADATA_MAX_ENTRIES) {
      seen.delete(value);
      return undefined;
    }
    cloned = value
      .map((entry) => clonePngExternalMetadataValue(entry, depth + 1, seen))
      .filter((entry) => entry !== undefined);
  } else if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length > PNG_MODEL_METADATA_MAX_KEYS) {
      seen.delete(value);
      return undefined;
    }
    cloned = {};
    entries.forEach(([key, entry]) => {
      const next = clonePngExternalMetadataValue(entry, depth + 1, seen);
      if (next !== undefined) cloned[key] = next;
    });
  }
  seen.delete(value);
  return cloned;
}

function clonePngGeneratedExternalUserData(userData = {}) {
  const cloned = {};
  Object.entries(userData).forEach(([key, value]) => {
    if (
      PNG_MODEL_GENERATED_OWNED_USER_DATA_KEYS.has(key)
      || Object.keys(cloned).length >= PNG_MODEL_METADATA_MAX_KEYS
    ) return;
    const next = clonePngExternalMetadataValue(value);
    if (next !== undefined) cloned[key] = next;
  });
  return cloned;
}

function validatePngExternalMetadataValue(value, depth = 0, forbidOwnedKeys = false) {
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= PNG_MODEL_METADATA_MAX_STRING_LENGTH;
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth >= PNG_MODEL_METADATA_MAX_DEPTH || !value || typeof value !== 'object') {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length <= PNG_MODEL_METADATA_MAX_ENTRIES
      && value.every((entry) => validatePngExternalMetadataValue(entry, depth + 1, false));
  }
  if (!isPlainObject(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= PNG_MODEL_METADATA_MAX_KEYS
    && entries.every(([key, entry]) => (
      (!forbidOwnedKeys || !PNG_MODEL_GENERATED_OWNED_USER_DATA_KEYS.has(key))
      && validatePngExternalMetadataValue(entry, depth + 1, false)
    ));
}

export function validatePngGeneratedChildMetadata(metadata) {
  if (metadata === undefined) return true;
  if (!isPlainObject(metadata)) return false;
  const entries = Object.entries(metadata);
  return entries.length <= PNG_MODEL_GENERATED_ROLES.size
    && entries.every(([role, userData]) => (
      PNG_MODEL_GENERATED_ROLES.has(role)
      && isPlainObject(userData)
      && (userData.agentId === undefined || isValidAgentId(userData.agentId))
      && validatePngExternalMetadataValue(userData, 0, true)
    ));
}

function validateSerializedObject(data, depth = 0) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || depth > 16) return false;
  if (data.agentId !== undefined && !isValidAgentId(data.agentId)) return false;

  if (data.type === 'pivot') {
    const mesh = data.mesh;
    const childrenValid = Array.isArray(data.children) && data.children.every((child) => validateSerializedObject(child, depth + 1));
    const meshValid = !mesh || (
      typeof mesh.geometryType === 'string'
      && typeof mesh.materialType === 'string'
      && isVector3(mesh.position)
      && (mesh.agentId === undefined || isValidAgentId(mesh.agentId))
      && (!mesh.color || isSerializedMaterialColor(mesh.color))
      && (!mesh.texture || typeof mesh.texture === 'object')
    );
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && childrenValid
      && meshValid;
  }

  if (data.type === 'group') {
    const pngRecipeValid = !data.pngModelSource || (
      validatePngRecipeVersions(data)
      && validatePngModelSource(data.pngModelSource).ok
      && (!data.pngModelSettings || (typeof data.pngModelSettings === 'object' && !Array.isArray(data.pngModelSettings)))
      && (!data.pngModelDepthMap || (
        typeof data.pngModelDepthMap === 'object'
        && !Array.isArray(data.pngModelDepthMap)
        && Array.isArray(data.pngModelDepthMap.values)
        && data.pngModelDepthMap.values.length <= 96 * 96
      ))
      && validatePngGeneratedChildMetadata(data.pngModelGeneratedChildMetadata)
    );
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && Array.isArray(data.children)
      && data.children.every((child) => validateSerializedObject(child, depth + 1))
      && (!data.animations || Array.isArray(data.animations))
      && pngRecipeValid;
  }

  if (data.type === 'avatar-group') {
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && data.avatarRecipe
      && typeof data.avatarRecipe === 'object'
      && !Array.isArray(data.avatarRecipe);
  }

  if (data.type === 'skinned-capture') {
    return typeof data.name === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && isSerializedSkinnedCapture(data)
      && (!data.animations || Array.isArray(data.animations));
  }

  if (data.type === 'mesh') {
    return typeof data.name === 'string'
      && typeof data.geometryType === 'string'
      && typeof data.materialType === 'string'
      && isVector3(data.position)
      && isVector3(data.rotation, Math.PI * 100)
      && isVector3(data.scale, 1000)
      && (!data.color || isSerializedMaterialColor(data.color))
      && (!data.texture || typeof data.texture === 'object');
  }

  return false;
}

function validateSerializedScene(data) {
  return !!data
    && typeof data === 'object'
    && !Array.isArray(data)
    && Array.isArray(data.objects)
    && data.objects.length <= MAX_SCENE_OBJECTS
    && data.objects.every((objectData) => validateSerializedObject(objectData));
}

function clearUserObjects() {
  while (state.userObjects.children.length > 0) {
    const child = state.userObjects.children[0];
    state.userObjects.remove(child);
    child.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }
}

function getGeometryType(mesh) {
  const g = mesh.geometry;
  if (!g) return null;
  if (g.type === 'BoxGeometry') return 'cube';
  if (g.type === 'SphereGeometry') return 'sphere';
  if (g.type === 'CylinderGeometry') return 'cylinder';
  if (g.type === 'ConeGeometry') return 'cone';
  if (g.type === 'PlaneGeometry') return 'plane';
  if (g.type === 'CapsuleGeometry') return 'capsule';
  if (g.type === 'TorusGeometry') return 'torus';
  if (g.type === 'WedgeGeometry') return 'wedge';
  if (g.type === 'PyramidGeometry') return 'pyramid';
  if (g.type === 'TaperedBoxGeometry') return 'taperedBox';
  if (g.type === 'LimbLoftGeometry') return 'limbLoft';
  if (g.type === 'LatheGeometry') return 'lathe';
  if (g.type === 'CustomGeometry') return 'custom';
  return 'unknown';
}

function getGeometryParams(mesh) {
  if (mesh?.userData?.geometryParams) {
    return cloneGeometryParams(mesh.userData.geometryParams);
  }
  const g = mesh.geometry;
  if (!g || !g.parameters) return {};
  return cloneGeometryParams(g.parameters);
}

function getMaterialType(mesh) {
  const m = mesh.material;
  if (!m) return 'Lambert';
  if (m.isMeshBasicMaterial) return 'Basic';
  if (m.isMeshLambertMaterial) return 'Lambert';
  if (m.isMeshPhongMaterial) return 'Phong';
  if (m.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

function extractTextureDataURL(mesh) {
  const tex = mesh.userData.texture || mesh.material.map;
  if (!tex || !tex.image) return null;
  try {
    const img = tex.image;
    // If the image is already a canvas, use toDataURL directly
    if (img instanceof HTMLCanvasElement) {
      return img.toDataURL('image/png');
    }
    const canvas = document.createElement('canvas');
    canvas.width = img.width || img.naturalWidth || 256;
    canvas.height = img.height || img.naturalHeight || 256;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch (_) {
    return null;
  }
}

function serializeTextureData(mesh) {
  if (!mesh.userData.textureEnabled) return null;
  const dataURL = extractTextureDataURL(mesh);
  if (!dataURL) return null;
  const data = {
    dataURL,
    colorBeforeTexture: mesh.userData.colorBeforeTexture !== undefined
      ? '#' + new THREE.Color(mesh.userData.colorBeforeTexture).getHexString()
      : null,
    transform: mesh.userData.textureTransform || getTextureTransform(mesh.userData.texture || mesh.material.map),
  };
  if (mesh.userData.faceUVs) {
    data.faceUVs = mesh.userData.faceUVs.map((d) => ({ ...d }));
  }
  if (mesh.userData.textureProcessing) {
    data.processing = cloneStructuredValue(mesh.userData.textureProcessing);
  }
  if (mesh.userData.decalSpec) {
    data.decal = cloneFaceDecalSpec(mesh.userData.decalSpec);
  }
  return data;
}

async function restoreTexture(mesh, texData) {
  if (!texData) return false;
  if (texData.decal) {
    applyFaceDecalTexture(mesh, texData.decal);
    await Promise.resolve(mesh.userData?.decalTextureReady).catch(() => null);
    return true;
  }
  if (!texData.dataURL) return false;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      configureTexture(texture);
      if (texData.transform) {
        applyTextureTransform(texture, texData.transform);
      }
      mesh.userData.texture = texture;
      mesh.userData.textureEnabled = true;
      if (texData.processing) {
        mesh.userData.textureProcessing = cloneStructuredValue(texData.processing);
      }
      rememberTextureTransform(mesh, texture);
      if (texData.colorBeforeTexture) {
        mesh.userData.colorBeforeTexture = new THREE.Color(texData.colorBeforeTexture).getHex();
      }
      mesh.material.map = texture;
      mesh.material.color.set(0xffffff);
      mesh.material.needsUpdate = true;
      if (texData.faceUVs && mesh.userData.geometryType === 'cube') {
        mesh.userData.faceUVs = texData.faceUVs.map((d) => ({ ...d }));
        const uvAttr = mesh.geometry.attributes.uv;
        if (uvAttr) {
          for (let face = 0; face < 6; face++) {
            const d = texData.faceUVs[face];
            if (!d) continue;
            const base = face * 4;
            const rad = THREE.MathUtils.degToRad(d.rot || 0);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
            corners.forEach((c, i) => {
              const cx = c[0] - 0.5;
              const cy = c[1] - 0.5;
              const rx = cx * cos - cy * sin + 0.5;
              const ry = cx * sin + cy * cos + 0.5;
              uvAttr.setXY(base + i, d.ou + rx * d.su, d.ov + ry * d.sv);
            });
          }
          uvAttr.needsUpdate = true;
        }
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = texData.dataURL;
  });
}

function serializeObject(obj) {
  if (obj.isGroup && isSkinnedCaptureGroup(obj)) {
    const data = serializeSkinnedCaptureGroup(obj);
    if (obj.userData?.agentId) data.agentId = obj.userData.agentId;
    return data;
  }

  if (obj.isGroup && obj.userData?.avatarRecipe) {
    return {
      type: 'avatar-group',
      agentId: obj.userData?.agentId,
      name: obj.userData.name || obj.name || 'Avatar',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      avatarRecipe: cloneStructuredValue(obj.userData.avatarRecipe),
    };
  }

  if (obj.isGroup && isPngModelGroup(obj)) {
    const recipe = clonePngModelRecipe(obj);
    const generatedChildMetadata = serializePngGeneratedChildMetadata(obj);
    const data = {
      type: 'group',
      agentId: obj.userData?.agentId,
      name: obj.userData.name || obj.name || recipe.settings.name || 'PNG FLAT MODEL',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      children: serializePngModelExternalChildren(obj),
      pngModelRecipeOnly: true,
      pngModelVersion: PNG_MODEL_VERSION,
      pngModelAlgorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
      pngModelSource: recipe.source,
      pngModelSettings: recipe.settings,
      pngModelDepthMap: recipe.depthMap,
    };
    if (generatedChildMetadata) {
      data.pngModelGeneratedChildMetadata = generatedChildMetadata;
    }
    if (obj.userData.animations && obj.userData.animations.length > 0) {
      data.animations = cloneStructuredValue(obj.userData.animations);
    }
    return data;
  }

  if (obj.isGroup && obj.userData.isPivot) {
    // PivotGroup: serialize pivot position, child mesh, and nested PivotGroup children
    const childMesh = obj.children.find((c) => c.isMesh);
    const data = {
      type: 'pivot',
      agentId: obj.userData?.agentId,
      name: obj.userData.name || 'Pivot',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      children: obj.children.filter((c) => c.isGroup).map(serializeObject),
    };
    if (childMesh) {
      data.mesh = {
        agentId: childMesh.userData?.agentId,
        geometryType: childMesh.userData.geometryType || getGeometryType(childMesh),
        geometryParams: getGeometryParams(childMesh),
        materialType: getMaterialType(childMesh),
        color: childMesh.userData.textureEnabled && childMesh.userData.colorBeforeTexture !== undefined
          ? '#' + new THREE.Color(childMesh.userData.colorBeforeTexture).getHexString()
          : (childMesh.material && childMesh.material.color ? '#' + childMesh.material.color.getHexString() : '#ffcc00'),
        position: childMesh.position.toArray(),
      };
      if (childMesh.material && childMesh.material.opacity < 1) {
        data.mesh.opacity = Math.round(childMesh.material.opacity * 1000) / 1000;
      }
      const texData = serializeTextureData(childMesh);
      if (texData) data.mesh.texture = texData;
      if (childMesh.userData.decalSpec) data.mesh.decal = cloneFaceDecalSpec(childMesh.userData.decalSpec);
      const vcData = serializeVertexColors(childMesh);
      if (vcData) data.mesh.vertexColors = vcData;
      const fcData = serializeFaceColors(childMesh);
      if (fcData) data.mesh.faceColors = fcData;
    }
    return data;
  }
  if (obj.isGroup) {
    const data = {
      type: 'group',
      agentId: obj.userData?.agentId,
      name: obj.userData.name || 'Group',
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
      children: obj.children.map(serializeObject),
    };
    if (obj.userData.animations && obj.userData.animations.length > 0) {
      data.animations = obj.userData.animations;
    }
    if (obj.userData.svgSource?.markup) {
      data.svgSource = cloneSvgSourceMetadata(obj.userData.svgSource);
      data.svgImportSettings = cloneSvgImportSettings(obj.userData.svgImportSettings || {});
      if (obj.userData.svgImportAnalysis) {
        data.svgImportAnalysis = cloneStructuredValue(obj.userData.svgImportAnalysis);
      }
    }
    if (obj.userData.slotSvgSources) {
      data.slotSvgSources = cloneStructuredValue(obj.userData.slotSvgSources);
    }
    // CharacterModel metadata
    if (obj.userData.archetype) {
      data.archetype = obj.userData.archetype;
      if (obj.userData.slotMap) data.slotMap = obj.userData.slotMap;
      if (obj.userData.slotColors) data.slotColors = cloneStructuredValue(obj.userData.slotColors);
      if (obj.userData.animationProfile) data.animationProfile = obj.userData.animationProfile;
      if (obj.userData.skeletonId) data.skeletonId = obj.userData.skeletonId;
      if (obj.userData.slotBindings) data.slotBindings = obj.userData.slotBindings;
      if (obj.userData.avatarRecipe) data.avatarRecipe = cloneStructuredValue(obj.userData.avatarRecipe);
    }
    return data;
  }
  if (obj.isMesh) {
    const meshData = {
      type: 'mesh',
      agentId: obj.userData?.agentId,
      name: obj.userData.name || 'Mesh',
      geometryType: obj.userData.geometryType || getGeometryType(obj),
      geometryParams: getGeometryParams(obj),
      materialType: getMaterialType(obj),
      color: obj.userData.textureEnabled && obj.userData.colorBeforeTexture !== undefined
        ? '#' + new THREE.Color(obj.userData.colorBeforeTexture).getHexString()
        : (obj.material && obj.material.color ? '#' + obj.material.color.getHexString() : '#ffcc00'),
      position: obj.position.toArray(),
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: obj.scale.toArray(),
    };
    if (obj.userData.pngModelRole) meshData.pngModelRole = obj.userData.pngModelRole;
    if (obj.material && obj.material.opacity < 1) {
      meshData.opacity = Math.round(obj.material.opacity * 1000) / 1000;
    }
    const texData = obj.userData.pngModelRole === 'surface' ? null : serializeTextureData(obj);
    if (texData) meshData.texture = texData;
    if (obj.userData.decalSpec) meshData.decal = cloneFaceDecalSpec(obj.userData.decalSpec);
    const vcData = serializeVertexColors(obj);
    if (vcData) meshData.vertexColors = vcData;
    const fcData = serializeFaceColors(obj);
    if (fcData) meshData.faceColors = fcData;
    return meshData;
  }
  return null;
}

function serializePngGeneratedChildMetadata(group) {
  const metadata = {};
  group.children.forEach((child) => {
    const role = child.userData?.pngModelRole;
    if (!PNG_MODEL_GENERATED_ROLES.has(role) || metadata[role]) return;
    const external = clonePngGeneratedExternalUserData(child.userData);
    if (Object.keys(external).length > 0) metadata[role] = external;
  });
  return Object.keys(metadata).length > 0 ? metadata : null;
}

export function applyPngGeneratedChildMetadata(group, metadata) {
  if (!validatePngGeneratedChildMetadata(metadata)) return;
  Object.entries(metadata || {}).forEach(([role, userData]) => {
    const child = group.children.find((candidate) => candidate.userData?.pngModelRole === role);
    if (!child) return;
    Object.assign(child.userData, clonePngGeneratedExternalUserData(userData));
  });
}

export function serializePngModelExternalChildren(group) {
  if (!group?.isGroup) return [];
  return group.children
    .filter((child) => !PNG_MODEL_GENERATED_ROLES.has(child.userData?.pngModelRole))
    .map(serializeObject)
    .filter(Boolean);
}

export function validatePngModelExternalChildren(children) {
  return children === undefined || (
    Array.isArray(children)
    && children.length <= MAX_SCENE_OBJECTS
    && children.every((child) => validateSerializedObject(child, 1))
  );
}

export async function restorePngModelExternalChildren(group, children = []) {
  if (!group?.isGroup || !validatePngModelExternalChildren(children)) {
    throw new Error('Invalid PNG model external children.');
  }
  for (const childData of children) {
    const child = await deserializeObject(childData);
    if (child) group.add(child);
  }
  return group;
}

function rebuildGeometry(geoType, params) {
  switch (normalizeGeometryType(geoType)) {
    case 'cube': return new THREE.BoxGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2);
    case 'sphere': return new THREE.SphereGeometry(params.radius ?? 1.5, params.widthSegments ?? 8, params.heightSegments ?? 6);
    case 'cylinder': return new THREE.CylinderGeometry(params.radiusTop ?? 1, params.radiusBottom ?? 1, params.height ?? 2.5, params.radialSegments ?? 8);
    case 'cone': return new THREE.ConeGeometry(params.radius ?? 1.5, params.height ?? 3, params.radialSegments ?? 8);
    case 'plane': return new THREE.PlaneGeometry(params.width ?? 3, params.height ?? 3);
    case 'capsule': return new THREE.CapsuleGeometry(params.radius ?? 0.8, params.length ?? 2, params.capSegments ?? 4, params.radialSegments ?? 8);
    case 'torus': return new THREE.TorusGeometry(params.radius ?? 1, params.tube ?? 0.08, params.radialSegments ?? 4, params.tubularSegments ?? 8);
    case 'wedge': return createWedgeGeometry(params.width ?? 2, params.height ?? 2, params.depth ?? 2);
    case 'pyramid': return createPyramidGeometry(params.width ?? 2, params.height ?? 2);
    case 'taperedBox': return createTaperedBoxGeometry(params);
    case 'limbLoft': return createLimbLoftGeometry(params);
    case 'lathe': return createLatheGeometry(params);
    case 'custom': return createCustomGeometry(params.vertices || [], params.faces || [], params.uvs || []);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

async function deserializeObject(data) {
  if (data.type === 'skinned-capture') {
    const group = createSkinnedCaptureCharacter(data.sourceSkeleton, {
      name: data.name,
      templateId: data.templateId || null,
    });
    group.position.fromArray(data.position);
    group.rotation.set(...data.rotation);
    group.scale.fromArray(data.scale);
    setRestoredAgentId(group, data.agentId);

    if (data.animations && data.animations.length > 0) {
      group.userData.animations = data.animations;
      group.userData.animationClips = data.animations
        .map((animDef) => compileAnimation(animDef, group))
        .filter(Boolean);
    }
    return group;
  }

  if (data.type === 'avatar-group') {
    const group = await buildAvatarGroup(cloneStructuredValue(data.avatarRecipe || {}));
    group.userData.name = data.name;
    group.name = data.name;
    group.position.fromArray(data.position);
    group.rotation.set(...data.rotation);
    group.scale.fromArray(data.scale);
    setRestoredAgentId(group, data.agentId);
    return group;
  }

  if (data.type === 'pivot') {
    const pivotGroup = new THREE.Group();
    pivotGroup.userData.name = data.name;
    pivotGroup.userData.isPivot = true;
    pivotGroup.name = data.name;
    pivotGroup.position.fromArray(data.position);
    pivotGroup.rotation.set(...data.rotation);
    pivotGroup.scale.fromArray(data.scale);
    setRestoredAgentId(pivotGroup, data.agentId);
    // Restore child mesh
    if (data.mesh) {
      const geometry = rebuildGeometry(data.mesh.geometryType, data.mesh.geometryParams || {});
      const hasFC = data.mesh.faceColors && applyFaceColors(geometry, data.mesh.faceColors);
      const hasVC = (data.mesh.vertexColors && applyVertexColors(geometry, data.mesh.vertexColors)) || hasFC;
      const material = createMaterial(data.mesh.materialType, {
        color: data.mesh.color,
        vertexColors: hasVC,
        opacity: data.mesh.opacity !== undefined ? data.mesh.opacity : 1,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.geometryType = normalizeGeometryType(data.mesh.geometryType) || data.mesh.geometryType;
      mesh.userData.geometryParams = cloneGeometryParams(data.mesh.geometryParams || geometry.parameters || {});
      setRestoredAgentId(mesh, data.mesh.agentId);
      if (hasVC) mesh.userData.vertexColors = data.mesh.vertexColors;
      if (hasFC) mesh.userData.faceColorArray = data.mesh.faceColors;
      mesh.position.fromArray(data.mesh.position);
      pivotGroup.add(mesh);
      if (data.mesh.decal) {
        await restoreTexture(mesh, { decal: data.mesh.decal });
      } else if (data.mesh.texture) {
        await restoreTexture(mesh, data.mesh.texture);
      }
    }
    // Recurse for nested PivotGroup children
    if (data.children) {
      for (const childData of data.children) {
        const child = await deserializeObject(childData);
        if (child) pivotGroup.add(child);
      }
    }
    return pivotGroup;
  }
  if (data.type === 'group') {
    if (data.pngModelSource?.dataURL) {
      const recipe = normalizePngModelRecipe({
        version: data.pngModelVersion,
        algorithmVersion: data.pngModelAlgorithmVersion,
        source: data.pngModelSource,
        settings: data.pngModelSettings,
        analysis: data.pngModelAnalysis,
        depthMap: data.pngModelDepthMap,
      });
      const group = await createPngModelGroup(
        recipe.source,
        { ...recipe.settings, name: data.name },
        recipe.depthMap,
      );
      group.userData.name = data.name;
      group.name = data.name;
      group.position.fromArray(data.position);
      group.rotation.set(...data.rotation);
      group.scale.fromArray(data.scale);
      setRestoredAgentId(group, data.agentId);
      if (recipe.migrations.length) {
        group.userData.pngModelMigrations = recipe.migrations;
      }
      applyPngGeneratedChildMetadata(group, data.pngModelGeneratedChildMetadata);
      await restorePngModelExternalChildren(group, data.children);
      if (data.animations && data.animations.length > 0) {
        group.userData.animations = cloneStructuredValue(data.animations);
        group.userData.animationClips = data.animations
          .map((animDef) => compileAnimation(animDef, group))
          .filter(Boolean);
      }
      return group;
    }

    const group = new THREE.Group();
    group.userData.name = data.name;
    group.name = data.name;
    group.position.fromArray(data.position);
    group.rotation.set(...data.rotation);
    group.scale.fromArray(data.scale);
    setRestoredAgentId(group, data.agentId);
    for (const childData of data.children) {
      const child = await deserializeObject(childData);
      if (child) group.add(child);
    }
    // Restore animations
    if (data.animations && data.animations.length > 0) {
      group.userData.animations = data.animations;
      group.userData.animationClips = data.animations
        .map((animDef) => compileAnimation(animDef, group))
        .filter(Boolean);
    }
    if (data.svgSource?.markup) {
      group.userData.svgSource = cloneSvgSourceMetadata(data.svgSource);
      group.userData.svgImportSettings = cloneSvgImportSettings(data.svgImportSettings || {});
      if (data.svgImportAnalysis) {
        group.userData.svgImportAnalysis = cloneStructuredValue(data.svgImportAnalysis);
      }
    }
    if (data.slotSvgSources) {
      group.userData.slotSvgSources = cloneStructuredValue(data.slotSvgSources);
    }
    // Restore CharacterModel metadata
    if (data.archetype) {
      group.userData.archetype = data.archetype;
      if (data.slotMap) group.userData.slotMap = data.slotMap;
      if (data.slotColors) group.userData.slotColors = cloneStructuredValue(data.slotColors);
      if (data.animationProfile) group.userData.animationProfile = data.animationProfile;
      if (data.skeletonId) group.userData.skeletonId = data.skeletonId;
      if (data.slotBindings) group.userData.slotBindings = data.slotBindings;
      if (data.avatarRecipe) group.userData.avatarRecipe = cloneStructuredValue(data.avatarRecipe);
    }
    return group;
  }
  if (data.type === 'mesh') {
    const geometry = rebuildGeometry(data.geometryType, data.geometryParams || {});
    const hasFC = data.faceColors && applyFaceColors(geometry, data.faceColors);
    const hasVC = (data.vertexColors && applyVertexColors(geometry, data.vertexColors)) || hasFC;
    const material = createMaterial(data.materialType, {
      color: data.color,
      vertexColors: hasVC,
      opacity: data.opacity !== undefined ? data.opacity : 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.name = data.name;
    mesh.userData.geometryType = normalizeGeometryType(data.geometryType) || data.geometryType;
    mesh.userData.geometryParams = cloneGeometryParams(data.geometryParams || geometry.parameters || {});
    if (data.pngModelRole) mesh.userData.pngModelRole = data.pngModelRole;
    setRestoredAgentId(mesh, data.agentId);
    if (hasVC) mesh.userData.vertexColors = data.vertexColors;
    if (hasFC) mesh.userData.faceColorArray = data.faceColors;
    mesh.position.fromArray(data.position);
    mesh.rotation.set(...data.rotation);
    mesh.scale.fromArray(data.scale);
    if (data.decal) {
      await restoreTexture(mesh, { decal: data.decal });
    } else if (data.texture) {
      await restoreTexture(mesh, data.texture);
    }
    return mesh;
  }
  return null;
}

function countAvatarHeadMigrations(objects = []) {
  let count = 0;
  objects.forEach((object) => {
    object?.traverse?.((node) => {
      const migrations = Array.isArray(node.userData?.avatarRecipeMigrations)
        ? node.userData.avatarRecipeMigrations
        : [];
      count += migrations.filter((entry) => entry?.type === 'headMold').length;
    });
  });
  return count;
}

function showSceneLoadedToast(result = {}) {
  if (result.avatarHeadMigrationCount > 0) {
    showToast(t('avatarHeadMigratedToast'));
    return;
  }
  showToast(t('sceneLoaded'));
}

// Serialize a group (or mesh) as the import-compatible JSON format:
// { name, pieces: [...], animations: [...] }
export function serializeGroupAsImportJSON(obj, { format = 'legacy' } = {}) {
  if (!obj) return null;

  // CharacterModel format if requested and metadata present
  if (format === 'character-model' && obj.isGroup && obj.userData.archetype) {
    return serializeAsCharacterModel(obj);
  }

  // Single mesh — wrap it
  if (obj.isMesh) {
    return {
      name: obj.userData.name || 'OBJECT',
      pieces: [serializeMeshAsPiece(obj)],
    };
  }

  if (!obj.isGroup) return null;
  if (isPngModelGroup(obj)) {
    const recipe = clonePngModelRecipe(obj);
    const generatedChildMetadata = serializePngGeneratedChildMetadata(obj);
    const data = {
      format: 'retrovisor-png-model',
      version: PNG_MODEL_VERSION,
      algorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
      name: obj.userData.name || 'PNG FLAT MODEL',
      pngModelSource: recipe.source,
      pngModelSettings: {
        ...recipe.settings,
        name: obj.userData.name || recipe.settings.name || 'PNG FLAT MODEL',
      },
      pngModelDepthMap: recipe.depthMap,
      children: serializePngModelExternalChildren(obj),
      transform: {
        position: roundArray(obj.position.toArray()),
        rotation: roundArray([obj.rotation.x, obj.rotation.y, obj.rotation.z]),
        scale: roundArray(obj.scale.toArray()),
      },
    };
    if (Array.isArray(obj.userData.animations) && obj.userData.animations.length > 0) {
      data.animations = cloneStructuredValue(obj.userData.animations);
    }
    if (generatedChildMetadata) {
      data.pngModelGeneratedChildMetadata = generatedChildMetadata;
    }
    return data;
  }
  if (isSvgDerivedGroup(obj)) {
    const data = {
      name: obj.userData.name || 'SVG MODEL',
      svgSource: cloneSvgSourceMetadata(obj.userData.svgSource),
      svgImportSettings: cloneSvgImportSettings({
        ...(obj.userData.svgImportSettings || {}),
        name: obj.userData.name || obj.userData.svgImportSettings?.name || 'SVG MODEL',
      }),
    };

    if (obj.userData.svgImportAnalysis) {
      data.svgImportAnalysis = cloneStructuredValue(obj.userData.svgImportAnalysis);
    }
    if (obj.userData.animations && obj.userData.animations.length > 0) {
      data.animations = cloneStructuredValue(obj.userData.animations);
    }

    return data;
  }

  const data = { name: obj.userData.name || 'GROUP' };
  data.pieces = [];

  // Collect pieces from children, handling PivotGroups recursively
  function collectPieces(parent, parentName) {
    for (const child of parent.children) {
      if (child.isGroup && child.userData.isPivot) {
        data.pieces.push(serializePivotAsPiece(child, parentName));
        // Recurse into nested PivotGroups
        collectPieces(child, child.userData.name);
      } else if (child.isMesh && !parent.userData.isPivot) {
        // Plain mesh (not a child of a PivotGroup — those are handled by serializePivotAsPiece)
        data.pieces.push(serializeMeshAsPiece(child));
      }
    }
  }

  collectPieces(obj, null);

  // Animations (raw definitions, already in import-ready format)
  if (obj.userData.animations && obj.userData.animations.length > 0) {
    data.animations = obj.userData.animations;
  }

  if (obj.userData.archetype) {
    data.archetype = obj.userData.archetype;
    if (obj.userData.slotMap) {
      data.slotMap = cloneStructuredValue(obj.userData.slotMap);
    }
    if (obj.userData.slotColors) {
      data.slotColors = cloneStructuredValue(obj.userData.slotColors);
    }
    if (obj.userData.slotSvgSources) {
      data.slotSvgSources = cloneStructuredValue(obj.userData.slotSvgSources);
    }
    if (obj.userData.animationProfile) {
      data.animationProfile = obj.userData.animationProfile;
    }
    if (obj.userData.skeletonId) {
      data.skeletonId = obj.userData.skeletonId;
    }
    if (obj.userData.slotBindings) {
      data.slotBindings = cloneStructuredValue(obj.userData.slotBindings);
    }
    if (obj.userData.avatarRecipe) {
      data.avatarRecipe = cloneStructuredValue(obj.userData.avatarRecipe);
    }
  }

  const attachments = collectSvgAttachments(obj);
  if (attachments.length > 0) {
    data.attachments = attachments;
  }

  return data;
}

function serializeAsCharacterModel(obj) {
  // First get the legacy pieces
  const legacyData = serializeGroupAsImportJSON(obj, { format: 'legacy' });
  if (!legacyData) return null;

  return piecesToCharacterModel(legacyData.pieces, {
    name: legacyData.name,
    archetype: obj.userData.archetype,
    slotMap: obj.userData.slotMap,
    animationProfile: obj.userData.animationProfile,
    skeletonId: obj.userData.skeletonId,
    slotBindings: obj.userData.slotBindings,
  });
}

// Accumulate position up through PivotGroup ancestors to get root-group-space position
function getAbsPivotPos(pivotGroup) {
  const pos = pivotGroup.position.clone();
  let parent = pivotGroup.parent;
  while (parent && parent.userData.isPivot) {
    pos.add(parent.position);
    parent = parent.parent;
  }
  return pos;
}

function serializePivotAsPiece(pivotGroup, parentName) {
  const childMesh = pivotGroup.children.find((c) => c.isMesh);
  const geometryType = childMesh
    ? normalizeGeometryType(childMesh.userData.geometryType || getGeometryType(childMesh))
    : 'label';
  // Convert local position to absolute root-group-space
  const absPivot = getAbsPivotPos(pivotGroup);
  const pivotPos = absPivot.toArray();
  const meshOffset = childMesh ? childMesh.position.toArray() : [0, 0, 0];
  const geometryParams = childMesh ? cleanGeometryParams(geometryType, getGeometryParams(childMesh)) : {};

  const piece = {
    name: pivotGroup.userData.name || 'PIECE',
    geometry: serializeGeometryDefinition(geometryType, geometryParams),
    color: childMesh && childMesh.material && childMesh.material.color
      ? '#' + childMesh.material.color.getHexString() : '#ffcc00',
    // Visual position = absolute pivot + mesh offset
    position: roundArray([pivotPos[0] + meshOffset[0], pivotPos[1] + meshOffset[1], pivotPos[2] + meshOffset[2]]),
    pivot: roundArray(pivotPos),
  };

  if (parentName) {
    piece.parent = parentName;
  }

  const rot = pivotGroup.rotation.toArray().slice(0, 3);
  if (rot.some((v) => Math.abs(v) > 0.001)) {
    piece.rotation = roundArray(rot);
  }

  const sc = pivotGroup.scale.toArray();
  if (sc.some((v) => Math.abs(v - 1) > 0.001)) {
    piece.scale = roundArray(sc);
  }

  if (childMesh) {
    if (childMesh.material && childMesh.material.opacity < 1) {
      piece.opacity = Math.round(childMesh.material.opacity * 1000) / 1000;
    }
    const texData = serializeTextureData(childMesh);
    if (texData) piece.texture = texData;
    if (childMesh.userData.decalSpec) piece.decal = cloneFaceDecalSpec(childMesh.userData.decalSpec);
    const vcData = serializeVertexColors(childMesh);
    if (vcData) piece.vertexColors = vcData;
    const fcData = serializeFaceColors(childMesh);
    if (fcData) piece.faceColors = fcData;
  }

  return piece;
}

function serializeMeshAsPiece(mesh) {
  const geometryType = normalizeGeometryType(mesh.userData.geometryType || getGeometryType(mesh));
  const geometryParams = cleanGeometryParams(geometryType, getGeometryParams(mesh));
  const piece = {
    name: mesh.userData.name || 'PIECE',
    geometry: serializeGeometryDefinition(geometryType, geometryParams),
    color: mesh.material && mesh.material.color ? '#' + mesh.material.color.getHexString() : '#ffcc00',
    position: roundArray(mesh.position.toArray()),
  };

  // Only include rotation/scale if non-default
  const rot = mesh.rotation.toArray().slice(0, 3);
  if (rot.some((v) => Math.abs(v) > 0.001)) {
    piece.rotation = roundArray(rot);
  }

  const sc = mesh.scale.toArray();
  if (sc.some((v) => Math.abs(v - 1) > 0.001)) {
    piece.scale = roundArray(sc);
  }

  if (mesh.material && mesh.material.opacity < 1) {
    piece.opacity = Math.round(mesh.material.opacity * 1000) / 1000;
  }
  const texData = serializeTextureData(mesh);
  if (texData) piece.texture = texData;
  if (mesh.userData.decalSpec) piece.decal = cloneFaceDecalSpec(mesh.userData.decalSpec);
  const vcData = serializeVertexColors(mesh);
  if (vcData) piece.vertexColors = vcData;
  const fcData = serializeFaceColors(mesh);
  if (fcData) piece.faceColors = fcData;

  return piece;
}

function roundArray(arr) {
  return arr.map((v) => Math.round(v * 1000) / 1000);
}

function collectSvgAttachments(rootGroup) {
  const attachments = [];
  if (!rootGroup?.isGroup) return attachments;

  rootGroup.traverse((node) => {
    if (node === rootGroup || !node.isGroup || !isSvgDerivedGroup(node)) return;
    attachments.push({
      type: 'svg',
      attachTo: node.parent ? (node.parent.userData?.name || node.parent.name || '') : '',
      object: serializeGroupAsImportJSON(node),
      transform: {
        position: roundArray(node.position.toArray()),
        rotation: roundArray([node.rotation.x, node.rotation.y, node.rotation.z]),
        scale: roundArray(node.scale.toArray()),
      },
    });
  });

  return attachments.filter((entry) => entry.object?.svgSource?.markup);
}

function cleanGeometryParams(type, params) {
  const allowedKeysByType = {
    cube: ['width', 'height', 'depth'],
    sphere: ['radius', 'widthSegments', 'heightSegments'],
    cylinder: ['radiusTop', 'radiusBottom', 'height', 'radialSegments'],
    cone: ['radius', 'height', 'radialSegments'],
    plane: ['width', 'height'],
    capsule: ['radius', 'length', 'capSegments', 'radialSegments'],
    torus: ['radius', 'tube', 'radialSegments', 'tubularSegments'],
    wedge: ['width', 'height', 'depth'],
    pyramid: ['width', 'height'],
    taperedBox: ['widthBottom', 'depthBottom', 'widthTop', 'depthTop', 'height', 'offsetTopX', 'offsetTopZ'],
    limbLoft: ['sides', 'sections', 'capTop', 'capBottom'],
    lathe: ['points', 'segments'],
    label: [],
    custom: ['vertices', 'faces'],
  };

  const allowedKeys = allowedKeysByType[type] || [];
  const clean = {};
  for (const key of allowedKeys) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      clean[key] = cloneStructuredValue(value);
    }
  }
  return clean;
}

export function serializeScene() {
  normalizeAgentIds(state.userObjects);
  const objects = [];
  state.userObjects.children.forEach((child) => {
    const data = serializeObject(child);
    if (data) objects.push(data);
  });
  return { version: 2, objects };
}

export async function deserializeScene(json) {
  deselect();
  if (!validateSerializedScene(json)) {
    throw new Error(t('sceneInvalidData'));
  }

  const rebuiltObjects = (await Promise.all(json.objects.map((data) => deserializeObject(data)))).filter(Boolean);
  const avatarHeadMigrationCount = countAvatarHeadMigrations(rebuiltObjects);
  clearUserObjects();
  rebuiltObjects.forEach((obj) => state.userObjects.add(obj));
  normalizeAgentIds(state.userObjects);
  return { avatarHeadMigrationCount };
}

export function saveToLocalStorage() {
  try {
    const data = serializeScene();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast(t('sceneSaved'));
  } catch (error) {
    showToast(t('sceneSaveError') + (error?.message || ''));
  }
}

export async function loadFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    showToast(t('noSavedScene'));
    return;
  }
  if (!confirm(t('confirmLoadScene'))) {
    return;
  }
  try {
    const data = JSON.parse(raw);
    const result = await deserializeScene(data);
    showSceneLoadedToast(result);
  } catch (error) {
    showToast(t('sceneLoadError') + (error?.message || t('sceneInvalidData')));
  }
}

export function exportSceneJSON() {
  const data = serializeScene();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lowpoly64-scene.json';
  link.click();
  URL.revokeObjectURL(url);
}

export function importSceneJSON(file) {
  if (!file) {
    return Promise.resolve({ success: false, error: t('jsonFileReadError') });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Promise.resolve(deserializeScene(data))
          .then((result) => {
            showSceneLoadedToast(result);
            resolve({ success: true });
          })
          .catch((error) => {
            showToast(t('sceneImportError') + (error?.message || t('sceneInvalidData')));
            resolve({ success: false, error: error?.message || t('sceneInvalidData') });
          });
      } catch (error) {
        showToast(t('sceneImportError') + (error?.message || t('sceneInvalidData')));
        resolve({ success: false, error: error?.message || t('sceneInvalidData') });
      }
    };
    reader.onerror = () => {
      showToast(t('sceneImportError') + t('jsonFileReadError'));
      resolve({ success: false, error: t('jsonFileReadError') });
    };
    reader.readAsText(file);
  });
}
