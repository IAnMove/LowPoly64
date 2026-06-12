export function createTexturePaintToolState({
  brushColor = '#ff0000',
  brushSize = 2,
  eraserMode = false,
} = {}) {
  return {
    brushColor,
    brushSize,
    eraserMode,
  };
}

export function setTexturePaintBrushSize(state, brushSize) {
  state.brushSize = brushSize;
  return state.brushSize;
}

export function setTexturePaintBrushColor(state, brushColor) {
  state.brushColor = brushColor;
  state.eraserMode = false;
  return state.brushColor;
}

export function setTexturePaintEraserMode(state, eraserMode) {
  state.eraserMode = eraserMode;
  return state.eraserMode;
}
