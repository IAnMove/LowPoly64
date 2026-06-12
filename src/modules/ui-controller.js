import { hasExportableSelection } from './export-button-state.js';
import { renderSelectedObjectProperties } from './properties-panel-presenter.js';
import {
  runSelectedColorUpdate,
  runSelectedMaterialUpdate,
  runSelectedNameUpdate,
  runSelectedPositionUpdate,
  runSelectedRotationUpdate,
  runSelectedScaleUpdate,
  runSelectedUvOffsetUpdate,
  runSelectedUvRepeatUpdate,
  runSelectedUvRotationUpdate,
} from './selected-property-flow.js';

export function createUIController({
  getUIState,
  getSelectedObject = () => null,
  getSelectedMeshes = () => [],
  getUserObjects = () => null,
  getBonesVisible = () => false,
  getHooks = () => ({}),
  translate = (key) => key,
  radToDeg,
  setColor,
  updateMaterialType,
  syncColorInputs,
  pushAction,
  rememberTextureTransform,
  renderSelectedObjectPropertiesCommand = renderSelectedObjectProperties,
  clearSelectionPanel,
  getMaterialInput,
  readPositionInputs,
  readRotationDegreeInputs,
  readScaleInputs,
  readUvInputs,
  setActionButtonVisibility,
  setColorInput,
  setMaterialInput,
  setSelectedName,
  showMultiSelectionFields,
  showSingleSelectionFields,
  writeObjectProperties,
  writeUvControls,
  showToastMessage,
  updateExportButtonLabel,
  hasExportableSelectionCommand = hasExportableSelection,
  runSelectedPositionUpdateCommand = runSelectedPositionUpdate,
  runSelectedRotationUpdateCommand = runSelectedRotationUpdate,
  runSelectedScaleUpdateCommand = runSelectedScaleUpdate,
  runSelectedNameUpdateCommand = runSelectedNameUpdate,
  runSelectedColorUpdateCommand = runSelectedColorUpdate,
  runSelectedMaterialUpdateCommand = runSelectedMaterialUpdate,
  runSelectedUvOffsetUpdateCommand = runSelectedUvOffsetUpdate,
  runSelectedUvRepeatUpdateCommand = runSelectedUvRepeatUpdate,
  runSelectedUvRotationUpdateCommand = runSelectedUvRotationUpdate,
} = {}) {
  const getRuntimeState = createUIRuntimeStateGetter({
    getUIState,
    getSelectedObject,
    getSelectedMeshes,
    getUserObjects,
    getBonesVisible,
  });

  function updatePropertiesPanel() {
    const runtimeState = getRuntimeState();
    return renderSelectedObjectPropertiesCommand(runtimeState.selectedObject, {
      userObjects: runtimeState.userObjects,
      bonesVisible: runtimeState.bonesVisible,
      radToDeg,
      showSingleSelectionFields,
      writeObjectProperties,
      setColorInput,
      syncColorPickers,
      setMaterialInput,
      writeUvControls,
      setActionButtonVisibility,
    });
  }

  function showMultiSelectionPanel() {
    return showMultiSelectionFields();
  }

  function clearPropertiesPanel() {
    clearSelectionPanel(translate('noObject'));
    getHooks().refreshSceneObjectList?.();
    return true;
  }

  function updatePosition() {
    return runSelectedPositionUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readPositionInputs,
    });
  }

  function updateRotation() {
    return runSelectedRotationUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readRotationDegreeInputs,
    });
  }

  function updateScale() {
    return runSelectedScaleUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readScaleInputs,
    });
  }

  function updateName(value) {
    return runSelectedNameUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      value,
      setSelectedName,
    });
  }

  function updateColorFromPanel(hex) {
    const runtimeState = getRuntimeState();
    return runSelectedColorUpdateCommand({
      selectedObject: runtimeState.selectedObject,
      hex,
      actionType: translate('actionChangeColor'),
      setColor,
      syncColorPickers,
      pushAction,
      shouldRefresh: () => Boolean(getRuntimeState().selectedObject),
      updatePropertiesPanel,
    });
  }

  function updateMaterialFromPanel() {
    const runtimeState = getRuntimeState();
    return runSelectedMaterialUpdateCommand({
      selectedObject: runtimeState.selectedObject,
      actionType: translate('actionChangeMaterial'),
      getMaterialInput,
      updateMaterialType,
      pushAction,
      shouldRefresh: () => Boolean(getRuntimeState().selectedObject),
      updatePropertiesPanel,
    });
  }

  function updateUVOffset() {
    return runSelectedUvOffsetUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readUvInputs,
      rememberTextureTransform,
    });
  }

  function updateUVRepeat() {
    return runSelectedUvRepeatUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readUvInputs,
      rememberTextureTransform,
    });
  }

  function updateUVRotation() {
    return runSelectedUvRotationUpdateCommand({
      selectedObject: getRuntimeState().selectedObject,
      readUvInputs,
      rememberTextureTransform,
    });
  }

  function showToast(message, duration = 2000) {
    return showToastMessage(message, duration);
  }

  function applyColorToAll(hex) {
    getRuntimeState().selectedMeshes.forEach((mesh) => {
      if (mesh.isMesh && mesh.material) {
        setColor(mesh, hex);
      }
    });
  }

  function syncColorPickers(hex) {
    return syncColorInputs(hex);
  }

  function updateExportButtonText() {
    const runtimeState = getRuntimeState();
    return updateExportButtonLabel(
      hasExportableSelectionCommand(runtimeState.selectedObject, runtimeState.selectedMeshes),
      {
        selection: translate('exportSelection'),
        default: translate('exportGlb'),
      }
    );
  }

  return {
    applyColorToAll,
    clearPropertiesPanel,
    showMultiSelectionPanel,
    showToast,
    syncColorPickers,
    updateColorFromPanel,
    updateExportButtonText,
    updateMaterialFromPanel,
    updateName,
    updatePosition,
    updatePropertiesPanel,
    updateRotation,
    updateScale,
    updateUVOffset,
    updateUVRepeat,
    updateUVRotation,
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

export function createUIRuntimeStateGetter({
  getUIState,
  getSelectedObject = () => null,
  getSelectedMeshes = () => [],
  getUserObjects = () => null,
  getBonesVisible = () => false,
} = {}) {
  return () => {
    const uiState = getUIState?.() || {};
    return {
      selectedObject: readStateValue(uiState, ['selectedObject', 'selectedMesh'], getSelectedObject),
      selectedMeshes: readStateValue(uiState, ['selectedMeshes'], getSelectedMeshes),
      userObjects: readStateValue(uiState, ['userObjects'], getUserObjects),
      bonesVisible: readStateValue(uiState, ['bonesVisible'], getBonesVisible),
    };
  };
}
