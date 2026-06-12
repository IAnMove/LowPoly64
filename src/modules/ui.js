import { createBrowserUIController } from './ui-browser-adapter.js';

const uiController = createBrowserUIController();

export { getChildMesh } from './property-commands.js';

export function configureUIHooks(hooks = {}) {
  return uiController.configureUIHooks(hooks);
}

export function updatePropertiesPanel() {
  return uiController.updatePropertiesPanel();
}

export function showMultiSelectionPanel() {
  return uiController.showMultiSelectionPanel();
}

export function clearPropertiesPanel() {
  return uiController.clearPropertiesPanel();
}

export function updatePosition() {
  return uiController.updatePosition();
}

export function updateRotation() {
  return uiController.updateRotation();
}

export function updateScale() {
  return uiController.updateScale();
}

export function updateName(value) {
  return uiController.updateName(value);
}

export function updateColorFromPanel(hex) {
  return uiController.updateColorFromPanel(hex);
}

export function updateMaterialFromPanel() {
  return uiController.updateMaterialFromPanel();
}

export function updateUVOffset() {
  return uiController.updateUVOffset();
}

export function updateUVRepeat() {
  return uiController.updateUVRepeat();
}

export function updateUVRotation() {
  return uiController.updateUVRotation();
}

export function showToast(message, duration = 2000) {
  return uiController.showToast(message, duration);
}

export function applyColorToAll(hex) {
  return uiController.applyColorToAll(hex);
}

export function syncColorPickers(hex) {
  return uiController.syncColorPickers(hex);
}

export function updateExportButtonText() {
  return uiController.updateExportButtonText();
}
