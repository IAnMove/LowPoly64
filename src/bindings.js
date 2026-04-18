// ── HTML onclick bindings ────────────────────────────────────────
// Consolidates all window.xxx = fn assignments for HTML onclick handlers.
// This file is the ONLY place that bridges JS modules to HTML onclick attributes.

import { initScene, toggleBones, onResize } from './modules/viewport/scene.js';
import { addPrimitive } from './modules/viewport/primitives.js';
import { addTemplate } from './modules/viewport/templates.js';
import { deselectAll, selectMesh, toggleMultiSelect } from './modules/viewport/selection.js';
import { toggleFlatShading, toggleWireframe, quickColor, randomRetroColor as getRandomRetroColor } from './modules/shared/materials.js';
import { handleTextureUpload, toggleTexture, togglePixelated } from './modules/shared/textures.js';
import {
  openTextureEditor, closeTextureEditor, setTool, setBrushSize, setBrushColor,
  paintUndo, texLoadImage, texDownload, texNewCanvas, texUpdateUV, buildPaletteUI,
  deselectFace, setFaceUV, selectFace,
  toggleGrid, setGridSize,
  selectStripTile, removeStripTile, clearStrip, removeSelectedStripVariation,
  applyStripToMesh, downloadStripImage, saveTextureSnapshot,
  startColorSample, removeColorFromCanvas,
  setTextureProcessingOption, applyTextureProcessing, applyPsxifyTexture, applyTextureProcessingPreset,
} from './modules/texture/texture-editor.js';
import {
  openAIGenModal, closeAIGenModal, openConfigModal, closeConfigModal, saveConfigModal,
  onConfigMethodChange, texGenerate, texGenerateFromModal, texGenerateVariation,
  openPromptExpandModal, closePromptExpandModal, applyPromptTemplate,
  loadOllamaModels, enhancePrompt, texApplyGenerated, texDiscardGenerated, clearPending,
} from './modules/texture/ai-gen-ui.js';
import {
  updatePosition, updateRotation, updateScale, updateName,
  updateColorFromPanel, updateMaterialFromPanel, updateOpacityFromPanel,
  updateUVOffset, updateUVRepeat, updateUVRotation,
  showToast, applyColorToAll, applyOpacityToAll, updateExportButtonText,
} from './modules/viewport/ui.js';
import { duplicateSelected, deleteSelected, centerCameraOnSelected, resetScene, groupSelected, ungroupSelected, detachBone, attachBone } from './modules/viewport/actions.js';
import { exportGLB, exportAllTemplatesGLBZip } from './modules/viewport/export.js';
import { saveToLocalStorage, loadFromLocalStorage, exportSceneJSON, importSceneJSON, serializeGroupAsImportJSON, serializeScene } from './modules/viewport/persistence.js';
import { toggleSnap } from './modules/viewport/snap.js';
import { openImportModal, closeImportModal, handleImportSubmit, handleImportFile, handleArchetypeImportSubmit } from './modules/viewport/json-import.js';
import { undo, redo } from './modules/shared/undo.js';
import { state } from './modules/shared/state.js';
import { togglePSXMode, toggleVertexJitter, toggleDithering, toggleLowRes, toggleAffineTexture } from './modules/viewport/retro-effects.js';
import { toggleLang, t } from './modules/shared/i18n.js';
import { toggleObjectList, refreshObjectList, updateSelectedOverlay } from './modules/viewport/object-list.js';
import { openRigPanel, closeRigPanel, rigAutoBind, rigTogglePlay, rigStopAnim } from './modules/animation/rig-ui.js';
import {
  showTimelineForGroup, enterAnimationMode, exitAnimationMode,
  playAnim, stopAnim, onAnimSelectChange, getAnimGroup,
  animModePlayClip, animModeDeleteClip, animModeImportAnim,
} from './modules/animation/anim-mode-ui.js';
import {
  openAssignRigModal, onAssignRigArchetypeChange, confirmAssignRig,
} from './modules/animation/assign-rig-ui.js';
import {
  openPromptModal, closePromptModal, switchPromptTab,
  onPromptSkeletonChange, onPromptArchetypeChange,
  generateModelPrompt, generateSkeletonPrompt, copyPrompt, promptApplyMoldHint,
} from './modules/animation/prompt-ui.js';
import {
  openSvgWorkbench,
  closeSvgWorkbench,
  openSvgWorkbenchForSelection,
  openSvgHeadWorkbenchForSelection,
} from './modules/svg/svg-ui.js';
import { on } from './event-bus.js';

