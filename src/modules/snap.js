import { createBrowserSnapController } from './snap-browser-adapter.js';

const snapController = createBrowserSnapController();

export function toggleSnap() {
  return snapController.toggleSnap();
}
