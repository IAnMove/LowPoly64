import { initScene, toggleBones } from './modules/scene.js';
import { addPrimitive } from './modules/primitives.js';
import { addTemplate, generateTemplateListUI } from './modules/templates.js';
import { onMouseDown, onDoubleClick } from './modules/selection.js';
import { onKeyDown } from './modules/shortcuts.js';
import { toggleFlatShading, toggleWireframe, quickColor, randomRetroColor as getRandomRetroColor, setColor } from './modules/materials.js';
import { handleTextureUpload, toggleTexture, togglePixelated, setupTextureDragDrop } from './modules/textures.js';
import {
  openTextureEditor, closeTextureEditor, setTool, setBrushSize, setBrushColor,
  paintUndo, texLoadImage, texDownload, texNewCanvas, texUpdateUV, buildPaletteUI,
  deselectFace, setFaceUV, selectFace,
} from './modules/texture-editor.js';
import {
  updatePosition, updateRotation, updateScale, updateName,
  updateColorFromPanel, updateMaterialFromPanel,
  updateUVOffset, updateUVRepeat, updateUVRotation,
  showToast, applyColorToAll, syncColorPickers, updateExportButtonText,
} from './modules/ui.js';
import { duplicateSelected, deleteSelected, centerCameraOnSelected, resetScene, groupSelected, ungroupSelected, detachBone, attachBone } from './modules/actions.js';
import { exportGLB } from './modules/export.js';
import { saveToLocalStorage, loadFromLocalStorage, exportSceneJSON, importSceneJSON, serializeGroupAsImportJSON } from './modules/persistence.js';
import { toggleSnap } from './modules/snap.js';
import { openImportModal, closeImportModal, handleImportSubmit, handleImportFile } from './modules/json-import.js';
import { undo, redo } from './modules/undo.js';
import { togglePlayPause, stopAnimation, getAnimationProgress, playAnimation } from './modules/animation.js';
import { importAnimationToGroup } from './modules/animation-import.js';
import { selectMesh } from './modules/selection.js';
import { state } from './modules/state.js';
import { toggleLang, initI18n, t, onLangChange } from './modules/i18n.js';
import { toggleObjectList, refreshObjectList, updateSelectedOverlay } from './modules/object-list.js';

document.addEventListener('DOMContentLoaded', () => {
  initScene();
  initI18n();

  // Canvas events
  state.renderer.domElement.addEventListener('mousedown', (e) => {
    onMouseDown(e);
    setTimeout(() => { updateExportButtonText(); updateSelectedOverlay(); refreshObjectList(); }, 0);
  });
  state.renderer.domElement.addEventListener('dblclick', (e) => {
    onDoubleClick(e);
    setTimeout(() => { updateExportButtonText(); updateSelectedOverlay(); refreshObjectList(); }, 0);
  });

  // Keyboard
  window.addEventListener('keydown', onKeyDown);

  // Generate template list dynamically
  const templateList = document.getElementById('template-list');
  if (templateList) {
    generateTemplateListUI(templateList);
    onLangChange(() => generateTemplateListUI(templateList));
  }

  // Build texture editor palette
  buildPaletteUI();

  // Setup texture drag-drop zone
  const texDropZone = document.getElementById('texture-drop-zone');
  if (texDropZone) setupTextureDragDrop(texDropZone);

  // Palette color picker — apply color on change
  const palettePicker = document.getElementById('palette-color-picker');
  if (palettePicker) {
    palettePicker.addEventListener('input', (e) => {
      if (state.selectedMesh) {
        updateColorFromPanel(e.target.value);
      }
    });
  }

  // Properties panel color input — sync to palette picker
  const propColor = document.getElementById('prop-color');
  if (propColor) {
    const origHandler = propColor.getAttribute('onchange');
    propColor.removeAttribute('onchange');
    propColor.addEventListener('change', (e) => {
      updateColorFromPanel(e.target.value);
    });
  }

  // Animation timeline update loop
  function updateTimelineUI() {
    requestAnimationFrame(updateTimelineUI);
    const timeline = document.getElementById('animation-timeline');
    if (!timeline || timeline.classList.contains('hidden')) return;

    const progress = getAnimationProgress();
    const bar = document.getElementById('anim-progress');
    const timeEl = document.getElementById('anim-time');
    const btnPlay = document.getElementById('btn-play-pause');

    if (bar && progress.duration > 0) {
      bar.style.width = `${(progress.time / progress.duration) * 100}%`;
    }
    if (timeEl) {
      timeEl.textContent = `${progress.time.toFixed(1)} / ${progress.duration.toFixed(1)}`;
    }
    if (btnPlay) {
      btnPlay.textContent = state.animationPlaying ? t('pause') : t('play');
    }
  }
  updateTimelineUI();
});

