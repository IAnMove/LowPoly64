import {
  disposeTexturePreview,
  initTexturePreview,
} from './texture-editor-preview.js';
import { t } from './i18n.js';
import { showToast } from './ui.js';
import {
  BRUSH_SIZES,
  buildPaletteUI as buildPaintPaletteUI,
  getBrushColor,
  getBrushSize,
  getPaintCanvas,
  initPaintCanvas as initPaintCanvasSurface,
  isEraserMode,
  paintUndo as paintCanvasUndo,
  setBrushColor as setPaintBrushColor,
  setBrushSize as setPaintBrushSize,
  setEraserMode,
  setPaintCanvasCursor,
  texDownload as downloadPaintCanvas,
  texLoadImage as loadPaintCanvasImage,
  texNewCanvas as clearPaintCanvas,
} from './texture-editor-paint.js';
import {
  cleanupFaceEditing,
  configureTextureFaceEditingServices,
  doUVMapDraw,
  drawAllFaceOverlays,
  endUVMapDraw,
  getEditedMesh,
  hasSelectedFace,
  initFaceEditing,
  isUVMapMode,
  setUVMapMode,
  startUVMapDraw,
  texUpdateUV as updateTextureUV,
  toggleUVMapMode,
  updateOverlay,
} from './texture-editor-face.js';
import { createTextureToolUiAdapter } from './texture-editor-tool-ui.js';
import {
  getSelectedEditableMesh,
  hideTextureEditorModal,
  resolveTextureEditorMesh,
  showTextureEditorModal,
} from './texture-editor-session.js';
import { setTextureEditorTool } from './texture-editor-tool-flow.js';
import {
  commitTextureEditorCanvas,
  previewTextureEditorCanvas,
} from './texture-editor-canvas-flow.js';
import {
  closeTextureEditorLifecycle,
  openTextureEditorLifecycle,
} from './texture-editor-lifecycle-flow.js';
import { createTextureEditorDomAdapter } from './texture-editor-dom.js';

export { deselectFace, selectFace, setFaceUV } from './texture-editor-face.js';

configureTextureFaceEditingServices({
  showToast,
  translate: t,
});

const textureEditorDom = createTextureEditorDomAdapter();
const textureToolUi = createTextureToolUiAdapter({ textureEditorDom });

export function openTextureEditor() {
  openTextureEditorLifecycle({
    resolveTextureEditorMesh,
    showTextureEditorModal,
    initPaintCanvas,
    initPreview,
    initFaceEditing,
    updateToolUI,
  });
}

export function closeTextureEditor() {
  closeTextureEditorLifecycle({
    hideTextureEditorModal,
    cleanupFaceEditing,
    disposeTexturePreview,
  });
}

function initPaintCanvas(mesh) {
  initPaintCanvasSurface(mesh, {
    isAlternateMode: isUVMapMode,
    onAlternateStart: startUVMapDraw,
    onAlternateMove: doUVMapDraw,
    onAlternateEnd: endUVMapDraw,
    onPreviewChange: applyCanvasToPreview,
    onCommitChange: applyCanvasToMesh,
    onAfterCommit: updateOverlay,
    onToolStateChange: updateToolUI,
  });
}

function initPreview(mesh) {
  initTexturePreview(mesh, {
    getTexturePreviewContainer: textureEditorDom.getTexturePreviewContainer,
    shouldResumeAutoRotate: () => !hasSelectedFace(),
  });
}

function applyCanvasToMesh() {
  commitTextureEditorCanvas({
    getEditedMesh,
    getSelectedEditableMesh,
    getPaintCanvas,
  });
}

function applyCanvasToPreview() {
  previewTextureEditorCanvas({
    getEditedMesh,
    getPaintCanvas,
  });
}

export function paintUndo() {
  paintCanvasUndo();
}

export function setTool(tool) {
  setTextureEditorTool(tool, {
    toggleUVMapMode,
    setUVMapMode,
    setEraserMode,
    setPaintCanvasCursor,
    updateToolUI,
    drawAllFaceOverlays,
  });
}

export function setBrushSize(idx) {
  setPaintBrushSize(idx);
}

export function setBrushColor(hex) {
  setPaintBrushColor(hex);
}

function updateToolUI() {
  textureToolUi.updateTextureToolUI({
    brushColor: getBrushColor(),
    brushSize: getBrushSize(),
    brushSizes: BRUSH_SIZES,
    eraserMode: isEraserMode(),
    uvMapMode: isUVMapMode(),
  });
}

export function texLoadImage() {
  loadPaintCanvasImage();
}

export function texDownload() {
  downloadPaintCanvas();
}

export function texNewCanvas() {
  clearPaintCanvas();
}

export function texUpdateUV() {
  updateTextureUV();
}

export function buildPaletteUI() {
  buildPaintPaletteUI();
}
