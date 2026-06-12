import {
  choosePaletteColor,
  setMeshColor,
} from './material-commands.js';
import {
  applySelectedQuickColor,
  createMaterialFromSettings,
  toggleFlatShadingSetting,
  toggleWireframeSetting,
  updateMaterialTypeForSelection,
} from './material-runtime-flow.js';

export function createMaterialController({
  getMaterialState = () => ({}),
  getSelectedMesh = () => null,
  getRetroPalette = () => [],
  translate = (key) => key,
  syncColorInputs,
  pushAction,
  createMaterialFromSettingsCommand = createMaterialFromSettings,
  updateMaterialTypeForSelectionCommand = updateMaterialTypeForSelection,
  toggleFlatShadingSettingCommand = toggleFlatShadingSetting,
  toggleWireframeSettingCommand = toggleWireframeSetting,
  setMeshColorCommand = setMeshColor,
  choosePaletteColorCommand = choosePaletteColor,
  applySelectedQuickColorCommand = applySelectedQuickColor,
} = {}) {
  const getRuntimeState = createMaterialRuntimeStateGetter({
    getMaterialState,
    getSelectedMesh,
    getRetroPalette,
  });

  function createMaterial(type, options = {}) {
    return createMaterialFromSettingsCommand(getRuntimeState().materialState, type, options);
  }

  function updateMaterialType(mesh, newType) {
    const runtimeState = getRuntimeState();
    return updateMaterialTypeForSelectionCommand(mesh, newType, {
      createMaterial,
      selectedMesh: runtimeState.selectedMesh,
    });
  }

  function toggleFlatShading() {
    return toggleFlatShadingSettingCommand(getRuntimeState().materialState);
  }

  function toggleWireframe() {
    return toggleWireframeSettingCommand(getRuntimeState().materialState);
  }

  function setColor(mesh, hexColor) {
    return setMeshColorCommand(mesh, hexColor);
  }

  function randomRetroColor() {
    return choosePaletteColorCommand(getRuntimeState().retroPalette);
  }

  function quickColor(hex) {
    return applySelectedQuickColorCommand({
      getSelectedMesh: () => getRuntimeState().selectedMesh,
      hex,
      actionType: translate('actionChangeColor'),
      setColor,
      syncColorInputs,
      pushAction,
    });
  }

  return {
    createMaterial,
    quickColor,
    randomRetroColor,
    setColor,
    toggleFlatShading,
    toggleWireframe,
    updateMaterialType,
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

export function createMaterialRuntimeStateGetter({
  getMaterialState = () => ({}),
  getSelectedMesh = () => null,
  getRetroPalette = () => [],
} = {}) {
  return () => {
    const materialState = getMaterialState() || {};
    return {
      materialState,
      selectedMesh: readStateValue(materialState, ['selectedMesh'], getSelectedMesh),
      retroPalette: readStateValue(materialState, ['retroPalette'], getRetroPalette),
    };
  };
}
