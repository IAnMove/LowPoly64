import { createBrowserObjectListController } from './object-list-browser-adapter.js';

const objectListController = createBrowserObjectListController();

export function toggleObjectList(options) {
  return objectListController.toggleObjectList(options);
}

export function refreshObjectList(options) {
  return objectListController.refreshObjectList(options);
}

export function updateSelectedOverlay(options) {
  return objectListController.updateSelectedOverlay(options);
}
