export function createTextureFaceEditingState() {
  return {
    selectedFace: -1,
    faceUVData: [],
    targetMesh: null,
    faceHighlight: null,
    uvMapMode: false,
    uvMapDragging: false,
    uvMapStartPos: null,
    previewClickElement: null,
  };
}

export function resetTextureFaceEditingState(state) {
  state.selectedFace = -1;
  state.faceUVData = [];
  state.targetMesh = null;
  state.faceHighlight = null;
  state.previewClickElement = null;
  setTextureFaceUvMapMode(state, false);
}

export function setTextureFaceUvMapMode(state, value) {
  state.uvMapMode = Boolean(value);
  if (!state.uvMapMode) {
    resetTextureFaceUvMapDrag(state);
  }
}

export function toggleTextureFaceUvMapMode(state) {
  setTextureFaceUvMapMode(state, !state.uvMapMode);
  return state.uvMapMode;
}

export function resetTextureFaceUvMapDrag(state) {
  state.uvMapDragging = false;
  state.uvMapStartPos = null;
}