// ── Event bus listeners ──────────────────────────────────────────
on('animation:show-timeline', (mesh) => showTimelineForGroup(mesh));
on('animation:play-pause', () => {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  if (state.animationPlaying) stopAnim();
  else playAnim();
});
on('animation:exit-mode', () => exitAnimationMode());
on('rig:assign-requested', (group) => openAssignRigModal(group));
on('bone:attach', (pivot) => attachBone(pivot));
on('scene:objects-changed', () => refreshSceneObjectList());

// ── Scene object list ────────────────────────────────────────────
export function refreshSceneObjectList() {
  const container = document.getElementById('scene-object-list');
  if (!container) return;
  const children = state.userObjects ? state.userObjects.children : [];
  container.innerHTML = '';
  if (children.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-zinc-500 text-[10px] italic py-2';
    empty.textContent = t('emptyScene');
    container.appendChild(empty);
    return;
  }
  children.forEach((obj) => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 px-2 py-[5px] cursor-pointer hover:bg-white/10 rounded text-[10px] font-mono text-zinc-300';
    const icon = document.createElement('span');
    icon.textContent = obj.isGroup ? '\u25A1' : '\u25A0';
    icon.className = obj.isGroup ? 'text-[#ffcc00]' : 'text-zinc-400';
    const label = document.createElement('span');
    label.className = 'truncate';
    label.textContent = obj.userData.name || 'Object';
    row.append(icon, label);
    row.addEventListener('click', (e) => {
      if ((e.ctrlKey || e.metaKey) && !state.animationMode) {
        toggleMultiSelect(obj);
      } else {
        deselectAll();
        selectMesh(obj);
      }
      updateSelectedOverlay();
      refreshObjectList();
    });
    container.appendChild(row);
  });
}

