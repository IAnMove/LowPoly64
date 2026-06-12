import { createBrowserSceneObjectListController } from './scene-object-list-browser-adapter.js';

const sceneObjectListController = createBrowserSceneObjectListController();

export function refreshSceneObjectList(options) {
  return sceneObjectListController.refreshSceneObjectList(options);
}
