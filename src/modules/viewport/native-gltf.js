import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

export const NATIVE_GLTF_FORMAT = 'retrovisor-gltf';
export const MAX_GLB_BYTES = 25 * 1024 * 1024;
const TRANSIENT_KEYS = new Set(['animationClips', 'gltfAnimations', 'texture', 'decalTextureReady']);

function cleanMetadata(value, depth = 0) {
  if (value == null || ['string', 'boolean', 'number'].includes(typeof value)) return value;
  if (depth > 16 || typeof value !== 'object' || value.isTexture || value.isObject3D || value.then) return undefined;
  if (Array.isArray(value)) return value.map((entry) => cleanMetadata(entry, depth + 1));
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !TRANSIENT_KEYS.has(key) && !['__proto__', 'constructor', 'prototype'].includes(key))
    .map(([key, entry]) => [key, cleanMetadata(entry, depth + 1)])
    .filter(([, entry]) => entry !== undefined));
}

export function getNativeAnimationJSON(group) {
  const clips = group.userData?.animationClips;
  return Array.isArray(clips)
    ? clips.map((clip) => THREE.AnimationClip.toJSON(clip))
    : structuredClone(group.userData?.gltfAnimations || []);
}

export function serializeNativeGltfGroup(group) {
  const clone = cloneSkeleton(group);
  clone.traverse((node) => { node.userData = cleanMetadata(node.userData) || {}; });
  return {
    format: NATIVE_GLTF_FORMAT, version: 1,
    name: group.userData.name || group.name || 'GLB',
    object: clone.toJSON(),
    clips: getNativeAnimationJSON(group),
  };
}

export function validateNativeGltfJSON(data) {
  if (data?.format !== NATIVE_GLTF_FORMAT || data.version !== 1) return 'Unsupported GLB JSON format or version.';
  if (!data.object?.object || data.object.metadata?.type !== 'Object') return 'GLB JSON requires an object snapshot.';
  if (!Array.isArray(data.clips) || data.clips.length > 256) return 'Invalid GLB animation list.';
  if ((data.object.geometries?.length || 0) > 5000 || (data.object.images?.length || 0) > 512) return 'GLB JSON exceeds the resource limit.';
  for (const image of data.object.images || []) {
    const urls = Array.isArray(image.url) ? image.url : [image.url];
    for (const url of urls) {
      if (typeof url === 'string' && !/^data:image\//i.test(url)) return 'GLB JSON images must be embedded data:image URLs.';
    }
  }
  return null;
}

export async function deserializeNativeGltfGroup(data) {
  const error = validateNativeGltfJSON(data);
  if (error) throw new Error(error);
  const group = await new THREE.ObjectLoader().parseAsync(data.object);
  group.userData.name = data.name || group.name || 'GLB';
  group.userData.nativeGltf = true;
  group.userData.gltfAnimations = structuredClone(data.clips);
  group.userData.animationClips = data.clips.map((clip) => THREE.AnimationClip.parse(clip));
  group.userData.animations = data.clips.map((clip) => ({ name: clip.name, duration: clip.duration, loop: true, tracks: [] }));
  return group;
}

function readGlbDocument(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 20) throw new Error('Invalid or truncated GLB file.');
  if (buffer.byteLength > MAX_GLB_BYTES) throw new Error('Choose a GLB file smaller than 25 MB.');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid GLB 2.0 file.');
  const jsonSize = view.getUint32(12, true);
  if (jsonSize > buffer.byteLength - 20) throw new Error('Truncated GLB file.');
  const document = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonSize)));
  for (const resource of [...(document.buffers || []), ...(document.images || [])]) {
    if (resource.uri && !/^data:/i.test(resource.uri)) throw new Error('This GLB references external files. Export it with embedded textures and buffers.');
  }
  if ((document.nodes?.length || 0) > 5000) throw new Error('GLB exceeds the 5000-node limit.');
  return document;
}

export async function parseGlbGroup(buffer, filename = 'Imported GLB') {
  readGlbDocument(buffer);
  const gltf = await new GLTFLoader().parseAsync(buffer, '');
  let group = gltf.scene;
  while (!group.userData.retroCharacterRecipe && group.children.length === 1
    && !group.children[0].isMesh && !group.children[0].isBone && group.position.lengthSq() === 0
    && group.quaternion.equals(new THREE.Quaternion()) && group.scale.equals(new THREE.Vector3(1, 1, 1))) group = group.children[0];
  group.removeFromParent();
  if (!group.isGroup) {
    const container = new THREE.Group();
    container.copy(group, false);
    container.uuid = group.uuid;
    for (const child of [...group.children]) container.add(child);
    group = container;
  }
  group.userData.name ||= group.name || filename.replace(/\.glb$/i, '');
  group.userData.nativeGltf = true;
  group.userData.gltfAnimations = gltf.animations.map((clip) => THREE.AnimationClip.toJSON(clip));
  group.userData.animationClips = gltf.animations;
  group.userData.animations = gltf.animations.map((clip) => ({ name: clip.name, duration: clip.duration, loop: true, tracks: [] }));
  return group;
}
