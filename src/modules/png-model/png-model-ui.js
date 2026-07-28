import { state } from '../shared/state.js';
import { showToast } from '../shared/ui-helpers.js';
import { findAlphaBounds } from './png-model-analysis.js';
import {
  clearDepthMap,
  createDepthMap,
  deserializeDepthMap,
  paintDepthMap,
} from './png-model-depth-map.js';
import {
  PNG_MODEL_DEFAULT_SETTINGS,
  clonePngModelRecipe,
  isPngModelGroup,
  normalizePngModelSettings,
} from './png-model-metadata.js';
import {
  buildPngModelPayloadFromLoaded,
  createPngModelGroupFromPayload,
  insertPngModelGroup,
  updatePngModelGroup,
} from './png-model.js';
import { loadPngModelFile, loadPngModelSource } from './png-model-source.js';
import { PngModelPreview } from './png-model-preview.js';

const uiState = {
  initialized: false,
  loaded: null,
  depthMap: createDepthMap(),
  payload: null,
  editingGroup: null,
  preview: null,
  tool: 'inflate',
  painting: false,
  generation: 0,
  timer: null,
  inspection: {
    showWireframe: false,
    showVertices: false,
  },
};

const element = (id) => document.getElementById(id);

function setStatus(message, error = false) {
  const status = element('png-model-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('text-red-400', error);
  status.classList.toggle('text-zinc-400', !error);
}

function updateDensityValue(value = element('png-model-density')?.value) {
  const output = element('png-model-density-value');
  if (output) output.textContent = String(Math.round(Number(value) || PNG_MODEL_DEFAULT_SETTINGS.density));
}

function updateTopologySummary(payload, message = 'No mesh generated') {
  const summary = element('png-model-topology-summary');
  if (!summary) return;
  summary.textContent = payload
    ? `${payload.analysis.vertexCount.toLocaleString()} vertices · ${payload.analysis.triangleCount.toLocaleString()} triangles`
    : message;
}

function applyInspectionState() {
  const wireframe = element('png-model-show-wireframe');
  const vertices = element('png-model-show-vertices');
  if (wireframe) wireframe.checked = uiState.inspection.showWireframe;
  if (vertices) vertices.checked = uiState.inspection.showVertices;
  uiState.preview?.setInspection(uiState.inspection);
}

function setSettings(settings = {}) {
  const value = normalizePngModelSettings(settings);
  element('png-model-name').value = value.name;
  element('png-model-target-size').value = value.targetSize;
  element('png-model-density').value = String(value.density);
  updateDensityValue(value.density);
  element('png-model-thickness').value = value.thickness;
  element('png-model-bulge').value = value.bulge;
  element('png-model-alpha').value = value.alphaThreshold;
  element('png-model-smoothing').value = String(value.smoothing);
  element('png-model-manual-strength').value = value.manualStrength;
  element('png-model-side-color').value = value.sideColor;
  element('png-model-mirror').checked = value.mirrorBack;
}

function getSettings() {
  return normalizePngModelSettings({
    name: element('png-model-name').value,
    targetSize: element('png-model-target-size').value,
    density: element('png-model-density').value,
    thickness: element('png-model-thickness').value,
    bulge: element('png-model-bulge').value,
    alphaThreshold: element('png-model-alpha').value,
    smoothing: element('png-model-smoothing').value,
    manualStrength: element('png-model-manual-strength').value,
    sideColor: element('png-model-side-color').value,
    mirrorBack: element('png-model-mirror').checked,
  });
}

function getCurrentBounds() {
  if (uiState.payload?.analysis?.bounds) return uiState.payload.analysis.bounds;
  if (!uiState.loaded) return null;
  return findAlphaBounds(
    uiState.loaded.imageData,
    uiState.loaded.canvas.width,
    uiState.loaded.canvas.height,
    getSettings().alphaThreshold,
  );
}

function drawPaintCanvas() {
  const canvas = element('png-model-paint');
  const empty = element('png-model-paint-empty');
  if (!canvas || !uiState.loaded) {
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  canvas.width = uiState.loaded.canvas.width;
  canvas.height = uiState.loaded.canvas.height;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(uiState.loaded.canvas, 0, 0);
  const bounds = getCurrentBounds();
  if (!bounds) return;
  const size = uiState.depthMap.size;
  const cellWidth = bounds.width / size;
  const cellHeight = bounds.height / size;
  uiState.depthMap.values.forEach((value, index) => {
    if (Math.abs(value) < 0.01) return;
    const x = index % size;
    const y = Math.floor(index / size);
    const alpha = Math.min(0.68, 0.12 + Math.abs(value) * 0.56);
    context.fillStyle = value > 0 ? `rgba(255,40,40,${alpha})` : `rgba(40,100,255,${alpha})`;
    context.fillRect(bounds.x + x * cellWidth, bounds.y + y * cellHeight, cellWidth + 1, cellHeight + 1);
  });
  context.strokeStyle = '#7cff00';
  context.lineWidth = Math.max(1, canvas.width / 400);
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

function updateAnalysis(payload) {
  const analysis = element('png-model-analysis');
  if (!analysis || !payload) return;
  const info = payload.analysis;
  analysis.textContent = [
    `Source: ${info.sourceWidth} x ${info.sourceHeight}px`,
    `Crop: ${info.bounds.width} x ${info.bounds.height}px`,
    `Grid: ${info.columns} x ${info.rows}`,
    `Opaque cells: ${info.opaqueCells}`,
    `Vertices: ${info.vertexCount}`,
    `Triangles: ${info.triangleCount}`,
    `Model: ${info.width.toFixed(2)} x ${info.height.toFixed(2)}`,
  ].join('\n');
}

async function regenerate() {
  if (!uiState.loaded) return;
  const generation = ++uiState.generation;
  element('png-model-confirm').disabled = true;
  setStatus('Generating local mesh...');
  updateTopologySummary(null, 'Generating mesh...');
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const payload = buildPngModelPayloadFromLoaded(uiState.loaded, getSettings(), uiState.depthMap);
    if (generation !== uiState.generation) return;
    uiState.payload = payload;
    const previewGroup = createPngModelGroupFromPayload(payload);
    uiState.preview?.setModel(previewGroup);
    updateAnalysis(payload);
    updateTopologySummary(payload);
    drawPaintCanvas();
    element('png-model-confirm').disabled = false;
    setStatus(`Ready. ${payload.analysis.triangleCount} triangles generated locally.`);
  } catch (error) {
    if (generation !== uiState.generation) return;
    uiState.payload = null;
    uiState.preview?.setModel(null);
    element('png-model-confirm').disabled = true;
    element('png-model-analysis').textContent = 'No valid silhouette.';
    updateTopologySummary(null);
    drawPaintCanvas();
    setStatus(error.message || 'Could not generate the model.', true);
  }
}

function scheduleRegeneration(delay = 120) {
  clearTimeout(uiState.timer);
  uiState.timer = setTimeout(() => { void regenerate(); }, delay);
}

function setTool(tool) {
  uiState.tool = tool;
  document.querySelectorAll('.png-depth-tool').forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle('bg-zinc-800', !active);
    button.classList.toggle('bg-red-950', active && tool === 'inflate');
    button.classList.toggle('bg-blue-950', active && tool === 'deflate');
    button.classList.toggle('bg-yellow-950', active && tool === 'smooth');
    button.classList.toggle('bg-zinc-600', active && tool === 'erase');
  });
}

