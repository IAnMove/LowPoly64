import { initScene, toggleBones, onResize } from './modules/scene.js';
import { addPrimitive } from './modules/primitives.js';
import { addTemplate, generateTemplateListUI } from './modules/templates.js';
import { onMouseDown, onDoubleClick, deselectAll } from './modules/selection.js';
import { onKeyDown } from './modules/shortcuts.js';
import { toggleFlatShading, toggleWireframe, quickColor, randomRetroColor as getRandomRetroColor, setColor, setOpacity } from './modules/materials.js';
import { handleTextureUpload, toggleTexture, togglePixelated, setupTextureDragDrop } from './modules/textures.js';
import {
  openTextureEditor, closeTextureEditor, setTool, setBrushSize, setBrushColor,
  paintUndo, texLoadImage, texDownload, texNewCanvas, texUpdateUV, buildPaletteUI,
  deselectFace, setFaceUV, selectFace, applyBase64ToCanvas,
} from './modules/texture-editor.js';
import { generateTexture, getTexGenConfig, saveTexGenConfig, fetchOllamaModels, enhancePromptWithOllama } from './modules/texture-generator.js';
import {
  updatePosition, updateRotation, updateScale, updateName,
  updateColorFromPanel, updateMaterialFromPanel, updateOpacityFromPanel,
  updateUVOffset, updateUVRepeat, updateUVRotation,
  showToast, applyColorToAll, syncColorPickers, updateExportButtonText,
} from './modules/ui.js';
import { duplicateSelected, deleteSelected, centerCameraOnSelected, resetScene, groupSelected, ungroupSelected, detachBone, attachBone } from './modules/actions.js';
import { exportGLB } from './modules/export.js';
import { saveToLocalStorage, loadFromLocalStorage, exportSceneJSON, importSceneJSON, serializeGroupAsImportJSON, serializeScene } from './modules/persistence.js';
import { toggleSnap } from './modules/snap.js';
import { openImportModal, closeImportModal, handleImportSubmit, handleImportFile, handleArchetypeImportSubmit } from './modules/json-import.js';
import { undo, redo } from './modules/undo.js';
import { stopAnimation, getAnimationProgress, playAnimation } from './modules/animation.js';
import { importAnimationToGroup } from './modules/animation-import.js';
import { selectMesh, toggleMultiSelect } from './modules/selection.js';
import { state } from './modules/state.js';
import { togglePSXMode, toggleVertexJitter, toggleDithering, toggleLowRes, toggleAffineTexture } from './modules/retro-effects.js';
import { toggleLang, initI18n, t, onLangChange } from './modules/i18n.js';
import { toggleObjectList, refreshObjectList, updateSelectedOverlay } from './modules/object-list.js';
import { openRigPanel, closeRigPanel, rigTogglePlay, rigStopAnim } from './modules/rig-ui.js';
import { ARCHETYPE_IDS } from './modules/archetype-system.js';
import { getSkeletonsByArchetype, getSkeletonById } from './modules/skeleton-registry.js';
import { generateCharacterPrompt, getPromptSkeletons, getPromptProfiles, generateSkeletonPrompt as buildSkeletonPrompt, getArchetypeOptions } from './modules/prompt-generator.js';

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
    const btnPlay = document.getElementById('btn-play');
    const btnStop = document.getElementById('btn-stop');

    if (bar && progress.duration > 0) {
      bar.style.width = `${(progress.time / progress.duration) * 100}%`;
    }
    if (timeEl) {
      timeEl.textContent = `${progress.time.toFixed(1)} / ${progress.duration.toFixed(1)}`;
    }
    if (btnPlay) {
      const playing = state.animationPlaying;
      btnPlay.classList.toggle('bg-[#ffcc00]', !playing);
      btnPlay.classList.toggle('text-black', !playing);
      btnPlay.classList.toggle('bg-green-600', playing);
      btnPlay.classList.toggle('text-white', playing);
    }
    if (btnStop) {
      const stopped = !state.animationPlaying;
      btnStop.classList.toggle('bg-zinc-800', !stopped || state.animationPlaying);
      btnStop.classList.toggle('text-[#ffcc00]', !stopped || state.animationPlaying);
    }
  }
  updateTimelineUI();
});

