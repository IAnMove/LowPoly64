import * as THREE from 'three';
import { state } from './state.js';
import { getChildMesh, showToast } from './ui.js';
import { configureTexture } from './textures.js';
import { t } from './i18n.js';

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
  initPaintCanvas(mesh);
  initPreview(mesh);
  initFaceEditing(mesh);
  updateToolUI();
}

export function closeTextureEditor() {
  document.getElementById('texture-editor-modal').classList.add('hidden');
  uvMapMode = false;
  uvMapDragging = false;
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

  if (mesh.material.map && mesh.material.map.image) {
    paintCtx.drawImage(mesh.material.map.image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
  } else {
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }
  saveUndoSnapshot();

  paintCanvas.onmousedown = startPaint;
  paintCanvas.onmousemove = doPaint;
  paintCanvas.onmouseup = endPaint;
  paintCanvas.onmouseleave = endPaint;
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
  undoStack.push(paintCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
  if (undoStack.length > 50) undoStack.shift();
}

export function paintUndo() {
  if (undoStack.length <= 1) return;
  undoStack.pop();
  const prev = undoStack[undoStack.length - 1];
  paintCtx.putImageData(prev, 0, 0);
  applyCanvasToPreview();
  applyCanvasToMesh();
}

// ── Apply canvas as texture ─────────────────────────────────────

function applyCanvasToMesh() {
  const mesh = targetMesh || (state.selectedMesh ? (getChildMesh(state.selectedMesh) || state.selectedMesh) : null);
  if (!mesh || !mesh.isMesh) return;

  const previousMap = mesh.material.map;
  const texture = new THREE.CanvasTexture(paintCanvas);
  configureTexture(texture);
  copyTextureTransform(previousMap, texture);

  if (!mesh.userData.textureEnabled) {
    mesh.userData.colorBeforeTexture = mesh.material.color.getHex();
    mesh.material.color.set(0xffffff);
  }
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  if (isEditorCanvasTexture(previousMap)) {
    previousMap.dispose();
  }
}

function applyCanvasToPreview() {
  if (!previewMesh || !previewMesh.material) return;
  const previousMap = previewMesh.material.map;
  const tex = new THREE.CanvasTexture(paintCanvas);
  configureTexture(tex);
  copyTextureTransform(previousMap, tex);
  previewMesh.material.map = tex;
  previewMesh.material.needsUpdate = true;

  if (isEditorCanvasTexture(previousMap)) {
    previousMap.dispose();
  }
}

function copyTextureTransform(source, target) {
  if (!source || !target) return;
  target.offset.copy(source.offset);
  target.repeat.copy(source.repeat);
  target.center.copy(source.center);
  target.rotation = source.rotation;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
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
  previewMesh.material = mesh.material.clone();
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
    if (previewMesh && previewAutoRotate) previewMesh.rotation.y += 0.01;
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
  link.href = paintCanvas.toDataURL('image/png');
  link.click();
}

export function texNewCanvas() {
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  saveUndoSnapshot();
  applyCanvasToMesh();
  applyCanvasToPreview();
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
    // Sync per-face UI if a face is selected
    if (selectedFace >= 0) updateFaceUI();
    updateOverlay();
    return;
  }

  // Non-boxes: use material.map transform as before
  const tex = mesh.material.map;
  tex.offset.x = ox;
  tex.offset.y = oy;
  tex.repeat.x = rx;
  tex.repeat.y = ry;
  tex.rotation = THREE.MathUtils.degToRad(rotDeg);
  tex.center.set(0.5, 0.5);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
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
    previewAutoRotate = false;
    highlightFace(idx);
    updateFaceUI();
    updateOverlay();
    drawAllFaceOverlays();
  }
}

export function deselectFace() {
  selectedFace = -1;
  previewAutoRotate = true;
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
  uvMapStartPos = getCanvasUV(e);
  uvMapDragging = true;
}

function doUVMapDraw(e) {
  if (!uvMapDragging || !uvMapStartPos || selectedFace < 0) return;
  const cur = getCanvasUV(e);
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
