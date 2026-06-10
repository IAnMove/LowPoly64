import * as THREE from 'three';

export const FACE_COLORS = ['#ff4444', '#44aaff', '#44ff44', '#ffaa00', '#ff44ff', '#44ffff'];

export const FACE_TARGET_ROTATIONS = [
  { x: 0, y: -Math.PI / 2 },
  { x: 0, y: Math.PI / 2 },
  { x: -Math.PI / 2, y: 0 },
  { x: Math.PI / 2, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: Math.PI },
];

function normalizeFaceUvEntry(entry = {}) {
  return {
    ou: entry.ou || 0,
    ov: entry.ov || 0,
    su: entry.su || 1,
    sv: entry.sv || 1,
    rot: entry.rot || 0,
  };
}

export function createDefaultFaceUVData(faceCount = 6) {
  return Array.from({ length: faceCount }, () => normalizeFaceUvEntry());
}

export function normalizeFaceUVData(data, faceCount = 6) {
  if (!Array.isArray(data)) return createDefaultFaceUVData(faceCount);
  return Array.from({ length: faceCount }, (_, index) => normalizeFaceUvEntry(data[index]));
}

export function readGlobalUVInputs() {
  return {
    ox: parseFloat(document.getElementById('tex-uv-ox').value) || 0,
    oy: parseFloat(document.getElementById('tex-uv-oy').value) || 0,
    rx: parseFloat(document.getElementById('tex-uv-rx').value) || 1,
    ry: parseFloat(document.getElementById('tex-uv-ry').value) || 1,
    rotDeg: parseFloat(document.getElementById('tex-uv-rot').value) || 0,
  };
}

export function setGlobalUVInputs(ox, oy, rx, ry, rotDeg) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };
  set('tex-uv-ox', ox.toFixed(2));
  set('tex-uv-oy', oy.toFixed(2));
  set('tex-uv-rx', rx.toFixed(2));
  set('tex-uv-ry', ry.toFixed(2));
  set('tex-uv-rot', rotDeg.toFixed(0));
}

export function buildTextureTransformFromGlobalInputs({ ox, oy, rx, ry, rotDeg }) {
  return {
    offset: [ox, oy],
    repeat: [rx, ry],
    rotation: THREE.MathUtils.degToRad(rotDeg),
    center: [0.5, 0.5],
  };
}

export function neutralizeTextureMapForFaceUVs(texture) {
  if (!texture) return;
  texture.offset.set(0, 0);
  texture.repeat.set(1, 1);
  texture.rotation = 0;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

export function applyFaceUVsToGeo(geo, face, faceUVData) {
  const uvAttr = geo.attributes.uv;
  if (!uvAttr) return;
  const data = faceUVData[face];
  const base = face * 4;
  const rad = THREE.MathUtils.degToRad(data.rot || 0);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
  corners.forEach((corner, index) => {
    const cx = corner[0] - 0.5;
    const cy = corner[1] - 0.5;
    const rx = cx * cos - cy * sin + 0.5;
    const ry = cx * sin + cy * cos + 0.5;
    uvAttr.setXY(base + index, data.ou + rx * data.su, data.ov + ry * data.sv);
  });
  uvAttr.needsUpdate = true;
}

export function updateFaceControlInputs(selectedFace, faceUVData) {
  const selectEl = document.getElementById('tex-face-select');
  const controlsEl = document.getElementById('tex-face-controls');

  if (selectEl) selectEl.value = selectedFace;

  if (selectedFace < 0) {
    if (controlsEl) controlsEl.classList.add('hidden');
    return;
  }

  if (controlsEl) controlsEl.classList.remove('hidden');

  const data = faceUVData[selectedFace];
  const fields = {
    'tex-face-ou': data.ou,
    'tex-face-ov': data.ov,
    'tex-face-su': data.su,
    'tex-face-sv': data.sv,
    'tex-face-rot': data.rot || 0,
  };
  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = typeof value === 'number' && id !== 'tex-face-rot' ? value.toFixed(2) : Math.round(value);
  }
}