// ── Panel toggles ──────────────────────────────────────────────
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

// ── Scene object list in right panel ───────────────────────────
function refreshSceneObjectList() {
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
window.refreshSceneObjectList = refreshSceneObjectList;

// Expose functions to HTML onclick handlers
window.addPrimitive = (...args) => { addPrimitive(...args); refreshObjectList(); refreshSceneObjectList(); };
window.addTemplate = (...args) => { addTemplate(...args); refreshObjectList(); refreshSceneObjectList(); };
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

// ── Texture Generation & Config ──────────────────────────────────
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

// ── Config modal ─────────────────────────────────────────────────
function openConfigModal() {
  const cfg = getTexGenConfig();

  document.getElementById('cfg-method-openai').classList.toggle('bg-[#ffcc00]', cfg.method === 'openai');
  document.getElementById('cfg-method-openai').classList.toggle('text-black', cfg.method === 'openai');
  document.getElementById('cfg-method-sd').classList.toggle('bg-[#ffcc00]', cfg.method === 'stable-diffusion');
  document.getElementById('cfg-method-sd').classList.toggle('text-black', cfg.method === 'stable-diffusion');
  document.getElementById('cfg-method-select').value = cfg.method;

  document.getElementById('cfg-openai-key').value = '';
  document.getElementById('cfg-openai-key').placeholder = cfg.openaiKey ? '••••••••••••••••••••' : 'sk-...';
  document.getElementById('cfg-openai-model').value = cfg.model;
  document.getElementById('cfg-openai-size').value = cfg.size;
  document.getElementById('cfg-openai-quality').value = cfg.quality;

  document.getElementById('cfg-sd-url').value = cfg.sdUrl;
  document.getElementById('cfg-sd-width').value = cfg.sdWidth;
  document.getElementById('cfg-sd-height').value = cfg.sdHeight;
  document.getElementById('cfg-sd-steps').value = cfg.sdSteps;

  document.getElementById('cfg-ollama-url').value = cfg.ollamaUrl;
  _refreshOllamaModelSelect(cfg.ollamaModel, []);

  _updateConfigSections(cfg.method);
  document.getElementById('config-modal').classList.remove('hidden');
}

function closeConfigModal() {
  document.getElementById('config-modal').classList.add('hidden');
}

function onConfigMethodChange(method) {
  document.getElementById('cfg-method-select').value = method;
  document.getElementById('cfg-method-openai').classList.toggle('bg-[#ffcc00]', method === 'openai');
  document.getElementById('cfg-method-openai').classList.toggle('text-black', method === 'openai');
  document.getElementById('cfg-method-sd').classList.toggle('bg-[#ffcc00]', method === 'stable-diffusion');
  document.getElementById('cfg-method-sd').classList.toggle('text-black', method === 'stable-diffusion');
  _updateConfigSections(method);
}

function _updateConfigSections(method) {
  document.getElementById('cfg-section-openai').classList.toggle('hidden', method !== 'openai');
  document.getElementById('cfg-section-sd').classList.toggle('hidden', method !== 'stable-diffusion');
}

async function loadOllamaModels() {
  const url = document.getElementById('cfg-ollama-url').value.trim();
  const btn = document.getElementById('cfg-ollama-load-btn');
  btn.disabled = true;
  btn.textContent = 'LOADING...';
  try {
    const models = await fetchOllamaModels(url);
    const saved = getTexGenConfig().ollamaModel;
    _refreshOllamaModelSelect(saved, models);
    showToast(`Found ${models.length} Ollama model(s)`);
  } catch (err) {
    showToast('Ollama: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'LOAD MODELS';
  }
}

function _refreshOllamaModelSelect(selectedModel, models) {
  const sel = document.getElementById('cfg-ollama-model-select');
  if (!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = models.length ? '— select model —' : '— click Load Models —';
  sel.appendChild(placeholder);
  models.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === selectedModel) opt.selected = true;
    sel.appendChild(opt);
  });
  if (selectedModel && !models.includes(selectedModel)) {
    const opt = document.createElement('option');
    opt.value = selectedModel;
    opt.textContent = selectedModel + ' (saved)';
    opt.selected = true;
    sel.appendChild(opt);
  }
}