// Expose functions to HTML onclick handlers
window.addPrimitive = (...args) => { addPrimitive(...args); refreshObjectList(); };
window.addTemplate = (...args) => { addTemplate(...args); refreshObjectList(); };
window.toggleFlatShading = toggleFlatShading;
window.toggleWireframe = toggleWireframe;
window.toggleBones = toggleBones;
window.quickColor = quickColor;
window.randomRetroColor = () => {
  if (state.selectedMesh) {
    setColor(state.selectedMesh, getRandomRetroColor());
  }
};
window.handleTextureUpload = handleTextureUpload;
window.toggleTexture = toggleTexture;
window.togglePixelated = togglePixelated;
window.openTextureEditor = openTextureEditor;
window.closeTextureEditor = closeTextureEditor;
window.texSetTool = setTool;
window.texSetSize = setBrushSize;
window.texSetColor = setBrushColor;
window.texPaintUndo = paintUndo;
window.texLoadImage = texLoadImage;
window.texDownload = texDownload;
window.texNewCanvas = texNewCanvas;
window.texUpdateUV = texUpdateUV;
window.texDeselectFace = deselectFace;
window.texSetFaceUV = setFaceUV;
window.texSelectFace = selectFace;
window.updatePosition = updatePosition;
window.updateRotation = updateRotation;
window.updateScale = updateScale;
window.updateName = (v) => { updateName(v); updateSelectedOverlay(); refreshObjectList(); };
window.updateColor = updateColorFromPanel;
window.updateMaterial = updateMaterialFromPanel;
window.updateUVOffset = updateUVOffset;
window.updateUVRepeat = updateUVRepeat;
window.updateUVRotation = updateUVRotation;
window.duplicateSelected = () => { duplicateSelected(); refreshObjectList(); };
window.deleteSelected = () => { deleteSelected(); refreshObjectList(); updateSelectedOverlay(); };
window.centerCameraOnSelected = centerCameraOnSelected;
window.resetScene = () => { resetScene(); refreshObjectList(); updateSelectedOverlay(); };
window.exportGLB = exportGLB;
window.toggleSnap = toggleSnap;
window.saveScene = saveToLocalStorage;
window.loadScene = () => { loadFromLocalStorage(); setTimeout(refreshObjectList, 0); };
window.exportSceneJSON = exportSceneJSON;
window.importSceneJSON = (event) => {
  const file = event.target.files[0];
  if (file) { importSceneJSON(file); setTimeout(refreshObjectList, 100); }
};
window.groupSelected = () => { groupSelected(); refreshObjectList(); };
window.ungroupSelected = () => { ungroupSelected(); refreshObjectList(); };
window.detachBone = detachBone;
window.attachBone = attachBone;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleImportSubmit = () => { handleImportSubmit(); refreshObjectList(); };
window.handleImportFile = (e) => { handleImportFile(e); setTimeout(refreshObjectList, 100); };
window.applyColorToAll = () => {
  const hex = document.getElementById('multi-color-picker')?.value || '#ffcc00';
  applyColorToAll(hex);
};
window.undo = () => { undo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.redo = () => { redo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.toggleLang = toggleLang;
window.toggleObjectList = toggleObjectList;

// Animation controls
window.toggleAnimPlayPause = () => {
  const group = state.selectedMesh;
  if (!group || !group.userData?.animationClips?.length) return;
  const select = document.getElementById('anim-select');
  const idx = select ? parseInt(select.value) || 0 : state.animationClipIndex || 0;
  togglePlayPause(group, idx);
};
window.stopAnim = () => {
  stopAnimation();
};
window.handleAnimImportSubmit = () => {
  const text = document.getElementById('import-anim-textarea')?.value?.trim();
  const errorEl = document.getElementById('import-anim-error');
  if (!text) {
    errorEl.textContent = t('pasteAnimJson');
    return;
  }
  const group = state.selectedMesh;
  if (!group || !group.isGroup) {
    errorEl.textContent = t('selectGroupFirst');
    return;
  }
  const result = importAnimationToGroup(text, group);
  if (result.success) {
    document.getElementById('import-anim-textarea').value = '';
    errorEl.textContent = result.warnings ? result.warnings.join(' | ') : '';
    showTimelineForGroup(group);
  } else {
    errorEl.textContent = result.error;
  }
};

// Show/hide timeline based on selection
window.showTimelineForGroup = showTimelineForGroup;
function showTimelineForGroup(group) {
  const timeline = document.getElementById('animation-timeline');
  if (!timeline) return;
  if (!group || !group.userData?.animationClips?.length) {
    timeline.classList.add('hidden');
    return;
  }
  timeline.classList.remove('hidden');
  // Populate animation dropdown
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

// ── Animation Mode ──────────────────────────────────────────────
window.enterAnimationMode = enterAnimationMode;
window.exitAnimationMode = exitAnimationMode;
window.animModePlayClip = animModePlayClip;
window.animModeDeleteClip = animModeDeleteClip;
window.animModeImportAnim = animModeImportAnim;

function enterAnimationMode() {
  const obj = state.selectedMesh;
  if (!obj || !obj.isGroup) {
    showToast(t('selectGroupForAnimMode'));
    return;
  }

  stopAnimation();
  state.animationMode = true;
  state.animationModeObject = obj;

  // Hide all other objects
  state.userObjects.children.forEach((child) => {
    if (child !== obj) {
      child.visible = false;
    }
  });

  // Center camera on the object
  selectMesh(obj);
  centerCameraOnSelected();

  // Update UI: hide left panel, show animation mode panel, hide normal properties
  const objName = obj.userData.name || 'Grupo';
  document.getElementById('left-panel').classList.add('hidden');
  document.getElementById('properties-panel').classList.add('hidden');
  document.getElementById('anim-mode-panel').classList.remove('hidden');
  document.getElementById('anim-mode-banner').classList.remove('hidden');
  document.getElementById('anim-mode-obj-name').textContent = objName;
  document.getElementById('anim-mode-banner-name').textContent = objName;

  // Populate animation list
  refreshAnimationList();

  // Show timeline
  showTimelineForGroup(obj);

  showToast(t('animModeLabel') + (obj.userData.name || 'Group'));
}

function exitAnimationMode() {
  if (!state.animationMode) return;

  stopAnimation();

  // Show all objects again
  state.userObjects.children.forEach((child) => {
    child.visible = true;
  });

  state.animationMode = false;
  state.animationModeObject = null;

  // Restore UI
  document.getElementById('left-panel').classList.remove('hidden');
  document.getElementById('anim-mode-panel').classList.add('hidden');
  document.getElementById('anim-mode-banner').classList.add('hidden');

  // Re-show properties if something selected
  if (state.selectedMesh) {
    document.getElementById('properties-panel').classList.remove('hidden');
    showTimelineForGroup(state.selectedMesh);
  }

  showToast(t('backToScene'));
}

function refreshAnimationList() {
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

function animModePlayClip(index) {
  const obj = state.animationModeObject;
  if (!obj || !obj.userData?.animationClips?.[index]) return;
  // Update dropdown to match
  const select = document.getElementById('anim-select');
  if (select) select.value = index;
  // Stop current and play selected
  stopAnimation();
  playAnimation(obj, index);
}

function animModeDeleteClip(index) {
  const obj = state.animationModeObject;
  if (!obj) return;
  stopAnimation();
  if (obj.userData.animations) obj.userData.animations.splice(index, 1);
  if (obj.userData.animationClips) obj.userData.animationClips.splice(index, 1);
  refreshAnimationList();
  showTimelineForGroup(obj);
  showToast(t('animDeleted'));
}

function animModeImportAnim() {
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

// ── Export object/scene JSON ────────────────────────────────────
window.exportObjectJSON = exportObjectJSON;

function exportObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  let data;
  let filename;

  if (obj) {
    // Export selected object as import-compatible JSON
    data = serializeGroupAsImportJSON(obj);
    if (!data) {
      showToast(t('couldNotSerialize'));
      return;
    }
    filename = (data.name || 'object').toLowerCase().replace(/\s+/g, '_') + '.json';
  } else {
    // No selection: export full scene
    data = { name: 'SCENE', objects: [] };
    state.userObjects.children.forEach((child) => {
      const obj = serializeGroupAsImportJSON(child);
      if (obj) data.objects.push(obj);
    });
    filename = 'scene.json';
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  showToast(obj ? t('objectExported') : t('sceneExported'));
}

// ── Copy object JSON to clipboard ───────────────────────────────
window.copyObjectJSON = copyObjectJSON;

function copyObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  if (!obj) {
    showToast(t('selectObjectFirst'));
    return;
  }
  const data = serializeGroupAsImportJSON(obj);
  if (!data) {
    showToast(t('couldNotSerialize'));
    return;
  }
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(t('jsonCopied'));
  }).catch(() => {
    prompt(t('copyThisJson'), json);
  });
}

window.downloadObjectJSON = downloadObjectJSON;

function downloadObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  if (!obj) {
    showToast(t('selectObjectFirst'));
    return;
  }
  const data = serializeGroupAsImportJSON(obj);
  if (!data) return;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = (data.name || 'object').toLowerCase().replace(/\s+/g, '_') + '.json';
  link.click();
  URL.revokeObjectURL(url);
}
