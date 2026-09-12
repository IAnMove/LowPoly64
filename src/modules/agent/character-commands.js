import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { state } from '../shared/state.js';
import { pushAction } from '../shared/undo.js';
import { buildGroupFromDefinition } from '../viewport/templates.js';
import { characterModelToPieces } from '../viewport/character-model.js';
import { serializeGroupAsImportJSON } from '../viewport/persistence.js';
import { prepareObjectForGlbExport } from '../viewport/export.js';
import { rebuildRigAnimationsForGroup } from '../animation/rigging-utils.js';
import { createAvatarPreviewRuntime } from '../avatar/avatar-preview-runtime.js';
import { AVATAR_HERO_PRESETS } from '../../data/avatar/catalog/forge-hero-presets.js';
import { MARIO64_RECIPE } from '../character-studio/plumber-presets.js';
import { HERO_PSX_RECIPE } from '../character-studio/heroic-presets.js';
import { CHARACTER_DESIGN_SCHEMA, validateCharacterDesign, createCharacterDesignModel } from '../character-studio/character-design.js';
import { CharacterDraftStore, CharacterDraftError } from './character-draft-store.js';
import { ensureAgentId, findObjectByAgentId, normalizeAgentIds } from './agent-object-ids.js';
import { makeSuccessResult } from './tool-validation.js';

const copy = value => structuredClone(value);
const named = node => node.userData?.name || node.name;
const fail = (code, message, details) => { throw new CharacterDraftError(code, message, details); };

export const CHARACTER_STARTERS = Object.freeze([
  { id: 'studio:mario64', engine: 'studio', label: 'Mario · estudio N64', tags: ['n64', 'mario', 'plumber', 'fontanero', 'mascota', 'gorra', 'overalls'], recipe: MARIO64_RECIPE },
  { id: 'studio:cloud-psx', engine: 'studio', label: 'Cloud · héroe PSX', tags: ['psx', 'cloud', 'ff7', 'hero', 'héroe', 'soldier', 'blond', 'rubio', 'buster', 'spiky'], recipe: HERO_PSX_RECIPE },
  { id: 'studio:psx-swordsman', engine: 'studio', label: 'Espadachín PSX', tags: ['psx', 'espadachín', 'swordsman', 'rubio', 'blond', 'spiky'], recipe: {
    name: 'Espadachín del Alba', style: 'psx', body: { height: 4.5, width: 1.7 }, head: { style: 'psx', scale: 0.95 }, hair: { style: 'swept_spikes', color: '#eabb43' }, skin: '#d7a17b',
    outfit: { style: 'sleeveless', shirt: '#33374f', pants: '#262b42', shoes: '#413b37' },
    equipment: { sword: { enabled: false }, pauldron: { enabled: false } },
  } },
  { id: 'studio:n64-explorer', engine: 'studio', label: 'Exploradora N64', tags: ['n64', 'exploradora', 'explorer', 'round', 'original'], recipe: {
    name: 'Luma del Bosque', style: 'n64', body: { height: 3.6, width: 1.8 }, head: { style: 'n64', scale: 1.1 }, hair: { style: 'short', color: '#593628' }, skin: '#bc835f',
    outfit: { style: 'tunic', shirt: '#468d79', pants: '#243f50', shoes: '#745044' }, equipment: { sword: { enabled: false }, pauldron: { enabled: false } },
  } },
]);

function catalog() {
  return [...CHARACTER_STARTERS, ...AVATAR_HERO_PRESETS.map(preset => ({ id: `forge:${preset.id}`, engine: 'avatar-forge', label: preset.labels?.es || preset.labels?.en || preset.recipe.label, tags: ['avatar', 'forge', preset.recipe.bodyPresetId], recipe: preset.recipe }))];
}
function catalogEntry(id) {
  return catalog().find(entry => entry.id === id) || fail('CATALOG_NOT_FOUND', 'Unknown character preset. Use search_character_catalog to obtain an exact catalog_id.', { catalogId: id });
}
function merge(base, patch) {
  const result = copy(base);
  for (const [key, value] of Object.entries(patch || {})) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('INVALID_RECIPE', 'Reserved recipe field.', { path: key });
    result[key] = value && typeof value === 'object' && !Array.isArray(value) ? merge(result[key] || {}, value) : value;
  }
  return result;
}
function validated(recipe) {
  const result = validateCharacterDesign(recipe);
  if (!result.ok) fail('INVALID_CHARACTER_RECIPE', 'Correct the indicated recipe fields.', result.errors);
  return result.recipe;
}
function disposeGroup(group) {
  group.traverse(node => {
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach(material => material.dispose());
  });
}
export const characterDrafts = new CharacterDraftStore({ dispose: disposeGroup });