function saveConfigModal() {
  const method = document.getElementById('cfg-method-select').value;
  saveTexGenConfig({
    method,
    openaiKey:   document.getElementById('cfg-openai-key').value.trim(),
    model:       document.getElementById('cfg-openai-model').value.trim(),
    size:        document.getElementById('cfg-openai-size').value,
    quality:     document.getElementById('cfg-openai-quality').value,
    sdUrl:       document.getElementById('cfg-sd-url').value.trim(),
    sdWidth:     document.getElementById('cfg-sd-width').value,
    sdHeight:    document.getElementById('cfg-sd-height').value,
    sdSteps:     document.getElementById('cfg-sd-steps').value,
    ollamaUrl:   document.getElementById('cfg-ollama-url').value.trim(),
    ollamaModel: document.getElementById('cfg-ollama-model-select').value,
  });
  closeConfigModal();
  showToast('Config saved');
}

// ── Prompt expand modal ──────────────────────────────────────────
function openPromptExpandModal() {
  const small = document.getElementById('tex-gen-prompt');
  const large = document.getElementById('tex-gen-prompt-full');
  if (large && small) large.value = small.value;

  const cfg = getTexGenConfig();
  const enhanceBtn = document.getElementById('prompt-enhance-btn');
  if (enhanceBtn) enhanceBtn.classList.toggle('hidden', !cfg.ollamaModel);

  document.getElementById('prompt-expand-modal').classList.remove('hidden');
  if (large) large.focus();
}

function closePromptExpandModal() {
  // Sync back to small textarea
  const large = document.getElementById('tex-gen-prompt-full');
  const small = document.getElementById('tex-gen-prompt');
  if (large && small) small.value = large.value;
  document.getElementById('prompt-expand-modal').classList.add('hidden');
}

function applyPromptTemplate(selectEl) {
  const val = selectEl.value;
  if (!val) return;
  const large = document.getElementById('tex-gen-prompt-full');
  if (large) large.value = val;
  selectEl.value = '';
}

// ── Generate (small panel) ────────────────────────────────────────
async function texGenerate() {
  const promptEl = document.getElementById('tex-gen-prompt');
  const btn = document.getElementById('tex-gen-btn');
  const prompt = promptEl ? promptEl.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  await _runGenerate(prompt, btn);
}

// ── Generate (expand modal) ───────────────────────────────────────
async function texGenerateFromModal() {
  const large = document.getElementById('tex-gen-prompt-full');
  const small = document.getElementById('tex-gen-prompt');
  const btn = document.getElementById('prompt-generate-btn');
  const prompt = large ? large.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  if (small) small.value = prompt;
  await _runGenerate(prompt, btn);
  closePromptExpandModal();
}

async function _runGenerate(prompt, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'GENERATING...'; }
  try {
    const b64 = await generateTexture(prompt);
    applyBase64ToCanvas(b64);
    showToast('Texture generated!');
  } catch (err) {
    showToast('Error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'GENERATE'; }
  }
}

