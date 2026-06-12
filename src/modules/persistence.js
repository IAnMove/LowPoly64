import { createBrowserPersistenceController } from './persistence-browser-adapter.js';

export { serializeGroupAsImportJSON } from './scene-serialization.js';

const persistenceController = createBrowserPersistenceController();

export function serializeScene() {
  return persistenceController.serializeScene();
}

export function deserializeScene(json) {
  return persistenceController.deserializeScene(json);
}

export function saveToLocalStorage() {
  return persistenceController.saveToLocalStorage();
}

export function loadFromLocalStorage() {
  return persistenceController.loadFromLocalStorage();
}

export function exportSceneJSON() {
  return persistenceController.exportSceneJSON();
}

export async function importSceneJSON(file) {
  return persistenceController.importSceneJSON(file);
}
