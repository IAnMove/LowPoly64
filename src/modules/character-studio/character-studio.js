import * as THREE from 'three';
import { buildGroupFromDefinition } from '../viewport/templates.js';
import { characterModelToPieces } from '../viewport/character-model.js';
import { rebuildRigAnimationsForGroup } from '../animation/rigging-utils.js';
import { createAvatarPreviewRuntime, frameAvatarPreviewCamera, resizeAvatarPreviewViewport } from '../avatar/avatar-preview-runtime.js';
import { state } from '../shared/state.js';
import { getLang } from '../shared/i18n.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { pushAction } from '../shared/undo.js';
import { emit } from '../../event-bus.js';
import {
  createRetroBodyModel,
  createRetroCharacterModel,
  normalizeRetroCharacterRecipe,
  validateRetroCharacterRecipe,
} from './character-model.js';

const STUDIO_MODAL_ID = 'retro-character-studio-modal';
const STUDIO_PREVIEW_CANVAS_ID = 'retro-character-studio-preview';

const UI_TEXT = Object.freeze({
  en: {
    title: 'RETRO CHARACTER STUDIO',
    subtitle: 'Build a reusable PSX or N64 body and swap heads without losing edits.',
    style: 'Body style',
    headStyle: 'Head style',
    hair: 'Hair',
    short: 'Short',
    spiky: 'Spiky',
    none: 'None',
    headScale: 'Head scale',
    bodyHeight: 'Body height',
    bodyWidth: 'Body width',
    palette: 'Palette',
    skin: 'Skin',
    hairColor: 'Hair',
    shirt: 'Shirt',
    pants: 'Pants',
    shoes: 'Shoes',
    create: 'CREATE CHARACTER',
    body: 'CREATE REUSABLE BODY',
    apply: 'APPLY HEAD TO SELECTED',
    close: 'CLOSE',
    idle: 'IDLE',
    triangles: 'triangles',
    noTarget: 'Select a retro body or character first.',
    applyHint: 'Select a retro body to apply a head.',
    applied: 'Head applied without changing the body.',
  },
  es: {
    title: 'ESTUDIO DE PERSONAJES RETRO',
    subtitle: 'Crea un cuerpo PSX o N64 reutilizable y cambia la cabeza sin perder ediciones.',
    style: 'Estilo del cuerpo',
    headStyle: 'Estilo de cabeza',
    hair: 'Pelo',
    short: 'Corto',
    spiky: 'Puntiagudo',
    none: 'Sin pelo',
    headScale: 'Escala de cabeza',
    bodyHeight: 'Altura del cuerpo',
    bodyWidth: 'Anchura del cuerpo',
    palette: 'Paleta',
    skin: 'Piel',
    hairColor: 'Pelo',
    shirt: 'Camiseta',
    pants: 'Pantalón',
    shoes: 'Zapatos',
    create: 'CREAR PERSONAJE',
    body: 'CREAR CUERPO REUTILIZABLE',
    apply: 'APLICAR CABEZA AL SELECCIONADO',
    close: 'CERRAR',
    idle: 'IDLE',
    triangles: 'triángulos',
    noTarget: 'Selecciona primero un cuerpo o personaje retro.',
    applyHint: 'Selecciona un cuerpo para aplicar la cabeza.',
    applied: 'Cabeza aplicada sin cambiar el cuerpo.',
  },
});

let studioState = null;

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function modelToDefinition(model) {
  const converted = characterModelToPieces(model);
  return {
    name: model.name,
    pieces: converted.pieces,
  };
}

