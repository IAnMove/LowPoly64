import { state } from '../shared/state.js';
import { t, onLangChange } from '../shared/i18n.js';
import { showToast } from '../shared/ui-helpers.js';
import { findAlphaBounds } from './png-model-analysis.js';
import { formatPngModelAnalysis } from './png-model-analysis-view.js';
import {
  clearDepthMap,
  createDepthMap,
  deserializeDepthMap,
  paintDepthMap,
} from './png-model-depth-map.js';
import {
  PNG_MODEL_DEFAULT_SETTINGS,
  PNG_MODEL_NEW_SETTINGS,
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
import { PNG_MODEL_PRESETS } from './png-model-presets.js';
import {
  loadPngModelAsset,
  loadPngModelFile,
  loadPngModelSource,
} from './png-model-source.js';
import { PngModelPreview } from './png-model-preview.js';

const GEOMETRY_CONTROL_IDS = Object.freeze([
  'png-model-target-size',
  'png-model-depth-profile',
  'png-model-density',
  'png-model-thickness',
  'png-model-bulge',
  'png-model-edge-depth',
  'png-model-edge-falloff',
  'png-model-component-mode',
  'png-model-coverage',
  'png-model-alpha',
  'png-model-smoothing',
  'png-model-manual-strength',
  'png-model-mirror',
]);

const PRESENTATION_CONTROL_IDS = Object.freeze([
  'png-model-name',
  'png-model-side-color',
  'png-model-side-style',
  'png-model-lock-depth-ratio',
]);
const uiState = {
  initialized: false,
  open: false,
  loaded: null,
  depthMap: null,
  payload: null,
  editingGroup: null,
  preview: null,
  previousFocus: null,
  tool: 'inflate',
  painting: false,
  strokeStart: null,
  paintQueue: [],
  paintFrame: 0,
  timer: null,
  presentationFrame: 0,
  pendingPresentation: null,
  sessionToken: 0,
  loadToken: 0,
  generationToken: 0,
  revision: 0,
  generatedRevision: -1,
  generationTask: null,
  baseSettings: { ...PNG_MODEL_NEW_SETTINGS },
  lastTargetSize: PNG_MODEL_NEW_SETTINGS.targetSize,
  dirty: false,
  confirming: false,
  loading: false,
  depthHistory: [],
  depthHistoryIndex: -1,
  previewView: 'three-quarter',
  inspection: {
    showWireframe: false,
    showVertices: false,
  },
};
const element = (id) => document.getElementById(id);
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const isOpen = () => uiState.open && !element('png-model-modal')?.classList.contains('hidden');

function translated(key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

function setStatus(message, error = false) {
  const status = element('png-model-status');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('text-red-400', error);
  status.classList.toggle('text-zinc-300', !error);
}
function setDirty(dirty) {
  uiState.dirty = Boolean(dirty);
  element('png-model-unsaved')?.classList.toggle('hidden', !uiState.dirty);
}
function setConfirmEnabled(enabled) {
  const button = element('png-model-confirm');
  if (button) button.disabled = !enabled || uiState.confirming;
}
function updateDensityValue(value = element('png-model-density')?.value) {
  const output = element('png-model-density-value');
  if (output) output.textContent = String(Math.round(Number(value) || PNG_MODEL_DEFAULT_SETTINGS.density));
}
function updateEdgeOutputs() {
  const depth = Number(element('png-model-edge-depth')?.value);
  const falloff = Number(element('png-model-edge-falloff')?.value);
  if (element('png-model-edge-depth-value')) {
    element('png-model-edge-depth-value').textContent = `${Math.round((Number.isFinite(depth) ? depth : 0.03) * 100)}%`;
  }
  if (element('png-model-edge-falloff-value')) {
    element('png-model-edge-falloff-value').textContent = `${Math.round((Number.isFinite(falloff) ? falloff : 0.18) * 100)}%`;
  }
  const coverage = Number(element('png-model-coverage')?.value);
  if (element('png-model-coverage-value')) {
    element('png-model-coverage-value').textContent = `${Math.round((Number.isFinite(coverage) ? coverage : 0.2) * 100)}%`;
  }
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
function setPreviewView(view = 'three-quarter') {
  uiState.previewView = ['front', 'three-quarter', 'side'].includes(view) ? view : 'three-quarter';
  document.querySelectorAll('.png-model-view').forEach((button) => {
    const active = button.dataset.view === uiState.previewView;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('border-[#7cff00]', active);
    button.classList.toggle('text-[#7cff00]', active);
    button.classList.toggle('border-zinc-600', !active);
    button.classList.toggle('text-zinc-300', !active);
  });
  uiState.preview?.setView(uiState.previewView);
}
function setSettings(settings = {}) {
  const value = normalizePngModelSettings(settings);
  uiState.baseSettings = { ...value };
  element('png-model-name').value = value.name;
  element('png-model-target-size').value = value.targetSize;
  uiState.lastTargetSize = value.targetSize;
  element('png-model-depth-profile').value = value.depthProfile;
  element('png-model-density').value = String(value.density);
  updateDensityValue(value.density);
  element('png-model-thickness').value = value.thickness;
  element('png-model-bulge').value = value.bulge;
  element('png-model-edge-depth').value = value.edgeDepth ?? 0.03;
  element('png-model-edge-falloff').value = value.edgeFalloff ?? 0.18;
  element('png-model-component-mode').value = value.componentMode || 'largest';
  element('png-model-coverage').value = value.coverageThreshold ?? 0.2;
  updateEdgeOutputs();
  element('png-model-alpha').value = value.alphaThreshold;
  element('png-model-smoothing').value = String(value.smoothing);
  element('png-model-manual-strength').value = value.manualStrength;
  element('png-model-side-style').value = value.sideStyle || 'sampled';
  element('png-model-side-color').value = value.sideColor;
  element('png-model-mirror').checked = value.mirrorBack;
  element('png-model-lock-depth-ratio').checked = value.keepDepthRatio !== false;
}
function getSettings() {
  return normalizePngModelSettings({
    ...uiState.baseSettings,
    name: element('png-model-name')?.value,
    targetSize: element('png-model-target-size')?.value,
    depthProfile: element('png-model-depth-profile')?.value,
    density: element('png-model-density')?.value,
    thickness: element('png-model-thickness')?.value,
    bulge: element('png-model-bulge')?.value,
    edgeDepth: element('png-model-edge-depth')?.value,
    edgeFalloff: element('png-model-edge-falloff')?.value,
    componentMode: element('png-model-component-mode')?.value,
    coverageThreshold: element('png-model-coverage')?.value,
    alphaThreshold: element('png-model-alpha')?.value,
    smoothing: element('png-model-smoothing')?.value,
    manualStrength: element('png-model-manual-strength')?.value,
    sideStyle: element('png-model-side-style')?.value,
    sideColor: element('png-model-side-color')?.value,
    mirrorBack: element('png-model-mirror')?.checked,
    keepDepthRatio: element('png-model-lock-depth-ratio')?.checked,
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
function clearPaintCanvas() {
  const canvas = element('png-model-paint');
  if (canvas) {
    canvas.width = 1;
    canvas.height = 1;
    canvas.getContext('2d')?.clearRect(0, 0, 1, 1);
  }
  element('png-model-paint-empty')?.classList.remove('hidden');
}

function drawPaintCanvas() {
  const canvas = element('png-model-paint');
  const empty = element('png-model-paint-empty');
  if (!canvas || !uiState.loaded || !uiState.depthMap) {
    clearPaintCanvas();
    return;
  }
  empty?.classList.add('hidden');
  if (
    canvas.width !== uiState.loaded.canvas.width
    || canvas.height !== uiState.loaded.canvas.height
  ) {
    canvas.width = uiState.loaded.canvas.width;
    canvas.height = uiState.loaded.canvas.height;
  }
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
  analysis.textContent = formatPngModelAnalysis(payload);
}
function disposePendingPresentation() {
  if (uiState.presentationFrame) cancelAnimationFrame(uiState.presentationFrame);
  uiState.presentationFrame = 0;
  uiState.pendingPresentation = null;
}
function invalidatePayload(message = 'Changes pending…', topologyMessage = 'Waiting to regenerate…') {
  uiState.revision += 1;
  uiState.generatedRevision = -1;
  uiState.generationToken += 1;
  uiState.payload = null;
  setConfirmEnabled(false);
  if (message) setStatus(message);
  if (topologyMessage) updateTopologySummary(null, topologyMessage);
  return uiState.revision;
}
function clearGenerationTimer() {
  clearTimeout(uiState.timer);
  uiState.timer = null;
}
function isCurrentOperation(session, token) {
  return isOpen() && session === uiState.sessionToken && token === uiState.generationToken;
}
function setPreviewPayload(payload) {
  const previewGroup = createPngModelGroupFromPayload(payload);
  uiState.preview?.setModel(previewGroup);
  setPreviewView(uiState.previewView);
  updateAnalysis(payload);
  updateTopologySummary(payload);
}
async function regenerate(targetRevision = uiState.revision) {
  if (!uiState.loaded || !uiState.depthMap || !isOpen()) return null;
  if (uiState.generationTask?.revision === targetRevision) return uiState.generationTask.promise;

  clearGenerationTimer();
  disposePendingPresentation();
  const generationToken = ++uiState.generationToken;
  const session = uiState.sessionToken;
  const loaded = uiState.loaded;
  const settings = getSettings();
  const depthMap = createDepthMap(uiState.depthMap.size, uiState.depthMap.values);
  setConfirmEnabled(false);
  setStatus('Generating local mesh…');
  updateTopologySummary(null, 'Generating mesh…');

  const promise = (async () => {
    try {
      await nextFrame();
      if (
        !isCurrentOperation(session, generationToken)
        || targetRevision !== uiState.revision
        || loaded !== uiState.loaded
      ) return null;
      const payload = buildPngModelPayloadFromLoaded(loaded, settings, depthMap);
      if (
        !isCurrentOperation(session, generationToken)
        || targetRevision !== uiState.revision
        || loaded !== uiState.loaded
      ) return null;
      uiState.payload = payload;
      uiState.generatedRevision = targetRevision;
      setPreviewPayload(payload);
      drawPaintCanvas();
      setConfirmEnabled(true);
      setStatus(`Ready. ${payload.analysis.triangleCount.toLocaleString()} triangles generated locally.`);
      return payload;
    } catch (error) {
      if (!isCurrentOperation(session, generationToken) || targetRevision !== uiState.revision) return null;
      uiState.payload = null;
      uiState.generatedRevision = -1;
      uiState.preview?.setModel(null);
      setConfirmEnabled(false);
      element('png-model-analysis').textContent = 'No valid silhouette.';
      updateTopologySummary(null);
      drawPaintCanvas();
      setStatus(error.message || 'Could not generate the model.', true);
      return null;
    } finally {
      if (uiState.generationTask?.token === generationToken) uiState.generationTask = null;
    }
  })();
  uiState.generationTask = { revision: targetRevision, token: generationToken, promise };
  return promise;
}
function scheduleRegeneration(delay = 120) {
  clearGenerationTimer();
  if (!uiState.loaded || !isOpen()) return;
  const revision = uiState.revision;
  uiState.timer = setTimeout(() => {
    uiState.timer = null;
    if (revision === uiState.revision) void regenerate(revision);
  }, delay);
}
function queueGeometryChange(delay = 120) {
  disposePendingPresentation();
  if (uiState.loaded) setDirty(true);
  invalidatePayload();
  scheduleRegeneration(delay);
}

function commitPresentationUpdate() {
  if (uiState.presentationFrame) cancelAnimationFrame(uiState.presentationFrame);
  uiState.presentationFrame = 0;
  const pending = uiState.pendingPresentation;
  uiState.pendingPresentation = null;
  if (!pending || !isOpen() || pending.revision !== uiState.revision) return null;
  if (!pending.basePayload || pending.loaded !== uiState.loaded) {
    scheduleRegeneration(0);
    return null;
  }
  const payload = {
    ...pending.basePayload,
    settings: getSettings(),
  };
  uiState.payload = payload;
  uiState.generatedRevision = uiState.revision;
  if (pending.redraw) setPreviewPayload(payload);
  else updateAnalysis(payload);
  setConfirmEnabled(true);
  setStatus(`Ready. ${payload.analysis.triangleCount.toLocaleString()} triangles; presentation updated without rebuilding geometry.`);
  return payload;
}

function queuePresentationChange(redraw = true) {
  const previousRevision = uiState.revision;
  const previousPending = uiState.pendingPresentation;
  const basePayload = (
    uiState.payload && uiState.generatedRevision === previousRevision
      ? uiState.payload
      : previousPending?.basePayload
  );
  if (uiState.loaded) setDirty(true);
  invalidatePayload('Updating presentation…', null);
  uiState.pendingPresentation = {
    revision: uiState.revision,
    loaded: uiState.loaded,
    basePayload,
    redraw: redraw || previousPending?.redraw,
  };
  if (uiState.presentationFrame) cancelAnimationFrame(uiState.presentationFrame);
  uiState.presentationFrame = requestAnimationFrame(() => commitPresentationUpdate());
}

function setTool(tool) {
  uiState.tool = tool;
  document.querySelectorAll('.png-depth-tool').forEach((button) => {
    const active = button.dataset.tool === tool;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('bg-zinc-800', !active);
    button.classList.toggle('bg-red-950', active && tool === 'inflate');
    button.classList.toggle('bg-blue-950', active && tool === 'deflate');
    button.classList.toggle('bg-yellow-950', active && tool === 'smooth');
    button.classList.toggle('bg-zinc-600', active && tool === 'erase');
  });
}

function depthValuesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (Math.abs(a[index] - b[index]) > 0.00001) return false;
  }
  return true;
}

function updateDepthHistoryButtons() {
  const undo = element('png-model-depth-undo');
  const redo = element('png-model-depth-redo');
  if (undo) undo.disabled = uiState.depthHistoryIndex <= 0;
  if (redo) redo.disabled = uiState.depthHistoryIndex < 0
    || uiState.depthHistoryIndex >= uiState.depthHistory.length - 1;
}

function resetDepthHistory() {
  uiState.depthHistory = uiState.depthMap
    ? [new Float32Array(uiState.depthMap.values)]
    : [];
  uiState.depthHistoryIndex = uiState.depthHistory.length ? 0 : -1;
  updateDepthHistoryButtons();
}

function pushDepthHistory() {
  if (!uiState.depthMap) return;
  const current = new Float32Array(uiState.depthMap.values);
  const previous = uiState.depthHistory[uiState.depthHistoryIndex];
  if (previous && depthValuesEqual(previous, current)) return;
  uiState.depthHistory.splice(uiState.depthHistoryIndex + 1);
  uiState.depthHistory.push(current);
  if (uiState.depthHistory.length > 40) uiState.depthHistory.shift();
  uiState.depthHistoryIndex = uiState.depthHistory.length - 1;
  updateDepthHistoryButtons();
}

function restoreDepthHistory(index) {
  if (!uiState.depthMap || !uiState.depthHistory[index]) return;
  uiState.depthHistoryIndex = index;
  uiState.depthMap.values.set(uiState.depthHistory[index]);
  updateDepthHistoryButtons();
  drawPaintCanvas();
  queueGeometryChange(0);
}

function undoDepth() {
  if (uiState.depthHistoryIndex > 0) restoreDepthHistory(uiState.depthHistoryIndex - 1);
}

function redoDepth() {
  if (uiState.depthHistoryIndex < uiState.depthHistory.length - 1) {
    restoreDepthHistory(uiState.depthHistoryIndex + 1);
  }
}

function paintAtPoint(point) {
  const canvas = element('png-model-paint');
  const bounds = getCurrentBounds();
  if (!canvas || !bounds || !uiState.depthMap) return;
  const x = (point.x / point.width) * canvas.width;
  const y = (point.y / point.height) * canvas.height;
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
}

function flushPaintQueue() {
  if (uiState.paintFrame) cancelAnimationFrame(uiState.paintFrame);
  uiState.paintFrame = 0;
  if (!uiState.paintQueue.length) return;
  const points = uiState.paintQueue.splice(0);
  points.forEach(paintAtPoint);
  drawPaintCanvas();
}

function queuePaint(event) {
  const canvas = element('png-model-paint');
  if (!canvas || !uiState.loaded || !uiState.depthMap) return;
  const rect = canvas.getBoundingClientRect();
  uiState.paintQueue.push({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
  });
  if (!uiState.paintFrame) {
    uiState.paintFrame = requestAnimationFrame(() => flushPaintQueue());
  }
}

function clearSourceState(label = 'No image loaded') {
  uiState.loaded = null;
  uiState.payload = null;
  uiState.generatedRevision = -1;
  uiState.depthMap = createDepthMap();
  resetDepthHistory();
  uiState.preview?.setModel(null);
  clearPaintCanvas();
  if (element('png-model-file-label')) element('png-model-file-label').textContent = label;
  if (element('png-model-analysis')) element('png-model-analysis').textContent = 'No image analyzed yet.';
  updateTopologySummary(null);
  setConfirmEnabled(false);
}

async function loadIntoWorkbench(loader, options = {}) {
  const session = uiState.sessionToken;
  const loadToken = ++uiState.loadToken;
  const previous = {
    loaded: uiState.loaded,
    depthMap: uiState.depthMap,
    payload: uiState.payload,
    generatedRevision: uiState.generatedRevision,
    settings: getSettings(),
    label: element('png-model-file-label')?.textContent || 'No image loaded',
    dirty: uiState.dirty,
    depthHistory: uiState.depthHistory,
    depthHistoryIndex: uiState.depthHistoryIndex,
  };
  clearGenerationTimer();
  disposePendingPresentation();
  invalidatePayload('Reading image locally…', 'Waiting for image…');
  uiState.loading = true;
  element('png-model-modal')?.setAttribute('aria-busy', 'true');
  if (!previous.loaded) clearSourceState(options.loadingLabel || 'Loading…');
  else element('png-model-file-label').textContent = options.loadingLabel || 'Loading…';
  if (options.settings) setSettings(options.settings);
  setDirty(options.dirty !== false);
  const exampleButton = element('png-model-example-fish');
  if (exampleButton) exampleButton.disabled = true;

  try {
    const loaded = await loader();
    if (!isOpen() || session !== uiState.sessionToken || loadToken !== uiState.loadToken) return null;
    uiState.loaded = loaded;
    uiState.loading = false;
    element('png-model-modal')?.removeAttribute('aria-busy');
    uiState.depthMap = options.depthMap || createDepthMap();
    if (options.settings) setSettings(options.settings);
    if (options.name) element('png-model-name').value = options.name;
    element('png-model-file-label').textContent = options.label || loaded.source.filename;
    resetDepthHistory();
    drawPaintCanvas();
    invalidatePayload('Image ready. Building volume…', 'Generating mesh…');
    const payload = await regenerate(uiState.revision);
    if (!payload) {
      const generationMessage = element('png-model-status')?.textContent;
      throw new Error(generationMessage || 'Could not generate a model from that image.');
    }
    if (!isOpen() || session !== uiState.sessionToken || loadToken !== uiState.loadToken) return null;
    if (options.dirty === false) setDirty(false);
    return payload;
  } catch (error) {
    if (!isOpen() || session !== uiState.sessionToken || loadToken !== uiState.loadToken) return null;
    uiState.loading = false;
    element('png-model-modal')?.removeAttribute('aria-busy');
    if (previous.loaded) {
      uiState.loaded = previous.loaded;
      uiState.depthMap = previous.depthMap;
      uiState.depthHistory = previous.depthHistory;
      uiState.depthHistoryIndex = previous.depthHistoryIndex;
      setSettings(previous.settings);
      element('png-model-file-label').textContent = previous.label;
      setDirty(previous.dirty);
      if (previous.payload) {
        uiState.payload = previous.payload;
        uiState.generatedRevision = uiState.revision;
        setPreviewPayload(previous.payload);
        drawPaintCanvas();
        updateDepthHistoryButtons();
        setConfirmEnabled(true);
      } else {
        scheduleRegeneration(0);
      }
    } else {
      clearSourceState();
      setDirty(false);
    }
    element('png-model-file').value = '';
    setStatus(error.message || 'Could not load that image.', true);
    return null;
  } finally {
    if (isOpen() && session === uiState.sessionToken && loadToken === uiState.loadToken && exampleButton) {
      exampleButton.disabled = false;
    }
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const name = file.name.replace(/\.(png|webp)$/i, '').trim().slice(0, 80)
    || PNG_MODEL_DEFAULT_SETTINGS.name;
  await loadIntoWorkbench(() => loadPngModelFile(file), {
    name,
    label: file.name,
    loadingLabel: `Loading ${file.name}…`,
    depthMap: createDepthMap(),
    dirty: true,
  });
}

function createPresetDepthMap(preset) {
  const depthMap = createDepthMap();
  preset.depthStrokes.forEach((stroke) => paintDepthMap(depthMap, stroke));
  return depthMap;
}

async function handleExampleFish() {
  const preset = PNG_MODEL_PRESETS.reefFish;
  element('png-model-file').value = '';
  await loadIntoWorkbench(() => loadPngModelAsset(preset.url, preset.filename), {
    settings: preset.settings,
    name: preset.settings.name,
    label: `${preset.filename} · built-in example`,
    loadingLabel: `Loading ${preset.label.toLowerCase()}…`,
    depthMap: createPresetDepthMap(preset),
    dirty: true,
  });
}

async function ensureLatestPayload() {
  flushPaintQueue();
  if (uiState.pendingPresentation) commitPresentationUpdate();
  clearGenerationTimer();
  while (isOpen() && uiState.loaded) {
    const targetRevision = uiState.revision;
    if (uiState.payload && uiState.generatedRevision === targetRevision) return uiState.payload;
    await regenerate(targetRevision);
    if (targetRevision !== uiState.revision) continue;
    return uiState.payload && uiState.generatedRevision === targetRevision ? uiState.payload : null;
  }
  return null;
}

async function confirmModel() {
  if (!uiState.loaded || uiState.loading || uiState.confirming) return;
  const button = element('png-model-confirm');
  uiState.confirming = true;
  setConfirmEnabled(false);
  setStatus('Finishing the latest revision…');
  try {
    const payload = await ensureLatestPayload();
    if (!payload || payload !== uiState.payload || uiState.generatedRevision !== uiState.revision) {
      throw new Error('The latest revision could not be generated.');
    }
    const group = createPngModelGroupFromPayload(payload);
    if (uiState.editingGroup?.parent && isPngModelGroup(uiState.editingGroup)) {
      updatePngModelGroup(uiState.editingGroup, group);
    } else {
      insertPngModelGroup(group);
    }
    setDirty(false);
    performClose();
  } catch (error) {
    setStatus(error.message || 'Could not add the model to the scene.', true);
    if (uiState.payload && uiState.generatedRevision === uiState.revision) setConfirmEnabled(true);
  } finally {
    uiState.confirming = false;
    if (isOpen() && uiState.payload && uiState.generatedRevision === uiState.revision) {
      if (button) button.disabled = false;
    }
  }
}

function initialize() {
  if (uiState.initialized) return;
  uiState.initialized = true;

  element('png-model-file').addEventListener('change', (event) => { void handleFile(event); });
  element('png-model-example-fish').addEventListener('click', () => { void handleExampleFish(); });
  element('png-model-x').addEventListener('click', () => closePngModelWorkbench());
  element('png-model-close').addEventListener('click', () => closePngModelWorkbench());
  element('png-model-refresh').addEventListener('click', () => {
    if (!uiState.loaded) return;
    invalidatePayload('Regenerating…', 'Generating mesh…');
    void regenerate(uiState.revision);
  });
  element('png-model-confirm').addEventListener('click', () => { void confirmModel(); });
  element('png-model-depth-undo').addEventListener('click', undoDepth);
  element('png-model-depth-redo').addEventListener('click', redoDepth);
  document.querySelectorAll('.png-depth-tool').forEach((button) => {
    button.addEventListener('click', () => setTool(button.dataset.tool));
  });
  document.querySelectorAll('.png-model-view').forEach((button) => {
    button.addEventListener('click', () => setPreviewView(button.dataset.view));
  });

  const brushSize = element('png-model-brush-size');
  const brushStrength = element('png-model-brush-strength');
  brushSize.addEventListener('input', () => {
    element('png-model-brush-size-value').textContent = brushSize.value;
  });
  brushStrength.addEventListener('input', () => {
    element('png-model-brush-strength-value').textContent = Number(brushStrength.value).toFixed(2);
  });

  const targetSize = element('png-model-target-size');
  targetSize.addEventListener('change', () => {
    const nextSize = normalizePngModelSettings({ targetSize: targetSize.value }).targetSize;
    targetSize.value = String(nextSize);
    if (element('png-model-lock-depth-ratio').checked && uiState.lastTargetSize > 0) {
      const thickness = element('png-model-thickness');
      const proportional = Number(thickness.value) * (nextSize / uiState.lastTargetSize);
      const bounded = Math.min(20, Math.max(0.02, proportional));
      thickness.value = String(Math.round(bounded * 1000) / 1000);
    }
    uiState.lastTargetSize = nextSize;
  });

  GEOMETRY_CONTROL_IDS.forEach((id) => {
    const control = element(id);
    control.addEventListener('input', () => {
      if (id === 'png-model-density') updateDensityValue(control.value);
      if (['png-model-edge-depth', 'png-model-edge-falloff', 'png-model-coverage'].includes(id)) updateEdgeOutputs();
      if (uiState.loaded && !uiState.loading) queueGeometryChange();
    });
  });

  PRESENTATION_CONTROL_IDS.forEach((id) => {
    const control = element(id);
    const redraw = id !== 'png-model-lock-depth-ratio';
    control.addEventListener('input', () => {
      if (uiState.loaded && !uiState.loading) queuePresentationChange(redraw);
    });
  });

  element('png-model-show-wireframe').addEventListener('change', (event) => {
    uiState.inspection.showWireframe = event.currentTarget.checked;
    applyInspectionState();
  });
  element('png-model-show-vertices').addEventListener('change', (event) => {
    uiState.inspection.showVertices = event.currentTarget.checked;
    applyInspectionState();
  });
  element('png-model-clear-depth').addEventListener('click', () => {
    if (!uiState.depthMap || !uiState.loaded || uiState.loading) return;
    const before = new Float32Array(uiState.depthMap.values);
    clearDepthMap(uiState.depthMap);
    if (depthValuesEqual(before, uiState.depthMap.values)) return;
    pushDepthHistory();
    drawPaintCanvas();
    queueGeometryChange(0);
  });

  const canvas = element('png-model-paint');
  canvas.addEventListener('pointerdown', (event) => {
    if (!uiState.loaded || !uiState.depthMap || uiState.loading) return;
    uiState.painting = true;
    uiState.strokeStart = new Float32Array(uiState.depthMap.values);
    canvas.setPointerCapture(event.pointerId);
    setDirty(true);
    invalidatePayload('Depth stroke pending…', 'Waiting for stroke…');
    queuePaint(event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (uiState.painting) queuePaint(event);
  });
  const endPaint = () => {
    if (!uiState.painting) return;
    uiState.painting = false;
    flushPaintQueue();
    if (uiState.strokeStart && !depthValuesEqual(uiState.strokeStart, uiState.depthMap?.values)) {
      pushDepthHistory();
    }
    uiState.strokeStart = null;
    scheduleRegeneration(40);
  };
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);
  canvas.addEventListener('lostpointercapture', endPaint);

  window.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      closePngModelWorkbench();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && document.activeElement === canvas) {
      event.preventDefault();
      if (event.shiftKey) redoDepth();
      else undoDepth();
    }
  });

  onLangChange(() => {
    if (!isOpen()) return;
    element('png-model-confirm').textContent = uiState.editingGroup
      ? translated('pngModelUpdate', 'UPDATE MODEL')
      : translated('pngModelCreate', 'CREATE MODEL');
  });
  setTool('inflate');
}

function prepareOpen(editingGroup) {
  initialize();
  uiState.sessionToken += 1;
  uiState.loadToken += 1;
  uiState.generationToken += 1;
  uiState.revision = 0;
  uiState.generatedRevision = -1;
  uiState.generationTask = null;
  uiState.open = true;
  uiState.confirming = false;
  uiState.loading = false;
  uiState.previousFocus = document.activeElement;
  uiState.editingGroup = editingGroup;
  uiState.loaded = null;
  uiState.depthMap = createDepthMap();
  uiState.payload = null;
  uiState.paintQueue = [];
  uiState.painting = false;
  uiState.strokeStart = null;
  uiState.previewView = 'three-quarter';
  resetDepthHistory();
  setDirty(false);

  const modal = element('png-model-modal');
  modal.classList.remove('hidden');
  modal.style.removeProperty('display');
  uiState.preview?.dispose();
  uiState.preview = new PngModelPreview(element('png-model-preview'));
  applyInspectionState();
  setPreviewView('three-quarter');
  setConfirmEnabled(false);
  element('png-model-confirm').textContent = editingGroup
    ? translated('pngModelUpdate', 'UPDATE MODEL')
    : translated('pngModelCreate', 'CREATE MODEL');
  element('png-model-subtitle').textContent = editingGroup
    ? translated('pngModelEditSubtitle', 'Regenerate selected PNG model')
    : translated('pngModelCreateSubtitle', 'Transparent image to editable 2.5D volume');
  element('png-model-file')?.focus();
}

async function openWorkbench(editingGroup = null) {
  prepareOpen(editingGroup);
  if (!editingGroup) {
    setSettings(PNG_MODEL_NEW_SETTINGS);
    element('png-model-file').value = '';
    clearSourceState();
    setStatus('Choose an image to begin.');
    return null;
  }

  const recipe = clonePngModelRecipe(editingGroup);
  setSettings(recipe.settings);
  setStatus('Restoring editable PNG model…');
  return loadIntoWorkbench(() => loadPngModelSource(recipe.source), {
    settings: recipe.settings,
    name: recipe.settings.name,
    label: recipe.source.filename,
    loadingLabel: recipe.source.filename,
    depthMap: deserializeDepthMap(recipe.depthMap),
    dirty: false,
  });
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

function performClose() {
  clearGenerationTimer();
  disposePendingPresentation();
  if (uiState.paintFrame) cancelAnimationFrame(uiState.paintFrame);
  uiState.paintFrame = 0;
  uiState.paintQueue = [];
  uiState.sessionToken += 1;
  uiState.loadToken += 1;
  uiState.generationToken += 1;
  uiState.open = false;
  uiState.painting = false;
  uiState.strokeStart = null;
  uiState.generationTask = null;
  uiState.preview?.dispose();
  uiState.preview = null;
  uiState.loaded = null;
  uiState.payload = null;
  uiState.editingGroup = null;
  uiState.depthMap = null;
  uiState.baseSettings = { ...PNG_MODEL_NEW_SETTINGS };
  uiState.depthHistory = [];
  uiState.depthHistoryIndex = -1;
  uiState.generatedRevision = -1;
  uiState.confirming = false;
  uiState.loading = false;
  element('png-model-modal')?.removeAttribute('aria-busy');
  setDirty(false);
  clearPaintCanvas();
  updateDepthHistoryButtons();
  setConfirmEnabled(false);
  if (element('png-model-file')) element('png-model-file').value = '';
  if (element('png-model-file-label')) element('png-model-file-label').textContent = 'No image loaded';
  if (element('png-model-analysis')) element('png-model-analysis').textContent = 'No image analyzed yet.';
  updateTopologySummary(null);
  const modal = element('png-model-modal');
  modal?.classList.add('hidden');
  if (modal) modal.style.display = 'none';
  const previousFocus = uiState.previousFocus;
  uiState.previousFocus = null;
  previousFocus?.focus?.();
}

export function closePngModelWorkbench(options = {}) {
  if (!isOpen()) return true;
  if (uiState.dirty && !options.force) {
    const shouldDiscard = window.confirm(translated(
      'pngModelDiscardConfirm',
      'Discard unsaved PNG model changes?',
    ));
    if (!shouldDiscard) return false;
  }
  performClose();
  return true;
}

export function getPngModelWorkbenchDiagnostics() {
  const settings = uiState.payload?.settings || (element('png-model-name') ? getSettings() : {});
  return {
    open: isOpen(),
    loaded: Boolean(uiState.loaded),
    loading: uiState.loading,
    dirty: uiState.dirty,
    pending: Boolean(
      uiState.loading
      || uiState.timer
      || uiState.generationTask
      || uiState.pendingPresentation
      || uiState.generatedRevision !== uiState.revision
    ),
    revision: uiState.revision,
    generatedRevision: uiState.generatedRevision,
    density: Number(element('png-model-density')?.value || PNG_MODEL_DEFAULT_SETTINGS.density),
    topology: uiState.payload ? {
      vertexCount: uiState.payload.analysis.vertexCount,
      triangleCount: uiState.payload.analysis.triangleCount,
    } : null,
    settings: { ...settings },
    analysis: uiState.payload ? { ...uiState.payload.analysis } : null,
    depthHistory: {
      undoDepth: Math.max(0, uiState.depthHistoryIndex),
      redoDepth: Math.max(0, uiState.depthHistory.length - uiState.depthHistoryIndex - 1),
    },
    inspection: {
      ...uiState.inspection,
      view: uiState.previewView,
      ...(uiState.preview?.getInspectionState() || {}),
    },
  };
}
