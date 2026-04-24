// ── HTML onclick bindings ────────────────────────────────────────
// Consolidates all window.xxx = fn assignments for HTML onclick handlers.
// This file is the ONLY place that bridges JS modules to HTML onclick attributes.

import { toggleBones, onResize } from './modules/viewport/scene.js';
import { addPrimitive } from './modules/viewport/primitives.js';
import { deselectAll, selectMesh, toggleMultiSelect } from './modules/viewport/selection.js';
import { toggleFlatShading, toggleWireframe, quickColor, randomRetroColor as getRandomRetroColor } from './modules/shared/materials.js';
import { handleTextureUpload, toggleTexture, togglePixelated } from './modules/shared/textures.js';
import {
  updatePosition, updateRotation, updateScale, updateName,
  updateColorFromPanel, updateMaterialFromPanel, updateOpacityFromPanel,
  updateFaceModeFromPanel,
  updateUVOffset, updateUVRepeat, updateUVRotation,
  showToast, applyColorToAll, applyOpacityToAll,
} from './modules/viewport/ui.js';
import { duplicateSelected, deleteSelected, centerCameraOnSelected, resetScene, groupSelected, ungroupSelected, detachBone, attachBone } from './modules/viewport/actions.js';
import { toggleSnap } from './modules/viewport/snap.js';
import { undo, redo } from './modules/shared/undo.js';
import { state } from './modules/shared/state.js';
import { togglePSXMode, toggleVertexJitter, toggleDithering, toggleLowRes, toggleAffineTexture } from './modules/viewport/retro-effects.js';
import { toggleLang, t } from './modules/shared/i18n.js';
import { toggleObjectList, refreshObjectList, updateSelectedOverlay } from './modules/viewport/object-list.js';
import { on } from './event-bus.js';

const loadTemplateTools = () => import('./modules/viewport/templates.js');
const loadTextureEditorTools = () => import('./modules/texture/texture-editor.js');
const loadAiTextureTools = () => import('./modules/texture/ai-gen-ui.js');
const loadExportTools = () => import('./modules/viewport/export.js');
const loadPersistenceTools = () => import('./modules/viewport/persistence.js');
const loadJsonImportTools = () => import('./modules/viewport/json-import.js');
const loadRigTools = () => import('./modules/animation/rig-ui.js');
const loadAnimationModeTools = () => import('./modules/animation/anim-mode-ui.js');
const loadAssignRigTools = () => import('./modules/animation/assign-rig-ui.js');
const loadPromptTools = () => import('./modules/animation/prompt-ui.js');
const loadMotionRipperTools = () => import('./modules/animation/motion-ripper-ui.js');
const loadSvgTools = () => import('./modules/svg/svg-ui.js');
const loadAvatarTools = () => import('./modules/avatar/avatar-ui.js');

// ── Event bus listeners ──────────────────────────────────────────
on('animation:show-timeline', (mesh) => {
  void loadAnimationModeTools().then(({ showTimelineForGroup }) => showTimelineForGroup(mesh));
});
on('animation:play-pause', () => {
  void loadAnimationModeTools().then(({ getAnimGroup, playAnim, stopAnim }) => {
    const group = getAnimGroup();
    if (!group || !group.userData?.animationClips?.length) return;
    if (state.animationPlaying) stopAnim();
    else playAnim();
  });
});
on('animation:exit-mode', () => {
  void loadAnimationModeTools().then(({ exitAnimationMode }) => exitAnimationMode());
});
on('rig:assign-requested', (group) => {
  void loadAssignRigTools().then(({ openAssignRigModal }) => openAssignRigModal(group));
});
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
async function exportObjectJSON() {
  const { serializeGroupAsImportJSON } = await loadPersistenceTools();
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

async function copyObjectJSON() {
  const { serializeGroupAsImportJSON } = await loadPersistenceTools();
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  if (!obj) { showToast(t('selectObjectFirst')); return; }
  const data = serializeGroupAsImportJSON(obj);
  if (!data) { showToast(t('couldNotSerialize')); return; }
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => showToast(t('jsonCopied'))).catch(() => prompt(t('copyThisJson'), json));
}

