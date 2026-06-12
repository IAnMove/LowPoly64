export function createAppChromeActions({
  defer = (callback, delay = 0) => setTimeout(callback, delay),
  refreshObjectList,
  refreshSceneObjectList,
  updateExportButtonText,
  updateSelectedOverlay,
  addPrimitive,
  addTemplate,
  loadFromLocalStorage,
  importSceneJSONFile,
  handleImportSubmit,
  handleImportFile,
  updateName,
  duplicateSelected,
  deleteSelected,
  resetScene,
  groupSelected,
  ungroupSelected,
} = {}) {
  const refreshSceneChrome = () => {
    refreshObjectList();
    refreshSceneObjectList();
  };

  const refreshSelectionChrome = () => {
    updateExportButtonText();
    updateSelectedOverlay();
    refreshObjectList();
  };

  const refreshAfterSelectionEvent = () => {
    defer(refreshSelectionChrome, 0);
  };

  const addPrimitiveAndRefresh = (...args) => {
    addPrimitive(...args);
    refreshSceneChrome();
  };

  const addTemplateAndRefresh = (...args) => {
    addTemplate(...args);
    refreshSceneChrome();
  };

  const loadSceneAndRefresh = () => {
    loadFromLocalStorage();
    defer(refreshSceneChrome, 0);
  };

  const importSceneJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    importSceneJSONFile(file);
    defer(refreshSceneChrome, 100);
  };

  const handleImportSubmitAndRefresh = () => {
    handleImportSubmit();
    refreshSceneChrome();
  };

  const handleImportFileAndRefresh = async (event) => {
    await handleImportFile(event);
    refreshSceneChrome();
  };

  const updateNameAndRefresh = (value) => {
    updateName(value);
    updateSelectedOverlay();
    refreshObjectList();
    refreshSceneObjectList();
  };

  const duplicateSelectedAndRefresh = () => {
    duplicateSelected();
    refreshSceneChrome();
  };

  const deleteSelectedAndRefresh = () => {
    deleteSelected();
    refreshObjectList();
    updateSelectedOverlay();
    refreshSceneObjectList();
  };

  const resetSceneAndRefresh = () => {
    resetScene();
    refreshObjectList();
    updateSelectedOverlay();
    refreshSceneObjectList();
  };

  const groupSelectedAndRefresh = () => {
    groupSelected();
    refreshSceneChrome();
  };

  const ungroupSelectedAndRefresh = () => {
    ungroupSelected();
    refreshSceneChrome();
  };

  return {
    refreshSceneChrome,
    refreshSelectionChrome,
    refreshAfterSelectionEvent,
    addPrimitiveAndRefresh,
    addTemplateAndRefresh,
    loadSceneAndRefresh,
    importSceneJSON,
    handleImportSubmitAndRefresh,
    handleImportFileAndRefresh,
    updateNameAndRefresh,
    duplicateSelectedAndRefresh,
    deleteSelectedAndRefresh,
    resetSceneAndRefresh,
    groupSelectedAndRefresh,
    ungroupSelectedAndRefresh,
  };
}