function paintAt(event) {
  const canvas = element('png-model-paint');
  const bounds = getCurrentBounds();
  if (!canvas || !bounds) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const u = (x - bounds.x) / bounds.width;
  const v = (y - bounds.y) / bounds.height;
  if (u < 0 || v < 0 || u > 1 || v > 1) return;
  paintDepthMap(uiState.depthMap, {
    tool: uiState.tool,
    u,
    v,
    radius: Number(element('png-model-brush-size').value),
    strength: Number(element('png-model-brush-strength').value),
  });
  drawPaintCanvas();
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  setStatus('Reading image locally...');
  try {
    uiState.loaded = await loadPngModelFile(file);
    uiState.depthMap = createDepthMap();
    element('png-model-file-label').textContent = file.name;
    if (element('png-model-name').value === PNG_MODEL_DEFAULT_SETTINGS.name) {
      element('png-model-name').value = file.name.replace(/\.(png|webp)$/i, '').slice(0, 80) || PNG_MODEL_DEFAULT_SETTINGS.name;
    }
    await regenerate();
  } catch (error) {
    uiState.loaded = null;
    uiState.payload = null;
    element('png-model-confirm').disabled = true;
    setStatus(error.message || 'Could not load that image.', true);
  }
}

async function confirmModel() {
  if (!uiState.payload) return;
  const button = element('png-model-confirm');
  button.disabled = true;
  try {
    const group = createPngModelGroupFromPayload(uiState.payload);
    if (uiState.editingGroup?.parent && isPngModelGroup(uiState.editingGroup)) {
      updatePngModelGroup(uiState.editingGroup, group);
    } else {
      insertPngModelGroup(group);
    }
    closePngModelWorkbench();
  } catch (error) {
    setStatus(error.message || 'Could not add the model to the scene.', true);
    button.disabled = false;
  }
}