// ── Enhance prompt with Ollama ────────────────────────────────────
async function enhancePrompt() {
  const large = document.getElementById('tex-gen-prompt-full');
  const btn = document.getElementById('prompt-enhance-btn');
  const prompt = large ? large.value.trim() : '';
  if (!prompt) { showToast('Enter a prompt first'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'ENHANCING...'; }
  try {
    const enhanced = await enhancePromptWithOllama(prompt);
    if (large) large.value = enhanced;
    showToast('Prompt enhanced!');
  } catch (err) {
    showToast('Ollama: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'ENHANCE'; }
  }
}
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
window.toggleSnap = toggleSnap;
window.saveScene = saveToLocalStorage;
window.loadScene = () => { loadFromLocalStorage(); setTimeout(() => { refreshObjectList(); refreshSceneObjectList(); }, 0); };
window.exportSceneJSON = exportSceneJSON;
window.copySceneJSON = () => {
  const data = serializeScene();
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(t('jsonCopied'));
  }).catch(() => {
    prompt(t('copyThisJson'), json);
  });
};
window.copyExportJSON = () => {
  const obj = state.animationMode ? state.animationModeObject : state.selectedMesh;
  let data;
  if (obj) {
    data = serializeGroupAsImportJSON(obj);
    if (!data) { showToast(t('couldNotSerialize')); return; }
  } else {
    data = { name: 'SCENE', objects: [] };
    state.userObjects.children.forEach((child) => {
      const d = serializeGroupAsImportJSON(child);
      if (d) data.objects.push(d);
    });
  }
  const json = JSON.stringify(data, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(t('jsonCopied'));
  }).catch(() => {
    prompt(t('copyThisJson'), json);
  });
};
window.importSceneJSON = (event) => {
  const file = event.target.files[0];
  if (file) { importSceneJSON(file); setTimeout(refreshObjectList, 100); }
};
window.groupSelected = () => { groupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.ungroupSelected = () => { ungroupSelected(); refreshObjectList(); refreshSceneObjectList(); };
window.detachBone = detachBone;
window.attachBone = attachBone;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleImportSubmit = () => { handleImportSubmit(); refreshObjectList(); refreshSceneObjectList(); };
window.handleImportFile = (e) => { handleImportFile(e); setTimeout(() => { refreshObjectList(); refreshSceneObjectList(); }, 100); };
window.applyColorToAll = () => {
  const hex = document.getElementById('multi-color-picker')?.value || '#ffcc00';
  applyColorToAll(hex);
};
window.applyOpacityToAll = (value) => {
  const opacity = parseFloat(value);
  const label = document.getElementById('multi-opacity-value');
  if (label) label.textContent = opacity.toFixed(2);
  state.selectedMeshes.forEach((mesh) => {
    const target = mesh.userData.isPivot ? mesh.children.find((c) => c.isMesh) : (mesh.isMesh ? mesh : null);
    if (target && target.material) {
      setOpacity(target, opacity);
    }
  });
};
window.undo = () => { undo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.redo = () => { redo(); setTimeout(() => { refreshObjectList(); updateSelectedOverlay(); }, 0); };
window.toggleLang = toggleLang;
window.toggleObjectList = toggleObjectList;
window.togglePSXMode = () => {
  const on = togglePSXMode();
  const btn = document.getElementById('btn-psx');
  if (btn) {
    btn.classList.toggle('bg-[#ff00ff]', on);
    btn.classList.toggle('text-black', on);
    btn.classList.toggle('bg-zinc-900', !on);
    btn.classList.toggle('text-[#ff00ff]', !on);
  }
};
window.toggleVertexJitter = toggleVertexJitter;
window.toggleDithering = toggleDithering;
window.toggleLowRes = toggleLowRes;
window.toggleAffineTexture = toggleAffineTexture;
window.openRigPanel = openRigPanel;

// ── Assign Rig Modal ───────────────────────────────────────────
let _assignRigTarget = null;

window.openAssignRigModal = (group) => {
  const g = group || state.selectedMesh;
  if (!g || !g.isGroup) return;
  _assignRigTarget = g;

  const archSelect = document.getElementById('assign-rig-archetype');
  archSelect.innerHTML = '';
  ARCHETYPE_IDS.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    archSelect.appendChild(opt);
  });

  window.onAssignRigArchetypeChange();
  document.getElementById('assign-rig-modal').classList.remove('hidden');
};

