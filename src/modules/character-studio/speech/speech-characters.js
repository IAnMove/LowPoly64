import * as THREE from 'three';
import { HERO_PSX_RECIPE } from '../heroic-presets.js';
import { EXPLORADORA_N64 } from '../character-design.js';
import { MARIO64_RECIPE } from '../plumber-presets.js';

const vector = values => Object.freeze([...values]);
const mouthByCharacter = new WeakMap();

function preset({ id, label, recipe, width, height, depth, position, rotation, hide = [] }) {
  return Object.freeze({
    id,
    label,
    recipe,
    mouth: Object.freeze({
      parent: 'HEAD',
      width,
      height,
      depth,
      position: vector(position),
      rotation: vector(rotation),
      hide: Object.freeze(['MOUTH', ...hide]),
    }),
  });
}

/** Character recipes and face-specific speech anchors used by the speech lab. */
export const SPEECH_CHARACTERS = Object.freeze([
  preset({
    id: 'mario64',
    label: 'Mario N64',
    recipe: MARIO64_RECIPE,
    width: .70,
    height: .45,
    depth: .16,
    position: [0, .32, .55],
    rotation: [.65, 0, 0],
  }),
  preset({
    id: 'cloud',
    label: 'Cloud PSX',
    recipe: HERO_PSX_RECIPE,
    width: .58,
    height: .38,
    depth: .16,
    position: [0, .39, .50],
    rotation: [.22, 0, 0],
    hide: ['FACE_LIP'],
  }),
  preset({
    id: 'explorer',
    label: 'Exploradora N64',
    recipe: EXPLORADORA_N64,
    width: .56,
    height: .36,
    depth: .16,
    position: [0, .412, .903],
    rotation: [.08, 0, 0],
  }),
]);

export function getSpeechCharacter(id = 'mario64') {
  return SPEECH_CHARACTERS.find(character => character.id === String(id).trim().toLowerCase());
}

function findMouthObject(group) {
  if (!group) return null;
  return mouthByCharacter.get(group) || group.getObjectByProperty?.('speechMouth', true) || null;
}

/** Attach a mouth to the character's HEAD and hide generated resting-mouth pieces. */
export function attachCharacterMouth(group, mouth, character) {
  if (!group || !mouth?.object) throw new TypeError('A character group and speech mouth are required.');
  const preset = typeof character === 'string' ? getSpeechCharacter(character) : character;
  if (!preset) throw new RangeError(`Unknown speech character: ${character}`);

  const anchorName = preset.mouth.parent || 'HEAD';
  const anchor = group.getObjectByName(anchorName);
  if (!anchor) throw new Error(`Speech anchor "${anchorName}" is missing from ${preset.label}.`);

  const hiddenNames = new Set(preset.mouth.hide || ['MOUTH']);
  group.traverse(node => {
    if (hiddenNames.has(node.name)) node.visible = false;
  });

  mouth.object.removeFromParent();
  anchor.add(mouth.object);
  mouth.object.position.fromArray(preset.mouth.position);
  mouth.object.rotation.fromArray(preset.mouth.rotation);
  mouth.object.userData.speechCharacterId = preset.id;
  mouth.object.userData.speechMouth = true;
  mouthByCharacter.set(group, mouth.object);
  group.userData.speechCharacterId = preset.id;
  group.userData.speechAnchor = {
    parent: anchorName,
    position: [...preset.mouth.position],
    rotation: [...preset.mouth.rotation],
    width: preset.mouth.width,
    height: preset.mouth.height,
    depth: preset.mouth.depth,
  };
  return anchor;
}

function frameObject(runtime, object, center, distance) {
  if (!runtime?.camera || !runtime?.controls || !object) return;
  const direction = new THREE.Vector3(.12, .025, 1).normalize();
  runtime.controls.target.copy(center);
  runtime.camera.position.copy(center).add(direction.multiplyScalar(distance));
  runtime.camera.lookAt(center);
  const previousDamping = runtime.controls.enableDamping;
  runtime.controls.enableDamping = false;
  runtime.controls.update();
  runtime.controls.enableDamping = previousDamping;
}

/** Frame either the face or the isolated speech mouth in a preview runtime. */
export function frameSpeechCharacter(runtime, group, character, solo = false) {
  const preset = typeof character === 'string' ? getSpeechCharacter(character) : character;
  if (!preset || !runtime?.camera || !runtime?.controls) return;

  group.updateWorldMatrix?.(true, true);
  const mouth = findMouthObject(group);
  const focus = solo ? (mouth || group) : (group.getObjectByName('HEAD') || group);
  focus.updateWorldMatrix?.(true, true);
  const bounds = new THREE.Box3().setFromObject(focus);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, .1);
  frameObject(runtime, focus, center, Math.max(solo ? .85 : 2.7, largest * (solo ? 1.4 : 1.45)));
}