function markRetroGroup(group, model) {
  const converted = characterModelToPieces(model);
  group.name = model.name;
  group.userData.name = model.name;
  group.userData.isRetroCharacter = true;
  group.userData.retroCharacterRoot = true;
  group.userData.retroCharacterRecipe = cloneValue(model.retroCharacterRecipe);
  if (model.characterDesignRecipe) group.userData.characterDesignRecipe = cloneValue(model.characterDesignRecipe);
  group.userData.retroCharacterModelFormat = model.format;
  group.userData.retroCharacterModelVersion = model.version;
  group.userData.archetype = model.archetype;
  group.userData.slotMap = cloneValue(converted.slotMap);
  group.userData.animationProfile = model.animationProfile;
  group.userData.skeletonId = model.skeletonId;
  group.userData.slotBindings = cloneValue(model.slotBindings);
  group.userData.humanoidRigMode = 'canonical';
  return group;
}

function buildRetroGroupFromModel(model) {
  const group = buildGroupFromDefinition(modelToDefinition(model), { compileAnimations: false });
  markRetroGroup(group, model);
  rebuildRigAnimationsForGroup(group, {
    skeletonId: model.skeletonId,
    animationProfile: model.animationProfile,
  });
  return group;
}

/** Build a complete editable low-poly character group with a standard rig. */
export function buildRetroCharacterGroup(recipe = {}) {
  const model = createRetroCharacterModel(recipe);
  return buildRetroGroupFromModel(model);
}

/** Build a headless reusable body. Its HEAD pivot remains ready for attachment. */
export function buildRetroBodyGroup(recipe = {}) {
  const model = createRetroBodyModel(recipe);
  return buildRetroGroupFromModel(model);
}

function findNamedNode(root, name) {
  if (!root) return null;
  const wanted = String(name || '').trim().toUpperCase();
  let exactPivot = null;
  let exactAny = null;
  root.traverse((node) => {
    const nodeName = String(node.userData?.name || node.name || '').trim().toUpperCase();
    if (nodeName !== wanted) return;
    if (!exactAny) exactAny = node;
    if (node.userData?.isPivot && !exactPivot) exactPivot = node;
  });
  return exactPivot || exactAny;
}

function resolveRetroRoot(target) {
  if (!target) return null;
  let cursor = target;
  let candidate = null;
  while (cursor) {
    if (cursor.userData?.retroCharacterRecipe || cursor.userData?.isRetroCharacter) {
      candidate = cursor;
    }
    cursor = cursor.parent;
  }
  return candidate || null;
}

function disposeObject3D(object) {
  if (!object) return;
  object.traverse((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.filter(Boolean).forEach((material) => material.dispose?.());
  });
}

function mergeHeadRecipe(root, patch = {}) {
  const previous = normalizeRetroCharacterRecipe(root?.userData?.retroCharacterRecipe || {});
  const next = patch && typeof patch === 'object' ? patch : {};
  return normalizeRetroCharacterRecipe({
    ...previous,
    headStyle: next.headStyle ?? previous.headStyle,
    headScale: next.headScale ?? previous.headScale,
    hair: next.hair ?? previous.hair,
    colors: {
      ...previous.colors,
      ...(next.colors?.skin !== undefined ? { skin: next.colors.skin } : {}),
      ...(next.colors?.hair !== undefined ? { hair: next.colors.hair } : {}),
    },
    includeHead: true,
  });
}

/**
 * Replace only the contents below a body's HEAD joint. Existing body pivots,
 * transforms and manual body children remain untouched.
 */