function findJoint(group, name) {
  let found;
  group.traverse(node => { if (named(node) === name && (node.userData?.isPivot || node.isBone)) found ||= node; });
  return found;
}
function pivotMap(group) {
  const map = new Map();
  group.traverse(node => { if (node.userData?.isPivot) map.set(named(node), node); });
  return map;
}
function partForName(name) {
  if (/^(?:EQUIP_)?SWORD/.test(name)) return 'equipment.sword';
  if (/^(?:EQUIP_)?PAULDRON/.test(name)) return 'equipment.pauldron';
  if (/^HAIR/.test(name)) return 'hair';
  if (/^(HEAD|EYE|PUPIL|NOSE|MOUTH|EAR|BROW|FACE)/.test(name)) return 'head';
  if (/^(OUTFIT|TUNIC|BELT)/.test(name)) return 'outfit';
  return 'body';
}

export function buildCharacterDesignGroup(input) {
  const recipe = validated(input);
  const model = createCharacterDesignModel(recipe);
  const converted = characterModelToPieces(model);
  const group = buildGroupFromDefinition({ name: model.name, pieces: converted.pieces }, { compileAnimations: false });
  group.name = model.name;
  Object.assign(group.userData, {
    ...(model.speechAnchor ? { speechAnchor: copy(model.speechAnchor) } : {}),
    name: model.name, isRetroCharacter: true, retroCharacterRoot: true,
    characterDesignRecipe: copy(recipe), characterDesignRevision: 0,
    retroCharacterRecipe: copy(model.retroCharacterRecipe), archetype: model.archetype,
    slotMap: copy(converted.slotMap), skeletonId: model.skeletonId,
    slotBindings: copy(model.slotBindings), animationProfile: model.animationProfile,
    humanoidRigMode: 'canonical',
  });
  group.traverse(node => { if (node.userData?.isPivot) { node.userData.characterPart = partForName(named(node)); ensureAgentId(node); } });
  ensureAgentId(group);
  rebuildRigAnimationsForGroup(group, { skeletonId: model.skeletonId, animationProfile: model.animationProfile });
  return group;
}

function cloneEditable(group) {
  const clone = cloneSkeleton(group);
  clone.traverse(node => {
    if (node.geometry) node.geometry = node.geometry.clone();
    if (node.material) node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material.clone();
  });
  if (!clone.userData.nativeGltf) rebuildRigAnimationsForGroup(clone, { skeletonId: clone.userData.skeletonId, animationProfile: clone.userData.animationProfile });
  return clone;
}

function recipeFor(group) {
  if (group.userData.characterDesignRecipe) return { engine: 'studio', recipe: copy(group.userData.characterDesignRecipe) };
  if (group.userData.avatarRecipe) return { engine: 'avatar-forge', recipe: copy(group.userData.avatarRecipe) };
  const legacy = group.userData.retroCharacterRecipe;
  if (legacy) return { engine: 'studio', recipe: validated({ name: legacy.label, style: legacy.style, body: { height: legacy.bodyHeight, width: legacy.bodyWidth }, head: { style: legacy.headStyle, scale: legacy.headScale }, hair: { style: legacy.hair, color: legacy.colors.hair }, skin: legacy.colors.skin, outfit: { shirt: legacy.colors.shirt, pants: legacy.colors.pants, shoes: legacy.colors.shoes } }) };
  fail('CHARACTER_RECIPE_REQUIRED', 'This object has no editable character recipe. Start from Character Studio or an Avatar Forge catalog preset.');
}

