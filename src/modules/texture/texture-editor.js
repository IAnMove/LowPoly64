import * as THREE from 'three';
import { state } from '../shared/state.js';
import { getChildMesh, showToast } from '../viewport/ui.js';
import {
  applyTextureTransform,
  createDetachedCanvasTexture,
  getTextureTransform,
  rememberTextureTransform,
} from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import {
  drawImageToTextureCanvas,
  drawSourceImageToTextureCanvas,
  fillTextureCanvas,
  getTextureCanvasPosition,
  paintBrushDot,
  paintBrushLine,
  removeColorRangeFromCanvas,
  sampleTextureCanvasHex,
} from './texture-canvas-paint.js';
import { cloneCanvas, createTextureProcessingController } from './texture-processing-controls.js';
import { createTexturePreviewRuntime } from './texture-preview-runtime.js';
import { createTextureSpriteStripController } from './texture-sprite-strip.js';
import {
  FACE_TARGET_ROTATIONS,
  applyFaceUVsToGeo,
  buildTextureTransformFromGlobalInputs,
  createFaceHighlight,
  drawAllFaceOverlays as drawAllFaceOverlaysUI,
  drawGridOverlay,
  drawSelectedFaceOverlay,
  getCanvasUV,
  neutralizeTextureMapForFaceUVs,
  normalizeFaceUVData,
  readGlobalUVInputs,
  setGlobalUVInputs,
  snapUV,
  updateFaceControlInputs,
} from './texture-uv-editor.js';

const CANVAS_SIZE = 256;
const BRUSH_SIZES = [2, 5, 10, 18, 30];
const DEFAULT_PALETTE = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0088ff',
  '#ffcc00', '#ff8800', '#aa00ff', '#ff69b4', '#00ffcc',
  '#8b4513', '#808080', '#c0c0c0', '#004400', '#000066',
];

let paintCanvas = null;
let paintCtx = null;
let painting = false;
let brushColor = '#ff0000';
let brushSize = 2; // index into BRUSH_SIZES
let eraserMode = false;
let undoStack = [];

// ── Chroma Key (color → transparent) ────────────────────────────
let chromaSampleMode = false;

export function startColorSample() {
  chromaSampleMode = true;
  if (paintCanvas) paintCanvas.style.cursor = 'crosshair';
}

export function removeColorFromCanvas(hexColor, tolerance) {
  if (!paintCtx) return;
  removeColorRangeFromCanvas(paintCtx, CANVAS_SIZE, hexColor, tolerance);
  saveUndoSnapshot();

  // Enable transparency on the mesh material
  if (targetMesh?.material) {
    targetMesh.material.transparent = true;
    targetMesh.material.alphaTest = 0.05;
    targetMesh.material.needsUpdate = true;
  }
  applyCanvasToMesh();
  applyCanvasToPreview();
}

// ── Grid (UV snap helper only) ───────────────────────────────────
let gridEnabled = false;
let gridCols = 2;
let gridRows = 2;

// ── Sprite Strip ─────────────────────────────────────────────────
// ── Auto-save ────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'lp64_tex_autosave';
let autoSaveTimer = null;

// ── Per-face UV ─────────────────────────────────────────────────
function getFaceNames() { return [t('faceRight'), t('faceLeft'), t('faceTop'), t('faceBottom'), t('faceFront'), t('faceBack')]; }
let selectedFace = -1;
let faceUVData = [];
let targetMesh = null; // reference to the actual scene mesh
let faceHighlight = null;
let uvMapMode = false;
let uvMapDragging = false;
let uvMapStartPos = null;
const textureProcessingController = createTextureProcessingController({ fallbackSize: CANVAS_SIZE });
const texturePreviewRuntime = createTexturePreviewRuntime({
  buildPreviewTextureCanvas,
  getTargetMesh: () => targetMesh,
  getPaintCanvas: () => paintCanvas,
});

const spriteStripController = createTextureSpriteStripController({
  canvasSize: CANVAS_SIZE,
  getPaintCanvas: () => paintCanvas,
  getTargetMesh: () => targetMesh,
  getPreviewMesh: () => getPreviewMesh(),
  getAppliedTextureProcessingSettings: textureProcessingController.getAppliedSettings,
  buildCommittedTextureCanvas,
  isEditorCanvasTexture,
  execAutoSave: _execAutoSave,
  showToast,
});