export function applyRetroHeadToGroup(target, headRecipe = {}, { emitChange = true, recordUndo = true } = {}) {
  const root = resolveRetroRoot(target);
  if (!root) return { ok: false, error: 'Selected object is not a retro character.' };
  const targetHead = findNamedNode(root, 'HEAD');
  if (!targetHead) return { ok: false, error: 'Retro character is missing its HEAD joint.' };

  const previousChildren = [...targetHead.children];
  const previousRecipe = cloneValue(root.userData.retroCharacterRecipe || {});
  const previousSlotMap = cloneValue(root.userData.slotMap || {});
  const previousAnimations = root.userData.animations;
  const previousAnimationClips = root.userData.animationClips;
  const nextRecipe = mergeHeadRecipe(root, headRecipe);
  const source = buildRetroCharacterGroup(nextRecipe);
  const sourceHead = findNamedNode(source, 'HEAD');
  if (!sourceHead) {
    disposeObject3D(source);
    return { ok: false, error: 'Could not build the replacement head.' };
  }

  // Move the newly built children into the target. Cloning here would share
  // geometry/material resources with the temporary source and make disposing
  // that source invalidate the live replacement.
  const nextChildren = [...sourceHead.children];
  nextChildren.forEach((child) => sourceHead.remove(child));
  previousChildren.forEach((child) => targetHead.remove(child));
  nextChildren.forEach((child) => targetHead.add(child));

  const nextSlotMap = {
    ...cloneValue(root.userData.slotMap || {}),
    HEAD: [...(source.userData.slotMap?.HEAD || ['HEAD'])],
  };
  root.userData.retroCharacterRecipe = cloneValue(nextRecipe);
  root.userData.retroCharacterModelFormat = 'retrovisor-character-model';
  root.userData.retroCharacterModelVersion = 1;
  root.userData.slotMap = nextSlotMap;

  // Native GLB roots own real AnimationClip instances. Their target names stay
  // stable when only HEAD descendants change, so retain those clips verbatim.
  if (!root.userData.nativeGltf) {
    rebuildRigAnimationsForGroup(root, {
      skeletonId: root.userData.skeletonId || 'HUMANOID_STANDARD',
      animationProfile: root.userData.animationProfile || 'HUMANOID_STANDARD_AVATAR_BASE',
    });
  }
  const nextAnimations = root.userData.animations;
  const nextAnimationClips = root.userData.animationClips;

  const restore = (children, recipe, slotMap, animations, animationClips) => {
    [...targetHead.children].forEach((child) => targetHead.remove(child));
    children.forEach((child) => targetHead.add(child));
    root.userData.retroCharacterRecipe = cloneValue(recipe);
    root.userData.slotMap = cloneValue(slotMap);
    if (root.userData.nativeGltf) {
      root.userData.animations = animations;
      root.userData.animationClips = animationClips;
    } else {
      rebuildRigAnimationsForGroup(root, {
        skeletonId: root.userData.skeletonId || 'HUMANOID_STANDARD',
        animationProfile: root.userData.animationProfile || 'HUMANOID_STANDARD_AVATAR_BASE',
      });
    }
    emit('scene:objects-changed');
  };

  if (recordUndo) {
    pushAction({
      type: 'Apply retro head',
      undo: () => restore(previousChildren, previousRecipe, previousSlotMap, previousAnimations, previousAnimationClips),
      redo: () => restore(nextChildren, nextRecipe, nextSlotMap, nextAnimations, nextAnimationClips),
    });
  }

  // The source no longer owns the moved head children, so disposal is safe.
  disposeObject3D(source);
  if (emitChange) emit('scene:objects-changed');
  return {
    ok: true,
    group: root,
    recipe: cloneValue(nextRecipe),
    previousChildren,
    nextChildren,
  };
}
/** Apply a selected head recipe while preserving the currently selected body's edits. */
export function applyRetroHeadToSelected(headRecipe = {}) {
  const result = applyRetroHeadToGroup(state.selectedMesh, headRecipe);
  if (!result.ok && typeof document !== 'undefined') {
    const message = UI_TEXT[getLang()]?.noTarget || UI_TEXT.en.noTarget;
    document.dispatchEvent(new CustomEvent('retro-character-studio:error', { detail: result.error || message }));
  }
  return result;
}

function insertGroupIntoScene(group, { parent = state.userObjects, position = null, select = true, recordUndo = true } = {}) {
  if (!parent?.add) return null;
  if (Array.isArray(position) && position.length === 3) group.position.set(position[0], position[1], position[2]);
  parent.add(group);
  if (select) selectMesh(group);
  if (recordUndo) {
    pushAction({
      type: 'Create retro character',
      undo: () => {
        if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect();
        parent.remove(group);
      },
      redo: () => {
        parent.add(group);
        if (select) selectMesh(group);
      },
    });
  }
  emit('scene:objects-changed');
  return group;
}

