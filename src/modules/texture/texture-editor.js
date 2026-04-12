import * as THREE from 'three';
import { state } from '../shared/state.js';
import { getChildMesh, showToast } from '../viewport/ui.js';
import {
  configureTexture,
  applyTextureTransform,
  createDetachedCanvasTexture,
  getTextureTransform,
  rememberTextureTransform,
} from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import {
  cloneTextureProcessingSettings,
  createTextureProcessingPreset,
  createPsxifyTextureSettings,
  processTextureCanvas,
} from './texture-processing.js';

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
let previewRenderer = null;
let previewScene = null;
let previewCamera = null;
let previewMesh = null;
let previewAnimId = null;
let previewAutoRotate = true;
let previewTargetRotation = null; // { x, y } when animating to a face

// ── Chroma Key (color → transparent) ────────────────────────────
let chromaSampleMode = false;

export function startColorSample() {
  chromaSampleMode = true;
  if (paintCanvas) paintCanvas.style.cursor = 'crosshair';
}

export function removeColorFromCanvas(hexColor, tolerance) {
  if (!paintCtx) return;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const tol = Math.max(0, Math.min(255, parseInt(tolerance) || 30));

  const imageData = paintCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) <= tol * 3) {
      d[i + 3] = 0;
    }
  }
  paintCtx.putImageData(imageData, 0, 0);
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
let spriteStrip = [];        // array of base64 PNG strings (full 256×256 each)
let selectedStripIdx = -1;

// ── Auto-save ────────────────────────────────────────────────────
const AUTOSAVE_KEY = 'lp64_tex_autosave';
let autoSaveTimer = null;

// ── Per-face UV ─────────────────────────────────────────────────
function getFaceNames() { return [t('faceRight'), t('faceLeft'), t('faceTop'), t('faceBottom'), t('faceFront'), t('faceBack')]; }
const FACE_COLORS = ['#ff4444', '#44aaff', '#44ff44', '#ffaa00', '#ff44ff', '#44ffff'];
let selectedFace = -1;
let faceUVData = [];
let targetMesh = null; // reference to the actual scene mesh
let faceHighlight = null;
let uvMapMode = false;
let uvMapDragging = false;
let uvMapStartPos = null;
let previewTextureProcessingSettings = cloneTextureProcessingSettings();
let appliedTextureProcessingSettings = cloneTextureProcessingSettings();

function normalizePreviewMaterialAppearance(material) {
  if (!material) return material;
  if (Array.isArray(material)) {
    material.forEach((entry) => normalizePreviewMaterialAppearance(entry));
    return material;
  }
  if (material.emissive) {
    material.emissive.set(0x000000);
    material.emissiveIntensity = 0;
  }
  return material;
}

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
  if (previewAnimId) { cancelAnimationFrame(previewAnimId); previewAnimId = null; }
  if (previewRenderer) { previewRenderer.dispose(); previewRenderer = null; }
  previewScene = null;
  previewCamera = null;
  previewMesh = null;
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
    drawTextureImageToCanvas(mesh.material.map.image);
    _syncBaseTileFromCanvas();
  } else {
    // Check for auto-saved texture before filling with white
    const saved = _loadAutoSave(mesh);
    if (saved) {
      _restoreSpriteStrip(saved.dataURL, saved.spriteStrip);
      const img = new Image();
      img.onload = () => {
        paintCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        paintCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        _syncBaseTileFromCanvas();
        saveUndoSnapshot();
        applyCanvasToMesh();
        applyCanvasToPreview();
        showToast('Auto-saved texture restored');
      };
      img.src = saved.dataURL;
    } else {
      paintCtx.fillStyle = '#ffffff';
      paintCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      _syncBaseTileFromCanvas();
    }
  }
  saveUndoSnapshot();

  paintCanvas.onmousedown = startPaint;
  paintCanvas.onmousemove = doPaint;
  paintCanvas.onmouseup = endPaint;
  paintCanvas.onmouseleave = endPaint;
}