function getPreviewMesh() { return texturePreviewRuntime.getMesh(); }
function getPreviewRenderer() { return texturePreviewRuntime.getRenderer(); }
function getPreviewCamera() { return texturePreviewRuntime.getCamera(); }

export function openTextureEditor() {
  const sel = state.selectedMesh;
  if (!sel) {
    showToast(t('selectObjectFirst'));
    return;
  }
  const mesh = getChildMesh(sel) || sel;
  if (!mesh || !mesh.isMesh) {
    showToast(t('selectPieceNotGroup'));
    return;
  }

  buildPaletteUI();
  document.getElementById('texture-editor-modal').classList.remove('hidden');
  syncTextureProcessingFromMesh(mesh);
  initPaintCanvas(mesh);
  initPreview(mesh);
  initFaceEditing(mesh);
  updateToolUI();
}

export function closeTextureEditor() {
  document.getElementById('texture-editor-modal').classList.add('hidden');
  uvMapMode = false;
  uvMapDragging = false;
  if (autoSaveTimer) { clearTimeout(autoSaveTimer); autoSaveTimer = null; }
  cleanupFaceEditing();
  texturePreviewRuntime.dispose();
  targetMesh = null;
}

// ── Paint Canvas ────────────────────────────────────────────────

function initPaintCanvas(mesh) {
  paintCanvas = document.getElementById('tex-paint-canvas');
  paintCtx = paintCanvas.getContext('2d', { willReadFrequently: true });
  paintCanvas.width = CANVAS_SIZE;
  paintCanvas.height = CANVAS_SIZE;
  undoStack = [];
  paintCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (mesh.material.map && mesh.material.map.image) {
    drawSourceImageToTextureCanvas({
      ctx: paintCtx,
      canvas: paintCanvas,
      sourceImage: mesh.material.map.image,
      canvasSize: CANVAS_SIZE,
      cloneCanvas,
    });
    _syncBaseTileFromCanvas();
  } else {
    // Check for auto-saved texture before filling with white
    const saved = _loadAutoSave(mesh);
    if (saved) {
      _restoreSpriteStrip(saved.dataURL, saved.spriteStrip);
      const img = new Image();
      img.onload = () => {
        drawImageToTextureCanvas(paintCtx, img, CANVAS_SIZE);
        _syncBaseTileFromCanvas();
        saveUndoSnapshot();
        applyCanvasToMesh();
        applyCanvasToPreview();
        showToast('Auto-saved texture restored');
      };
      img.src = saved.dataURL;
    } else {
      fillTextureCanvas(paintCtx, CANVAS_SIZE);
      _syncBaseTileFromCanvas();
    }
  }
  saveUndoSnapshot();

  paintCanvas.onmousedown = startPaint;
  paintCanvas.onmousemove = doPaint;
  paintCanvas.onmouseup = endPaint;
  paintCanvas.onmouseleave = endPaint;
}

function renderTextureProcessingUI() {
  textureProcessingController.renderUi();
}

function syncTextureProcessingFromMesh(mesh) {
  textureProcessingController.syncFromMesh(mesh);
}

function setTextureProcessingValue(key, value) {
  textureProcessingController.setValue(key, value);
}

function buildCommittedTextureCanvas(sourceCanvas, options = {}) {
  return textureProcessingController.buildCommittedCanvas(sourceCanvas, options);
}

function buildPreviewTextureCanvas(sourceCanvas, options = {}) {
  return textureProcessingController.buildPreviewCanvas(sourceCanvas, options);
}