/** Insert an authored design through the existing scene/undo/rig path. */
export function insertCharacterDesignModel(model, options = {}) {
  return insertGroupIntoScene(buildRetroGroupFromModel(model), options);
}

export function insertRetroCharacter(recipe = {}, options = {}) {
  return insertGroupIntoScene(buildRetroCharacterGroup(recipe), options);
}

export function insertRetroBody(recipe = {}, options = {}) {
  return insertGroupIntoScene(buildRetroBodyGroup(recipe), options);
}

function countTriangles(root) {
  let total = 0;
  root?.traverse?.((node) => {
    if (!node.isMesh || !node.geometry) return;
    const index = node.geometry.index;
    const position = node.geometry.attributes?.position;
    total += index ? index.count / 3 : (position ? position.count / 3 : 0);
  });
  return Math.round(total);
}

function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') element.className = value;
    else if (key === 'textContent') element.textContent = value;
    else if (key === 'htmlFor') element.htmlFor = value;
    else if (key === 'style' && value && typeof value === 'object') Object.assign(element.style, value);
    else element.setAttribute(key, value);
  });
  children.forEach((child) => element.append(child));
  return element;
}

function studioText(key) {
  const lang = getLang();
  return UI_TEXT[lang]?.[key] || UI_TEXT.en[key] || key;
}

function styleOptions(select, current) {
  select.append(
    createElement('option', { value: 'n64', textContent: 'N64' }),
    createElement('option', { value: 'psx', textContent: 'PSX' }),
  );
  select.value = current;
}

