export function openTextureEditorLifecycle({
  resolveTextureEditorMesh = () => null,
  showTextureEditorModal = () => {},
  initPaintCanvas = () => {},
  initPreview = () => {},
  initFaceEditing = () => {},
  updateToolUI = () => {},
} = {}) {
  const mesh = resolveTextureEditorMesh();
  if (!mesh) return false;

  showTextureEditorModal();
  initPaintCanvas(mesh);
  initPreview(mesh);
  initFaceEditing(mesh);
  updateToolUI();
  return true;
}

export function closeTextureEditorLifecycle({
  hideTextureEditorModal = () => {},
  cleanupFaceEditing = () => {},
  disposeTexturePreview = () => {},
} = {}) {
  hideTextureEditorModal();
  cleanupFaceEditing();
  disposeTexturePreview();
  return true;
}
