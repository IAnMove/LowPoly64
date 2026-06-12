import { FACE_COLORS } from './texture-editor-uv.js';

export function getCanvasUV(event, paintCanvas) {
  if (!paintCanvas) return null;
  const rect = paintCanvas.getBoundingClientRect();
  return {
    u: clamp01((event.clientX - rect.left) / rect.width),
    v: clamp01((event.clientY - rect.top) / rect.height),
  };
}

export function calculateUvMapSelection(start, current) {
  return {
    ou: Math.min(start.u, current.u),
    ov: Math.min(start.v, current.v),
    su: Math.abs(current.u - start.u),
    sv: Math.abs(current.v - start.v),
  };
}

export function renderSelectedFaceOverlay({
  overlay,
  paintCanvas,
  selectedFace,
  faceUVData,
  uvMapMode,
  colors = FACE_COLORS,
  minSize = 4,
} = {}) {
  if (!overlay || !paintCanvas) return false;

  const data = faceUVData?.[selectedFace];
  if (selectedFace < 0 || uvMapMode || !data) {
    overlay.classList.add('hidden');
    return false;
  }

  overlay.classList.remove('hidden');
  const canvasWidth = paintCanvas.clientWidth;
  const canvasHeight = paintCanvas.clientHeight;

  overlay.style.left = `${data.ou * canvasWidth}px`;
  overlay.style.top = `${data.ov * canvasHeight}px`;
  overlay.style.width = `${Math.max(minSize, data.su * canvasWidth)}px`;
  overlay.style.height = `${Math.max(minSize, data.sv * canvasHeight)}px`;
  overlay.style.borderColor = colors[selectedFace];
  return true;
}

export function drawFaceUvMapCanvas({
  canvas,
  paintCanvas,
  faceUVData,
  selectedFace,
  uvMapMode,
  faceNames,
  colors = FACE_COLORS,
} = {}) {
  if (!canvas || !paintCanvas) return false;

  if (!uvMapMode || !faceUVData?.length) {
    canvas.classList.add('hidden');
    return false;
  }

  canvas.classList.remove('hidden');
  const canvasWidth = paintCanvas.clientWidth;
  const canvasHeight = paintCanvas.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let i = 0; i < 6; i++) {
    if (i >= faceUVData.length) break;
    const data = faceUVData[i];
    const x = data.ou * canvasWidth;
    const y = data.ov * canvasHeight;
    const width = Math.max(1, data.su * canvasWidth);
    const height = Math.max(1, data.sv * canvasHeight);

    ctx.globalAlpha = i === selectedFace ? 0.25 : 0.1;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y, width, height);

    ctx.globalAlpha = 1;
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = i === selectedFace ? 2.5 : 1;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = colors[i];
    ctx.font = 'bold 9px monospace';
    ctx.fillText(faceNames[i], x + 3, y + 11);
  }

  return true;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
