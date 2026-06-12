export function selectTextureFaceFromIndex(state, faceIndex, {
  setPreviewAutoRotate = () => {},
  highlightFace = () => {},
  updateFaceUI = () => {},
  updateOverlay = () => {},
  drawAllFaceOverlays = () => {},
  redrawAllFaces = false,
} = {}) {
  if (faceIndex < 0 || faceIndex >= 6) return false;

  state.selectedFace = faceIndex;
  setPreviewAutoRotate(false);
  highlightFace(faceIndex);
  updateFaceUI();
  updateOverlay();
  if (redrawAllFaces) drawAllFaceOverlays();
  return true;
}

export function selectTextureFaceFromValue(state, value, handlers = {}) {
  const faceIndex = Number.parseInt(value, 10);
  if (faceIndex < 0 || Number.isNaN(faceIndex)) {
    deselectTextureFace(state, handlers);
    return false;
  }

  return selectTextureFaceFromIndex(state, faceIndex, {
    ...handlers,
    redrawAllFaces: true,
  });
}

export function deselectTextureFace(state, {
  setPreviewAutoRotate = () => {},
  removeFaceHighlight = () => {},
  updateFaceUI = () => {},
  updateOverlay = () => {},
  drawAllFaceOverlays = () => {},
} = {}) {
  state.selectedFace = -1;
  setPreviewAutoRotate(true);
  removeFaceHighlight();
  updateFaceUI();
  updateOverlay();
  drawAllFaceOverlays();
}