window.onAssignRigArchetypeChange = () => {
  const archetypeId = document.getElementById('assign-rig-archetype')?.value;
  const skelSelect = document.getElementById('assign-rig-skeleton');
  if (!skelSelect) return;
  skelSelect.innerHTML = '';
  getSkeletonsByArchetype(archetypeId).forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.id;
    skelSelect.appendChild(opt);
  });
  if (skelSelect.options.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '(ninguno)';
    skelSelect.appendChild(opt);
  }
};

window.confirmAssignRig = () => {
  const g = _assignRigTarget;
  if (!g) return;

  const archetypeId = document.getElementById('assign-rig-archetype')?.value;
  const skeletonId = document.getElementById('assign-rig-skeleton')?.value;
  if (!archetypeId) return;

  const skeleton = skeletonId ? getSkeletonById(skeletonId) : null;

  g.userData.archetype = archetypeId;
  g.userData.skeletonId = skeletonId || null;
  g.userData.slotBindings = skeleton ? { ...skeleton.defaultBindings } : {};
  if (!g.userData.slotMap) g.userData.slotMap = {};

  document.getElementById('assign-rig-modal').classList.add('hidden');
  _assignRigTarget = null;

  // Refresh button label in properties panel
  const rigBtn = document.getElementById('btn-rig-panel');
  if (rigBtn) {
    rigBtn.textContent = t('rigAnimations');
  }

  openRigPanel(g);
};

// ── Prompt Generator ───────────────────────────────────────────
window.openPromptModal = () => {
  const modal = document.getElementById('prompt-modal');
  if (!modal) return;
  // Populate model tab skeleton dropdown
  const skelSelect = document.getElementById('prompt-skeleton-select');
  skelSelect.innerHTML = '';
  getPromptSkeletons().forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    skelSelect.appendChild(opt);
  });
  window.onPromptSkeletonChange();
  // Populate skeleton tab archetype dropdown
  const archSelect = document.getElementById('prompt-archetype-select');
  archSelect.innerHTML = '';
  getArchetypeOptions().forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = a.id;
    archSelect.appendChild(opt);
  });
  // Hide output, start on model tab
  const out = document.getElementById('prompt-output-section');
  if (out) out.classList.add('hidden');
  window.switchPromptTab('model');
  modal.classList.remove('hidden');
};

window.closePromptModal = () => {
  document.getElementById('prompt-modal')?.classList.add('hidden');
};

window.switchPromptTab = (tab) => {
  const isModel = tab === 'model';
  document.getElementById('prompt-tab-model').classList.toggle('hidden', !isModel);
  document.getElementById('prompt-tab-skeleton').classList.toggle('hidden', isModel);
  document.getElementById('prompt-tab-btn-model').className = isModel
    ? 'px-4 py-2 text-[9px] tracking-widest border-r border-[#ff00ff]/20 bg-[#ff00ff] text-black'
    : 'px-4 py-2 text-[9px] tracking-widest border-r border-[#ff00ff]/20 text-zinc-400 hover:text-white';
  document.getElementById('prompt-tab-btn-skeleton').className = !isModel
    ? 'px-4 py-2 text-[9px] tracking-widest bg-[#ff00ff] text-black'
    : 'px-4 py-2 text-[9px] tracking-widest text-zinc-400 hover:text-white';
  const out = document.getElementById('prompt-output-section');
  if (out) out.classList.add('hidden');
};

window.onPromptSkeletonChange = () => {
  const skeletonId = document.getElementById('prompt-skeleton-select')?.value;
  if (!skeletonId) return;
  const profileSelect = document.getElementById('prompt-profile-select');
  profileSelect.innerHTML = '';
  getPromptProfiles(skeletonId).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.label;
    profileSelect.appendChild(opt);
  });
};

