import {
  calculateUvMapSelection,
  getCanvasUV,
} from './texture-editor-face-overlay.js';
import { resetTextureFaceUvMapDrag } from './texture-editor-face-state.js';

export function startTextureFaceUvMapDraw(state, event, {
  paintCanvas,
  getCanvasUv = getCanvasUV,
  showSelectFaceFirst = () => {},
} = {}) {
  if (state.selectedFace < 0) {
    showSelectFaceFirst();
    return false;
  }

  const startPos = getCanvasUv(event, paintCanvas);
  if (!startPos) return false;

  state.uvMapStartPos = startPos;
  state.uvMapDragging = true;
  return true;
}

export function doTextureFaceUvMapDraw(state, event, {
  paintCanvas,
  getCanvasUv = getCanvasUV,
  calculateSelection = calculateUvMapSelection,
  applyFaceUVs = () => {},
  updateFaceUI = () => {},
  drawAllFaceOverlays = () => {},
} = {}) {
  if (!state.uvMapDragging || !state.uvMapStartPos || state.selectedFace < 0) return false;

  const current = getCanvasUv(event, paintCanvas);
  if (!current) return false;

  Object.assign(
    state.faceUVData[state.selectedFace],
    calculateSelection(state.uvMapStartPos, current),
  );
  applyFaceUVs(state.selectedFace);
  updateFaceUI();
  drawAllFaceOverlays();
  return true;
}

export function endTextureFaceUvMapDraw(state, {
  resetDrag = resetTextureFaceUvMapDrag,
} = {}) {
  resetDrag(state);
}