function requireSource(id) {
  const object = findObjectByAgentId(state.userObjects, id);
  if (!object || object.parent !== state.userObjects) fail('CHARACTER_NOT_FOUND', 'Use the stable ID of a complete top-level character.', { id });
  return object;
}
function fingerprint(group) {
  // Actual geometry and all local transforms, including hand-authored descendants.
  // Recipe-only comparisons would miss manual edits.
  group.updateWorldMatrix(true, true);
  return JSON.stringify(group.toJSON());
}
function target(args) {
  if (Boolean(args.id) === Boolean(args.draft_id)) fail('CHARACTER_TARGET_REQUIRED', 'Supply exactly one id or draft_id.');
  if (args.draft_id) {
    const draft = characterDrafts.get(args.draft_id);
    const version = characterDrafts.version(draft, args.revision);
    return { ...version, draft, revision: args.revision ?? draft.revision, engine: draft.engine };
  }
  if (args.revision !== undefined) fail('INVALID_REVISION', 'revision applies only to a draft_id.');
  const group = requireSource(args.id);
  return { group, ...recipeFor(group), revision: group.userData.characterDesignRevision || 0 };
}


function replaceParts(next, fresh, previousFresh, parts) {
  const current = pivotMap(next);
  const incoming = pivotMap(fresh);
  const baseline = pivotMap(previousFresh);
  // Only generated roots of the requested semantic part are replaced. Manual
  // children are carried over; all unrelated joints, materials and IDs stay.
  const selected = [...incoming.entries()].filter(([name]) => parts.has(partForName(name)));
  const existing = [...current.entries()].filter(([name]) => parts.has(partForName(name)));
  for (const [name, old] of existing) {
    if (incoming.has(name)) continue;
    const primaryMesh = old.children.find(child => child.isMesh);
    next.updateWorldMatrix(true, true);
    const attachmentParent = old.parent;
    for (const child of [...old.children]) {
      if (child !== primaryMesh && (!child.userData?.isPivot || !baseline.has(named(child)) || !parts.has(partForName(named(child))))) attachmentParent.attach(child);
    }
    if (primaryMesh) for (const child of [...primaryMesh.children]) attachmentParent.attach(child);
    old.removeFromParent();
    disposeGroup(old);
  }
  for (const [name, source] of selected) {
    source.updateMatrix();
    const old = current.get(name);
    const parentName = named(source.parent);
    const parent = current.get(parentName) || next;
    if (old) {
      const sourceMesh = source.children.find(node => node.isMesh);
      const oldMesh = old.children.find(node => node.isMesh);
      const baselineMesh = baseline.get(name)?.children.find(node => node.isMesh);
      if (sourceMesh) {
        const replacement = sourceMesh.clone();
        replacement.geometry = sourceMesh.geometry.clone();
        replacement.material = Array.isArray(sourceMesh.material) ? sourceMesh.material.map(m => m.clone()) : sourceMesh.material.clone();
        if (oldMesh && baselineMesh) {
          oldMesh.updateMatrix(); baselineMesh.updateMatrix(); sourceMesh.updateMatrix();
          const transform = oldMesh.matrix.clone().multiply(baselineMesh.matrix.clone().invert()).multiply(sourceMesh.matrix);
          transform.decompose(replacement.position, replacement.quaternion, replacement.scale);
          const oldColor = baselineMesh.material?.color?.getHex();
          const newColor = sourceMesh.material?.color?.getHex();
          if (oldColor === newColor) {
            if (Array.isArray(replacement.material)) replacement.material.forEach(m => m.dispose()); else replacement.material.dispose();
            replacement.material = Array.isArray(oldMesh.material) ? oldMesh.material.map(m => m.clone()) : oldMesh.material.clone();
          }
        }
        const meshIndex = oldMesh ? old.children.indexOf(oldMesh) : 0;
        if (oldMesh) {
          old.updateWorldMatrix(true, true);
          for (const child of [...oldMesh.children]) old.attach(child);
          old.remove(oldMesh);
          disposeGroup(oldMesh);
        }
        old.add(replacement);
        // Keep the generated mesh before manual attachments across patches.
        old.children.splice(old.children.indexOf(replacement), 1);
        old.children.splice(meshIndex, 0, replacement);
      }
      // Keep user rotation/scale on an existing joint; update generated offsets.
      const base = baseline.get(name);
      if (base) old.position.add(source.position.clone().sub(base.position));
    } else {
      const added = new THREE.Group();
      added.name = source.name;
      added.userData = copy(source.userData);
      delete added.userData.agentId;
      ensureAgentId(added);
      const transform = source.matrix.clone();
      transform.decompose(added.position, added.quaternion, added.scale);
      const mesh = source.children.find(node => node.isMesh);
      if (mesh) {
        const cloned = mesh.clone();
        cloned.geometry = mesh.geometry.clone();
        cloned.material = Array.isArray(mesh.material) ? mesh.material.map(m => m.clone()) : mesh.material.clone();
        added.add(cloned);
      }
      parent.add(added);
      current.set(name, added);
    }
  }
}

