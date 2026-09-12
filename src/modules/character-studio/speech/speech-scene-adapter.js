import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { state } from '../../shared/state.js';
import { prepareObjectForGlbExport } from '../../viewport/export.js';
import { buildCharacterDesignGroup } from '../../agent/character-commands.js';
import {
  SPEECH_CHARACTERS,
  getSpeechCharacter,
} from './speech-characters.js';
import { createSpeechMouth } from './speech-mouths.js';

const ownedResources = new WeakMap();
const DEFAULT_MOUTH = Object.freeze({
  parent: 'HEAD',
  width: 0.45,
  height: 0.22,
  depth: 0.12,
  position: [0, 0.28, 0.52],
  rotation: [0, 0, 0],
  hide: ['MOUTH'],
});
const SPEECH_CLIP_NAME = /^speech$/i; // adapter clip name
const SPEECH_ROOT_NAME = /^SPEECH_MOUTH_\d+_ROOT$/i;

function cloneData(value) {
  if (value === undefined) return value;
  try {
    return structuredClone(value);
  } catch {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return undefined;
    }
  }
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function positive(value, fallback) {
  const number = finite(value, fallback);
  return number > 0 ? number : fallback;
}

function vector3(value, fallback) {
  return Array.isArray(value) && value.length >= 3 && value.slice(0, 3).every(Number.isFinite)
    ? value.slice(0, 3).map(Number)
    : [...fallback];
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function nodeName(node) {
  return node?.userData?.name || node?.name || '';
}

function nodeMatches(node, name) {
  return normalizeName(nodeName(node)) === normalizeName(name);
}

function findNamedNode(root, name) {
  if (!root) return null;
  let match = null;
  root.traverse?.((node) => {
    if (!match && nodeMatches(node, name)) match = node;
  });
  return match;
}

function findDirectRoot(object) {
  if (!object || !state.userObjects) return null;
  let current = object;
  while (current && current.parent && current.parent !== state.userObjects) current = current.parent;
  return current?.parent === state.userObjects ? current : null;
}

function sceneRoots() {
  return Array.isArray(state.userObjects?.children) ? [...state.userObjects.children] : [];
}

function selectedSceneRoot() {
  const candidates = [state.selectedMesh, ...(state.selectedMeshes instanceof Set ? state.selectedMeshes : [])];
  for (const candidate of candidates) {
    const root = findDirectRoot(candidate);
    if (root) return root;
  }
  return null;
}

function isSceneId(value) {
  return typeof value === 'string' && value.startsWith('scene:');
}

function rootId(root) {
  return root ? `scene:${root.uuid}` : null;
}

function rootForSceneId(idOrPreset) {
  const id = typeof idOrPreset === 'string' ? idOrPreset : idOrPreset?.id;
  const supplied = typeof idOrPreset === 'object'
    ? (idOrPreset.source || idOrPreset.sceneObject || idOrPreset.object || idOrPreset.group)
    : null;
  const suppliedRoot = findDirectRoot(supplied) || (supplied?.parent === state.userObjects ? supplied : null);
  if (suppliedRoot && (!id || id === rootId(suppliedRoot) || id === suppliedRoot.uuid)) return suppliedRoot;
  if (!isSceneId(id)) return null;
  const uuid = id.slice('scene:'.length);
  return sceneRoots().find((root) => root.uuid === uuid) || null;
}

function hasSkinnedMesh(object) {
  let found = false;
  object?.traverse?.((node) => {
    if (node.isSkinnedMesh) found = true;
  });
  return found;
}

function pairNodes(source, target, pairs = [], map = new Map()) {
  if (!source || !target) return { pairs, map };
  pairs.push([source, target]);
  map.set(source, target);
  source.children.forEach((child, index) => pairNodes(child, target.children[index], pairs, map));
  return { pairs, map };
}

function cloneClip(clip) {
  try {
    if (clip instanceof THREE.AnimationClip) {
      return THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(clip));
    }
    if (clip && typeof clip === 'object' && Array.isArray(clip.tracks)) {
      return THREE.AnimationClip.parse(cloneData(clip));
    }
  } catch {
    // A malformed native clip should not make the character itself unusable.
  }
  return null;
}

function sourceAnimationClips(source) {
  const clips = Array.isArray(source?.userData?.animationClips)
    ? source.userData.animationClips
    : source?.userData?.gltfAnimations;
  if (!Array.isArray(clips)) return [];
  return clips.map(cloneClip).filter(Boolean);
}

function isSpeechClip(clip) {
  return SPEECH_CLIP_NAME.test(String(clip?.name || ''));
}

