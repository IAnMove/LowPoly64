import { createBrowserBoneVisualizationController } from './bone-visualization-browser-adapter.js';

export { findBoneTargets } from './bone-visualization-controller.js';

const boneVisualizationController = createBrowserBoneVisualizationController();

export function raycastBones(raycaster) {
  return boneVisualizationController.raycastBones(raycaster);
}

export function toggleBones() {
  return boneVisualizationController.toggleBones();
}

export function updateBones() {
  return boneVisualizationController.updateBones();
}