function recolor(next, color, names) {
  const map = pivotMap(next);
  for (const name of names) {
    const mesh = map.get(name)?.children.find(node => node.isMesh);
    if (!mesh) continue;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material?.color?.set(color);
    mesh.userData.color = color;
  }
}

function patchStudio(group, previous, patch) {
  const recipe = validated(merge(previous, patch));
  const next = cloneEditable(group);
  const parts = new Set();
  if (patch.style !== undefined || patch.body !== undefined) {
    parts.add('body');
    if (recipe.body.profile !== 'classic' || previous.body.profile !== 'classic') { parts.add('outfit'); parts.add('equipment.sword'); parts.add('equipment.pauldron'); }
  }
  if (patch.head?.style !== undefined || patch.head?.profile !== undefined || patch.head?.jaw !== undefined) { parts.add('head'); parts.add('hair'); }
  if (patch.hair !== undefined) parts.add('hair');
  if (patch.outfit?.style !== undefined) parts.add('outfit');
  if (patch.equipment?.sword !== undefined) parts.add('equipment.sword');
  if (patch.equipment?.pauldron !== undefined) parts.add('equipment.pauldron');
  if (recipe.head.scale !== previous.head.scale) {
    const head = findJoint(next, 'HEAD');
    if (!head) fail('HEAD_JOINT_MISSING', 'The character is missing its HEAD joint.');
    const ratio = recipe.head.scale / previous.head.scale;
    head.scale.multiplyScalar(ratio);
    next.userData.characterDesignHeadJointScale = (next.userData.characterDesignHeadJointScale || 1) * ratio;
  }
  if (parts.size) {
    const freshRecipe = copy(recipe);
    freshRecipe.head.scale /= next.userData.characterDesignHeadJointScale || 1;
    const fresh = buildCharacterDesignGroup(freshRecipe);
    const baselineRecipe = copy(previous);
    baselineRecipe.head.scale /= group.userData.characterDesignHeadJointScale || 1;
    const previousFresh = buildCharacterDesignGroup(baselineRecipe);
    try {
      replaceParts(next, fresh, previousFresh, parts);
      if (parts.has('body') && !parts.has('head')) {
        const head = findJoint(next, 'HEAD');
        const oldHead = findJoint(previousFresh, 'HEAD');
        const newHead = findJoint(fresh, 'HEAD');
        if (head && oldHead && newHead) head.position.add(newHead.position.clone().sub(oldHead.position));
      }
    } finally { disposeGroup(fresh); disposeGroup(previousFresh); }
  }
  if (patch.outfit?.shirt !== undefined || patch.outfit?.style !== undefined) {
    recolor(next, recipe.outfit.shirt, ['TORSO', ...(recipe.body.profile === 'plumber' ? ['ARM_L_LOWER', 'ARM_R_LOWER'] : [])]);
    recolor(next, (recipe.outfit.style === 'sleeveless' || recipe.outfit.style === 'soldier') ? recipe.skin : recipe.outfit.shirt, ['ARM_L_UPPER', 'ARM_R_UPPER']);
  }
  if (patch.outfit?.shirt !== undefined) {
    const shirtPieces = recipe.outfit.style === 'soldier' ? ['OUTFIT_COLLAR'] : recipe.outfit.style === 'overalls' ? [] : [...pivotMap(next).keys()].filter(name => partForName(name) === 'outfit');
    recolor(next, recipe.outfit.shirt, shirtPieces);
  }
  if (patch.outfit?.pants !== undefined && recipe.outfit.style === 'overalls') recolor(next, recipe.outfit.pants, ['OUTFIT_BIB', 'OUTFIT_STRAP_L', 'OUTFIT_STRAP_R', 'OUTFIT_BIB_BACK', 'OUTFIT_STRAP_BACK_L', 'OUTFIT_STRAP_BACK_R']);
  if (patch.outfit?.pants !== undefined) recolor(next, recipe.outfit.pants, ['PELVIS', 'LEG_L_UPPER', 'LEG_R_UPPER', ...(recipe.body.profile === 'heroic' ? [] : ['LEG_L_LOWER', 'LEG_R_LOWER'])]);
  if (patch.outfit?.shoes !== undefined) recolor(next, recipe.outfit.shoes, ['FOOT_L', 'FOOT_R', ...(recipe.body.profile === 'heroic' ? ['LEG_L_LOWER', 'LEG_R_LOWER'] : [])]);
  if (patch.skin !== undefined) {
    recolor(next, recipe.skin, ['HEAD', 'NOSE', 'EAR_L', 'EAR_R', 'NECK', ...(recipe.body.profile === 'plumber' ? [] : ['ARM_L_LOWER', 'ARM_R_LOWER', 'HAND_L', 'HAND_R']), ...(recipe.head.profile === 'plumber' ? ['FACE_CHEEK_L', 'FACE_CHEEK_R'] : []), ...((recipe.outfit.style === 'sleeveless' || recipe.outfit.style === 'soldier') ? ['ARM_L_UPPER', 'ARM_R_UPPER'] : [])]);
  }
  next.name = recipe.name;
  next.userData.name = recipe.name;
  next.userData.characterDesignRecipe = copy(recipe);
  const model = createCharacterDesignModel(recipe);
  next.userData.retroCharacterRecipe = copy(model.retroCharacterRecipe);
  // Preserve slot membership for manual attachments while adding new generated names.
  const converted = characterModelToPieces(model);
  const aliveNames = new Set(pivotMap(next).keys());
  for (const [slot, names] of Object.entries(converted.slotMap)) next.userData.slotMap[slot] = [...new Set([...(next.userData.slotMap[slot] || []), ...names])].filter(name => aliveNames.has(name));
  rebuildRigAnimationsForGroup(next, { skeletonId: next.userData.skeletonId, animationProfile: next.userData.animationProfile });
  next.updateMatrixWorld(true);
  return { group: next, recipe };
}