function filterSpeechClips(clips = []) {
  return clips.filter((clip) => !isSpeechClip(clip));
}

function findAnimationTarget(source, targetName) {
  if (!source || !targetName) return null;
  if (source.uuid === targetName || source.name === targetName || targetName === nodeName(source)) return source;
  let match = null;
  source.traverse?.((node) => {
    if (!match && (node.uuid === targetName || node.name === targetName || node.userData?.name === targetName)) match = node;
  });
  return match;
}

function remapNativeClipJSON(clip, source, cloneMap) {
  const json = cloneData(THREE.AnimationClip.toJSON(clip));
  if (!json?.tracks) return json;
  for (const track of json.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    if (binding.objectName) continue;
    const sourceNode = findAnimationTarget(source, binding.nodeName);
    const cloneNode = cloneMap.get(sourceNode);
    if (!cloneNode) continue;
    const index = binding.propertyIndex === undefined ? '' : `[${binding.propertyIndex}]`;
    track.name = `${cloneNode.uuid}.${binding.propertyName}${index}`;
  }
  return json;
}

function restoreNativeMetadata(pairs, cloneMap) {
  for (const [source, clone] of pairs) {
    if (!source.userData?.nativeGltf) continue;
    const clips = filterSpeechClips(sourceAnimationClips(source));
    clone.userData.animationClips = clips;
    // Keep name-based runtime clips for AnimationMixer; the UUID-targeted JSON
    // mirrors export.js and is consumed by the GLB preparation path.
    clone.userData.gltfAnimations = clips.map((clip) => remapNativeClipJSON(clip, source, cloneMap));
  }
}

function restoreAnimationMetadata(pairs) {
  for (const [source, clone] of pairs) {
    if (source.userData?.nativeGltf) continue;
    if (Array.isArray(source.userData?.animationClips)) {
      clone.userData.animationClips = filterSpeechClips(source.userData.animationClips.map(cloneClip).filter(Boolean));
    }
    if (Array.isArray(source.userData?.gltfAnimations)) {
      clone.userData.gltfAnimations = cloneData(source.userData.gltfAnimations)
        ?.filter((clip) => !isSpeechClip(clip)) || [];
    }
    if (Array.isArray(source.userData?.animations)) {
      clone.userData.animations = cloneData(source.userData.animations)
        ?.filter((clip) => !isSpeechClip(clip)) || [];
    }
  }
}

function restoreHighlightMaterial(sourceMesh, material) {
  if (!material?.emissive) return;
  const original = state.originalEmissive?.get(sourceMesh.uuid);
  if (!original) return;
  material.emissive.copy(original);
  material.emissiveIntensity = 0;
}

function cloneOwnedObject(source) {
  if (!source?.isObject3D) throw new TypeError('A THREE.Object3D is required.');
  const clone = hasSkinnedMesh(source) ? cloneSkeleton(source) : source.clone(true);
  const { pairs, map } = pairNodes(source, clone);
  const geometries = new Set();
  const materials = new Set();
  const geometryMap = new Map();
  const materialMap = new Map();

  for (const [sourceNode, targetNode] of pairs) {
    if (sourceNode.geometry) {
      let geometry = geometryMap.get(sourceNode.geometry);
      if (!geometry) {
        geometry = sourceNode.geometry.clone();
        geometryMap.set(sourceNode.geometry, geometry);
        geometries.add(geometry);
      }
      targetNode.geometry = geometry;
    }
    if (sourceNode.material) {
      const sourceMaterials = Array.isArray(sourceNode.material) ? sourceNode.material : [sourceNode.material];
      const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
        let material = materialMap.get(sourceMaterial);
        if (!material) {
          material = sourceMaterial.clone();
          materialMap.set(sourceMaterial, material);
          materials.add(material);
        }
        restoreHighlightMaterial(sourceNode, material);
        return material;
      });
      targetNode.material = Array.isArray(sourceNode.material) ? clonedMaterials : clonedMaterials[0];
    }
  }

  restoreNativeMetadata(pairs, map);
  restoreAnimationMetadata(pairs);
  clone.userData = { ...(clone.userData || {}), speechClone: true };
  ownedResources.set(clone, { geometries, materials });
  return { clone, pairs, map };
}

function isSpeechMouthRoot(node) {
  return Boolean(node?.userData?.speechMouth)
    || SPEECH_ROOT_NAME.test(String(node?.name || ''));
}

function removeSpeechMouthSubtrees(root, keepSource = null, sourceToClone = null) {
  const remove = [];
  const keepClone = keepSource && sourceToClone?.get(keepSource);
  root.traverse((node) => {
    if (node === root || !isSpeechMouthRoot(node)) return;
    if (keepSource && (node === keepSource || node === keepClone)) return;
    remove.push(node);
  });
  remove.forEach((node) => node.removeFromParent());
  return remove.length;
}

