// Animation Mode UI — enter/exit animation mode, animation list, play/delete/import clips
import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { t } from '../shared/i18n.js';
import { stopAnimation, playAnimation } from './animation.js';
import { importAnimationToGroup } from './animation-import.js';
import { selectMesh } from '../viewport/selection.js';
import { centerCameraOnSelected } from '../viewport/actions.js';

// ── Timeline ─────────────────────────────────────────────────────
export function showTimelineForGroup(group) {
  const timeline = document.getElementById('animation-timeline');
  if (!timeline) return;
  if (!group || !group.userData?.animationClips?.length) {
    timeline.classList.add('hidden');
    return;
  }
  timeline.classList.remove('hidden');
  const select = document.getElementById('anim-select');
  if (select) {
    select.innerHTML = '';
    group.userData.animations.forEach((anim, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = anim.name || `Anim ${i + 1}`;
      select.appendChild(opt);
    });
  }
}

// ── Animation controls ───────────────────────────────────────────
export function getAnimGroup() {
  return state.animationMode ? state.animationModeObject : state.selectedMesh;
}

export function getAnimSelectIdx() {
  const select = document.getElementById('anim-select');
  return select ? parseInt(select.value) || 0 : 0;
}

export function playAnim() {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
}

export function stopAnim() {
  stopAnimation();
}

export function onAnimSelectChange() {
  if (!state.animationPlaying) return;
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
}

// ── Enter/Exit Animation Mode ────────────────────────────────────
export function enterAnimationMode() {
  const obj = state.selectedMesh;
  if (!obj || !obj.isGroup) {
    showToast(t('selectGroupForAnimMode'));
    return;
  }

  stopAnimation();
  state.animationMode = true;
  state.animationModeObject = obj;

  state.userObjects.children.forEach((child) => {
    if (child !== obj) child.visible = false;
  });

  selectMesh(obj);
  centerCameraOnSelected();

  const objName = obj.userData.name || 'Grupo';
  document.getElementById('left-panel').classList.add('hidden');
  document.getElementById('properties-panel').classList.add('hidden');
  document.getElementById('anim-mode-panel').classList.remove('hidden');
  document.getElementById('anim-mode-banner').classList.remove('hidden');
  document.getElementById('anim-mode-obj-name').textContent = objName;
  document.getElementById('anim-mode-banner-name').textContent = objName;

  refreshAnimationList();
  showTimelineForGroup(obj);
  showToast(t('animModeLabel') + (obj.userData.name || 'Group'));
}

export function exitAnimationMode() {
  if (!state.animationMode) return;
  stopAnimation();

  state.userObjects.children.forEach((child) => {
    child.visible = true;
  });

  state.animationMode = false;
  state.animationModeObject = null;

  document.getElementById('left-panel').classList.remove('hidden');
  document.getElementById('anim-mode-panel').classList.add('hidden');
  document.getElementById('anim-mode-banner').classList.add('hidden');

  if (state.selectedMesh) {
    document.getElementById('properties-panel').classList.remove('hidden');
    showTimelineForGroup(state.selectedMesh);
  }

  showToast(t('backToScene'));
}

// ── Animation list in anim mode ──────────────────────────────────
export function refreshAnimationList() {
  const list = document.getElementById('anim-mode-list');
  if (!list) return;
  list.replaceChildren();

  const obj = state.animationModeObject;
  if (!obj) return;

  const anims = obj.userData.animations || [];
  if (anims.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-zinc-500 text-[10px]';
    empty.textContent = t('noAnimations');
    list.appendChild(empty);
    return;
  }

  anims.forEach((anim, i) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-zinc-800 border border-zinc-700 px-3 py-2 rounded';

    const name = document.createElement('span');
    name.className = 'flex-1 text-[10px] text-white truncate';
    name.textContent = anim.name || `Anim ${i + 1}`;

    const duration = document.createElement('span');
    duration.className = 'text-[10px] text-zinc-400';
    duration.textContent = anim.duration ? `${anim.duration.toFixed(1)}s` : '';

    const tracks = document.createElement('span');
    tracks.className = 'text-[10px] text-zinc-500';
    tracks.textContent = anim.tracks ? `${anim.tracks.length}t` : '';

    const playBtn = document.createElement('button');
    playBtn.className = 'retro-button bg-[#ffcc00] text-black px-2 py-0.5 text-[10px] font-bold';
    playBtn.textContent = 'PLAY';
    playBtn.addEventListener('click', () => animModePlayClip(i));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'retro-button bg-red-600 text-white px-2 py-0.5 text-[10px]';
    deleteBtn.textContent = 'X';
    deleteBtn.addEventListener('click', () => animModeDeleteClip(i));

    row.append(name, duration, tracks, playBtn, deleteBtn);
    list.appendChild(row);
  });
}

export function animModePlayClip(index) {
  const obj = state.animationModeObject;
  if (!obj || !obj.userData?.animationClips?.[index]) return;
  const select = document.getElementById('anim-select');
  if (select) select.value = index;
  stopAnimation();
  playAnimation(obj, index);
}

export function animModeDeleteClip(index) {
  const obj = state.animationModeObject;
  if (!obj) return;
  stopAnimation();
  if (obj.userData.animations) obj.userData.animations.splice(index, 1);
  if (obj.userData.animationClips) obj.userData.animationClips.splice(index, 1);
  refreshAnimationList();
  showTimelineForGroup(obj);
  showToast(t('animDeleted'));
}

export function animModeImportAnim() {
  const text = document.getElementById('anim-mode-textarea')?.value?.trim();
  const errorEl = document.getElementById('anim-mode-import-error');
  if (!text) {
    if (errorEl) errorEl.textContent = t('pasteAnimJson');
    return;
  }
  const obj = state.animationModeObject;
  if (!obj) {
    if (errorEl) errorEl.textContent = t('noActiveObject');
    return;
  }
  const result = importAnimationToGroup(text, obj);
  if (result.success) {
    document.getElementById('anim-mode-textarea').value = '';
    if (errorEl) errorEl.textContent = result.warnings ? result.warnings.join(' | ') : '';
    refreshAnimationList();
    showTimelineForGroup(obj);
  } else {
    if (errorEl) errorEl.textContent = result.error;
  }
}