function patchForge(group, previous, patch) {
  const allowed = Object.keys(patch).every(key => key === 'name' || key === 'head');
  if (!allowed || (patch.head && Object.keys(patch.head).some(key => key !== 'scale'))) {
    fail('FORGE_PATCH_NOT_SUPPORTED', 'Avatar Forge drafts currently support name and head.scale. Use Avatar Forge controls for its face, body and hair catalog; Studio drafts support all semantic parts.');
  }
  const next = cloneEditable(group);
  const recipe = copy(previous);
  if (patch.name !== undefined) { recipe.label = patch.name; next.userData.name = patch.name; next.name = patch.name; }
  if (patch.head?.scale !== undefined) {
    const head = findJoint(next, 'HEAD') || findJoint(next, 'Head');
    if (!head) fail('HEAD_JOINT_MISSING', 'Avatar Forge head joint was not found.');
    head.scale.multiplyScalar(patch.head.scale / (recipe.headScale || 1));
    recipe.headScale = patch.head.scale;
  }
  next.userData.avatarRecipe = copy(recipe);
  return { group: next, recipe };
}

async function buildDraft(args) {
  if (args.source_id && args.catalog_id) fail('AMBIGUOUS_CHARACTER_SOURCE', 'Supply source_id or catalog_id, not both.');
  let group, recipe, engine = 'studio', sourceFingerprint = null;
  if (args.source_id) {
    const source = requireSource(args.source_id);
    let skinned = false;
    source.traverse(node => { if (node.isSkinnedMesh) skinned = true; });
    if (skinned) fail('ANIMATED_COPY_NOT_EDITABLE', 'Edit the original articulated character, then create a new compatible animated copy. Skin weights cannot be regenerated by semantic part edits.');
    ({ recipe, engine } = recipeFor(source));
    sourceFingerprint = fingerprint(source);
    group = cloneEditable(source);
  } else if (args.catalog_id) {
    const entry = catalogEntry(args.catalog_id);
    engine = entry.engine;
    if (engine === 'avatar-forge') {
      const { buildAvatarGroup } = await import('../avatar/avatar-builder.js');
      group = await buildAvatarGroup(copy(entry.recipe));
      recipe = copy(group.userData.avatarRecipe);
    } else {
      recipe = validated(entry.recipe);
      group = buildCharacterDesignGroup(recipe);
    }
  } else {
    recipe = validated(args.recipe || {});
    group = buildCharacterDesignGroup(recipe);
  }
  try {
    if (args.recipe && (args.source_id || args.catalog_id)) {
      const result = engine === 'studio' ? patchStudio(group, recipe, args.recipe) : patchForge(group, recipe, args.recipe);
      disposeGroup(group);
      ({ group, recipe } = result);
    }
    return characterDrafts.describe(characterDrafts.create({ group, recipe, engine, sourceId: args.source_id || null, sourceFingerprint }));
  } catch (error) { disposeGroup(group); throw error; }
}

