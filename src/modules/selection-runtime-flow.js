import {
  executeDoubleClickSelectionEvent,
  executeMouseSelectionEvent,
} from './selection-pointer-flow.js';
import {
  addMeshToMultiSelection,
  clearMultiSelection,
  clearSingleSelection,
  removeMeshFromMultiSelection,
  setSingleSelection,
} from './selection-state.js';
import {
  clearAllSelectionFeedback,
  clearSelectionFeedback,
  showSingleSelectionFeedback,
  syncMultiRemovalFeedback,
  syncMultiSelectionFeedback,
} from './selection-ui-flow.js';

export function createSelectionRuntimeController({
  selectionState,
  raycaster,
  raycastBones,
  attachTransformControls,
  detachTransformControls,
  highlightSelection,
  unhighlightSelection,
  translate,
  hideAnimationTimeline,
  showMultiSelectionHeader,
  showSingleSelectionHeader,
  updatePropertiesPanel,
  clearPropertiesPanel,
  showMultiSelectionPanel,
  updateExportButtonText,
  getHooks = () => ({}),
  executeMouseSelection = executeMouseSelectionEvent,
  executeDoubleClickSelection = executeDoubleClickSelectionEvent,
  addMeshToMultiSelectionCommand = addMeshToMultiSelection,
  removeMeshFromMultiSelectionCommand = removeMeshFromMultiSelection,
  clearMultiSelectionCommand = clearMultiSelection,
  clearSingleSelectionCommand = clearSingleSelection,
  setSingleSelectionCommand = setSingleSelection,
  clearAllSelectionFeedbackCommand = clearAllSelectionFeedback,
  clearSelectionFeedbackCommand = clearSelectionFeedback,
  showSingleSelectionFeedbackCommand = showSingleSelectionFeedback,
  syncMultiRemovalFeedbackCommand = syncMultiRemovalFeedback,
  syncMultiSelectionFeedbackCommand = syncMultiSelectionFeedback,
}) {
  const stateAdapters = {
    attachTransformControls,
    detachTransformControls,
    highlightSelection,
    unhighlightSelection,
  };

  function selectMesh(mesh) {
    if (selectionState.selectedMeshes.size > 0) {
      deselectAll();
    }
    deselect();

    setSingleSelectionCommand(selectionState, mesh, stateAdapters);

    showSingleSelectionFeedbackCommand(mesh, {
      showSingleSelectionHeader,
      updatePropertiesPanel,
      updateExportButtonText,
      showTimelineForGroup: getHooks().showTimelineForGroup,
    });
  }

  function deselect() {
    clearSingleSelectionCommand(selectionState, stateAdapters);
    clearSelectionFeedbackCommand({ clearPropertiesPanel });
  }

  function addToMultiSelection(mesh) {
    addMeshToMultiSelectionCommand(selectionState, mesh, stateAdapters);
  }

  function removeFromMultiSelection(mesh) {
    const result = removeMeshFromMultiSelectionCommand(selectionState, mesh, stateAdapters);

    syncMultiRemovalFeedbackCommand(result, selectionState, {
      selectMesh,
      clearPropertiesPanel,
    });
  }

  function updateSelectionUI() {
    syncMultiSelectionFeedbackCommand(selectionState, {
      translate,
      showMultiSelectionHeader,
      showMultiSelectionPanel,
      selectMesh,
    });
  }

  function deselectAll() {
    clearMultiSelectionCommand(selectionState, stateAdapters);
    clearSingleSelectionCommand(selectionState, stateAdapters);
    clearAllSelectionFeedbackCommand({
      animationMode: selectionState.animationMode,
      clearPropertiesPanel,
      updateExportButtonText,
      hideAnimationTimeline,
    });
  }

  function createDecisionHandlers() {
    return {
      addToMultiSelection,
      removeFromMultiSelection,
      updateSelectionUI,
      attachBone: (pivot) => getHooks().attachBone?.(pivot),
      deselectAll,
      selectMesh,
    };
  }

  function onMouseDown(event) {
    return executeMouseSelection(event, {
      selectionState,
      raycaster,
      raycastBones,
      handlers: createDecisionHandlers(),
    });
  }

  function onDoubleClick(event) {
    return executeDoubleClickSelection(event, {
      selectionState,
      raycaster,
      handlers: createDecisionHandlers(),
    });
  }

  return {
    onMouseDown,
    onDoubleClick,
    selectMesh,
    deselect,
    deselectAll,
  };
}
