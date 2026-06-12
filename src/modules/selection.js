import { createBrowserSelectionController } from './selection-browser-adapter.js';

const selectionController = createBrowserSelectionController();

export function configureSelectionHooks(hooks = {}) {
  return selectionController.configureSelectionHooks(hooks);
}

export function onMouseDown(event) {
  return selectionController.onMouseDown(event);
}

export function onDoubleClick(event) {
  return selectionController.onDoubleClick(event);
}

export function selectMesh(mesh) {
  return selectionController.selectMesh(mesh);
}

export function deselect() {
  return selectionController.deselect();
}

export function deselectAll() {
  return selectionController.deselectAll();
}