function collectWorldBoundsLocal(node, localRoot) {
  if (!node || !localRoot) return null;
  node.updateWorldMatrix(true, true);
  localRoot.updateWorldMatrix(true, true);
  const worldBox = new THREE.Box3().setFromObject(node);
  if (worldBox.isEmpty()) return null;
  const inverse = localRoot.matrixWorld.clone().invert();
  const localBox = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const x of [worldBox.min.x, worldBox.max.x]) {
    for (const y of [worldBox.min.y, worldBox.max.y]) {
      for (const z of [worldBox.min.z, worldBox.max.z]) {
        point.set(x, y, z).applyMatrix4(inverse);
        localBox.expandByPoint(point);
      }
    }
  }
  return localBox;
}

function relativeRotation(parent, child) {
  const parentQuaternion = parent.getWorldQuaternion(new THREE.Quaternion());
  const childQuaternion = child.getWorldQuaternion(new THREE.Quaternion());
  const relative = parentQuaternion.invert().multiply(childQuaternion);
  return new THREE.Euler().setFromQuaternion(relative, 'XYZ').toArray();
}

function inferredMouthAnchor(head, sourceMouth) {
  const headBounds = collectWorldBoundsLocal(head, head);
  const defaultAnchor = normalizeMouthAnchor(DEFAULT_MOUTH, { inferred: true });
  if (!headBounds) return defaultAnchor;

  const headSize = headBounds.getSize(new THREE.Vector3());
  const headCenter = headBounds.getCenter(new THREE.Vector3());
  if (!sourceMouth) {
    return normalizeMouthAnchor({
      parent: nodeName(head) || 'HEAD',
      width: Math.max(0.3, headSize.x * 0.36),
      height: Math.max(0.16, headSize.y * 0.16),
      depth: Math.max(0.1, headSize.z * 0.16),
      position: [headCenter.x, headBounds.min.y + headSize.y * 0.25, headBounds.max.z + Math.max(0.04, headSize.z * 0.08)],
      rotation: [0, 0, 0],
      hide: ['MOUTH'],
    }, { inferred: true });
  }

  const mouthBounds = collectWorldBoundsLocal(sourceMouth, head);
  const mouthCenter = mouthBounds?.getCenter(new THREE.Vector3()) || headCenter;
  const mouthSize = mouthBounds?.getSize(new THREE.Vector3()) || new THREE.Vector3(
    headSize.x * 0.3,
    headSize.y * 0.12,
    headSize.z * 0.12,
  );
  return normalizeMouthAnchor({
    parent: nodeName(head) || 'HEAD',
    width: Math.max(0.12, mouthSize.x),
    height: Math.max(0.08, mouthSize.y),
    depth: Math.max(0.06, mouthSize.z),
    position: mouthCenter.toArray(),
    rotation: relativeRotation(head, sourceMouth),
    hide: ['MOUTH'],
  }, { inferred: true });
}

function normalizeMouthAnchor(anchor = {}, { inferred = false } = {}) {
  const hide = Array.isArray(anchor.hide) ? anchor.hide.map(String) : [];
  return {
    parent: String(anchor.parent || 'HEAD'),
    width: positive(anchor.width, DEFAULT_MOUTH.width),
    height: positive(anchor.height, DEFAULT_MOUTH.height),
    depth: positive(anchor.depth, DEFAULT_MOUTH.depth),
    position: vector3(anchor.position, DEFAULT_MOUTH.position),
    rotation: vector3(anchor.rotation, DEFAULT_MOUTH.rotation),
    hide: [...new Set(['MOUTH', ...hide])],
    inferred: Boolean(anchor.inferred ?? inferred),
  };
}

function findExistingMouth(root, head) {
  let match = null;
  root?.traverse?.((node) => {
    if (match || node === head || !nodeMatches(node, 'MOUTH')) return;
    let current = node.parent;
    while (current && current !== root && current !== head) current = current.parent;
    if (current === head) match = node;
  });
  return match;
}

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function recognizedPresetForRoot(root) {
  const savedId = root?.userData?.speechCharacterId;
  const saved = savedId && getSpeechCharacter(savedId);
  if (saved) return saved;
  const recipe = root?.userData?.characterDesignRecipe;
  if (!recipe) return null;
  const serialized = stableValue(recipe);
  return SPEECH_CHARACTERS.find((preset) => stableValue(preset.recipe) === serialized)
    || SPEECH_CHARACTERS.find((preset) => preset.recipe?.name && preset.recipe.name === recipe.name)
    || null;
}