window.onPromptArchetypeChange = () => {
  const isNew = document.getElementById('prompt-new-archetype')?.checked;
  const nameInput = document.getElementById('prompt-new-archetype-name');
  const archSelect = document.getElementById('prompt-archetype-select');
  if (nameInput) nameInput.classList.toggle('hidden', !isNew);
  if (archSelect) archSelect.disabled = !!isNew;
};

window.generateModelPrompt = () => {
  const skeletonId = document.getElementById('prompt-skeleton-select')?.value;
  const profileId = document.getElementById('prompt-profile-select')?.value;
  const description = document.getElementById('prompt-description')?.value?.trim();
  const prompt = generateCharacterPrompt(skeletonId, profileId, description);
  const output = document.getElementById('prompt-output');
  if (output) output.value = prompt;
  document.getElementById('prompt-hint-model')?.classList.remove('hidden');
  document.getElementById('prompt-hint-skeleton')?.classList.add('hidden');
  const section = document.getElementById('prompt-output-section');
  if (section) section.classList.remove('hidden');
};

window.generateSkeletonPrompt = () => {
  const isNew = document.getElementById('prompt-new-archetype')?.checked;
  const archetypeId = document.getElementById('prompt-archetype-select')?.value;
  const newName = document.getElementById('prompt-new-archetype-name')?.value?.trim();
  const description = document.getElementById('prompt-skeleton-description')?.value?.trim();
  const prompt = buildSkeletonPrompt(archetypeId, isNew, newName, description);
  const output = document.getElementById('prompt-output');
  if (output) output.value = prompt;
  document.getElementById('prompt-hint-model')?.classList.add('hidden');
  document.getElementById('prompt-hint-skeleton')?.classList.remove('hidden');
  const section = document.getElementById('prompt-output-section');
  if (section) section.classList.remove('hidden');
};

// Keep old name working (backward compat with any lingering onclick)
window.generatePrompt = window.generateModelPrompt;

window.copyPrompt = () => {
  const output = document.getElementById('prompt-output');
  if (!output) return;
  navigator.clipboard.writeText(output.value).then(() => {
    showToast(t('jsonCopied'));
  }).catch(() => {
    output.select();
    document.execCommand('copy');
  });
};
window.closeRigPanel = closeRigPanel;
window.rigTogglePlay = rigTogglePlay;
window.rigStopAnim = rigStopAnim;

const ARCHETYPE_DEFAULT_TEMPLATES = {
  HUMANOID: 'swordsman_cm',
  BIRD: 'chicken_cm',
  CAR: 'car_cm',
};

window.openArchetype = (archetypeId) => {
  const templateId = ARCHETYPE_DEFAULT_TEMPLATES[archetypeId];
  if (!templateId) return;
  addTemplate(templateId);
  refreshObjectList();
  refreshSceneObjectList();
  // Brief delay so the group is fully added before opening rig panel
  setTimeout(() => {
    const group = state.userObjects.children[state.userObjects.children.length - 1];
    if (group && group.userData.archetype) openRigPanel(group);
  }, 50);
};

// Animation controls
function getAnimGroup() {
  return state.animationMode ? state.animationModeObject : state.selectedMesh;
}
function getAnimSelectIdx() {
  const select = document.getElementById('anim-select');
  return select ? parseInt(select.value) || 0 : 0;
}
window.playAnim = () => {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
};
window.stopAnim = () => {
  stopAnimation();
};
window.onAnimSelectChange = () => {
  if (!state.animationPlaying) return;
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  stopAnimation();
  playAnimation(group, getAnimSelectIdx());
};
// Keep toggleAnimPlayPause for keyboard shortcut (Space)
window.toggleAnimPlayPause = () => {
  const group = getAnimGroup();
  if (!group || !group.userData?.animationClips?.length) return;
  if (state.animationPlaying) {
    stopAnimation();
  } else {
    playAnimation(group, getAnimSelectIdx());
  }
};
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
  reader.onerror = () => {
    const err = document.getElementById('import-archetype-error');
    if (err) err.textContent = t('jsonFileReadError');
  };
  reader.readAsText(file);
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