function startPaint(e) {
  if (uvMapMode) { startUVMapDraw(e); return; }
  if (chromaSampleMode) {
    chromaSampleMode = false;
    paintCanvas.style.cursor = '';
    const pos = getTextureCanvasPosition(paintCanvas, CANVAS_SIZE, e);
    const hex = sampleTextureCanvasHex(paintCtx, pos.x, pos.y);
    // Notify main.js of the sampled color
    const colorInput = document.getElementById('tex-chroma-color');
    if (colorInput) { colorInput.value = hex; colorInput.dispatchEvent(new Event('input')); }
    return;
  }
  painting = true;
  const pos = getTextureCanvasPosition(paintCanvas, CANVAS_SIZE, e);
  drawDot(pos.x, pos.y);
  paintCanvas._lastPos = pos;
}

function doPaint(e) {
  if (uvMapMode) { doUVMapDraw(e); return; }
  if (!painting) return;
  const pos = getTextureCanvasPosition(paintCanvas, CANVAS_SIZE, e);
  const last = paintCanvas._lastPos || pos;
  drawLine(last.x, last.y, pos.x, pos.y);
  paintCanvas._lastPos = pos;
  applyCanvasToPreview();
}

function endPaint() {
  if (uvMapMode) { endUVMapDraw(); return; }
  if (!painting) return;
  painting = false;
  paintCanvas._lastPos = null;
  saveUndoSnapshot();
  applyCanvasToMesh();
  updateOverlay();
}

function drawDot(x, y) {
  paintBrushDot(paintCtx, x, y, {
    radius: BRUSH_SIZES[brushSize],
    brushColor,
    eraserMode,
  });
}

function drawLine(x1, y1, x2, y2) {
  paintBrushLine(paintCtx, x1, y1, x2, y2, {
    radius: BRUSH_SIZES[brushSize],
    brushColor,
    eraserMode,
  });
}

function saveUndoSnapshot() {
  undoStack.push({
    imageData: paintCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE),
    appliedSettings: textureProcessingController.getAppliedSettings(),
    previewSettings: textureProcessingController.getPreviewSettings(),
  });
  if (undoStack.length > 50) undoStack.shift();
}

export function paintUndo() {
  if (undoStack.length <= 1) return;
  undoStack.pop();
  const prev = undoStack[undoStack.length - 1];
  if (!prev) return;
  paintCtx.putImageData(prev.imageData, 0, 0);
  textureProcessingController.restoreSnapshot(prev);
  applyCanvasToPreview();
  applyCanvasToMesh();
}

// ── Apply canvas as texture ─────────────────────────────────────

function applyCanvasToMesh() {
  const mesh = targetMesh || (state.selectedMesh ? (getChildMesh(state.selectedMesh) || state.selectedMesh) : null);
  if (!mesh || !mesh.isMesh) return;
  _syncBaseTileFromCanvas();

  const previousMap = mesh.material.map;
  const committedCanvas = buildCommittedTextureCanvas(paintCanvas);
  const texture = createDetachedCanvasTexture(
    committedCanvas,
    mesh.userData.textureTransform || getTextureTransform(previousMap)
  );
  if (!texture) return;

  if (!mesh.userData.textureEnabled) {
    mesh.userData.colorBeforeTexture = mesh.material.color.getHex();
    mesh.material.color.set(0xffffff);
  }
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.userData.textureProcessing = textureProcessingController.getAppliedSettings();
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  if (previousMap && previousMap !== texture) {
    previousMap.dispose();
  }
  _scheduleAutoSave(mesh);
  _renderStripNav();
  _updateStripActionsUI();
}

function applyCanvasToPreview() {
  texturePreviewRuntime.applyCanvasToPreview();
}

function isEditorCanvasTexture(texture) {
  return texturePreviewRuntime.isEditorCanvasTexture(texture);
}

// ── 3D Preview ──────────────────────────────────────────────────

function initPreview(mesh) {
  texturePreviewRuntime.init(mesh, {
    onClick: onPreviewClick,
    isFaceSelected: () => selectedFace >= 0,
  });
}

// ── Tool controls ───────────────────────────────────────────────

export function setTool(tool) {
  if (tool === 'uvmap') {
    uvMapMode = !uvMapMode;
    eraserMode = false;
    if (paintCanvas) paintCanvas.style.cursor = uvMapMode ? 'crosshair' : '';
    updateToolUI();
    drawAllFaceOverlays();
    return;
  }
  uvMapMode = false;
  eraserMode = (tool === 'eraser');
  if (paintCanvas) paintCanvas.style.cursor = '';
  updateToolUI();
  drawAllFaceOverlays();
}

