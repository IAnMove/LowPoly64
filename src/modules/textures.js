import { createBrowserTextureController } from './texture-browser-adapter.js';

export {
  applyTextureTransform,
  configureTexture,
  getTextureTransform,
  rememberTextureTransform,
} from './texture-core.js';
export {
  cloneBrowserImageToCanvas as cloneImageToCanvas,
  cloneBrowserTexture as cloneTexture,
  createDetachedBrowserCanvasTexture as createDetachedCanvasTexture,
} from './browser-canvas-adapter.js';

const textureController = createBrowserTextureController();

export function handleTextureUpload(event) {
  return textureController.handleTextureUpload(event);
}

export function setupTextureDragDrop(dropZone) {
  return textureController.setupTextureDragDrop(dropZone);
}

export function applyTexture(mesh, texture) {
  return textureController.applyTexture(mesh, texture);
}

export function toggleTexture() {
  return textureController.toggleTexture();
}

export function togglePixelated() {
  return textureController.togglePixelated();
}
