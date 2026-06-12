import { state } from './state.js';
import { deselect } from './selection.js';
import { showToast } from './ui.js';
import { t } from './i18n.js';
import { downloadJSON, readFileAsJSON } from './browser-json-adapter.js';
import { validateSerializedScene } from './persistence-validation.js';
import {
  deserializeObject,
  serializeObject,
} from './scene-serialization.js';
import { createSceneStorage } from './scene-storage.js';
import { createPersistenceController } from './persistence-controller.js';

export function createBrowserPersistenceController({
  getPersistenceState = () => state,
  sceneStorage = createSceneStorage(),
  createFacadeController = createPersistenceController,
  confirmLoad = (message) => globalThis.confirm(message),
} = {}) {
  return createFacadeController({
    getPersistenceState,
    deselect,
    showToast,
    translate: t,
    serializeObject,
    deserializeObject,
    validateSerializedScene,
    saveSceneSnapshot: sceneStorage.saveSceneSnapshot,
    loadSceneSnapshot: sceneStorage.loadSceneSnapshot,
    downloadJSON,
    readFileAsJSON,
    confirmLoad,
  });
}
