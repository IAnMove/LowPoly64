import {
  drawFaceUvMapCanvas,
  renderSelectedFaceOverlay,
} from './texture-editor-face-overlay.js';
import { renderFaceControls } from './texture-editor-face-ui.js';

const FACE_NAME_KEYS = [
  'faceRight',
  'faceLeft',
  'faceTop',
  'faceBottom',
  'faceFront',
  'faceBack',
];

export function getTextureFaceNames(translate = (key) => key) {
  return FACE_NAME_KEYS.map(translate);
}

export function renderTextureFaceUI(state, {
  renderFaceControlsCommand = renderFaceControls,
} = {}) {
  return renderFaceControlsCommand({
    selectedFace: state.selectedFace,
    faceUVData: state.faceUVData,
  });
}

export function renderTextureFaceOverlay(state, {
  overlay,
  paintCanvas,
  renderSelectedFaceOverlayCommand = renderSelectedFaceOverlay,
} = {}) {
  return renderSelectedFaceOverlayCommand({
    overlay,
    paintCanvas,
    selectedFace: state.selectedFace,
    faceUVData: state.faceUVData,
    uvMapMode: state.uvMapMode,
  });
}

export function renderAllTextureFaceOverlays(state, {
  canvas,
  paintCanvas,
  faceNames,
  drawFaceUvMapCanvasCommand = drawFaceUvMapCanvas,
} = {}) {
  return drawFaceUvMapCanvasCommand({
    canvas,
    paintCanvas,
    faceUVData: state.faceUVData,
    selectedFace: state.selectedFace,
    uvMapMode: state.uvMapMode,
    faceNames,
  });
}