export function setBrushSize(idx) {
  brushSize = idx;
  updateToolUI();
}

export function setBrushColor(hex) {
  brushColor = hex;
  eraserMode = false;
  updateToolUI();
}

function updateToolUI() {
  const btnBrush = document.getElementById('tex-tool-brush');
  const btnEraser = document.getElementById('tex-tool-eraser');
  const btnUVMap = document.getElementById('tex-tool-uvmap');
  const isPaint = !eraserMode && !uvMapMode;
  if (btnBrush) { btnBrush.classList.toggle('bg-[#ffcc00]', isPaint); btnBrush.classList.toggle('text-black', isPaint); }
  if (btnEraser) { btnEraser.classList.toggle('bg-[#ffcc00]', eraserMode); btnEraser.classList.toggle('text-black', eraserMode); }
  if (btnUVMap) { btnUVMap.classList.toggle('bg-[#ffcc00]', uvMapMode); btnUVMap.classList.toggle('text-black', uvMapMode); }

  for (let i = 0; i < BRUSH_SIZES.length; i++) {
    const btn = document.getElementById(`tex-size-${i}`);
    if (btn) {
      btn.classList.toggle('bg-[#ffcc00]', i === brushSize);
      btn.classList.toggle('text-black', i === brushSize);
    }
  }

  document.querySelectorAll('.tex-color-swatch').forEach((el) => {
    el.classList.toggle('ring-2', el.dataset.color === brushColor && !eraserMode && !uvMapMode);
    el.classList.toggle('ring-white', el.dataset.color === brushColor && !eraserMode && !uvMapMode);
  });
}

// ── Load / Download / New ───────────────────────────────────────

export function texLoadImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      drawImageToTextureCanvas(paintCtx, img, CANVAS_SIZE);
      saveUndoSnapshot();
      applyCanvasToMesh();
      applyCanvasToPreview();
    };
    img.src = URL.createObjectURL(file);
  };
  input.click();
}

export function texDownload() {
  const link = document.createElement('a');
  link.download = 'texture.png';
  const canvas = buildCommittedTextureCanvas(paintCanvas);
  link.href = (canvas || paintCanvas).toDataURL('image/png');
  link.click();
}

export function texNewCanvas() {
  fillTextureCanvas(paintCtx, CANVAS_SIZE);
  _syncBaseTileFromCanvas();
  saveUndoSnapshot();
  applyCanvasToMesh();
  applyCanvasToPreview();
}

// Apply a base64 PNG (no data-URL prefix) to the paint canvas
export function applyBase64ToCanvas(base64) {
  const img = new Image();
  img.onload = () => {
    drawImageToTextureCanvas(paintCtx, img, CANVAS_SIZE);
    _syncBaseTileFromCanvas();
    saveUndoSnapshot();
    applyCanvasToMesh();
    applyCanvasToPreview();
  };
  img.src = 'data:image/png;base64,' + base64;
}

export function setTextureProcessingOption(key, value) {
  setTextureProcessingValue(key, value);
  applyCanvasToPreview();
}

export function applyTextureProcessing() {
  if (!paintCanvas) return false;
  textureProcessingController.commitPreviewSettings();
  applyCanvasToMesh();
  applyCanvasToPreview();
  saveUndoSnapshot();
  return true;
}

export function applyPsxifyTexture() {
  textureProcessingController.applyPsxify();
  applyCanvasToPreview();
  return true;
}

export function applyTextureProcessingPreset(presetId) {
  textureProcessingController.applyPreset(presetId);
  applyCanvasToPreview();
  return true;
}

// ── Global UV controls ──────────────────────────────────────────