function drawTextureImageToCanvas(sourceImage) {
  if (!sourceImage) return;

  const sourceIsSameCanvas = sourceImage === paintCanvas;
  const source = sourceIsSameCanvas ? cloneCanvas(sourceImage) : sourceImage;

  if (!source) {
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    return;
  }

  paintCtx.drawImage(source, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

function cloneCanvas(sourceCanvas) {
  if (!(sourceCanvas instanceof HTMLCanvasElement)) return null;
  const copy = document.createElement('canvas');
  copy.width = sourceCanvas.width || CANVAS_SIZE;
  copy.height = sourceCanvas.height || CANVAS_SIZE;
  const copyCtx = copy.getContext('2d');
  copyCtx.drawImage(sourceCanvas, 0, 0);
  return copy;
}

function renderTextureProcessingUI() {
  const sizeSelect = document.getElementById('tex-fx-target-size');
  const downscale = document.getElementById('tex-fx-downscale');
  const palette15 = document.getElementById('tex-fx-palette15');
  const dithering = document.getElementById('tex-fx-dither');

  if (sizeSelect) sizeSelect.value = `${previewTextureProcessingSettings.targetSize}`;
  if (downscale) downscale.checked = previewTextureProcessingSettings.downscaleEnabled;
  if (palette15) palette15.checked = previewTextureProcessingSettings.palette15Bit;
  if (dithering) dithering.checked = previewTextureProcessingSettings.ditheringEnabled;
}

function syncTextureProcessingFromMesh(mesh) {
  appliedTextureProcessingSettings = cloneTextureProcessingSettings(mesh?.userData?.textureProcessing || {});
  previewTextureProcessingSettings = cloneTextureProcessingSettings(appliedTextureProcessingSettings);
  renderTextureProcessingUI();
}

function setTextureProcessingValue(key, value) {
  previewTextureProcessingSettings = cloneTextureProcessingSettings({
    ...previewTextureProcessingSettings,
    [key]: key === 'targetSize' ? Number.parseInt(value, 10) : value,
  });
  renderTextureProcessingUI();
}

function buildTextureCanvasWithProcessing(sourceCanvas, settings, options = {}) {
  const processed = processTextureCanvas(sourceCanvas, settings, options);
  return processed?.canvas || cloneCanvas(sourceCanvas);
}

function buildCommittedTextureCanvas(sourceCanvas, options = {}) {
  return buildTextureCanvasWithProcessing(sourceCanvas, appliedTextureProcessingSettings, options);
}

function buildPreviewTextureCanvas(sourceCanvas, options = {}) {
  return buildTextureCanvasWithProcessing(sourceCanvas, previewTextureProcessingSettings, options);
}

function getCanvasPos(e) {
  const rect = paintCanvas.getBoundingClientRect();
  const scaleX = CANVAS_SIZE / rect.width;
  const scaleY = CANVAS_SIZE / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function startPaint(e) {
  if (uvMapMode) { startUVMapDraw(e); return; }
  if (chromaSampleMode) {
    chromaSampleMode = false;
    paintCanvas.style.cursor = '';
    const pos = getCanvasPos(e);
    const px = paintCtx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
    const hex = '#' + [px[0], px[1], px[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    // Notify main.js of the sampled color
    const colorInput = document.getElementById('tex-chroma-color');
    if (colorInput) { colorInput.value = hex; colorInput.dispatchEvent(new Event('input')); }
    return;
  }
  painting = true;
  const pos = getCanvasPos(e);
  drawDot(pos.x, pos.y);
  paintCanvas._lastPos = pos;
}

function doPaint(e) {
  if (uvMapMode) { doUVMapDraw(e); return; }
  if (!painting) return;
  const pos = getCanvasPos(e);
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
  const r = BRUSH_SIZES[brushSize];
  paintCtx.beginPath();
  if (eraserMode) {
    paintCtx.globalCompositeOperation = 'destination-out';
    paintCtx.arc(x, y, r, 0, Math.PI * 2);
    paintCtx.fill();
    paintCtx.globalCompositeOperation = 'source-over';
    paintCtx.fillStyle = '#ffffff';
    paintCtx.beginPath();
    paintCtx.arc(x, y, r, 0, Math.PI * 2);
    paintCtx.fill();
  } else {
    paintCtx.fillStyle = brushColor;
    paintCtx.arc(x, y, r, 0, Math.PI * 2);
    paintCtx.fill();
  }
}

function drawLine(x1, y1, x2, y2) {
  const r = BRUSH_SIZES[brushSize];
  const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const steps = Math.max(1, Math.ceil(dist / (r * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawDot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }
}

function saveUndoSnapshot() {
  undoStack.push({
    imageData: paintCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE),
    appliedSettings: cloneTextureProcessingSettings(appliedTextureProcessingSettings),
    previewSettings: cloneTextureProcessingSettings(previewTextureProcessingSettings),
  });
  if (undoStack.length > 50) undoStack.shift();
}

export function paintUndo() {
  if (undoStack.length <= 1) return;
  undoStack.pop();
  const prev = undoStack[undoStack.length - 1];
  if (!prev) return;
  paintCtx.putImageData(prev.imageData, 0, 0);
  appliedTextureProcessingSettings = cloneTextureProcessingSettings(prev.appliedSettings || {});
  previewTextureProcessingSettings = cloneTextureProcessingSettings(prev.previewSettings || prev.appliedSettings || {});
  renderTextureProcessingUI();
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
  mesh.userData.textureProcessing = cloneTextureProcessingSettings(appliedTextureProcessingSettings);
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  if (previousMap && previousMap !== texture) {
    previousMap.dispose();
  }
  _scheduleAutoSave(mesh);
  _updateSheetNav();
}

function applyCanvasToPreview() {
  if (!previewMesh || !previewMesh.material) return;
  const previousMap = previewMesh.material.map;
  const previewCanvas = buildPreviewTextureCanvas(paintCanvas);
  const tex = new THREE.CanvasTexture(previewCanvas);
  configureTexture(tex);
  applyTextureTransform(tex, targetMesh?.userData?.textureTransform || getTextureTransform(previousMap));
  previewMesh.material.map = tex;
  previewMesh.material.needsUpdate = true;

  if (isEditorCanvasTexture(previousMap)) {
    previousMap.dispose();
  }
}

function isEditorCanvasTexture(texture) {
  return !!(texture && texture.isCanvasTexture && texture.image === paintCanvas);
}

// ── 3D Preview ──────────────────────────────────────────────────

function initPreview(mesh) {
  const container = document.getElementById('tex-preview-3d');
  container.innerHTML = '';
  previewAutoRotate = true;

  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x1a1a1a);

  previewCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  previewCamera.position.set(0, 0, 4);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  previewScene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(2, 3, 4);
  previewScene.add(dir);

  // Clone mesh for preview with its own geometry copy for per-face UV edits
  previewMesh = mesh.clone();
  previewMesh.geometry = mesh.geometry.clone();
  previewMesh.material = normalizePreviewMaterialAppearance(mesh.material.clone());
  if (mesh.material?.map) {
    previewMesh.material.map = createDetachedCanvasTexture(
      mesh.material.map.image,
      mesh.userData.textureTransform || getTextureTransform(mesh.material.map)
    );
  }
  previewMesh.position.set(0, 0, 0);
  previewMesh.rotation.set(0, 0, 0);
  previewMesh.scale.set(1, 1, 1);
  previewMesh.geometry.computeBoundingBox();
  const box = previewMesh.geometry.boundingBox;
  const center = box.getCenter(new THREE.Vector3());
  previewMesh.geometry.translate(-center.x, -center.y, -center.z);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  previewCamera.position.z = maxDim * 2.5;
  previewScene.add(previewMesh);

  previewRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  previewRenderer.setSize(200, 200);
  previewRenderer.setPixelRatio(1);
  container.appendChild(previewRenderer.domElement);

  // Pause rotation on hover so faces are easier to click
  previewRenderer.domElement.addEventListener('mouseenter', () => { previewAutoRotate = false; });
  previewRenderer.domElement.addEventListener('mouseleave', () => { if (selectedFace < 0) previewAutoRotate = true; });

  function animatePreview() {
    previewAnimId = requestAnimationFrame(animatePreview);
    if (previewMesh) {
      if (previewTargetRotation) {
        previewMesh.rotation.x += (previewTargetRotation.x - previewMesh.rotation.x) * 0.12;
        previewMesh.rotation.y += (previewTargetRotation.y - previewMesh.rotation.y) * 0.12;
        const doneX = Math.abs(previewTargetRotation.x - previewMesh.rotation.x) < 0.001;
        const doneY = Math.abs(previewTargetRotation.y - previewMesh.rotation.y) < 0.001;
        if (doneX && doneY) {
          previewMesh.rotation.x = previewTargetRotation.x;
          previewMesh.rotation.y = previewTargetRotation.y;
          previewTargetRotation = null;
        }
      } else if (previewAutoRotate) {
        previewMesh.rotation.y += 0.01;
      }
    }
    if (previewRenderer && previewScene && previewCamera) {
      previewRenderer.render(previewScene, previewCamera);
    }
  }
  animatePreview();
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
      paintCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      paintCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  _syncBaseTileFromCanvas();
  saveUndoSnapshot();
  applyCanvasToMesh();
  applyCanvasToPreview();
}

// Apply a base64 PNG (no data-URL prefix) to the paint canvas
export function applyBase64ToCanvas(base64) {
  const img = new Image();
  img.onload = () => {
    paintCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    paintCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
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
  appliedTextureProcessingSettings = cloneTextureProcessingSettings(previewTextureProcessingSettings);
  applyCanvasToMesh();
  applyCanvasToPreview();
  saveUndoSnapshot();
  return true;
}

export function applyPsxifyTexture() {
  previewTextureProcessingSettings = createPsxifyTextureSettings(previewTextureProcessingSettings);
  renderTextureProcessingUI();
  applyCanvasToPreview();
  return true;
}

export function applyTextureProcessingPreset(presetId) {
  previewTextureProcessingSettings = createTextureProcessingPreset(presetId, previewTextureProcessingSettings);
  renderTextureProcessingUI();
  applyCanvasToPreview();
  return true;
}

// ── Global UV controls ──────────────────────────────────────────

export function texUpdateUV() {
  const mesh = targetMesh || (state.selectedMesh ? (getChildMesh(state.selectedMesh) || state.selectedMesh) : null);
  if (!mesh || !mesh.material || !mesh.material.map) return;

  const ox = parseFloat(document.getElementById('tex-uv-ox').value) || 0;
  const oy = parseFloat(document.getElementById('tex-uv-oy').value) || 0;
  const rx = parseFloat(document.getElementById('tex-uv-rx').value) || 1;
  const ry = parseFloat(document.getElementById('tex-uv-ry').value) || 1;
  const rotDeg = parseFloat(document.getElementById('tex-uv-rot').value) || 0;

  // For boxes: global controls set ALL faces via geometry UV attributes
  if (mesh.userData.geometryType === 'cube' && faceUVData.length === 6) {
    for (let i = 0; i < 6; i++) {
      faceUVData[i] = { ou: ox, ov: oy, su: rx, sv: ry, rot: rotDeg };
      applyFaceUVsToGeo(mesh.geometry, i);
      if (previewMesh) applyFaceUVsToGeo(previewMesh.geometry, i);
    }
    mesh.userData.faceUVs = faceUVData.map((d) => ({ ...d }));
    // Keep material.map neutral for boxes
    const tex = mesh.material.map;
    tex.offset.set(0, 0);
    tex.repeat.set(1, 1);
    tex.rotation = 0;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    rememberTextureTransform(mesh, tex);
    // Sync per-face UI if a face is selected
    if (selectedFace >= 0) updateFaceUI();
    updateOverlay();
    return;
  }

  // Non-boxes: use material.map transform as before
  const tex = mesh.material.map;
  const transform = {
    offset: [ox, oy],
    repeat: [rx, ry],
    rotation: THREE.MathUtils.degToRad(rotDeg),
    center: [0.5, 0.5],
  };
  applyTextureTransform(tex, transform);
  rememberTextureTransform(mesh, tex);
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
    faceUVData = mesh.userData.faceUVs
      ? mesh.userData.faceUVs.map((d) => ({ ou: d.ou || 0, ov: d.ov || 0, su: d.su || 1, sv: d.sv || 1, rot: d.rot || 0 }))
      : Array.from({ length: 6 }, () => ({ ou: 0, ov: 0, su: 1, sv: 1, rot: 0 }));

    previewRenderer.domElement.style.cursor = 'pointer';
    previewRenderer.domElement.addEventListener('click', onPreviewClick);

    // Reset material.map to neutral — all UV control goes through geometry attributes
    if (mesh.material && mesh.material.map) {
      mesh.material.map.offset.set(0, 0);
      mesh.material.map.repeat.set(1, 1);
      mesh.material.map.rotation = 0;
      mesh.material.map.wrapS = THREE.RepeatWrapping;
      mesh.material.map.wrapT = THREE.RepeatWrapping;
      mesh.material.map.needsUpdate = true;
    }

    // Sync global UV inputs from first face data (so user sees current values)
    const d0 = faceUVData[0];
    setGlobalUVInputs(d0.ou, d0.ov, d0.su, d0.sv, d0.rot);

    // Apply existing per-face UVs to both meshes
    for (let i = 0; i < 6; i++) {
      applyFaceUVsToGeo(mesh.geometry, i);
      applyFaceUVsToGeo(previewMesh.geometry, i);
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
  if (!previewMesh || !previewRenderer) return;
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
      previewAutoRotate = false;
      previewTargetRotation = { ...FACE_TARGET_ROTATIONS[fi] };
      highlightFace(fi);
      updateFaceUI();
      updateOverlay();
    }
  }
}

// Target rotations (x, y) so each face points toward the camera (camera is at +z)
const FACE_TARGET_ROTATIONS = [
  { x: 0,              y: -Math.PI / 2 }, // 0: Right (+x)
  { x: 0,              y:  Math.PI / 2 }, // 1: Left  (-x)
  { x: -Math.PI / 2,  y: 0 },            // 2: Top   (+y)
  { x:  Math.PI / 2,  y: 0 },            // 3: Bottom(-y)
  { x: 0,              y: 0 },            // 4: Front (+z)
  { x: 0,              y:  Math.PI },     // 5: Back  (-z)
];

export function selectFace(value) {
  const idx = parseInt(value);
  if (idx < 0 || isNaN(idx)) {
    deselectFace();
  } else if (idx >= 0 && idx < 6) {
    selectedFace = idx;
    previewAutoRotate = false;
    previewTargetRotation = { ...FACE_TARGET_ROTATIONS[idx] };
    highlightFace(idx);
    updateFaceUI();
    updateOverlay();
    drawAllFaceOverlays();
  }
}

export function deselectFace() {
  selectedFace = -1;
  previewAutoRotate = true;
  previewTargetRotation = null;
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
  applyFaceUVsToGeo(targetMesh.geometry, face);
  if (previewMesh) applyFaceUVsToGeo(previewMesh.geometry, face);
  targetMesh.userData.faceUVs = faceUVData.map((d) => ({ ...d }));
}

function setGlobalUVInputs(ox, oy, rx, ry, rotDeg) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('tex-uv-ox', ox.toFixed(2));
  set('tex-uv-oy', oy.toFixed(2));
  set('tex-uv-rx', rx.toFixed(2));
  set('tex-uv-ry', ry.toFixed(2));
  set('tex-uv-rot', rotDeg.toFixed(0));
}

function applyFaceUVsToGeo(geo, face) {
  const uvAttr = geo.attributes.uv;
  if (!uvAttr) return;
  const d = faceUVData[face];
  const base = face * 4;
  const rad = THREE.MathUtils.degToRad(d.rot || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  // Default box UV corners per face: (0,1) (1,1) (0,0) (1,0)
  const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
  corners.forEach((c, i) => {
    // Rotate corner around (0.5, 0.5) center, then scale and offset
    const cx = c[0] - 0.5;
    const cy = c[1] - 0.5;
    const rx = cx * cos - cy * sin + 0.5;
    const ry = cx * sin + cy * cos + 0.5;
    uvAttr.setXY(base + i, d.ou + rx * d.su, d.ov + ry * d.sv);
  });
  uvAttr.needsUpdate = true;
}

function highlightFace(faceIdx) {
  removeFaceHighlight();
  if (!previewMesh) return;

  const posAttr = previewMesh.geometry.attributes.position;
  const base = faceIdx * 4;
  // Perimeter: top-left → top-right → bottom-right → bottom-left
  const order = [0, 1, 3, 2];
  const positions = new Float32Array(12);
  order.forEach((vi, i) => {
    positions[i * 3] = posAttr.getX(base + vi);
    positions[i * 3 + 1] = posAttr.getY(base + vi);
    positions[i * 3 + 2] = posAttr.getZ(base + vi);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, depthTest: false });
  faceHighlight = new THREE.LineLoop(geo, mat);
  faceHighlight.renderOrder = 999;
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
  const selectEl = document.getElementById('tex-face-select');
  const controlsEl = document.getElementById('tex-face-controls');

  if (selectEl) selectEl.value = selectedFace;

  if (selectedFace < 0) {
    if (controlsEl) controlsEl.classList.add('hidden');
    return;
  }

  if (controlsEl) controlsEl.classList.remove('hidden');

  const d = faceUVData[selectedFace];
  const fields = { 'tex-face-ou': d.ou, 'tex-face-ov': d.ov, 'tex-face-su': d.su, 'tex-face-sv': d.sv, 'tex-face-rot': d.rot || 0 };
  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = typeof val === 'number' && id !== 'tex-face-rot' ? val.toFixed(2) : Math.round(val);
  }
}

function updateOverlay() {
  const overlay = document.getElementById('tex-uv-overlay');
  if (!overlay || !paintCanvas) return;

  // In UV MAP mode, the all-face canvas handles display
  if (selectedFace < 0 || uvMapMode) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.classList.remove('hidden');
  const d = faceUVData[selectedFace];
  const cw = paintCanvas.clientWidth;
  const ch = paintCanvas.clientHeight;

  // With flipY=false: UV V maps directly to canvas Y (both top-to-bottom)
  const left = d.ou * cw;
  const top = d.ov * ch;
  const width = Math.max(4, d.su * cw);
  const height = Math.max(4, d.sv * ch);

  overlay.style.left = left + 'px';
  overlay.style.top = top + 'px';
  overlay.style.width = width + 'px';
  overlay.style.height = height + 'px';
  overlay.style.borderColor = FACE_COLORS[selectedFace];
}

// ── UV MAP mode: interactive rectangle drawing ─────────────────

function getCanvasUV(e) {
  const rect = paintCanvas.getBoundingClientRect();
  return {
    u: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    v: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
  };
}

function startUVMapDraw(e) {
  if (selectedFace < 0) {
    showToast(t('selectFaceFirst'));
    return;
  }
  uvMapStartPos = _snapUV(getCanvasUV(e));
  uvMapDragging = true;
}

function doUVMapDraw(e) {
  if (!uvMapDragging || !uvMapStartPos || selectedFace < 0) return;
  const cur = _snapUV(getCanvasUV(e));
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
  if (!paintCanvas) return;
  const b64 = paintCanvas.toDataURL('image/png').split(',')[1];
  spriteStrip.push(b64);
  selectedStripIdx = spriteStrip.length - 1;
  _renderStripNav();
  _updateStripActionsUI();
  _execAutoSave(targetMesh); // persist immediately
}

export function selectStripTile(idx) {
  selectedStripIdx = idx === selectedStripIdx ? -1 : idx; // toggle
  _renderStripNav();
  _updateStripActionsUI();
}

export function getSelectedStripIdx() { return selectedStripIdx; }

export function getStripTileB64(idx) {
  return spriteStrip[idx] ?? null;
}

// Called when user approves a generated variation — adds it to the strip
// and assembles + applies the full horizontal strip texture to the mesh
export function approveToStrip(b64) {
  _syncBaseTileFromCanvas();
  spriteStrip.push(b64);
  selectedStripIdx = spriteStrip.length - 1;
  _renderStripNav();
  _updateStripActionsUI();
  _applyStripToMesh();
  _execAutoSave(targetMesh);
}

export function applyStripToMesh() {
  _syncBaseTileFromCanvas();
  _applyStripToMesh();
}

export function removeStripTile(idx) {
  if (idx <= 0 || idx >= spriteStrip.length) return;
  spriteStrip.splice(idx, 1);
  if (selectedStripIdx === idx) selectedStripIdx = Math.max(0, idx - 1);
  else if (selectedStripIdx >= spriteStrip.length) selectedStripIdx = spriteStrip.length - 1;
  _renderStripNav();
  _updateStripActionsUI();
  if (spriteStrip.length > 0) {
    _applyStripToMesh();
    _execAutoSave(targetMesh);
  }
}

export function clearStrip() {
  spriteStrip = [];
  selectedStripIdx = -1;
  _renderStripNav();
  _updateStripActionsUI();
}

export function removeSelectedStripVariation() {
  if (selectedStripIdx <= 0 || selectedStripIdx >= spriteStrip.length) return false;
  removeStripTile(selectedStripIdx);
  return true;
}

export async function downloadStripImage() {
  _syncBaseTileFromCanvas();
  if (spriteStrip.length === 0) return false;
  const stripCanvas = await _buildStripCanvas();
  if (!stripCanvas) return false;
  const committedCanvas = buildCommittedTextureCanvas(stripCanvas, { tileCount: spriteStrip.length });
  const link = document.createElement('a');
  link.download = `sprite_strip_${spriteStrip.length}x1.png`;
  link.href = (committedCanvas || stripCanvas).toDataURL('image/png');
  link.click();
  return true;
}

function _applyStripToMesh() {
  if (!targetMesh) return;
  _buildStripCanvas().then((stripCanvas) => {
    if (stripCanvas) _commitStripCanvas(stripCanvas);
  }).catch((e) => { if (typeof showToast === 'function') showToast('Strip error: ' + e.message); });
}

function _commitStripCanvas(stripCanvas) {
  if (!targetMesh?.material) return;
  const previousMap = targetMesh.material.map;
  const committedCanvas = buildCommittedTextureCanvas(stripCanvas, { tileCount: spriteStrip.length });
  const tex = createDetachedCanvasTexture(committedCanvas, targetMesh.userData.textureTransform);
  if (!targetMesh.userData.textureEnabled) {
    targetMesh.userData.colorBeforeTexture = targetMesh.material.color.getHex();
    targetMesh.material.color.set(0xffffff);
  }
  targetMesh.material.map = tex;
  targetMesh.userData.texture = tex;
  targetMesh.userData.textureEnabled = true;
  targetMesh.userData.textureProcessing = cloneTextureProcessingSettings(appliedTextureProcessingSettings);
  rememberTextureTransform(targetMesh, tex);
  targetMesh.material.needsUpdate = true;
  if (previousMap && previousMap !== tex) previousMap.dispose();

  if (previewMesh?.material) {
    const prevTex = previewMesh.material.map;
    const tex2 = new THREE.CanvasTexture(committedCanvas);
    configureTexture(tex2);
    applyTextureTransform(tex2, targetMesh.userData.textureTransform || getTextureTransform(prevTex));
    previewMesh.material.map = tex2;
    previewMesh.material.needsUpdate = true;
    if (isEditorCanvasTexture(prevTex)) prevTex.dispose();
  }
}

function _renderStripNav() {
  const nav = document.getElementById('tex-strip-nav');
  if (!nav) return;
  nav.innerHTML = '';

  if (spriteStrip.length === 0) {
    nav.innerHTML = '<span class="text-zinc-600 text-[8px] self-center px-1">Generate or paint a base sprite, then add variations</span>';
    return;
  }

  spriteStrip.forEach((b64, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'flex flex-col items-center gap-0.5 cursor-pointer shrink-0';

    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + b64;
    const sel = i === selectedStripIdx;
    img.style.cssText = `width:44px;height:44px;image-rendering:pixelated;display:block;border:2px solid ${sel ? '#ffcc00' : '#3f3f46'};`;

    const lbl = document.createElement('span');
    lbl.className = 'text-[7px] ' + (sel ? 'text-[#ffcc00]' : 'text-zinc-500');
    lbl.textContent = i === 0 ? 'BASE' : `VAR ${i}`;

    wrap.appendChild(img);
    wrap.appendChild(lbl);
    wrap.onclick = () => selectStripTile(i);

    // Right-click removes only variations, never the base tile
    if (i > 0) {
      wrap.oncontextmenu = (e) => { e.preventDefault(); removeStripTile(i); showToast('Tile removed'); };
    }

    nav.appendChild(wrap);
  });
}

function _updateStripActionsUI() {
  const section = document.getElementById('tex-strip-var-section');
  if (!section) return;
  const hasSel = selectedStripIdx >= 0 && selectedStripIdx < spriteStrip.length;
  section.classList.toggle('hidden', !hasSel);
  if (hasSel) {
    const lbl = document.getElementById('tex-strip-src-label');
    if (lbl) lbl.textContent = selectedStripIdx === 0 ? 'BASE' : `VAR ${selectedStripIdx}`;
  }
  const applyBtn = document.getElementById('tex-strip-apply-btn');
  if (applyBtn) applyBtn.classList.toggle('hidden', spriteStrip.length === 0);
  const removeBtn = document.getElementById('tex-strip-remove-btn');
  if (removeBtn) {
    const canRemove = selectedStripIdx > 0 && selectedStripIdx < spriteStrip.length;
    removeBtn.classList.toggle('hidden', !canRemove);
  }
  const exportBtn = document.getElementById('tex-strip-export-btn');
  if (exportBtn) exportBtn.classList.toggle('hidden', spriteStrip.length === 0);
}

function _syncBaseTileFromCanvas() {
  const base64 = _getCanvasBase64();
  if (!base64) return false;
  let changed = false;
  if (spriteStrip.length === 0) {
    spriteStrip = [base64];
    selectedStripIdx = 0;
    changed = true;
  } else if (spriteStrip[0] !== base64) {
    spriteStrip[0] = base64;
    if (selectedStripIdx < 0) selectedStripIdx = 0;
    changed = true;
  }
  if (changed) {
    _renderStripNav();
    _updateStripActionsUI();
  }
  return changed;
}

function _getCanvasBase64() {
  return paintCanvas ? paintCanvas.toDataURL('image/png').split(',')[1] : null;
}

function _restoreSpriteStrip(savedDataUrl, savedStrip) {
  const savedBase64 = typeof savedDataUrl === 'string' && savedDataUrl.includes(',')
    ? savedDataUrl.split(',')[1]
    : null;
  if (!Array.isArray(savedStrip) || savedStrip.length === 0) {
    spriteStrip = savedBase64 ? [savedBase64] : [];
  } else if (savedBase64 && savedStrip[0] !== savedBase64) {
    spriteStrip = [savedBase64, ...savedStrip];
  } else {
    spriteStrip = savedStrip.slice();
  }
  selectedStripIdx = spriteStrip.length > 0 ? 0 : -1;
  _renderStripNav();
  _updateStripActionsUI();
}

function _loadStripTile(base64, index) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, index });
    img.onerror = reject;
    img.src = 'data:image/png;base64,' + base64;
  });
}

