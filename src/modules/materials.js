import { createBrowserMaterialController } from './material-browser-adapter.js';

const materialController = createBrowserMaterialController();

export function createMaterial(type, options = {}) {
  return materialController.createMaterial(type, options);
}

export function updateMaterialType(mesh, newType) {
  return materialController.updateMaterialType(mesh, newType);
}

export function toggleFlatShading() {
  return materialController.toggleFlatShading();
}

export function toggleWireframe() {
  return materialController.toggleWireframe();
}

export function setColor(mesh, hexColor) {
  return materialController.setColor(mesh, hexColor);
}

export function randomRetroColor() {
  return materialController.randomRetroColor();
}

export function quickColor(hex) {
  return materialController.quickColor(hex);
}