export function texUpdateUV() {
  const mesh = targetMesh || (state.selectedMesh ? (getChildMesh(state.selectedMesh) || state.selectedMesh) : null);
  if (!mesh || !mesh.material || !mesh.material.map) return;

  const { ox, oy, rx, ry, rotDeg } = readGlobalUVInputs();

  // For boxes: global controls set ALL faces via geometry UV attributes
  if (mesh.userData.geometryType === 'cube' && faceUVData.length === 6) {
    const previewMesh = getPreviewMesh();
    for (let i = 0; i < 6; i++) {
      faceUVData[i] = { ou: ox, ov: oy, su: rx, sv: ry, rot: rotDeg };
      applyFaceUVsToGeo(mesh.geometry, i, faceUVData);
      if (previewMesh) applyFaceUVsToGeo(previewMesh.geometry, i, faceUVData);
    }
    mesh.userData.faceUVs = faceUVData.map((d) => ({ ...d }));
    // Keep material.map neutral for boxes
    neutralizeTextureMapForFaceUVs(mesh.material.map);
    rememberTextureTransform(mesh, mesh.material.map);
    // Sync per-face UI if a face is selected
    if (selectedFace >= 0) updateFaceUI();
    updateOverlay();
    return;
  }

  // Non-boxes: use material.map transform as before
  const tex = mesh.material.map;
  const transform = buildTextureTransformFromGlobalInputs({ ox, oy, rx, ry, rotDeg });
  applyTextureTransform(tex, transform);
  rememberTextureTransform(mesh, tex);
  const previewMesh = getPreviewMesh();
  if (previewMesh?.material?.map) {
    applyTextureTransform(previewMesh.material.map, transform);
  }
}

// ── Build palette UI ────────────────────────────────────────────

export function buildPaletteUI() {
  const container = document.getElementById('tex-palette');
  if (!container) return;
  container.innerHTML = '';
  DEFAULT_PALETTE.forEach((hex) => {
    const swatch = document.createElement('div');
    swatch.className = 'tex-color-swatch w-5 h-5 rounded cursor-pointer border border-zinc-600';
    swatch.style.background = hex;
    swatch.dataset.color = hex;
    swatch.onclick = () => setBrushColor(hex);
    container.appendChild(swatch);
  });
}

// ── Per-face UV editing (box geometry only) ─────────────────────

function initFaceEditing(mesh) {
  targetMesh = mesh;
  selectedFace = -1;
  faceHighlight = null;

  const isBox = mesh.userData.geometryType === 'cube';
  const section = document.getElementById('tex-face-section');
  if (section) section.classList.toggle('hidden', !isBox);

  if (isBox) {
    faceUVData = normalizeFaceUVData(mesh.userData.faceUVs);

    const previewRenderer = getPreviewRenderer();
    if (previewRenderer) previewRenderer.domElement.style.cursor = 'pointer';

    // Reset material.map to neutral — all UV control goes through geometry attributes
    if (mesh.material && mesh.material.map) neutralizeTextureMapForFaceUVs(mesh.material.map);

    // Sync global UV inputs from first face data (so user sees current values)
    const d0 = faceUVData[0];
    setGlobalUVInputs(d0.ou, d0.ov, d0.su, d0.sv, d0.rot);

    // Apply existing per-face UVs to both meshes
    const previewMesh = getPreviewMesh();
    for (let i = 0; i < 6; i++) {
      applyFaceUVsToGeo(mesh.geometry, i, faceUVData);
      if (previewMesh) applyFaceUVsToGeo(previewMesh.geometry, i, faceUVData);
    }
  } else {
    const transform = mesh.userData.textureTransform || getTextureTransform(mesh.material?.map);
    setGlobalUVInputs(
      transform.offset?.[0] ?? 0,
      transform.offset?.[1] ?? 0,
      transform.repeat?.[0] ?? 1,
      transform.repeat?.[1] ?? 1,
      THREE.MathUtils.radToDeg(transform.rotation ?? 0)
    );
  }

  updateFaceUI();
  updateOverlay();
}

function cleanupFaceEditing() {
  selectedFace = -1;
  faceHighlight = null;
  faceUVData = [];
  const uvmapCanvas = document.getElementById('tex-uvmap-canvas');
  if (uvmapCanvas) uvmapCanvas.classList.add('hidden');
}

