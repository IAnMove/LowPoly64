export function configureAppCrossModuleHooks({
  root = globalThis.document,
  state,
  configureActionContext,
  configureSelectionHooks,
  configureShortcutHooks,
  configureImportHooks,
  configureUIHooks,
  selectMesh,
  deselect,
  deselectAll,
  pushAction,
  showToast,
  configureUndoFeedback,
  cloneTexture,
  t,
  attachBone,
  showTimelineForGroup,
  isImportModalOpen,
  undo,
  redo,
  duplicateSelected,
  deleteSelected,
  groupSelected,
  ungroupSelected,
  toggleAnimPlayPause,
  exitAnimationMode,
  closeImportModal,
  refreshSceneObjectList,
} = {}) {
  configureActionContext({
    state,
    getActionState: () => state,
    selectMesh,
    deselect,
    deselectAll,
    pushAction,
    showToast,
    cloneTexture,
    t,
  });

  configureUndoFeedback?.({
    showToast,
  });

  configureSelectionHooks({
    attachBone,
    showTimelineForGroup,
  });

  configureShortcutHooks({
    getActiveElement: () => root?.activeElement,
    isAnimationMode: () => state.animationMode,
    isImportModalOpen,
    setTransformMode: (mode) => state.transformControls?.setMode(mode),
    undo,
    redo,
    duplicateSelected,
    deleteSelected,
    groupSelected,
    ungroupSelected,
    toggleAnimPlayPause,
    exitAnimationMode,
    closeImportModal,
  });

  configureImportHooks({
    showTimelineForGroup,
  });

  configureUIHooks({
    refreshSceneObjectList,
  });
}
