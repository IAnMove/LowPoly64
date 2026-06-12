import {
  createTextureCanvas,
  createTextureImageFileInput,
  createTexturePaletteSwatch,
  getTexturePaintCanvas,
  getTexturePaletteContainer,
  isTextureCanvas,
} from './texture-editor-dom.js';
import { loadImageFile } from './browser-image-adapter.js';
import { downloadDataURL } from './browser-download-adapter.js';
import {
  TEXTURE_BRUSH_SIZES,
  TEXTURE_CANVAS_SIZE,
  getBrushRadius,
} from './texture-editor-paint-core.js';
import {
  drawBrushDot,
  drawBrushStroke,
} from './texture-editor-paint-commands.js';
import {
  createTexturePaintToolState,
  setTexturePaintBrushColor,
  setTexturePaintBrushSize,
  setTexturePaintEraserMode,
} from './texture-editor-paint-tool-state.js';
import {
  clearTexturePaintSurface,
  loadTexturePaintImage,
  undoTexturePaintSurface,
} from './texture-editor-paint-command-flow.js';
import { renderTexturePaintPalette } from './texture-editor-paint-palette-ui.js';
import { initializeTexturePaintCanvas } from './texture-editor-paint-init-flow.js';
import {
  createTexturePaintFlowState,
  endTexturePaintFlow,
  moveTexturePaintFlow,
  resetTexturePaintFlowState,
  startTexturePaintFlow,
} from './texture-editor-paint-flow.js';
import { createPaintUndoHistory } from './texture-editor-paint-history.js';
import { downloadPaintCanvas } from './texture-editor-paint-file-flow.js';

const CANVAS_SIZE = TEXTURE_CANVAS_SIZE;
export const BRUSH_SIZES = TEXTURE_BRUSH_SIZES;

let paintCanvas = null;
let paintCtx = null;
const paintToolState = createTexturePaintToolState();
const paintFlowState = createTexturePaintFlowState();
const undoHistory = createPaintUndoHistory({ canvasSize: CANVAS_SIZE });
let paintHooks = {};
let cleanupPaintCanvasListeners = null;

const noop = () => {};

function getHooks() {
  return {
    isAlternateMode: paintHooks.isAlternateMode || (() => false),
    onAlternateStart: paintHooks.onAlternateStart || noop,
    onAlternateMove: paintHooks.onAlternateMove || noop,
    onAlternateEnd: paintHooks.onAlternateEnd || noop,
    onPreviewChange: paintHooks.onPreviewChange || noop,
    onCommitChange: paintHooks.onCommitChange || noop,
    onAfterCommit: paintHooks.onAfterCommit || noop,
    onToolStateChange: paintHooks.onToolStateChange || noop,
  };
}

export function getPaintCanvas() {
  return paintCanvas;
}

export function getBrushSize() {
  return paintToolState.brushSize;
}

export function getBrushColor() {
  return paintToolState.brushColor;
}

export function isEraserMode() {
  return paintToolState.eraserMode;
}

export function setPaintCanvasCursor(cursor) {
  if (paintCanvas) paintCanvas.style.cursor = cursor;
}

export function initPaintCanvas(mesh, hooks = {}) {
  paintHooks = hooks;
  paintCanvas = getTexturePaintCanvas();
  const initResult = initializeTexturePaintCanvas(mesh, {
    paintCanvas,
    canvasSize: CANVAS_SIZE,
    resetPaintFlowState: () => resetTexturePaintFlowState(paintFlowState),
    undoHistory,
    saveUndoSnapshot,
    cleanupPaintCanvasListeners,
    createCanvas: createTextureCanvas,
    isCanvas: isTextureCanvas,
    eventHandlers: {
      onStart: startPaint,
      onMove: doPaint,
      onEnd: endPaint,
    },
  });
  paintCtx = initResult.paintCtx;
  cleanupPaintCanvasListeners = initResult.cleanupPaintCanvasListeners;
}

export function setBrushSize(idx) {
  setTexturePaintBrushSize(paintToolState, idx);
  getHooks().onToolStateChange();
}

export function setBrushColor(hex) {
  setTexturePaintBrushColor(paintToolState, hex);
  getHooks().onToolStateChange();
}

export function setEraserMode(value) {
  setTexturePaintEraserMode(paintToolState, value);
  getHooks().onToolStateChange();
}

export function paintUndo() {
  undoTexturePaintSurface({
    paintCtx,
    undoHistory,
    hooks: getHooks(),
  });
}

export function texLoadImage() {
  return loadTexturePaintImage({
    paintCtx,
    canvasSize: CANVAS_SIZE,
    createFileInput: createTextureImageFileInput,
    loadImageFile,
    hooks: getHooks(),
    saveUndoSnapshot,
    onError: console.error,
  });
}

export function texDownload() {
  return downloadPaintCanvas(paintCanvas, {
    downloadDataURL,
  });
}

export function texNewCanvas() {
  clearTexturePaintSurface({
    paintCtx,
    canvasSize: CANVAS_SIZE,
    hooks: getHooks(),
    saveUndoSnapshot,
  });
}

export function buildPaletteUI() {
  renderTexturePaintPalette({
    container: getTexturePaletteContainer(),
    createSwatch: createTexturePaletteSwatch,
    onColorSelect: setBrushColor,
  });
}

function startPaint(event) {
  startTexturePaintFlow(paintFlowState, event, {
    hooks: getHooks(),
    paintCanvas,
    canvasSize: CANVAS_SIZE,
    drawDot,
  });
}

function doPaint(event) {
  moveTexturePaintFlow(paintFlowState, event, {
    hooks: getHooks(),
    paintCanvas,
    canvasSize: CANVAS_SIZE,
    drawLine,
  });
}

function endPaint() {
  endTexturePaintFlow(paintFlowState, {
    hooks: getHooks(),
    saveUndoSnapshot,
  });
}

function drawDot(x, y) {
  const radius = getBrushRadius(paintToolState.brushSize, BRUSH_SIZES);
  drawBrushDot(paintCtx, {
    x,
    y,
    radius,
    color: paintToolState.brushColor,
    eraserMode: paintToolState.eraserMode,
  });
}

function drawLine(x1, y1, x2, y2) {
  const radius = getBrushRadius(paintToolState.brushSize, BRUSH_SIZES);
  drawBrushStroke(paintCtx, {
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    radius,
    color: paintToolState.brushColor,
    eraserMode: paintToolState.eraserMode,
  });
}

function saveUndoSnapshot() {
  undoHistory.saveSnapshot(paintCtx);
}