function onPreviewClick(e) {
  const previewMesh = getPreviewMesh();
  const previewRenderer = getPreviewRenderer();
  const previewCamera = getPreviewCamera();
  if (!previewMesh || !previewRenderer || !previewCamera) return;
  const rect = previewRenderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, previewCamera);
  const intersects = raycaster.intersectObject(previewMesh);

  if (intersects.length > 0) {
    const fi = Math.floor(intersects[0].faceIndex / 2);
    if (fi >= 0 && fi < 6) {
      selectedFace = fi;
      texturePreviewRuntime.setAutoRotate(false);
      texturePreviewRuntime.setTargetRotation(FACE_TARGET_ROTATIONS[fi]);
      highlightFace(fi);
      updateFaceUI();
      updateOverlay();
    }
  }
}

export function selectFace(value) {
  const idx = parseInt(value);
  if (idx < 0 || isNaN(idx)) {
    deselectFace();
  } else if (idx >= 0 && idx < 6) {
    selectedFace = idx;
    texturePreviewRuntime.setAutoRotate(false);
    texturePreviewRuntime.setTargetRotation(FACE_TARGET_ROTATIONS[idx]);
    highlightFace(idx);
    updateFaceUI();
    updateOverlay();
    drawAllFaceOverlays();
  }
}

export function deselectFace() {
  selectedFace = -1;
  texturePreviewRuntime.setAutoRotate(true);
  texturePreviewRuntime.setTargetRotation(null);
  removeFaceHighlight();
  updateFaceUI();
  updateOverlay();
  drawAllFaceOverlays();
}

export function setFaceUV(field, value) {
  if (selectedFace < 0 || !targetMesh) return;
  faceUVData[selectedFace][field] = parseFloat(value) || 0;
  applyFaceUVs(selectedFace);
  updateOverlay();
  drawAllFaceOverlays();
}

function applyFaceUVs(face) {
  applyFaceUVsToGeo(targetMesh.geometry, face, faceUVData);
  const previewMesh = getPreviewMesh();
  if (previewMesh) applyFaceUVsToGeo(previewMesh.geometry, face, faceUVData);
  targetMesh.userData.faceUVs = faceUVData.map((d) => ({ ...d }));
}

function highlightFace(faceIdx) {
  removeFaceHighlight();
  const previewMesh = getPreviewMesh();
  if (!previewMesh) return;

  faceHighlight = createFaceHighlight(previewMesh, faceIdx);
  if (!faceHighlight) return;
  previewMesh.add(faceHighlight);
}

function removeFaceHighlight() {
  if (faceHighlight) {
    if (faceHighlight.parent) faceHighlight.parent.remove(faceHighlight);
    faceHighlight.geometry.dispose();
    faceHighlight.material.dispose();
    faceHighlight = null;
  }
}

function updateFaceUI() {
  updateFaceControlInputs(selectedFace, faceUVData);
}

function updateOverlay() {
  const overlay = document.getElementById('tex-uv-overlay');
  drawSelectedFaceOverlay({
    overlay,
    paintCanvas,
    selectedFace,
    faceUVData,
    uvMapMode,
  });
}

// ── UV MAP mode: interactive rectangle drawing ─────────────────

function startUVMapDraw(e) {
  if (selectedFace < 0) {
    showToast(t('selectFaceFirst'));
    return;
  }
  uvMapStartPos = _snapUV(getCanvasUV(paintCanvas, e));
  uvMapDragging = true;
}

function doUVMapDraw(e) {
  if (!uvMapDragging || !uvMapStartPos || selectedFace < 0) return;
  const cur = _snapUV(getCanvasUV(paintCanvas, e));
  const ou = Math.min(uvMapStartPos.u, cur.u);
  const ov = Math.min(uvMapStartPos.v, cur.v);
  const su = Math.abs(cur.u - uvMapStartPos.u);
  const sv = Math.abs(cur.v - uvMapStartPos.v);

  faceUVData[selectedFace].ou = ou;
  faceUVData[selectedFace].ov = ov;
  faceUVData[selectedFace].su = su;
  faceUVData[selectedFace].sv = sv;
  applyFaceUVs(selectedFace);
  updateFaceUI();
  drawAllFaceOverlays();
}

function endUVMapDraw() {
  uvMapDragging = false;
  uvMapStartPos = null;
}

