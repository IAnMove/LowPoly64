import {
  readTextureUvInputs,
  writeGlobalUvInputs,
} from './texture-editor-face-ui.js';
import {
  createTextureFaceEditingState,
  resetTextureFaceEditingState,
  setTextureFaceUvMapMode,
  toggleTextureFaceUvMapMode,
} from './texture-editor-face-state.js';
import { initializeTextureFaceEditing } from './texture-editor-face-init-flow.js';
import {
  deselectTextureFace,
  selectTextureFaceFromValue,
} from './texture-editor-face-selection-flow.js';
import {
  removeTextureFaceHighlight,
  removeTextureFacePreviewClickListener,
  replaceTextureFaceHighlight,
  selectTextureFaceFromPreviewClick,
} from './texture-editor-face-preview-flow.js';
import {
  applyTextureFaceUVs,
  updateTextureFaceUVField,
  updateTextureFaceUVFromInputs,
} from './texture-editor-face-update-flow.js';
import {
  getTextureFaceNames,
  renderAllTextureFaceOverlays,
  renderTextureFaceOverlay,
  renderTextureFaceUI,
} from './texture-editor-face-render-flow.js';
import {
  doTextureFaceUvMapDraw,
  endTextureFaceUvMapDraw,
  startTextureFaceUvMapDraw,
} from './texture-editor-face-uvmap-flow.js';
import {
  applyTextureTransformToPreview,
  getPreviewCamera,
  getPreviewMesh,
  getPreviewRenderer,
  setPreviewAutoRotate,
} from './texture-editor-preview.js';
import { getPaintCanvas } from './texture-editor-paint.js';
import {
  getTextureFaceSection,
  getTextureUVMapCanvas,
  getTextureUVOverlay,
} from './texture-editor-dom.js';

const faceState = createTextureFaceEditingState();
const defaultTextureFaceServices = {
  showToast: () => {},
  translate: (key) => key,
};
const textureFaceServices = { ...defaultTextureFaceServices };

export function configureTextureFaceEditingServices({
  showToast,
  translate,
} = {}) {
  textureFaceServices.showToast = showToast || defaultTextureFaceServices.showToast;
  textureFaceServices.translate = translate || defaultTextureFaceServices.translate;
}

export function resetTextureFaceEditingServices() {
  configureTextureFaceEditingServices();
}

function getFaceNames() {
  return getTextureFaceNames(textureFaceServices.translate);
}

function removePreviewClickListener() {
  removeTextureFacePreviewClickListener(faceState, { onPreviewClick });
}

export function getEditedMesh() {
  return faceState.targetMesh;
}

export function hasSelectedFace() {
  return faceState.selectedFace >= 0;
}

export function isUVMapMode() {
  return faceState.uvMapMode;
}

export function setUVMapMode(value) {
  setTextureFaceUvMapMode(faceState, value);
}

export function toggleUVMapMode() {
  return toggleTextureFaceUvMapMode(faceState);
}

export function initFaceEditing(mesh) {
  removePreviewClickListener();
  initializeTextureFaceEditing(faceState, mesh, {
    getFaceSection: getTextureFaceSection,
    getPreviewRenderer,
    getPreviewMesh,
    onPreviewClick,
    writeGlobalUvInputs,
  });
  updateFaceUI();
  updateOverlay();
}

export function cleanupFaceEditing() {
  removePreviewClickListener();
  removeFaceHighlight();
  resetTextureFaceEditingState(faceState);
  const uvmapCanvas = getTextureUVMapCanvas();
  if (uvmapCanvas) uvmapCanvas.classList.add('hidden');
}

function onPreviewClick(event) {
  selectTextureFaceFromPreviewClick(faceState, event, {
    previewMesh: getPreviewMesh(),
    previewRenderer: getPreviewRenderer(),
    previewCamera: getPreviewCamera(),
    handlers: getFaceSelectionHandlers(),
  });
}

export function selectFace(value) {
  selectTextureFaceFromValue(faceState, value, getFaceSelectionHandlers());
}

export function deselectFace() {
  deselectTextureFace(faceState, getFaceSelectionHandlers());
}

export function setFaceUV(field, value) {
  updateTextureFaceUVField(faceState, field, value, {
    previewMesh: getPreviewMesh(),
    updateOverlay,
    drawAllFaceOverlays,
  });
}

function applyFaceUVs(face) {
  applyTextureFaceUVs(faceState, face, {
    previewMesh: getPreviewMesh(),
  });
}

function highlightFace(faceIdx) {
  replaceTextureFaceHighlight(faceState, faceIdx, {
    previewMesh: getPreviewMesh(),
  });
}

function removeFaceHighlight() {
  removeTextureFaceHighlight(faceState);
}

function getFaceSelectionHandlers() {
  return {
    setPreviewAutoRotate,
    highlightFace,
    removeFaceHighlight,
    updateFaceUI,
    updateOverlay,
    drawAllFaceOverlays,
  };
}

function updateFaceUI() {
  renderTextureFaceUI(faceState);
}

export function updateOverlay() {
  renderTextureFaceOverlay(faceState, {
    overlay: getTextureUVOverlay(),
    paintCanvas: getPaintCanvas(),
  });
}

export function startUVMapDraw(event) {
  startTextureFaceUvMapDraw(faceState, event, {
    paintCanvas: getPaintCanvas(),
    showSelectFaceFirst: () => textureFaceServices.showToast(textureFaceServices.translate('selectFaceFirst')),
  });
}

export function doUVMapDraw(event) {
  doTextureFaceUvMapDraw(faceState, event, {
    paintCanvas: getPaintCanvas(),
    applyFaceUVs,
    updateFaceUI,
    drawAllFaceOverlays,
  });
}

export function endUVMapDraw() {
  endTextureFaceUvMapDraw(faceState);
}

export function drawAllFaceOverlays() {
  renderAllTextureFaceOverlays(faceState, {
    canvas: getTextureUVMapCanvas(),
    paintCanvas: getPaintCanvas(),
    faceNames: getFaceNames(),
  });
}

export function texUpdateUV() {
  updateTextureFaceUVFromInputs(faceState, {
    readTextureUvInputs,
    previewMesh: getPreviewMesh(),
    applyPreviewTransform: applyTextureTransformToPreview,
    updateFaceUI,
    updateOverlay,
  });
}
