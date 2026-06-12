import {
  applyTextureFilterToObject,
  applyTextureToMesh,
  toggleMeshTexture,
} from './texture-commands.js';
import {
  loadTextureFileForSelection,
  togglePixelatedSetting,
  toggleSelectedTexture,
} from './texture-runtime-flow.js';

export function createTextureController({
  getTextureState = () => ({}),
  getSelectedObject = () => getTextureState().selectedMesh,
  TextureClass,
  nearestFilter,
  linearFilter,
  loadImageFile,
  configureTexture,
  getTargetMesh,
  showToast = () => {},
  pushAction = () => {},
  translate = (key) => key,
  bindTextureDropZone = () => {},
  showPreview = () => {},
  showUvControls = () => {},
  applyTextureToMeshCommand = applyTextureToMesh,
  toggleMeshTextureCommand = toggleMeshTexture,
  applyTextureFilterToObjectCommand = applyTextureFilterToObject,
  loadTextureFileForSelectionCommand = loadTextureFileForSelection,
  toggleSelectedTextureCommand = toggleSelectedTexture,
  togglePixelatedSettingCommand = togglePixelatedSetting,
} = {}) {
  const getRuntimeState = createTextureRuntimeStateGetter({
    getTextureState,
    getSelectedObject,
  });

  function applyTexture(mesh, texture) {
    return applyTextureToMeshCommand(mesh, texture, {
      actionType: translate('actionApplyTexture'),
      pushAction,
    });
  }

  async function loadTextureFromFile(file) {
    const runtimeState = getRuntimeState();
    return loadTextureFileForSelectionCommand(file, {
      loadImageFile,
      TextureClass,
      configureTexture,
      pixelated: runtimeState.textureState.pixelatedMode,
      getSelectedObject: () => getRuntimeState().selectedObject,
      getTargetMesh,
      applyTexture,
      showToast,
      successMessage: translate('textureApplied'),
      errorPrefix: translate('jsonFileReadError'),
      showPreview,
      showUvControls,
    });
  }

  function handleTextureUpload(event) {
    const file = event?.target?.files?.[0];
    if (!file) return false;
    return loadTextureFromFile(file);
  }

  function setupTextureDragDrop(dropZone) {
    return bindTextureDropZone(dropZone, loadTextureFromFile);
  }

  function toggleTexture() {
    return toggleSelectedTextureCommand({
      selectedObject: getRuntimeState().selectedObject,
      getTargetMesh,
      toggleTexture: toggleMeshTextureCommand,
    });
  }

  function togglePixelated() {
    return togglePixelatedSettingCommand(getRuntimeState().textureState, {
      nearestFilter,
      linearFilter,
      applyFilterToObject: applyTextureFilterToObjectCommand,
    });
  }

  return {
    applyTexture,
    handleTextureUpload,
    loadTextureFromFile,
    setupTextureDragDrop,
    togglePixelated,
    toggleTexture,
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

export function createTextureRuntimeStateGetter({
  getTextureState = () => ({}),
  getSelectedObject = () => getTextureState().selectedMesh,
} = {}) {
  return () => {
    const textureState = getTextureState() || {};
    return {
      textureState,
      selectedObject: readStateValue(textureState, ['selectedObject', 'selectedMesh'], getSelectedObject),
    };
  };
}