async function downloadObjectJSON() {
  const { serializeGroupAsImportJSON } = await loadPersistenceTools();
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
  const panel = state.animationMode
    ? document.getElementById('anim-mode-panel')
    : document.getElementById('left-panel');
  const icon = document.getElementById('toggle-left-icon');
  if (!panel || !icon) return;
  panel.classList.toggle('panel-collapsed');
  icon.innerHTML = panel.classList.contains('panel-collapsed') ? '&#9654;' : '&#9664;';
  setTimeout(onResize, 10);
};
window.toggleRightPanel = () => {
  const panel = document.getElementById('right-panel');
  const icon = document.getElementById('toggle-right-icon');
  if (!panel || !icon) return;
  panel.classList.toggle('panel-collapsed');
  icon.innerHTML = panel.classList.contains('panel-collapsed') ? '&#9664;' : '&#9654;';
  setTimeout(onResize, 10);
};

// ── Viewport bindings ────────────────────────────────────────────
window.addPrimitive = (...args) => { addPrimitive(...args); refreshObjectList(); refreshSceneObjectList(); };
window.addTemplate = async (...args) => {
  const { addTemplate } = await loadTemplateTools();
  addTemplate(...args);
  refreshObjectList();
  refreshSceneObjectList();
};
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
window.updateFaceMode = updateFaceModeFromPanel;
window.updateUVOffset = updateUVOffset;
window.updateUVRepeat = updateUVRepeat;
window.updateUVRotation = updateUVRotation;
window.duplicateSelected = () => { duplicateSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.deleteSelected = () => { deleteSelected(); refreshObjectList(); updateSelectedOverlay(); refreshSceneObjectList(); };
window.centerCameraOnSelected = centerCameraOnSelected;
window.resetScene = () => { resetScene(); refreshObjectList(); updateSelectedOverlay(); refreshSceneObjectList(); };
window.exportGLB = async () => {
  const { exportGLB } = await loadExportTools();
  exportGLB();
};
window.exportAllTemplatesGLBZip = async () => {
  const { exportAllTemplatesGLBZip } = await loadExportTools();
  return exportAllTemplatesGLBZip();
};
window.toggleSnap = toggleSnap;
window.saveScene = async () => {
  const { saveToLocalStorage } = await loadPersistenceTools();
  saveToLocalStorage();
};
window.loadScene = async () => {
  const { loadFromLocalStorage } = await loadPersistenceTools();
  await loadFromLocalStorage();
  refreshObjectList();
  refreshSceneObjectList();
};
window.exportSceneJSON = async () => {
  const { exportSceneJSON } = await loadPersistenceTools();
  exportSceneJSON();
};
window.copySceneJSON = async () => {
  const { serializeScene } = await loadPersistenceTools();
  const data = serializeScene();
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => showToast(t('jsonCopied'))).catch(() => prompt(t('copyThisJson'), json));
};
window.copyExportJSON = async () => {
  const { serializeGroupAsImportJSON } = await loadPersistenceTools();
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
  const { importSceneJSON } = await loadPersistenceTools();
  await importSceneJSON(file);
  refreshObjectList();
  refreshSceneObjectList();
  event.target.value = '';
};
window.groupSelected = () => { groupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.ungroupSelected = () => { ungroupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.detachBone = detachBone;
window.openImportModal = async () => {
  const { openImportModal } = await loadJsonImportTools();
  openImportModal();
};
window.closeImportModal = async () => {
  const { closeImportModal } = await loadJsonImportTools();
  closeImportModal();
};
window.handleImportSubmit = async () => {
  const { handleImportSubmit } = await loadJsonImportTools();
  const result = await handleImportSubmit();
  refreshObjectList();
  refreshSceneObjectList();
  return result;
};
window.handleImportFile = async (e) => {
  const { handleImportFile } = await loadJsonImportTools();
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
window.openSvgWorkbench = async () => {
  const { openSvgWorkbench } = await loadSvgTools();
  openSvgWorkbench();
};
window.closeSvgWorkbench = async () => {
  const { closeSvgWorkbench } = await loadSvgTools();
  closeSvgWorkbench();
};
window.openSvgWorkbenchForSelection = async () => {
  const { openSvgWorkbenchForSelection } = await loadSvgTools();
  openSvgWorkbenchForSelection();
};
window.openSvgHeadWorkbenchForSelection = async () => {
  const { openSvgHeadWorkbenchForSelection } = await loadSvgTools();
  openSvgHeadWorkbenchForSelection();
};
window.openAvatarForge = async () => {
  const { openAvatarForge } = await loadAvatarTools();
  openAvatarForge();
};
window.closeAvatarForge = async () => {
  const { closeAvatarForge } = await loadAvatarTools();
  closeAvatarForge();
};

// ── Texture editor bindings ──────────────────────────────────────
window.openTextureEditor = async () => {
  const { openTextureEditor } = await loadTextureEditorTools();
  openTextureEditor();
};
window.closeTextureEditor = async () => {
  const [{ closeTextureEditor }, { clearPending }] = await Promise.all([
    loadTextureEditorTools(),
    loadAiTextureTools(),
  ]);
  closeTextureEditor();
  clearPending();
};
window.texSetTool = async (...args) => (await loadTextureEditorTools()).setTool(...args);
window.texSetSize = async (...args) => (await loadTextureEditorTools()).setBrushSize(...args);
window.texSetColor = async (...args) => (await loadTextureEditorTools()).setBrushColor(...args);
window.texPaintUndo = async () => (await loadTextureEditorTools()).paintUndo();
window.texLoadImage = async (...args) => (await loadTextureEditorTools()).texLoadImage(...args);
window.texDownload = async () => (await loadTextureEditorTools()).texDownload();
window.texNewCanvas = async () => (await loadTextureEditorTools()).texNewCanvas();
window.texUpdateUV = async () => (await loadTextureEditorTools()).texUpdateUV();
window.texDeselectFace = async () => (await loadTextureEditorTools()).deselectFace();
window.texSetFaceUV = async (...args) => (await loadTextureEditorTools()).setFaceUV(...args);
window.texSelectFace = async (...args) => (await loadTextureEditorTools()).selectFace(...args);
window.texToggleGrid = async () => (await loadTextureEditorTools()).toggleGrid();
window.texSetGridSize = async (v) => (await loadTextureEditorTools()).setGridSize(v);
window.texSelectStripTile = async (i) => (await loadTextureEditorTools()).selectStripTile(i);
window.texRemoveStripTile = async (i) => {
  const { removeStripTile } = await loadTextureEditorTools();
  removeStripTile(i);
  showToast('Tile removed');
};
window.texRemoveSelectedVariation = async () => {
  const { removeSelectedStripVariation } = await loadTextureEditorTools();
  if (!removeSelectedStripVariation()) { showToast('Select a variation to remove'); return; }
  showToast('Variation removed');
};
window.texApplyStrip = async () => {
  const { applyStripToMesh } = await loadTextureEditorTools();
  applyStripToMesh();
  showToast('Strip applied to mesh');
};
window.texExportStrip = async () => {
  const { downloadStripImage } = await loadTextureEditorTools();
  showToast(await downloadStripImage() ? 'Sprite strip saved' : 'Nothing to export');
};
window.texClearStrip = async () => {
  const { clearStrip } = await loadTextureEditorTools();
  clearStrip();
  showToast('Strip cleared');
};
window.texGenerateVariation = async () => (await loadAiTextureTools()).texGenerateVariation();
window.saveTextureSnapshot = async () => (await loadTextureEditorTools()).saveTextureSnapshot();
window.texStartColorSample = async () => {
  const { startColorSample } = await loadTextureEditorTools();
  showToast('Click on the canvas to sample a color');
  startColorSample();
};
window.texSetTextureProcessing = async (key, value) => {
  const { setTextureProcessingOption } = await loadTextureEditorTools();
  setTextureProcessingOption(key, value);
};
window.texApplyFx = async () => {
  const { applyTextureProcessing } = await loadTextureEditorTools();
  if (applyTextureProcessing()) showToast('Texture FX applied');
};
window.texPsxify = async () => {
  const { applyPsxifyTexture } = await loadTextureEditorTools();
  if (applyPsxifyTexture()) showToast('PSX-ify preview loaded');
};
window.texApplyPreset = async (presetId) => {
  const { applyTextureProcessingPreset } = await loadTextureEditorTools();
  if (applyTextureProcessingPreset(presetId)) showToast(`Texture preset preview: ${presetId}`);
};
window.texRemoveColor = async () => {
  const { removeColorFromCanvas } = await loadTextureEditorTools();
  removeColorFromCanvas(document.getElementById('tex-chroma-color')?.value || '#808080', document.getElementById('tex-chroma-tol')?.value || 30);
  showToast('Color removed (UNDO to revert)');
};

// ── AI gen bindings ──────────────────────────────────────────────
window.openAIGenModal = async () => (await loadAiTextureTools()).openAIGenModal();
window.closeAIGenModal = async () => (await loadAiTextureTools()).closeAIGenModal();
window.openConfigModal = async () => (await loadAiTextureTools()).openConfigModal();
window.closeConfigModal = async () => (await loadAiTextureTools()).closeConfigModal();
window.saveConfigModal = async () => (await loadAiTextureTools()).saveConfigModal();
window.onConfigMethodChange = async (...args) => (await loadAiTextureTools()).onConfigMethodChange(...args);
window.texGenerate = async () => (await loadAiTextureTools()).texGenerate();
window.texGenerateFromModal = async () => (await loadAiTextureTools()).texGenerateFromModal();
window.openPromptExpandModal = async () => (await loadAiTextureTools()).openPromptExpandModal();
window.closePromptExpandModal = async () => (await loadAiTextureTools()).closePromptExpandModal();
window.applyPromptTemplate = async (...args) => (await loadAiTextureTools()).applyPromptTemplate(...args);
window.loadOllamaModels = async () => (await loadAiTextureTools()).loadOllamaModels();
window.enhancePrompt = async () => (await loadAiTextureTools()).enhancePrompt();
window.texApplyGenerated = async () => (await loadAiTextureTools()).texApplyGenerated();
window.texDiscardGenerated = async () => (await loadAiTextureTools()).texDiscardGenerated();

// ── Animation bindings ───────────────────────────────────────────
window.playAnim = async () => (await loadAnimationModeTools()).playAnim();
window.stopAnim = async () => (await loadAnimationModeTools()).stopAnim();
window.onAnimSelectChange = async () => (await loadAnimationModeTools()).onAnimSelectChange();
window.enterAnimationMode = async () => (await loadAnimationModeTools()).enterAnimationMode();
window.exitAnimationMode = async () => (await loadAnimationModeTools()).exitAnimationMode();
window.animModePlayClip = async (...args) => (await loadAnimationModeTools()).animModePlayClip(...args);
window.animModeDeleteClip = async (...args) => (await loadAnimationModeTools()).animModeDeleteClip(...args);
window.animModeExportFastPoserClip = async (...args) => (await loadAnimationModeTools()).animModeExportFastPoserClip(...args);
window.animModeImportAnim = async () => (await loadAnimationModeTools()).animModeImportAnim();
window.animModeEditorChangeTrack = async () => (await loadAnimationModeTools()).animModeEditorChangeTrack();
window.animModeEditorScrubFrame = async () => (await loadAnimationModeTools()).animModeEditorScrubFrame();
window.animModeEditorPrevFrame = async () => (await loadAnimationModeTools()).animModeEditorPrevFrame();
window.animModeEditorNextFrame = async () => (await loadAnimationModeTools()).animModeEditorNextFrame();
window.animModeEditorPreviewFrame = async () => (await loadAnimationModeTools()).animModeEditorPreviewFrame();
window.animModeEditorApply = async () => (await loadAnimationModeTools()).animModeEditorApply();
window.animModeToggleSection = async (...args) => (await loadAnimationModeTools()).animModeToggleSection(...args);
window.animModeToggleRigViewport = async () => (await loadAnimationModeTools()).animModeToggleRigViewport();
window.animModeLoadReferenceVideo = async (...args) => (await loadAnimationModeTools()).animModeLoadReferenceVideo(...args);
window.animModeClearReferenceVideo = async () => (await loadAnimationModeTools()).animModeClearReferenceVideo();
window.animModeToggleReferenceVideoPlayback = async () => (await loadAnimationModeTools()).animModeToggleReferenceVideoPlayback();
window.animModeReferenceVideoPrevFrame = async () => (await loadAnimationModeTools()).animModeReferenceVideoPrevFrame();
window.animModeReferenceVideoNextFrame = async () => (await loadAnimationModeTools()).animModeReferenceVideoNextFrame();
window.animModeSetReferenceVideoSpeed = async (...args) => (await loadAnimationModeTools()).animModeSetReferenceVideoSpeed(...args);
window.animModeSelectPose = async () => (await loadAnimationModeTools()).animModeSelectPose();
window.animModeSavePoseToLibrary = async () => (await loadAnimationModeTools()).animModeSavePoseToLibrary();
window.animModePreviewPose = async () => (await loadAnimationModeTools()).animModePreviewPose();
window.animModeApplyPoseToFrame = async () => (await loadAnimationModeTools()).animModeApplyPoseToFrame();
window.animModeDeletePose = async () => (await loadAnimationModeTools()).animModeDeletePose();
window.animModeExportPoseLibrary = async () => (await loadAnimationModeTools()).animModeExportPoseLibrary();
window.animModeImportPoseLibrary = async (...args) => (await loadAnimationModeTools()).animModeImportPoseLibrary(...args);
window.getAnimModeRigPreviewDiagnostics = async () => (await loadAnimationModeTools()).getAnimModeRigPreviewDiagnostics();
window.openMotionRipperModal = async () => (await loadMotionRipperTools()).openMotionRipperModal();
window.closeMotionRipperModal = async () => (await loadMotionRipperTools()).closeMotionRipperModal();
window.motionRipperShareScreen = async () => (await loadMotionRipperTools()).motionRipperShareScreen();
window.motionRipperStopShare = async () => (await loadMotionRipperTools()).motionRipperStopShare();
window.motionRipperCaptureNeutral = async () => (await loadMotionRipperTools()).motionRipperCaptureNeutral();
window.motionRipperToggleRecording = async () => (await loadMotionRipperTools()).motionRipperToggleRecording();
window.motionRipperClearCapture = async () => (await loadMotionRipperTools()).motionRipperClearCapture();
window.motionRipperImportCapture = async () => (await loadMotionRipperTools()).motionRipperImportCapture();
window.motionRipperExportDebugJsons = async () => (await loadMotionRipperTools()).motionRipperExportDebugJsons?.();
window.motionRipperTogglePreviewPlayback = async () => (await loadMotionRipperTools()).motionRipperTogglePreviewPlayback();
window.motionRipperUpdatePreviewSpeed = async () => (await loadMotionRipperTools()).motionRipperUpdatePreviewSpeed?.();
window.motionRipperUpdateSmoothingLabel = async () => (await loadMotionRipperTools()).motionRipperUpdateSmoothingLabel?.();
window.motionRipperToggleAreaSelection = async () => (await loadMotionRipperTools()).motionRipperToggleAreaSelection?.();
window.motionRipperResetArea = async () => (await loadMotionRipperTools()).motionRipperResetArea?.();
window.motionRipperPreviewPrevFrame = async () => (await loadMotionRipperTools()).motionRipperPreviewPrevFrame?.();
window.motionRipperPreviewNextFrame = async () => (await loadMotionRipperTools()).motionRipperPreviewNextFrame?.();
window.motionRipperDeleteCurrentFrame = async () => (await loadMotionRipperTools()).motionRipperDeleteCurrentFrame?.();
window.motionRipperRepairCurrentFrame = async () => (await loadMotionRipperTools()).motionRipperRepairCurrentFrame?.();
window.motionRipperStartFrameEdit = async () => (await loadMotionRipperTools()).motionRipperStartFrameEdit?.();
window.motionRipperCancelFrameEdit = async () => (await loadMotionRipperTools()).motionRipperCancelFrameEdit?.();
window.motionRipperSaveFrameEdit = async () => (await loadMotionRipperTools()).motionRipperSaveFrameEdit?.();
window.handleArchetypeImportSubmit = async () => (await loadJsonImportTools()).handleArchetypeImportSubmit();
window.handleArchetypeImportFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const ta = document.getElementById('import-archetype-textarea');
    if (ta) ta.value = e.target.result;
    await window.handleArchetypeImportSubmit();
  };
  reader.onerror = () => { document.getElementById('import-archetype-error').textContent = t('jsonFileReadError'); };
  reader.readAsText(file);
};

// ── Rig bindings ─────────────────────────────────────────────────
window.openRigPanel = async (...args) => (await loadRigTools()).openRigPanel(...args);
window.closeRigPanel = async () => (await loadRigTools()).closeRigPanel();
window.rigAutoBind = async () => (await loadRigTools()).rigAutoBind();
window.rigTogglePlay = async () => (await loadRigTools()).rigTogglePlay();
window.rigStopAnim = async () => (await loadRigTools()).rigStopAnim();
window.openAssignRigModal = async (...args) => (await loadAssignRigTools()).openAssignRigModal(...args);
window.onAssignRigArchetypeChange = async (...args) => (await loadAssignRigTools()).onAssignRigArchetypeChange(...args);
window.confirmAssignRig = async () => (await loadAssignRigTools()).confirmAssignRig();

// ── Prompt generator bindings ────────────────────────────────────
window.openPromptModal = async () => (await loadPromptTools()).openPromptModal();
window.closePromptModal = async () => (await loadPromptTools()).closePromptModal();
window.switchPromptTab = async (...args) => (await loadPromptTools()).switchPromptTab(...args);
window.onPromptSkeletonChange = async () => (await loadPromptTools()).onPromptSkeletonChange();
window.onPromptArchetypeChange = async () => (await loadPromptTools()).onPromptArchetypeChange();
window.generateModelPrompt = async () => (await loadPromptTools()).generateModelPrompt();
window.generateSkeletonPrompt = async () => (await loadPromptTools()).generateSkeletonPrompt();
window.generatePrompt = window.generateModelPrompt;
window.promptApplyMoldHint = async () => (await loadPromptTools()).promptApplyMoldHint();
window.copyPrompt = async () => (await loadPromptTools()).copyPrompt();

// ── Archetype shortcuts ──────────────────────────────────────────
const ARCHETYPE_DEFAULT_TEMPLATES = {
  HUMANOID: 'swordsman_cm',
  BIRD: 'chicken_cm',
  QUADRUPED: 'psx_spyro_study_cm',
  CAR: 'car_cm',
  PROP: 'crate',
};
window.openArchetype = async (archetypeId) => {
  const templateId = ARCHETYPE_DEFAULT_TEMPLATES[archetypeId];
  if (!templateId) return;
  const { addTemplate } = await loadTemplateTools();
  addTemplate(templateId);
  refreshObjectList();
  refreshSceneObjectList();
  setTimeout(async () => {
    const group = state.userObjects.children[state.userObjects.children.length - 1];
    if (!group || !group.userData.archetype) return;
    const { openRigPanel } = await loadRigTools();
    openRigPanel(group);
  }, 50);
};