// ── Sprite Sheet / Grid ─────────────────────────────────────────

// ── Grid toggle (UV snap visual guide) ───────────────────────────

export function toggleGrid() {
  gridEnabled = !gridEnabled;
  _drawGridOverlay();
  const btn = document.getElementById('tex-grid-toggle');
  if (btn) {
    btn.classList.toggle('bg-[#ffcc00]', gridEnabled);
    btn.classList.toggle('text-black', gridEnabled);
  }
}

export function setGridSize(value) {
  const [c, r] = value.split('x').map(Number);
  gridCols = Math.max(1, c || 2);
  gridRows = Math.max(1, r || 2);
  _drawGridOverlay();
}

// ── Sprite Strip ─────────────────────────────────────────────────

// Save the current canvas content as a new tile at the end of the strip
export function saveTileToStrip() {
  spriteStripController.saveTileToStrip();
}

export function selectStripTile(idx) {
  spriteStripController.selectStripTile(idx);
}

export function getSelectedStripIdx() { return spriteStripController.getSelectedStripIdx(); }

export function getStripTileB64(idx) {
  return spriteStripController.getStripTileB64(idx);
}

// Called when user approves a generated variation — adds it to the strip
// and assembles + applies the full horizontal strip texture to the mesh
export function approveToStrip(b64) {
  spriteStripController.approveToStrip(b64);
}

export function applyStripToMesh() {
  spriteStripController.applyStripToMesh();
}

export function removeStripTile(idx) {
  spriteStripController.removeStripTile(idx);
}

export function clearStrip() {
  spriteStripController.clearStrip();
}

export function removeSelectedStripVariation() {
  return spriteStripController.removeSelectedStripVariation();
}

export async function downloadStripImage() {
  return spriteStripController.downloadStripImage();
}

function _renderStripNav() {
  spriteStripController.renderStripNav();
}

function _updateStripActionsUI() {
  spriteStripController.updateStripActionsUi();
}

function _syncBaseTileFromCanvas() {
  return spriteStripController.syncBaseTileFromCanvas();
}

function _restoreSpriteStrip(savedDataUrl, savedStrip) {
  spriteStripController.restoreSpriteStrip(savedDataUrl, savedStrip);
}

function _snapUV({ u, v }) {
  return snapUV({ u, v }, { gridEnabled, gridCols, gridRows });
}

function _drawGridOverlay() {
  const canvas = document.getElementById('tex-grid-canvas');
  drawGridOverlay({ canvas, paintCanvas, gridEnabled, gridCols, gridRows });
}


// ── Auto-save ────────────────────────────────────────────────────

function _scheduleAutoSave(mesh) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => _execAutoSave(mesh), 1500);
}

function _execAutoSave(mesh) {
  if (!paintCanvas) return;
  try {
    _syncBaseTileFromCanvas();
    const record = {
      meshName: mesh?.parent?.userData?.name || mesh?.userData?.name || '',
      dataURL: paintCanvas.toDataURL('image/png'),
      spriteStrip: spriteStripController.getSpriteStripSnapshot(),
      ts: Date.now(),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(record));
    const el = document.getElementById('tex-autosave-status');
    if (el) {
      el.textContent = 'AUTO-SAVED';
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; }, 2000);
    }
  } catch (_) {}
}

function _loadAutoSave(mesh) {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    const age = Date.now() - (record.ts || 0);
    // Only restore if < 24h old and mesh has no existing texture
    if (age < 86400000) return record;
  } catch (_) {}
  return null;
}

export function saveTextureSnapshot() {
  if (!paintCanvas) return;
  _execAutoSave(targetMesh);
  const link = document.createElement('a');
  link.download = 'texture_snapshot.png';
  const canvas = buildCommittedTextureCanvas(paintCanvas);
  link.href = (canvas || paintCanvas).toDataURL('image/png');
  link.click();
}

function drawAllFaceOverlays() {
  const canvas = document.getElementById('tex-uvmap-canvas');
  drawAllFaceOverlaysUI({
    canvas,
    paintCanvas,
    uvMapMode,
    faceUVData,
    selectedFace,
    getFaceNames,
  });
}