function sceneSpeechDescriptor(root) {
  const head = findNamedNode(root, 'HEAD');
  if (!head) return null;
  const knownPreset = recognizedPresetForRoot(root);
  const savedAnchor = root.userData?.speechAnchor;
  const savedParent = savedAnchor?.parent && findNamedNode(root, savedAnchor.parent);
  let mouth;
  if (savedAnchor && (!savedAnchor.parent || savedParent)) {
    mouth = normalizeMouthAnchor(savedAnchor);
  } else if (knownPreset) {
    mouth = normalizeMouthAnchor(knownPreset.mouth);
  } else {
    mouth = inferredMouthAnchor(head, findExistingMouth(root, head));
  }
  const id = rootId(root);
  const descriptor = {
    id,
    label: String(root.userData?.name || root.name || 'Scene character'),
    mouth,
    recipe: cloneData(root.userData?.characterDesignRecipe),
    characterId: root.userData?.speechCharacterId || knownPreset?.id || null,
    scene: true,
    inferredMouth: Boolean(mouth.inferred),
  };
  // Keep the source available to callers without making the descriptor a
  // circular object when it is serialized for UI state.
  Object.defineProperty(descriptor, 'source', { value: root, enumerable: false });
  return descriptor;
}

/** Return compatible top-level scene roots, with the selected root first. */
export function listSceneSpeechCharacters() {
  const roots = sceneRoots();
  const selected = selectedSceneRoot();
  const ordered = selected ? [selected, ...roots.filter((root) => root !== selected)] : roots;
  const scene = ordered.map(sceneSpeechDescriptor).filter(Boolean);
  return scene;
}

function presetForInput(preset) {
  if (typeof preset === 'string') {
    if (isSceneId(preset)) return { id: preset };
    return getSpeechCharacter(preset);
  }
  if (!preset || typeof preset !== 'object') return null;
  if (isSceneId(preset.id)) return preset;
  return preset.id ? (getSpeechCharacter(preset.id) || preset) : preset;
}

/** Build an independent character copy for a prepared or scene descriptor. */
export async function createSpeechCharacter(preset) {
  const resolved = presetForInput(preset);
  if (!resolved) throw new RangeError(`Unknown speech character: ${preset}`);
  if (isSceneId(resolved.id)) {
    const source = rootForSceneId(resolved);
    if (!source) throw new Error(`Scene speech character is no longer available: ${resolved.id}`);
    const result = cloneOwnedObject(source);
    removeSpeechMouthSubtrees(result.clone);
    result.clone.userData.speechSourceId = resolved.id;
    result.clone.userData.speechCharacterId = resolved.characterId || source.userData?.speechCharacterId || null;
    return result.clone;
  }
  if (!resolved.recipe) throw new Error('A prepared speech character requires a Character Studio recipe.');
  const group = buildCharacterDesignGroup(resolved.recipe);
  ownedResources.set(group, collectOwnedResources(group));
  return group;
}

function collectOwnedResources(root) {
  const geometries = new Set();
  const materials = new Set();
  root?.traverse?.((node) => {
    if (node.geometry) geometries.add(node.geometry);
    const nodeMaterials = Array.isArray(node.material) ? node.material : [node.material];
    nodeMaterials.filter(Boolean).forEach((material) => materials.add(material));
  });
  return { geometries, materials };
}

function isEditorHelper(node) {
  return Boolean(node?.isLight || node?.isHelper || node?.userData?.editorHelper || node?.userData?.isEditorHelper)
    || node?.type === 'GridHelper'
    || /^(?:GridHelper|AxesHelper|CameraHelper|TransformControls)$/i.test(String(node?.name || ''));
}

function removeEditorHelpers(root) {
  const helpers = [];
  root?.traverse?.((node) => {
    if (node !== root && isEditorHelper(node)) helpers.push(node);
  });
  helpers.forEach((node) => node.removeFromParent());
}

/** Clone the editor composition, omitting the active character root and helpers. */
export function createSpeechSceneBackdrop(excludedId = null) {
  const excluded = rootForSceneId(excludedId) || (excludedId?.isObject3D ? findDirectRoot(excludedId) : null);
  const backdrop = new THREE.Group();
  backdrop.name = 'Speech Scene Backdrop';
  backdrop.userData = { speechClone: true, speechSceneBackdrop: true };
  const resources = { geometries: new Set(), materials: new Set() };

  for (const source of sceneRoots()) {
    if (source === excluded || isEditorHelper(source)) continue;
    const result = cloneOwnedObject(source);
    removeEditorHelpers(result.clone);
    if (result.clone === excluded || isEditorHelper(result.clone)) {
      disposeSpeechClone(result.clone);
      continue;
    }
    backdrop.add(result.clone);
    const owned = ownedResources.get(result.clone);
    owned?.geometries.forEach((geometry) => resources.geometries.add(geometry));
    owned?.materials.forEach((material) => resources.materials.add(material));
  }
  ownedResources.set(backdrop, resources);
  return backdrop;
}