export function evaluateCharacterGroup(group) {
  group.updateMatrixWorld(true);
  let triangles = 0, meshCount = 0;
  const issues = [];
  const names = new Set();
  group.traverse(node => {
    if (node.userData?.isPivot || node.isBone) {
      const name = named(node);
      if (names.has(name)) issues.push({ severity: 'error', code: 'DUPLICATE_JOINT', part: name });
      names.add(name);
    }
    if (!node.isMesh || !node.geometry) return;
    meshCount += 1;
    triangles += (node.geometry.index?.count || node.geometry.attributes.position?.count || 0) / 3;
    if (!node.matrixWorld.elements.every(Number.isFinite)) issues.push({ severity: 'error', code: 'NONFINITE_TRANSFORM', part: named(node) });
  });
  const forge = Boolean(group.userData.avatarRecipe);
  for (const joint of forge ? ['HEAD', 'PELVIS'] : ['HEAD', 'PELVIS', 'HAND_L', 'HAND_R', 'FOOT_L', 'FOOT_R']) {
    if (!names.has(joint)) issues.push({ severity: 'error', code: 'MISSING_JOINT', part: joint });
  }
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || ![...bounds.min, ...bounds.max].every(Number.isFinite)) issues.push({ severity: 'error', code: 'INVALID_BOUNDS' });
  if (triangles > 12000) issues.push({ severity: 'warning', code: 'TRIANGLE_BUDGET', message: 'Above the suggested 12,000 triangle review budget.' });
  const inverseRoot = group.matrixWorld.clone().invert();
  for (const mesh of [...pivotMap(group).values()].filter(node => /SWORD/.test(named(node)))) {
    let ancestor = mesh.parent;
    while (ancestor && !['HAND_R', 'Right_Hand'].includes(named(ancestor))) ancestor = ancestor.parent;
    if (!ancestor) issues.push({ severity: 'error', code: 'SWORD_UNANCHORED', part: named(mesh) });
  }
  const localMin = bounds.min.clone().applyMatrix4(inverseRoot);
  if (!forge && localMin.y < -0.05) issues.push({ severity: 'warning', code: 'BELOW_GROUND', message: 'A part extends below the feet; inspect the side view.' });
  return { valid: !issues.some(issue => issue.severity === 'error'), triangles: Math.round(triangles), meshCount, jointCount: names.size, bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: size.toArray() }, issues, visualReviewRequired: true, note: 'Structural measurements only. Inspect silhouette, face, intersections and likeness in the three images; no automatic aesthetic score is claimed.' };
}

async function renderViews(group, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const runtime = createAvatarPreviewRuntime(canvas);
  const display = cloneEditable(group);
  // Scene translation does not affect framing. Keep the model's authored facing.
  display.position.set(0, 0, 0);
  display.rotation.set(0, display.userData.avatarRecipe || display.userData.sourceAvatarRecipe ? Math.PI : 0, 0);
  runtime.scene.add(display);
  runtime.renderer.setSize(size, size, false);
  runtime.camera.aspect = 1;
  runtime.camera.updateProjectionMatrix();
  display.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(display);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 0.5);
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(runtime.camera.fov / 2)) * 1.12;
  const views = [];
  try {
    for (const [view, direction] of [['front', [0, 0, 1]], ['profile', [1, 0, 0]], ['three-quarter', [0.75, 0.15, 1]]]) {
      runtime.camera.position.copy(center).add(new THREE.Vector3(...direction).normalize().multiplyScalar(distance));
      runtime.camera.near = Math.max(0.01, distance - radius * 1.5);
      runtime.camera.far = distance + radius * 2 + 20;
      runtime.camera.updateProjectionMatrix();
      runtime.camera.lookAt(center);
      runtime.renderer.render(runtime.scene, runtime.camera);
      views.push({ view, mimeType: 'image/png', width: size, height: size, data: canvas.toDataURL('image/png').split(',')[1] });
    }
    return views;
  } finally {
    disposeGroup(display);
    runtime.controls.dispose();
    runtime.scene.traverse(node => { if (node !== display && node.isLineSegments) { node.geometry?.dispose(); node.material?.dispose(); } });
    runtime.renderer.dispose();
    runtime.renderer.forceContextLoss();
  }
}