// ── Export/Copy JSON helpers ──────────────────────────────────────
function exportObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  let data, filename;
  if (obj) {
    data = serializeGroupAsImportJSON(obj);
    if (!data) { showToast(t('couldNotSerialize')); return; }
    filename = (data.name || 'object').toLowerCase().replace(/\s+/g, '_') + '.json';
  } else {
    data = { name: 'SCENE', objects: [] };
    state.userObjects.children.forEach((child) => {
      const d = serializeGroupAsImportJSON(child);
      if (d) data.objects.push(d);
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

function copyObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  if (!obj) { showToast(t('selectObjectFirst')); return; }
  const data = serializeGroupAsImportJSON(obj);
  if (!data) { showToast(t('couldNotSerialize')); return; }
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => showToast(t('jsonCopied'))).catch(() => prompt(t('copyThisJson'), json));
}

function downloadObjectJSON() {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  if (!obj) { showToast(t('selectObjectFirst')); return; }
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

// ── Panel toggles ────────────────────────────────────────────────
window.toggleLeftPanel = () => {
  const panel = document.getElementById('left-panel');
  const icon = document.getElementById('toggle-left-icon');
  panel.classList.toggle('panel-collapsed');
  icon.innerHTML = panel.classList.contains('panel-collapsed') ? '&#9654;' : '&#9664;';
  setTimeout(onResize, 10);
};
window.toggleRightPanel = () => {
  const panel = document.getElementById('right-panel');
  const icon = document.getElementById('toggle-right-icon');
  panel.classList.toggle('panel-collapsed');
  icon.innerHTML = panel.classList.contains('panel-collapsed') ? '&#9664;' : '&#9654;';
  setTimeout(onResize, 10);
};

// ── Viewport bindings ────────────────────────────────────────────
window.addPrimitive = (...args) => { addPrimitive(...args); refreshObjectList(); refreshSceneObjectList(); };
window.addTemplate = (...args) => { addTemplate(...args); refreshObjectList(); refreshSceneObjectList(); };
window.toggleFlatShading = toggleFlatShading;
window.toggleWireframe = toggleWireframe;
window.toggleBones = toggleBones;
window.quickColor = quickColor;
window.randomRetroColor = () => quickColor(getRandomRetroColor());
window.handleTextureUpload = handleTextureUpload;
window.toggleTexture = toggleTexture;
window.togglePixelated = togglePixelated;
window.updatePosition = updatePosition;
window.updateRotation = updateRotation;
window.updateScale = updateScale;
window.updateName = (v) => { updateName(v); updateSelectedOverlay(); refreshObjectList(); };
window.updateColor = updateColorFromPanel;
window.updateOpacity = updateOpacityFromPanel;
window.updateMaterial = updateMaterialFromPanel;
window.updateUVOffset = updateUVOffset;
window.updateUVRepeat = updateUVRepeat;
window.updateUVRotation = updateUVRotation;
window.duplicateSelected = () => { duplicateSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.deleteSelected = () => { deleteSelected(); refreshObjectList(); updateSelectedOverlay(); refreshSceneObjectList(); };
window.centerCameraOnSelected = centerCameraOnSelected;
window.resetScene = () => { resetScene(); refreshObjectList(); updateSelectedOverlay(); refreshSceneObjectList(); };
window.exportGLB = exportGLB;
window.exportAllTemplatesGLBZip = exportAllTemplatesGLBZip;
window.toggleSnap = toggleSnap;
window.saveScene = saveToLocalStorage;
window.loadScene = () => { loadFromLocalStorage(); refreshObjectList(); refreshSceneObjectList(); };
window.exportSceneJSON = exportSceneJSON;
window.copySceneJSON = () => {
  const data = serializeScene();
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => showToast(t('jsonCopied'))).catch(() => prompt(t('copyThisJson'), json));
};
window.copyExportJSON = () => {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  let data;
  if (obj) {
    data = serializeGroupAsImportJSON(obj);
    if (!data) { showToast(t('couldNotSerialize')); return; }
  } else {
    data = { name: 'SCENE', objects: [] };
    state.userObjects.children.forEach((child) => { const d = serializeGroupAsImportJSON(child); if (d) data.objects.push(d); });
  }
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => showToast(t('jsonCopied'))).catch(() => prompt(t('copyThisJson'), json));
};
window.importSceneJSON = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  await importSceneJSON(file);
  refreshObjectList();
  refreshSceneObjectList();
  event.target.value = '';
};
window.groupSelected = () => { groupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.ungroupSelected = () => { ungroupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.detachBone = detachBone;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleImportSubmit = async () => {
  const result = await handleImportSubmit();
  refreshObjectList();
  refreshSceneObjectList();
  return result;
};
window.handleImportFile = async (e) => {
  await handleImportFile(e);
  refreshObjectList();
  refreshSceneObjectList();
  if (e?.target) e.target.value = '';
};
window.applyColorToAll = () => { applyColorToAll(document.getElementById('multi-color-picker')?.value || '#ffcc00'); };
window.applyOpacityToAll = (value) => { applyOpacityToAll(value); };
window.undo = () => { undo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.redo = () => { redo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.toggleLang = toggleLang;
window.toggleObjectList = toggleObjectList;
window.togglePSXMode = () => {
  const isOn = togglePSXMode();
  const btn = document.getElementById('btn-psx');
  if (btn) { btn.classList.toggle('bg-[#ff00ff]', isOn); btn.classList.toggle('text-black', isOn); btn.classList.toggle('bg-zinc-900', !isOn); btn.classList.toggle('text-[#ff00ff]', !isOn); }
};
window.toggleVertexJitter = toggleVertexJitter;
window.toggleDithering = toggleDithering;
window.toggleLowRes = toggleLowRes;
window.toggleAffineTexture = toggleAffineTexture;
window.exportObjectJSON = exportObjectJSON;
window.copyObjectJSON = copyObjectJSON;
window.downloadObjectJSON = downloadObjectJSON;
window.openSvgWorkbench = openSvgWorkbench;
window.closeSvgWorkbench = closeSvgWorkbench;
window.openSvgWorkbenchForSelection = openSvgWorkbenchForSelection;
window.openSvgHeadWorkbenchForSelection = openSvgHeadWorkbenchForSelection;

// ── Texture editor bindings ──────────────────────────────────────
window.openTextureEditor = openTextureEditor;
window.closeTextureEditor = () => { closeTextureEditor(); clearPending(); };
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
window.texToggleGrid = () => toggleGrid();
window.texSetGridSize = (v) => setGridSize(v);
window.texSelectStripTile = (i) => selectStripTile(i);
window.texRemoveStripTile = (i) => { removeStripTile(i); showToast('Tile removed'); };
window.texRemoveSelectedVariation = () => {
  if (!removeSelectedStripVariation()) { showToast('Select a variation to remove'); return; }
  showToast('Variation removed');
};
window.texApplyStrip = () => { applyStripToMesh(); showToast('Strip applied to mesh'); };
window.texExportStrip = async () => { showToast(await downloadStripImage() ? 'Sprite strip saved' : 'Nothing to export'); };
window.texClearStrip = () => { clearStrip(); showToast('Strip cleared'); };
window.texGenerateVariation = texGenerateVariation;
window.saveTextureSnapshot = saveTextureSnapshot;
window.texStartColorSample = () => { showToast('Click on the canvas to sample a color'); startColorSample(); };
window.texSetTextureProcessing = (key, value) => {
  setTextureProcessingOption(key, value);
};
window.texApplyFx = () => {
  if (applyTextureProcessing()) showToast('Texture FX applied');
};
window.texPsxify = () => {
  if (applyPsxifyTexture()) showToast('PSX-ify preview loaded');
};
window.texApplyPreset = (presetId) => {
  if (applyTextureProcessingPreset(presetId)) showToast(`Texture preset preview: ${presetId}`);
};
window.texRemoveColor = () => {
  removeColorFromCanvas(document.getElementById('tex-chroma-color')?.value || '#808080', document.getElementById('tex-chroma-tol')?.value || 30);
  showToast('Color removed (UNDO to revert)');
};

// ── AI gen bindings ──────────────────────────────────────────────
window.openAIGenModal = openAIGenModal;
window.closeAIGenModal = closeAIGenModal;
window.openConfigModal = openConfigModal;
window.closeConfigModal = closeConfigModal;
window.saveConfigModal = saveConfigModal;
window.onConfigMethodChange = onConfigMethodChange;
window.texGenerate = texGenerate;
window.texGenerateFromModal = texGenerateFromModal;
window.openPromptExpandModal = openPromptExpandModal;
window.closePromptExpandModal = closePromptExpandModal;
window.applyPromptTemplate = applyPromptTemplate;
window.loadOllamaModels = loadOllamaModels;
window.enhancePrompt = enhancePrompt;
window.texApplyGenerated = texApplyGenerated;
window.texDiscardGenerated = texDiscardGenerated;

// ── Animation bindings ───────────────────────────────────────────
window.playAnim = playAnim;
window.stopAnim = stopAnim;
window.onAnimSelectChange = onAnimSelectChange;
window.enterAnimationMode = enterAnimationMode;
window.exitAnimationMode = exitAnimationMode;
window.animModePlayClip = animModePlayClip;
window.animModeDeleteClip = animModeDeleteClip;
window.animModeImportAnim = animModeImportAnim;
window.handleArchetypeImportSubmit = handleArchetypeImportSubmit;
window.handleArchetypeImportFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const ta = document.getElementById('import-archetype-textarea');
    if (ta) ta.value = e.target.result;
    handleArchetypeImportSubmit();
  };
  reader.onerror = () => { document.getElementById('import-archetype-error').textContent = t('jsonFileReadError'); };
  reader.readAsText(file);
};

// ── Rig bindings ─────────────────────────────────────────────────
window.openRigPanel = openRigPanel;
window.closeRigPanel = closeRigPanel;
window.rigAutoBind = rigAutoBind;
window.rigTogglePlay = rigTogglePlay;
window.rigStopAnim = rigStopAnim;
window.openAssignRigModal = openAssignRigModal;
window.onAssignRigArchetypeChange = onAssignRigArchetypeChange;
window.confirmAssignRig = confirmAssignRig;

// ── Prompt generator bindings ────────────────────────────────────
window.openPromptModal = openPromptModal;
window.closePromptModal = closePromptModal;
window.switchPromptTab = switchPromptTab;
window.onPromptSkeletonChange = onPromptSkeletonChange;
window.onPromptArchetypeChange = onPromptArchetypeChange;
window.generateModelPrompt = generateModelPrompt;
window.generateSkeletonPrompt = generateSkeletonPrompt;
window.generatePrompt = generateModelPrompt;
window.promptApplyMoldHint = promptApplyMoldHint;
window.copyPrompt = copyPrompt;

// ── Archetype shortcuts ──────────────────────────────────────────
const ARCHETYPE_DEFAULT_TEMPLATES = {
  HUMANOID: 'swordsman_cm',
  BIRD: 'chicken_cm',
  QUADRUPED: 'psx_spyro_study_cm',
  CAR: 'car_cm',
  PROP: 'crate',
};
window.openArchetype = (archetypeId) => {
  const templateId = ARCHETYPE_DEFAULT_TEMPLATES[archetypeId];
  if (!templateId) return;
  addTemplate(templateId);
  refreshObjectList();
  refreshSceneObjectList();
  setTimeout(() => {
    const group = state.userObjects.children[state.userObjects.children.length - 1];
    if (group && group.userData.archetype) openRigPanel(group);
  }, 50);
};