async function _buildStripCanvas() {
  if (spriteStrip.length === 0) return null;
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = CANVAS_SIZE * spriteStrip.length;
  stripCanvas.height = CANVAS_SIZE;
  const ctx = stripCanvas.getContext('2d');
  const tiles = await Promise.all(spriteStrip.map((b64, index) => _loadStripTile(b64, index)));
  tiles.forEach(({ img, index }) => {
    ctx.drawImage(img, 0, 0, img.width, img.height, index * CANVAS_SIZE, 0, CANVAS_SIZE, CANVAS_SIZE);
  });
  return stripCanvas;
}

function _snapUV({ u, v }) {
  if (!gridEnabled) return { u, v };
  return {
    u: Math.round(u * gridCols) / gridCols,
    v: Math.round(v * gridRows) / gridRows,
  };
}

function _drawGridOverlay() {
  const canvas = document.getElementById('tex-grid-canvas');
  if (!canvas || !paintCanvas) return;
  const cw = paintCanvas.clientWidth;
  const ch = paintCanvas.clientHeight;
  canvas.width = cw; canvas.height = ch;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);
  if (!gridEnabled) return;

  const tw = cw / gridCols;
  const th = ch / gridRows;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,204,0,0.35)';
  ctx.lineWidth = 1;
  for (let c = 1; c < gridCols; c++) {
    ctx.beginPath(); ctx.moveTo(c * tw, 0); ctx.lineTo(c * tw, ch); ctx.stroke();
  }
  for (let r = 1; r < gridRows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * th); ctx.lineTo(cw, r * th); ctx.stroke();
  }

  // Tile numbers (orientation guide only)
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,204,0,0.4)';
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      ctx.fillText(String(r * gridCols + c), c * tw + 3, r * th + 12);
    }
  }
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
      spriteStrip: spriteStrip.slice(), // persist strip too
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
  if (!canvas || !paintCanvas) return;

  if (!uvMapMode || faceUVData.length === 0) {
    canvas.classList.add('hidden');
    return;
  }

  canvas.classList.remove('hidden');
  const cw = paintCanvas.clientWidth;
  const ch = paintCanvas.clientHeight;
  canvas.width = cw;
  canvas.height = ch;
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);

  for (let i = 0; i < 6; i++) {
    if (i >= faceUVData.length) break;
    const d = faceUVData[i];
    const x = d.ou * cw;
    const y = d.ov * ch;
    const w = Math.max(1, d.su * cw);
    const h = Math.max(1, d.sv * ch);

    // Semi-transparent fill
    ctx.globalAlpha = i === selectedFace ? 0.25 : 0.1;
    ctx.fillStyle = FACE_COLORS[i];
    ctx.fillRect(x, y, w, h);

    // Border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = FACE_COLORS[i];
    ctx.lineWidth = i === selectedFace ? 2.5 : 1;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = FACE_COLORS[i];
    ctx.font = 'bold 9px monospace';
    ctx.fillText(getFaceNames()[i], x + 3, y + 11);
  }
}