function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  const parts = [];
  for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(parts.join(''));
}

export function createCharacterCommandHandlers({ syncUi, selectObject, deselectAll }) {
  const success = (name, data, ids = []) => makeSuccessResult(name, data, { changedIds: ids });
  return {
    get_character_capabilities: async () => success('get_character_capabilities', {
      version: 1, schema: CHARACTER_DESIGN_SCHEMA, engines: [
        { id: 'studio', styles: ['psx', 'n64'], parts: ['body', 'head', 'hair', 'outfit', 'equipment.sword', 'equipment.pauldron'], recipeSchema: 'See the complete schema artifact and the tool input fields.' },
        { id: 'avatar-forge', catalog: 'search_character_catalog engine=avatar-forge', draftEdits: ['name', 'head.scale'], detailedEdits: 'Use the Avatar Forge panel for its face, hair and body controls.' },
      ],
      coordinates: { units: 'Retrovisor scene units; default body height about 4', up: '+Y', front: '+Z in the Studio model', left: '-X in Studio local coordinates (named anatomical side)', angles: 'degrees in agent transform tools, radians in saved model transforms', equipment: 'Generated relative to HAND_R and the chosen shoulder joint; do not detach them.' },
      workflow: ['get_character_capabilities', 'build_character_draft', 'render_character_views', 'evaluate_character', 'patch_character_draft (up to 3 corrections)', 'commit_character_draft (choose the best revision)', 'export_character_asset'],
      maxCorrections: 3, maxOpenDrafts: 6, drafts: [...characterDrafts.drafts.values()].map(draft => characterDrafts.describe(draft)),
      examples: CHARACTER_STARTERS,
      quickStart: {
        build: { catalog_id: 'studio:psx-swordsman', operation_id: 'create-swordsman-unique-001' },
        readCatalog: { catalog_id: 'studio:psx-swordsman' },
        addSword: { equipment: { sword: { enabled: true, width: 0.58 } } },
        reduceHead: { head: { scale: 0.8 } },
        note: 'Omit source_id when creating. Recipes may omit format and version; defaults are retrovisor-character-design and 1.',
      },
      preservation: 'Patch only requested fields. HEAD scaling preserves its manual descendants. Edits outside changed parts keep IDs and geometry. Commit refuses a manually modified source.',
    }),
    search_character_catalog: async args => {
      const terms = args.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const matches = catalog().filter(entry => (args.engine === 'all' || entry.engine === args.engine) && terms.every(term => `${entry.id} ${entry.label} ${entry.tags.join(' ')}`.toLocaleLowerCase().includes(term)));
      return success('search_character_catalog', { total: matches.length, items: matches.slice(0, args.limit).map(({ recipe, ...entry }) => entry), truncated: matches.length > args.limit });
    },
    get_character_recipe: async args => {
      if (args.catalog_id) {
        if (args.id || args.draft_id) fail('AMBIGUOUS_CHARACTER_TARGET', 'Supply catalog_id or a character target.');
        const entry = catalogEntry(args.catalog_id);
        return success('get_character_recipe', { ...entry, recipe: entry.engine === 'studio' ? validated(entry.recipe) : copy(entry.recipe) });
      }
      const resolved = target(args);
      return success('get_character_recipe', { id: args.id, draftId: args.draft_id, engine: resolved.engine, revision: resolved.revision, recipe: resolved.recipe, ...(resolved.draft ? { revisions: resolved.draft.versions.map((_, index) => index) } : {}) });
    },
    validate_character_recipe: async args => success('validate_character_recipe', validateCharacterDesign(args.recipe)),
    build_character_draft: args => characterDrafts.once('build_character_draft', args, async () => success('build_character_draft', await buildDraft(args))),
    patch_character_draft: args => characterDrafts.once('patch_character_draft', args, async () => {
      const draft = characterDrafts.get(args.draft_id, args.expected_revision);
      if (draft.revision >= characterDrafts.maxCorrections) fail('CORRECTION_LIMIT', 'Review and commit the best of the four existing revisions, or discard the draft.');
      if (!Object.keys(args.patch).length) fail('EMPTY_CHARACTER_PATCH', 'Supply at least one recipe field to change.');
      const current = characterDrafts.version(draft);
      const updated = draft.engine === 'studio' ? patchStudio(current.group, current.recipe, args.patch) : patchForge(current.group, current.recipe, args.patch);
      characterDrafts.append(draft, updated);
      return success('patch_character_draft', characterDrafts.describe(draft));
    }),
    render_character_views: async args => {
      const resolved = target(args);
      return success('render_character_views', { id: args.id, draftId: args.draft_id, revision: resolved.revision, views: await renderViews(resolved.group, args.size) });
    },
    evaluate_character: async args => {
      const resolved = target(args);
      return success('evaluate_character', { id: args.id, draftId: args.draft_id, revision: resolved.revision, ...evaluateCharacterGroup(resolved.group) });
    },
    commit_character_draft: args => characterDrafts.once('commit_character_draft', args, async () => {
      const draft = characterDrafts.get(args.draft_id, args.expected_revision);
      const { group } = characterDrafts.version(draft, args.chosen_revision);
      const evaluation = evaluateCharacterGroup(group);
      if (!evaluation.valid) fail('CHARACTER_NOT_READY', 'Fix structural errors before committing.', evaluation.issues);
      const original = draft.sourceId ? requireSource(draft.sourceId) : null;
      if (original && fingerprint(original) !== draft.sourceFingerprint) fail('SOURCE_CONFLICT', 'The source character changed while this draft was open. Your manual work is intact; build a new draft from the current source.');
      const parent = state.userObjects;
      const index = original ? parent.children.indexOf(original) : parent.children.length;
      group.userData.characterDesignRevision = (original?.userData.characterDesignRevision || 0) + 1;
      if (original) group.userData.agentId = ensureAgentId(original);
      function install(remove, add) {
        deselectAll();
        remove?.removeFromParent();
        if (add) {
          parent.add(add);
          const currentIndex = parent.children.indexOf(add);
          parent.children.splice(currentIndex, 1);
          parent.children.splice(Math.min(index, parent.children.length), 0, add);
          normalizeAgentIds(parent);
          selectObject(add);
        }
        syncUi();
      }
      install(original, group);
      pushAction({ type: 'Personaje del asistente', undo: () => install(group, original), redo: () => install(original, group) });
      characterDrafts.release(draft.id, group);
      const id = ensureAgentId(group);
      return success('commit_character_draft', { id, revision: group.userData.characterDesignRevision, chosenRevision: args.chosen_revision ?? draft.revision, recipe: recipeFor(group).recipe, undoable: true }, [id]);
    }),
    discard_character_draft: args => characterDrafts.once('discard_character_draft', args, async () => {
      characterDrafts.get(args.draft_id, args.expected_revision);
      characterDrafts.release(args.draft_id);
      return success('discard_character_draft', { draftId: args.draft_id, discarded: true, sceneChanged: false });
    }),
    export_character_asset: async args => {
      const resolved = target(args);
      const label = String(resolved.group.userData.name || 'personaje').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 80);
      if (args.format !== 'glb') {
        const definition = args.format === 'recipe' ? resolved.recipe : serializeGroupAsImportJSON(resolved.group);
        return success('export_character_asset', { id: args.id, draftId: args.draft_id, revision: resolved.revision, format: args.format, filename: `${label}${args.format === 'recipe' ? '.recipe' : ''}.json`, mimeType: 'application/json', definition });
      }
      const prepared = prepareObjectForGlbExport(resolved.group);
      try {
        const buffer = await new GLTFExporter().parseAsync(prepared.object, { binary: true, animations: prepared.clips });
        return success('export_character_asset', { id: args.id, draftId: args.draft_id, revision: resolved.revision, format: 'glb', filename: `${label}.glb`, mimeType: 'model/gltf-binary', data: base64(buffer) });
      } finally {
        const sourceGeometries = new Set();
        resolved.group.traverse(node => { if (node.geometry) sourceGeometries.add(node.geometry); });
        prepared.object.traverse(node => {
          if (node.geometry && !sourceGeometries.has(node.geometry)) node.geometry.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.filter(Boolean).forEach(material => material.dispose());
        });
      }
    },
  };
}
