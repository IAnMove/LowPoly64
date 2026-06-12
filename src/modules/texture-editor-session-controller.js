export function createTextureEditorSessionController({
  getTextureEditorState = () => ({}),
  getChildMesh = () => null,
  showToast = () => {},
  translate = (key) => key,
  showTextureEditorModalCommand = () => {},
  hideTextureEditorModalCommand = () => {},
} = {}) {
  function getSelectedEditableMesh() {
    const selectedMesh = getTextureEditorState().selectedMesh;
    if (!selectedMesh) return null;

    const mesh = getChildMesh(selectedMesh) || selectedMesh;
    return mesh?.isMesh ? mesh : null;
  }

  function resolveTextureEditorMesh() {
    if (!getTextureEditorState().selectedMesh) {
      showToast(translate('selectObjectFirst'));
      return null;
    }

    const mesh = getSelectedEditableMesh();
    if (!mesh) {
      showToast(translate('selectPieceNotGroup'));
      return null;
    }

    return mesh;
  }

  function showTextureEditorModal() {
    showTextureEditorModalCommand();
  }

  function hideTextureEditorModal() {
    hideTextureEditorModalCommand();
  }

  return {
    getSelectedEditableMesh,
    hideTextureEditorModal,
    resolveTextureEditorMesh,
    showTextureEditorModal,
  };
}
