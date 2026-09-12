import * as THREE from 'three';
import { state } from '../shared/state.js';
import { getLang } from '../shared/i18n.js';
import { showToast } from '../shared/ui-helpers.js';
import { pushAction } from '../shared/undo.js';
import { selectMesh, deselect } from '../viewport/selection.js';
import { frameAvatarPreviewCamera } from '../avatar/avatar-preview-runtime.js';
import { MAX_GLB_BYTES, parseGlbGroup } from '../viewport/native-gltf.js';
import { playAnimation, stopAnimation } from './animation.js';
import { createCompatibleHumanoidCopy, isEditableRetroCharacter } from './compatible-humanoid-rig.js';
import { emit } from '../../event-bus.js';

const text = (es, en) => getLang() === 'es' ? es : en;

export function resolveCompatibleAnimationTarget(object = state.selectedMesh) {
  for (let node = object; node; node = node.parent) {
    if (isEditableRetroCharacter(node)) return node;
  }
  return null;
}

function disposeDonor(root) {
  const resources = new Set();
  root?.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials.filter(Boolean)) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  resources.forEach((resource) => resource.dispose?.());
}

export async function createAnimatedRetroCopyFromGLB(buffer, target = state.selectedMesh, filename = 'animations.glb') {
  const source = resolveCompatibleAnimationTarget(target);
  if (!source) throw new Error(text('Selecciona un personaje PSX/N64 o de Avatar Forge.', 'Select a PSX/N64 studio or Avatar Forge character.'));
  let donor;
  try {
    donor = await parseGlbGroup(buffer, filename);
    stopAnimation();
    const copy = createCompatibleHumanoidCopy(source, donor);
    const sourceName = source.userData.name || source.name || 'Personaje';
    copy.name = text(sourceName + ' · animado', sourceName + ' · animated');
    copy.userData.name = copy.name;
    copy.userData.animationSourceFile = filename;
    const parent = source.parent || state.userObjects;
    source.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(source);
    if (source.parent) bounds.applyMatrix4(source.parent.matrixWorld.clone().invert());
    const width = bounds.getSize(new THREE.Vector3()).x;
    copy.position.x += Math.max(Number.isFinite(width) ? width : 0, 1) + 1;
    parent.add(copy);
    const selectAndPlay = () => {
      selectMesh(copy);
      frameAvatarPreviewCamera(copy, { camera: state.camera, controls: state.orbitControls });
      const clips = copy.userData.animationClips || [];
      const walking = clips.findIndex((clip) => /walk/i.test(clip.name));
      const clipIndex = walking >= 0 ? walking : 0;
      const selector = document.getElementById('anim-select');
      if (selector) selector.value = String(clipIndex);
      playAnimation(copy, clipIndex);
      emit('scene:objects-changed');
    };
    pushAction({
      type: text('Crear copia con animaciones GLB', 'Create copy with GLB animations'),
      undo() {
        if (state.animationMixer?.getRoot() === copy) stopAnimation();
        if (state.selectedMesh === copy) deselect();
        copy.removeFromParent();
        selectMesh(source);
        emit('scene:objects-changed');
      },
      redo() { parent.add(copy); selectAndPlay(); },
    });
    selectAndPlay();
    return copy;
  } finally {
    disposeDonor(donor);
  }
}

export function openCompatibleAnimationImport() {
  const target = resolveCompatibleAnimationTarget();
  if (!target) {
    showToast(text('Selecciona primero un personaje PSX/N64 o de Avatar Forge.', 'Select a PSX/N64 or Avatar Forge character first.'));
    return null;
  }
  document.getElementById('compatible-animation-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'compatible-animation-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'compatible-animation-title');
  Object.assign(modal.style, { position: 'fixed', inset: '0', zIndex: '100', background: '#000c', display: 'grid', placeItems: 'center' });
  const panel = document.createElement('div');
  Object.assign(panel.style, { background: '#15151c', border: '2px solid #91e4c1', padding: '24px', width: 'min(480px, 94vw)', color: '#eee', fontSize: '13px' });
  const title = document.createElement('h2');
  title.id = 'compatible-animation-title';
  title.textContent = text('ANIMAR CON GLB', 'ANIMATE WITH GLB');
  Object.assign(title.style, { color: '#91e4c1', fontWeight: 'bold', marginBottom: '14px' });
  const description = document.createElement('p');
  description.textContent = text(
    'Carga un GLB de animaciones compatible con el rig humanoide analizado de Meshy. Se creará una copia animada y conservarás el cuerpo original para editarlo.',
    'Load an animation GLB compatible with the analyzed Meshy humanoid rig. This creates an animated copy and keeps the original body available for editing.',
  );
  Object.assign(description.style, { lineHeight: '1.6', marginBottom: '16px' });
  const label = document.createElement('label');
  label.textContent = text('Archivo .GLB (máximo 25 MB)', '.GLB file (maximum 25 MB)');
  const input = document.createElement('input');
  input.id = 'compatible-animation-file';
  input.type = 'file';
  input.accept = '.glb';
  Object.assign(input.style, { display: 'block', marginTop: '8px', width: '100%' });
  label.append(input);
  const status = document.createElement('p');
  status.id = 'compatible-animation-status';
  status.setAttribute('role', 'status');
  Object.assign(status.style, { minHeight: '40px', lineHeight: '1.5', marginTop: '14px', color: '#ffd27c' });
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = text('CERRAR', 'CLOSE');
  Object.assign(close.style, { padding: '9px 14px', border: '1px solid #91e4c1', marginTop: '12px', cursor: 'pointer' });
  close.addEventListener('click', () => modal.remove());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    if (file.size > MAX_GLB_BYTES) {
      status.textContent = text('El archivo supera 25 MB.', 'File exceeds 25 MB.');
      return;
    }
    input.disabled = true;
    close.disabled = true;
    status.textContent = text('Preparando el rig y las animaciones…', 'Preparing rig and animations…');
    try {
      const copy = await createAnimatedRetroCopyFromGLB(await file.arrayBuffer(), target, file.name);
      modal.remove();
      const count = copy.userData.animationClips.length;
      showToast(text(`Copia creada con ${count} animaciones.`, `Copy created with ${count} animations.`));
    } catch (error) {
      status.textContent = text('No se pudo crear la copia: ', 'Could not create the copy: ') + error.message;
      input.disabled = false;
      close.disabled = false;
    }
  });
  panel.append(title, description, label, status, close);
  modal.append(panel);
  document.body.append(modal);
  input.focus();
  return modal;
}
