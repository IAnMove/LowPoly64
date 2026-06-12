function callTextureEditor(loadTextureEditorModule, methodName, getArgs = () => []) {
  return async (element, event) => {
    const textureEditor = await loadTextureEditorModule();
    return textureEditor[methodName](...getArgs(element, event));
  };
}

export function createAppActionMaps({
  getAppActionState,
  loadTextureEditorModule,
  loadExportModule,
  toggleWireframe,
  toggleFlatShading,
  toggleBones,
  resetSceneAndRefresh,
  saveToLocalStorage,
  loadSceneAndRefresh,
  toggleLang,
  toggleLeftPanel,
  toggleRightPanel,
  addPrimitiveAndRefresh,
  openImportModal,
  exportObjectJSON,
  copyExportJSON,
  toggleSnap,
  toggleObjectList,
  quickColor,
  playAnim,
  stopAnim,
  exportSceneJSON,
  copySceneJSON,
  getSelectedMesh = () => null,
  setColor,
  getRandomRetroColor,
  toggleTexture,
  togglePixelated,
  duplicateSelectedAndRefresh,
  deleteSelectedAndRefresh,
  centerCameraOnSelected,
  ungroupSelectedAndRefresh,
  detachBone,
  enterAnimationMode,
  copyObjectJSON,
  downloadObjectJSON,
  groupSelectedAndRefresh,
  getMultiColorValue,
  applyColorToAll,
  exitAnimationMode,
  animModeImportAnim,
  handleImportSubmitAndRefresh,
  closeImportModal,
  handleAnimImportSubmit,
  onAnimSelectChange,
  importSceneJSON,
  updateColorFromPanel,
  updateMaterialFromPanel,
  handleTextureUpload,
  handleImportFileAndRefresh,
  updateNameAndRefresh,
  updatePosition,
  updateRotation,
  updateScale,
  updateUVOffset,
  updateUVRepeat,
  updateUVRotation,
} = {}) {
  const getRuntimeState = createAppActionRuntimeStateGetter({
    getAppActionState,
    getSelectedMesh,
  });
  const openTextureEditor = async () => {
    const textureEditor = await loadTextureEditorModule();
    textureEditor.buildPaletteUI();
    textureEditor.openTextureEditor();
  };

  const exportGLB = async () => {
    const exportModule = await loadExportModule();
    await exportModule.exportGLB();
  };

  const randomRetroColor = () => {
    const selectedMesh = getRuntimeState().selectedMesh;
    if (selectedMesh) {
      setColor(selectedMesh, getRandomRetroColor());
    }
  };

  const applyMultiSelectionColor = () => {
    applyColorToAll(getMultiColorValue());
  };

  return {
    clickActions: {
      toggleWireframe,
      toggleFlatShading,
      toggleBones,
      resetScene: resetSceneAndRefresh,
      exportGLB,
      saveScene: saveToLocalStorage,
      loadScene: loadSceneAndRefresh,
      toggleLang,
      toggleLeftPanel,
      toggleRightPanel,
      addPrimitive: (element) => addPrimitiveAndRefresh(element.dataset.primitive),
      openImportModal,
      exportObjectJSON,
      copyExportJSON,
      toggleSnap,
      toggleObjectList,
      openTextureEditor,
      quickColor: (element) => quickColor(element.dataset.color),
      playAnim,
      stopAnim,
      exportSceneJSON,
      copySceneJSON,
      randomRetroColor,
      toggleTexture,
      togglePixelated,
      duplicateSelected: duplicateSelectedAndRefresh,
      deleteSelected: deleteSelectedAndRefresh,
      centerCameraOnSelected,
      ungroupSelected: ungroupSelectedAndRefresh,
      detachBone,
      enterAnimationMode,
      copyObjectJSON,
      downloadObjectJSON,
      groupSelected: groupSelectedAndRefresh,
      applyColorToAll: applyMultiSelectionColor,
      exitAnimationMode,
      animModeImportAnim,
      handleImportSubmit: handleImportSubmitAndRefresh,
      closeImportModal,
      handleAnimImportSubmit,
      closeTextureEditor: callTextureEditor(loadTextureEditorModule, 'closeTextureEditor'),
      texSetTool: callTextureEditor(loadTextureEditorModule, 'setTool', (element) => [element.dataset.tool]),
      texSetSize: callTextureEditor(loadTextureEditorModule, 'setBrushSize', (element) => [
        Number.parseInt(element.dataset.size, 10),
      ]),
      texPaintUndo: callTextureEditor(loadTextureEditorModule, 'paintUndo'),
      texLoadImage: callTextureEditor(loadTextureEditorModule, 'texLoadImage'),
      texDownload: callTextureEditor(loadTextureEditorModule, 'texDownload'),
      texNewCanvas: callTextureEditor(loadTextureEditorModule, 'texNewCanvas'),
    },
    changeActions: {
      onAnimSelectChange,
      importSceneJSON: (_element, event) => importSceneJSON(event),
      updateColor: (element) => updateColorFromPanel(element.value),
      updateMaterial: updateMaterialFromPanel,
      handleTextureUpload: (_element, event) => handleTextureUpload(event),
      handleImportFile: (_element, event) => handleImportFileAndRefresh(event),
      texSetColor: callTextureEditor(loadTextureEditorModule, 'setBrushColor', (element) => [element.value]),
      texSelectFace: callTextureEditor(loadTextureEditorModule, 'selectFace', (element) => [element.value]),
    },
    inputActions: {
      updateName: (element) => updateNameAndRefresh(element.value),
      updatePosition,
      updateRotation,
      updateScale,
      updateUVOffset,
      updateUVRepeat,
      updateUVRotation,
      texSetFaceUV: callTextureEditor(loadTextureEditorModule, 'setFaceUV', (element) => [
        element.dataset.field,
        element.value,
      ]),
      texUpdateUV: callTextureEditor(loadTextureEditorModule, 'texUpdateUV'),
    },
  };
}

function readStateValue(source, keys, fallback) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }
  return fallback();
}

export function createAppActionRuntimeStateGetter({
  getAppActionState,
  getSelectedMesh = () => null,
} = {}) {
  return () => {
    const appActionState = getAppActionState?.() || {};
    return {
      appActionState,
      selectedMesh: readStateValue(appActionState, ['selectedMesh'], getSelectedMesh),
    };
  };
}
