import { createBrowserSceneController } from './scene-browser-adapter.js';

export { raycastBones, toggleBones } from './bone-visualization.js';

const sceneController = createBrowserSceneController();

export function initScene() {
  return sceneController.initScene();
}

export function onResize() {
  return sceneController.onResize();
}
