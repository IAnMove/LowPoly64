import {
  clearRuntimeUserObjects,
  deserializeRuntimeScene,
  exportRuntimeSceneJSON,
  importRuntimeSceneJSON,
  loadRuntimeScene,
  saveRuntimeScene,
  serializeRuntimeScene,
} from './persistence-runtime-flow.js';

export const DEFAULT_SCENE_JSON_FILENAME = 'lowpoly64-scene.json';

export function createPersistenceController({
  getPersistenceState = () => ({}),
  deselect,
  showToast,
  translate = (key) => key,
  serializeObject,
  deserializeObject,
  validateSerializedScene,
  saveSceneSnapshot,
  loadSceneSnapshot,
  downloadJSON,
  readFileAsJSON,
  confirmLoad,
  sceneJsonFilename = DEFAULT_SCENE_JSON_FILENAME,
  clearUserObjects = clearRuntimeUserObjects,
  serializeRuntimeSceneCommand = serializeRuntimeScene,
  deserializeRuntimeSceneCommand = deserializeRuntimeScene,
  saveRuntimeSceneCommand = saveRuntimeScene,
  loadRuntimeSceneCommand = loadRuntimeScene,
  exportRuntimeSceneJSONCommand = exportRuntimeSceneJSON,
  importRuntimeSceneJSONCommand = importRuntimeSceneJSON,
} = {}) {
  function serializeScene() {
    const persistenceState = getPersistenceState();
    return serializeRuntimeSceneCommand(persistenceState.userObjects, { serializeObject });
  }

  function deserializeScene(json) {
    const persistenceState = getPersistenceState();
    return deserializeRuntimeSceneCommand(json, {
      userObjects: persistenceState.userObjects,
      deselect,
      validateSerializedScene,
      deserializeObject,
      pixelated: persistenceState.pixelatedMode,
      clearUserObjects,
      invalidMessage: translate('sceneInvalidData'),
    });
  }

  function saveToLocalStorage() {
    return saveRuntimeSceneCommand({
      serializeScene,
      saveSceneSnapshot,
      showToast,
      messages: {
        saved: translate('sceneSaved'),
        error: translate('sceneSaveError'),
      },
    });
  }

  function loadFromLocalStorage() {
    return loadRuntimeSceneCommand({
      loadSceneSnapshot,
      confirmLoad,
      deserializeScene,
      showToast,
      messages: {
        noSaved: translate('noSavedScene'),
        confirm: translate('confirmLoadScene'),
        loaded: translate('sceneLoaded'),
        error: translate('sceneLoadError'),
        invalid: translate('sceneInvalidData'),
      },
    });
  }

  function exportSceneJSON() {
    return exportRuntimeSceneJSONCommand({
      serializeScene,
      downloadJSON,
      filename: sceneJsonFilename,
    });
  }

  function importSceneJSON(file) {
    return importRuntimeSceneJSONCommand(file, {
      readFileAsJSON,
      deserializeScene,
      showToast,
      messages: {
        loaded: translate('sceneLoaded'),
        error: translate('sceneImportError'),
        invalid: translate('sceneInvalidData'),
      },
    });
  }

  return {
    deserializeScene,
    exportSceneJSON,
    importSceneJSON,
    loadFromLocalStorage,
    saveToLocalStorage,
    serializeScene,
  };
}