function initialize() {
  if (uiState.initialized) return;
  uiState.initialized = true;
  element('png-model-file').addEventListener('change', handleFile);
  element('png-model-x').addEventListener('click', closePngModelWorkbench);
  element('png-model-close').addEventListener('click', closePngModelWorkbench);
  element('png-model-refresh').addEventListener('click', () => { void regenerate(); });
  element('png-model-confirm').addEventListener('click', () => { void confirmModel(); });
  document.querySelectorAll('.png-depth-tool').forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));
  const brushSize = element('png-model-brush-size');
  const brushStrength = element('png-model-brush-strength');
  brushSize.addEventListener('input', () => { element('png-model-brush-size-value').textContent = brushSize.value; });
  brushStrength.addEventListener('input', () => { element('png-model-brush-strength-value').textContent = Number(brushStrength.value).toFixed(2); });
  const density = element('png-model-density');
  density.addEventListener('input', () => {
    updateDensityValue(density.value);
    if (uiState.loaded) scheduleRegeneration();
  });
  density.addEventListener('change', () => { if (uiState.loaded) scheduleRegeneration(0); });
  element('png-model-show-wireframe').addEventListener('change', (event) => {
    uiState.inspection.showWireframe = event.currentTarget.checked;
    applyInspectionState();
  });
  element('png-model-show-vertices').addEventListener('change', (event) => {
    uiState.inspection.showVertices = event.currentTarget.checked;
    applyInspectionState();
  });
  element('png-model-clear-depth').addEventListener('click', () => {
    clearDepthMap(uiState.depthMap);
    drawPaintCanvas();
    scheduleRegeneration(0);
  });
  document.querySelectorAll('.png-model-field, #png-model-mirror, #png-model-side-color').forEach((control) => {
    control.addEventListener('input', () => { if (uiState.loaded) scheduleRegeneration(); });
    control.addEventListener('change', () => { if (uiState.loaded) scheduleRegeneration(0); });
  });
  const canvas = element('png-model-paint');
  canvas.addEventListener('pointerdown', (event) => {
    uiState.painting = true;
    canvas.setPointerCapture(event.pointerId);
    paintAt(event);
  });
  canvas.addEventListener('pointermove', (event) => { if (uiState.painting) paintAt(event); });
  const endPaint = () => {
    if (!uiState.painting) return;
    uiState.painting = false;
    scheduleRegeneration(40);
  };
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !element('png-model-modal').classList.contains('hidden')) closePngModelWorkbench();
  });
  setTool('inflate');
}

async function openWorkbench(editingGroup = null) {
  initialize();
  const modal = element('png-model-modal');
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  uiState.preview?.dispose();
  uiState.preview = new PngModelPreview(element('png-model-preview'));
  applyInspectionState();
  uiState.editingGroup = editingGroup;
  uiState.payload = null;
  element('png-model-confirm').disabled = true;
  element('png-model-confirm').textContent = editingGroup ? 'UPDATE MODEL' : 'CREATE MODEL';
  element('png-model-subtitle').textContent = editingGroup ? 'Regenerate selected PNG model' : 'Transparent image to editable 2.5D volume';
  if (!editingGroup) {
    uiState.loaded = null;
    uiState.depthMap = createDepthMap();
    setSettings(PNG_MODEL_DEFAULT_SETTINGS);
    element('png-model-file').value = '';
    element('png-model-file-label').textContent = 'No image loaded';
    element('png-model-analysis').textContent = 'No image analyzed yet.';
    updateTopologySummary(null);
    setStatus('Choose an image to begin.');
    drawPaintCanvas();
    return;
  }
  const recipe = clonePngModelRecipe(editingGroup);
  setSettings(recipe.settings);
  uiState.depthMap = deserializeDepthMap(recipe.depthMap);
  element('png-model-file-label').textContent = recipe.source.filename;
  setStatus('Restoring editable PNG model...');
  try {
    uiState.loaded = await loadPngModelSource(recipe.source);
    await regenerate();
  } catch (error) {
    setStatus(error.message || 'The stored source could not be restored.', true);
  }
}

export function openPngModelWorkbench() {
  return openWorkbench(null);
}

export function openPngModelWorkbenchForSelection() {
  if (!isPngModelGroup(state.selectedMesh)) {
    showToast('Select a PNG-derived model first');
    return null;
  }
  return openWorkbench(state.selectedMesh);
}

export function closePngModelWorkbench() {
  clearTimeout(uiState.timer);
  uiState.generation += 1;
  uiState.painting = false;
  uiState.preview?.dispose();
  uiState.preview = null;
  const modal = element('png-model-modal');
  modal?.classList.add('hidden');
  if (modal) modal.style.display = 'none';
}

export function getPngModelWorkbenchDiagnostics() {
  return {
    open: !element('png-model-modal')?.classList.contains('hidden'),
    density: Number(element('png-model-density')?.value || PNG_MODEL_DEFAULT_SETTINGS.density),
    topology: uiState.payload ? {
      vertexCount: uiState.payload.analysis.vertexCount,
      triangleCount: uiState.payload.analysis.triangleCount,
    } : null,
    inspection: {
      ...uiState.inspection,
      ...(uiState.preview?.getInspectionState() || {}),
    },
  };
}
