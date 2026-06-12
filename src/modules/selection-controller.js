import { createSelectionRaycaster } from './selection-raycast.js';
import { createSelectionRuntimeController } from './selection-runtime-flow.js';

export function createSelectionController({
  getSelectionState = () => ({}),
  getTransformControls = () => null,
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
  createRaycaster = createSelectionRaycaster,
  createSelectionRuntime = createSelectionRuntimeController,
} = {}) {
  const selectionHooks = {
    attachBone: null,
    showTimelineForGroup: null,
  };
  const getRuntimeState = createSelectionRuntimeStateGetter({
    getSelectionState,
    getTransformControls,
  });
  const attachTransformControlsAdapter = attachTransformControls ?? ((mesh) => {
    getRuntimeState().transformControls?.attach(mesh);
  });
  const detachTransformControlsAdapter = detachTransformControls ?? (() => {
    getRuntimeState().transformControls?.detach();
  });
  const raycaster = createRaycaster();
  const runtimeState = getRuntimeState();
  const selectionRuntime = createSelectionRuntime({
    selectionState: runtimeState.selectionState,
    raycaster,
    raycastBones,
    attachTransformControls: attachTransformControlsAdapter,
    detachTransformControls: detachTransformControlsAdapter,
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
    getHooks: () => selectionHooks,
  });

  function configureSelectionHooks(hooks = {}) {
    Object.assign(selectionHooks, hooks);
  }

  function onMouseDown(event) {
    return selectionRuntime.onMouseDown(event);
  }

  function onDoubleClick(event) {
    return selectionRuntime.onDoubleClick(event);
  }

  function selectMesh(mesh) {
    return selectionRuntime.selectMesh(mesh);
  }

  function deselect() {
    return selectionRuntime.deselect();
  }

  function deselectAll() {
    return selectionRuntime.deselectAll();
  }

  return {
    configureSelectionHooks,
    deselect,
    deselectAll,
    onDoubleClick,
    onMouseDown,
    selectMesh,
  };
}

export function createSelectionRuntimeStateGetter({
  getSelectionState = () => ({}),
  getTransformControls = () => null,
} = {}) {
  return () => {
    const selectionState = getSelectionState() || {};
    const transformControls = Object.prototype.hasOwnProperty.call(selectionState, 'transformControls')
      ? selectionState.transformControls
      : getTransformControls();

    return {
      selectionState,
      transformControls,
    };
  };
}