export function drawSelectedFaceOverlay({
  overlay,
  paintCanvas,
  selectedFace,
  faceUVData,
  uvMapMode,
}) {
  if (!overlay || !paintCanvas) return;

  if (selectedFace < 0 || uvMapMode) {
    overlay.classList.add('hidden');
    return;
  }

  overlay.classList.remove('hidden');
  const data = faceUVData[selectedFace];
  const canvasWidth = paintCanvas.clientWidth;
  const canvasHeight = paintCanvas.clientHeight;

  overlay.style.left = (data.ou * canvasWidth) + 'px';
  overlay.style.top = (data.ov * canvasHeight) + 'px';
  overlay.style.width = Math.max(4, data.su * canvasWidth) + 'px';
  overlay.style.height = Math.max(4, data.sv * canvasHeight) + 'px';
  overlay.style.borderColor = FACE_COLORS[selectedFace];
}

export function getCanvasUV(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    u: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    v: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

export function snapUV({ u, v }, { gridEnabled, gridCols, gridRows }) {
  if (!gridEnabled) return { u, v };
  return {
    u: Math.round(u * gridCols) / gridCols,
    v: Math.round(v * gridRows) / gridRows,
  };
}

export function drawGridOverlay({ canvas, paintCanvas, gridEnabled, gridCols, gridRows }) {
  if (!canvas || !paintCanvas) return;
  const canvasWidth = paintCanvas.clientWidth;
  const canvasHeight = paintCanvas.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (!gridEnabled) return;

  const tileWidth = canvasWidth / gridCols;
  const tileHeight = canvasHeight / gridRows;
  ctx.strokeStyle = 'rgba(255,204,0,0.35)';
  ctx.lineWidth = 1;

  for (let col = 1; col < gridCols; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * tileWidth, 0);
    ctx.lineTo(col * tileWidth, canvasHeight);
    ctx.stroke();
  }
  for (let row = 1; row < gridRows; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * tileHeight);
    ctx.lineTo(canvasWidth, row * tileHeight);
    ctx.stroke();
  }

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255,204,0,0.4)';
  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      ctx.fillText(String(row * gridCols + col), col * tileWidth + 3, row * tileHeight + 12);
    }
  }
}

export function drawAllFaceOverlays({
  canvas,
  paintCanvas,
  uvMapMode,
  faceUVData,
  selectedFace,
  getFaceNames,
}) {
  if (!canvas || !paintCanvas) return;

  if (!uvMapMode || faceUVData.length === 0) {
    canvas.classList.add('hidden');
    return;
  }

  canvas.classList.remove('hidden');
  const canvasWidth = paintCanvas.clientWidth;
  const canvasHeight = paintCanvas.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let index = 0; index < 6; index += 1) {
    if (index >= faceUVData.length) break;
    const data = faceUVData[index];
    const x = data.ou * canvasWidth;
    const y = data.ov * canvasHeight;
    const width = Math.max(1, data.su * canvasWidth);
    const height = Math.max(1, data.sv * canvasHeight);

    ctx.globalAlpha = index === selectedFace ? 0.25 : 0.1;
    ctx.fillStyle = FACE_COLORS[index];
    ctx.fillRect(x, y, width, height);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = FACE_COLORS[index];
    ctx.lineWidth = index === selectedFace ? 2.5 : 1;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = FACE_COLORS[index];
    ctx.font = 'bold 9px monospace';
    ctx.fillText(getFaceNames()[index], x + 3, y + 11);
  }
}

export function createFaceHighlight(previewMesh, faceIdx) {
  if (!previewMesh) return null;
  const posAttr = previewMesh.geometry.attributes.position;
  const base = faceIdx * 4;
  const order = [0, 1, 3, 2];
  const positions = new Float32Array(12);
  order.forEach((vertexIndex, index) => {
    positions[index * 3] = posAttr.getX(base + vertexIndex);
    positions[index * 3 + 1] = posAttr.getY(base + vertexIndex);
    positions[index * 3 + 2] = posAttr.getZ(base + vertexIndex);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, depthTest: false });
  const highlight = new THREE.LineLoop(geo, mat);
  highlight.renderOrder = 999;
  return highlight;
}