/** Dispose only geometry and material resources owned by a speech clone. */
export function disposeSpeechClone(group) {
  if (!group) return;
  const resources = ownedResources.get(group) || collectOwnedResources(group);
  resources.geometries?.forEach((geometry) => geometry.dispose?.());
  resources.materials?.forEach((material) => material.dispose?.());
  ownedResources.delete(group);
  group.removeFromParent?.();
  group.clear?.();
}

function speechMouthDimensions(group, mouth, metadata) {
  const anchor = metadata?.mouth || metadata?.anchor || group.userData?.speechAnchor || {};
  return {
    width: positive(anchor.width, DEFAULT_MOUTH.width),
    height: positive(anchor.height, DEFAULT_MOUTH.height),
    depth: positive(anchor.depth, DEFAULT_MOUTH.depth),
  };
}

function speechAnchorForExport(group, metadata = {}) {
  const preset = getSpeechCharacter(metadata.characterId);
  const source = metadata.mouth || group.userData?.speechAnchor || DEFAULT_MOUTH;
  const hide = Array.isArray(source.hide) && source.hide.length > 0
    ? source.hide
    : (preset?.mouth?.hide || DEFAULT_MOUTH.hide);
  return normalizeMouthAnchor({ ...source, hide });
}

function speechSkinForExport(group, metadata = {}) {
  return metadata.skin
    || metadata.mouth?.skin
    || group.userData?.characterDesignRecipe?.skin
    || group.userData?.avatarRecipe?.skin;
}

/**
 * Export a speaking character without mutating its live group or mouth.
 * Body/native clips come from prepareObjectForGlbExport and the fresh mouth
 * clip is appended under the stable `speech` name.
 */
export async function exportSpeechCharacter(group, mouth, track, metadata = {}) {
  if (!group?.isObject3D) throw new TypeError('A character group is required.');
  if (!mouth?.object || typeof mouth.createClip !== 'function') throw new TypeError('A speech mouth is required.');
  await mouth.ready;
  const sourceClone = cloneOwnedObject(group);
  let freshMouth = null;
  let prepared = null;
  removeSpeechMouthSubtrees(sourceClone.clone);
  const anchor = speechAnchorForExport(group, metadata);
  const parentName = anchor.parent || 'HEAD';
  const parent = findNamedNode(sourceClone.clone, parentName) || findNamedNode(sourceClone.clone, 'HEAD');
  if (!parent) {
    disposeSpeechClone(sourceClone.clone);
    throw new Error(`Speech anchor "${parentName}" is missing from the export character.`);
  }
  const mode = mouth.object.userData?.speechMode || metadata.mode || 'cutout';
  freshMouth = createSpeechMouth({
    mode,
    ...speechMouthDimensions(sourceClone.clone, mouth, { ...metadata, mouth: anchor }),
    skin: speechSkinForExport(group, metadata),
  });
  await freshMouth.ready;
  parent.add(freshMouth.object);
  freshMouth.object.position.fromArray(anchor.position);
  freshMouth.object.rotation.fromArray(anchor.rotation);
  freshMouth.object.userData.speechCharacterId = metadata.characterId || group.userData?.speechCharacterId || null;

  const speechPrototype = {
    ...(cloneData(group.userData?.speechPrototype) || {}),
    ...(cloneData(metadata) || {}),
    mouth: cloneData(anchor),
    mode,
    track: cloneData(track),
  };
  sourceClone.clone.userData.speechPrototype = speechPrototype;
  sourceClone.clone.userData.speechAnchor = cloneData(anchor);
  const speechClip = freshMouth.createClip(track, 'speech');
  try {
    prepared = prepareObjectForGlbExport(sourceClone.clone);
    const bodyClips = filterSpeechClips(prepared.clips || []);
    const clips = [...bodyClips, speechClip];
    return await new GLTFExporter().parseAsync(prepared.object, {
      binary: true,
      animations: clips,
      onlyVisible: true,
    });
  } finally {
    freshMouth?.dispose?.();
    disposeSpeechClone(sourceClone.clone);
    prepared?.object?.traverse?.((node) => {
      node.geometry?.dispose?.();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.filter(Boolean).forEach((material) => material.dispose?.());
    });
  }
}