function createStudioModal(initialRecipe) {
  const recipe = normalizeRetroCharacterRecipe({ ...initialRecipe, includeHead: true });
  const modal = createElement('div', {
    id: STUDIO_MODAL_ID,
    style: {
      position: 'fixed', inset: '0', zIndex: '1000', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '18px',
      background: 'rgba(5, 5, 12, 0.82)', fontFamily: 'monospace', color: '#f8f4e8',
    },
  });
  const panel = createElement('div', {
    style: {
      display: 'grid', gridTemplateColumns: 'minmax(320px, 430px) minmax(280px, 360px)',
      gap: '18px', width: 'min(820px, 96vw)', maxHeight: '92vh', overflow: 'auto',
      padding: '18px', border: '2px solid #e4bd4f', borderRadius: '10px',
      background: 'linear-gradient(150deg, #19152a, #0b0d18)', boxShadow: '0 18px 50px #000a',
    },
  });
  const previewColumn = createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
  const controlsColumn = createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '9px' } });
  const title = createElement('h2', { textContent: studioText('title'), style: { margin: '0', color: '#ffd65a', fontSize: '18px', letterSpacing: '1px' } });
  const subtitle = createElement('p', { textContent: studioText('subtitle'), style: { margin: '0 0 4px', color: '#b8b3c6', fontSize: '11px', lineHeight: '1.45' } });
  const canvas = createElement('canvas', {
    id: STUDIO_PREVIEW_CANVAS_ID,
    width: '430', height: '430',
    style: { width: '100%', minHeight: '330px', background: '#090b12', border: '1px solid #3b3551', borderRadius: '7px', imageRendering: 'pixelated' },
  });
  const triangleReadout = createElement('div', { style: { fontSize: '11px', color: '#9f9ab1', textAlign: 'right' } });
  previewColumn.append(title, subtitle, canvas, triangleReadout);

  const heroButton = createElement('button', {
    type: 'button', 'data-retro-preset': 'hero-psx',
    textContent: getLang() === 'es' ? 'NUEVO · HÉROE PSX / CLOUD' : 'NEW · PSX HERO / CLOUD',
    style: { padding: '12px 8px', color: '#17151e', background: '#e4bd4f', border: '1px solid #ffe697', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' },
  });
  heroButton.addEventListener('click', async () => {
    const target = resolveRetroRoot(state.selectedMesh);
    const { openHeroicStudio } = await import('./heroic-studio-panel.js');
    modalState.close();
    openHeroicStudio({ target, ...(target?.userData?.characterDesignRecipe?.body.profile === 'heroic' ? { recipe: target.userData.characterDesignRecipe } : {}) });
  });
  const marioButton = createElement('button', {
    type: 'button', 'data-retro-preset': 'mario64',
    textContent: getLang() === 'es' ? 'NUEVO · MARIO / N64' : 'NEW · MARIO / N64',
    style: { padding: '12px 8px', color: '#fff4e8', background: '#a92b3a', border: '1px solid #ea6775', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' },
  });
  marioButton.addEventListener('click', async () => {
    const target = resolveRetroRoot(state.selectedMesh);
    marioButton.disabled = true;
    marioButton.textContent = getLang() === 'es' ? 'Preparando Mario…' : 'Preparing Mario…';
    cancelAnimationFrame(modalState.frameId); modalState.frameId = null;
    try {
      const [{ openHeroicStudio }, { MARIO64_RECIPE }] = await Promise.all([import('./heroic-studio-panel.js'), import('./plumber-presets.js')]);
      modalState.close();
      openHeroicStudio({ target, recipe: target?.userData?.characterDesignRecipe?.body.profile === 'plumber' ? target.userData.characterDesignRecipe : MARIO64_RECIPE });
    } catch (error) {
      marioButton.disabled = false; marioButton.textContent = getLang() === 'es' ? 'Reintentar Mario / N64' : 'Retry Mario / N64';
      if (modal.isConnected) modalState.frameId = requestAnimationFrame(renderFrame);
      console.error('Mario studio:', error);
    }
  });
  const speechLink = createElement('button', {
    type: 'button', 'data-open-speech': 'true',
    textContent: getLang() === 'es' ? 'BOCAS Y VOZ · WEBCAM / VÍDEO' : 'SPEECH STUDIO · WEBCAM / VIDEO',
    style: { padding: '10px 8px', color: '#c8e9ed', background: '#213a43', border: '1px solid #557c86', borderRadius: '4px', textAlign: 'center', textDecoration: 'none', fontSize: '11px' },
  });
  speechLink.addEventListener('click', async () => {
    modalState.close();
    (await import('./speech/speech-studio.js')).openSpeechStudio();
  });
  controlsColumn.append(heroButton, marioButton, speechLink);
  const fields = {};
  const addSelect = (key, labelKey, options) => {
    const label = createElement('label', { style: { display: 'grid', gap: '4px', fontSize: '11px', color: '#c8c0d8' } });
    const caption = createElement('span', { textContent: studioText(labelKey) });
    const select = createElement('select', { 'data-retro-field': key, style: { padding: '7px', color: '#f8f4e8', background: '#211c32', border: '1px solid #564b72', borderRadius: '4px' } });
    options(select);
    label.append(caption, select);
    controlsColumn.append(label);
    fields[key] = select;
  };
  const addRange = (key, labelKey, min, max, step, value) => {
    const label = createElement('label', { style: { display: 'grid', gap: '4px', fontSize: '11px', color: '#c8c0d8' } });
    const row = createElement('span', { style: { display: 'flex', justifyContent: 'space-between' } });
    const caption = createElement('span', { textContent: studioText(labelKey) });
    const output = createElement('output', { textContent: String(value), style: { color: '#ffd65a' } });
    row.append(caption, output);
    const input = createElement('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(value), 'data-retro-field': key, style: { accentColor: '#e4bd4f' } });
    input.addEventListener('input', () => { output.textContent = input.value; updatePreview(); });
    label.append(row, input);
    controlsColumn.append(label);
    fields[key] = input;
  };
  addSelect('style', 'style', (select) => styleOptions(select, recipe.style));
  addSelect('headStyle', 'headStyle', (select) => styleOptions(select, recipe.headStyle));
  addSelect('hair', 'hair', (select) => {
    [['short', 'short'], ['spiky', 'spiky'], ['none', 'none']].forEach(([value, key]) => select.append(createElement('option', { value, textContent: studioText(key) })));
    select.value = recipe.hair;
  });
  addRange('headScale', 'headScale', 0.65, 1.45, 0.05, recipe.headScale);
  addRange('bodyHeight', 'bodyHeight', 2.8, 5.8, 0.1, recipe.bodyHeight);
  addRange('bodyWidth', 'bodyWidth', 1, 2.8, 0.05, recipe.bodyWidth);

  const paletteTitle = createElement('div', { textContent: studioText('palette'), style: { marginTop: '4px', color: '#ffd65a', fontSize: '11px', letterSpacing: '1px' } });
  controlsColumn.append(paletteTitle);
  [['skin', 'skin'], ['hair', 'hairColor'], ['shirt', 'shirt'], ['pants', 'pants'], ['shoes', 'shoes']].forEach(([key, labelKey]) => {
    const label = createElement('label', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#c8c0d8' } });
    label.append(createElement('span', { textContent: studioText(labelKey) }));
    const input = createElement('input', { type: 'color', value: recipe.colors[key], 'data-retro-color': key, style: { width: '42px', height: '24px', border: '0', background: 'transparent' } });
    input.addEventListener('input', updatePreview);
    label.append(input);
    controlsColumn.append(label);
    fields[`color:${key}`] = input;
  });

  const actions = createElement('div', { style: { display: 'grid', gap: '7px', marginTop: '7px' } });
  const actionButton = (key, kind = 'primary') => createElement('button', {
    type: 'button',
    textContent: studioText(key),
    style: {
      padding: '9px 8px', cursor: 'pointer', borderRadius: '4px', fontFamily: 'inherit', fontWeight: '700',
      color: kind === 'primary' ? '#16111f' : '#f8f4e8',
      background: kind === 'primary' ? '#e4bd4f' : '#272239',
      border: kind === 'primary' ? '1px solid #ffe697' : '1px solid #564b72',
    },
  });
  const createButton = actionButton('create');
  const bodyButton = actionButton('body', 'secondary');
  const applyButton = actionButton('apply', 'secondary');
  const hasApplyTarget = !!resolveRetroRoot(state.selectedMesh);
  applyButton.disabled = !hasApplyTarget;
  applyButton.setAttribute('aria-disabled', String(!hasApplyTarget));
  applyButton.style.opacity = hasApplyTarget ? '1' : '0.5';
  applyButton.style.cursor = hasApplyTarget ? 'pointer' : 'not-allowed';
  applyButton.title = hasApplyTarget ? '' : studioText('applyHint');
  const applyHint = createElement('div', {
    textContent: hasApplyTarget ? '' : studioText('applyHint'),
    'data-retro-apply-hint': 'true',
    style: { fontSize: '10px', lineHeight: '1.35', color: '#9f9ab1', textAlign: 'center', minHeight: '13px' },
  });
  const closeButton = actionButton('close', 'secondary');
  actions.append(createButton, bodyButton, applyButton, applyHint, closeButton);
  controlsColumn.append(actions);
  panel.append(previewColumn, controlsColumn);
  modal.append(panel);
  document.body.append(modal);

  const runtime = createAvatarPreviewRuntime(canvas);
  runtime.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const modalState = {
    modal,
    canvas,
    fields,
    runtime,
    previewGroup: null,
    mixer: null,
    frameId: null,
    triangleReadout,
    recipe,
    close() {
      if (modalState.frameId) cancelAnimationFrame(modalState.frameId);
      modalState.frameId = null;
      modalState.mixer?.stopAllAction?.();
      if (modalState.previewGroup) {
        runtime.scene.remove(modalState.previewGroup);
        disposeObject3D(modalState.previewGroup);
        modalState.previewGroup = null;
      }
      modalState.mixer = null;
      runtime.controls.dispose?.();
      runtime.renderer.dispose?.();
      modal.remove();
      if (studioState === modalState) studioState = null;
    },
  };

  function readRecipe() {
    const colors = {};
    Object.keys(recipe.colors).forEach((key) => { colors[key] = fields[`color:${key}`].value; });
    return normalizeRetroCharacterRecipe({
      ...recipe,
      style: fields.style.value,
      headStyle: fields.headStyle.value,
      hair: fields.hair.value,
      headScale: Number(fields.headScale.value),
      bodyHeight: Number(fields.bodyHeight.value),
      bodyWidth: Number(fields.bodyWidth.value),
      colors,
    });
  }

  function startPreviewAnimation(group) {
    modalState.mixer = new THREE.AnimationMixer(group);
    const clip = group.userData.animationClips?.find((entry) => entry.name === 'idle')
      || group.userData.animationClips?.[0];
    if (clip) modalState.mixer.clipAction(clip).play();
  }

  function renderFrame(timestamp) {
    if (!modalState.modal.isConnected) return;
    modalState.frameId = requestAnimationFrame(renderFrame);
    if (modalState.mixer) modalState.mixer.update(0.016);
    runtime.controls.update();
    runtime.renderer.render(runtime.scene, runtime.camera);
  }

  function updatePreview() {
    const nextRecipe = readRecipe();
    modalState.recipe = nextRecipe;
    const validation = validateRetroCharacterRecipe(nextRecipe);
    if (!validation.ok) return;
    const nextGroup = buildRetroCharacterGroup(nextRecipe);
    if (modalState.previewGroup) {
      runtime.scene.remove(modalState.previewGroup);
      disposeObject3D(modalState.previewGroup);
    }
    modalState.previewGroup = nextGroup;
    runtime.scene.add(nextGroup);
    modalState.mixer?.stopAllAction?.();
    startPreviewAnimation(nextGroup);
    resizeAvatarPreviewViewport(canvas.parentElement || canvas, runtime.renderer, runtime.camera, true);
    frameAvatarPreviewCamera(nextGroup, { camera: runtime.camera, controls: runtime.controls });
    const bounds = new THREE.Box3().setFromObject(nextGroup);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const distance = Math.max(size.y * 1.25, size.z * 3.2, 5.4);
    runtime.controls.target.copy(center);
    runtime.camera.position.set(center.x, center.y + size.y * 0.03, center.z + distance);
    runtime.camera.lookAt(center);
    runtime.controls.update();
    triangleReadout.textContent = `${countTriangles(nextGroup)} ${studioText('triangles')}`;
  }

  fields.style.addEventListener('change', updatePreview);
  fields.headStyle.addEventListener('change', updatePreview);
  fields.hair.addEventListener('change', updatePreview);
  createButton.addEventListener('click', () => {
    const created = insertRetroCharacter(readRecipe());
    if (created) modalState.close();
  });
  bodyButton.addEventListener('click', () => {
    const created = insertRetroBody(readRecipe());
    if (created) modalState.close();
  });
  applyButton.addEventListener('click', () => {
    const result = applyRetroHeadToSelected(readRecipe());
    if (result.ok) modalState.close();
  });
  closeButton.addEventListener('click', () => modalState.close());
  modal.addEventListener('click', (event) => { if (event.target === modal) modalState.close(); });
  updatePreview();
  modalState.frameId = requestAnimationFrame(renderFrame);
  return modalState;
}

/** Open the focused bilingual creator. Calling it again refreshes the existing modal. */
export function openCharacterStudio(options = {}) {
  if (typeof document === 'undefined') return null;
  if (studioState) studioState.close();
  const selectedRoot = resolveRetroRoot(state.selectedMesh);
  const selectedRecipe = selectedRoot?.userData?.retroCharacterRecipe || null;
  studioState = createStudioModal(options.recipe || selectedRecipe || {});
  return studioState;
}

export function closeCharacterStudio() {
  studioState?.close?.();
  studioState = null;
}

export function getCharacterStudioState() {
  return studioState;
}








