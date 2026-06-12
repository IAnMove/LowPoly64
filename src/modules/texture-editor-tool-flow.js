export function setTextureEditorTool(tool, {
  toggleUVMapMode,
  setUVMapMode,
  setEraserMode,
  setPaintCanvasCursor,
  updateToolUI,
  drawAllFaceOverlays,
} = {}) {
  if (tool === 'uvmap') {
    const enabled = toggleUVMapMode();
    setEraserMode(false);
    setPaintCanvasCursor(enabled ? 'crosshair' : '');
    updateToolUI();
    drawAllFaceOverlays();
    return {
      tool,
      uvMapMode: enabled,
      eraserMode: false,
    };
  }

  const eraserMode = tool === 'eraser';
  setUVMapMode(false);
  setEraserMode(eraserMode);
  setPaintCanvasCursor('');
  updateToolUI();
  drawAllFaceOverlays();
  return {
    tool,
    uvMapMode: false,
    eraserMode,
  };
}
