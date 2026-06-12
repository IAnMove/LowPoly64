import { getTexturePreviewContainer as getDefaultTexturePreviewContainer } from './texture-editor-dom.js';
import {
  createTexturePreviewRuntimeState,
  disposeTexturePreviewRuntime,
  initializeTexturePreviewRuntime,
} from './texture-editor-preview-runtime-flow.js';
import {
  applyCanvasToPreviewTexture,
  applyTransformToPreviewTexture,
} from './texture-editor-preview-texture.js';

const previewRuntimeState = createTexturePreviewRuntimeState();

export function initTexturePreview(sourceMesh, options = {}) {
  const {
    getTexturePreviewContainer = getDefaultTexturePreviewContainer,
    initializePreviewRuntime = initializeTexturePreviewRuntime,
    runtimeState = previewRuntimeState,
    shouldResumeAutoRotate,
  } = options;

  initializePreviewRuntime(runtimeState, sourceMesh, {
    container: getTexturePreviewContainer(),
    shouldResumeAutoRotate,
  });
}

export function disposeTexturePreview() {
  disposeTexturePreviewRuntime(previewRuntimeState);
}

export function getPreviewRenderer() {
  return previewRuntimeState.renderer;
}

export function getPreviewCamera() {
  return previewRuntimeState.camera;
}

export function getPreviewMesh() {
  return previewRuntimeState.mesh;
}

export function setPreviewAutoRotate(value) {
  previewRuntimeState.autoRotate = value;
}

export function applyCanvasToTexturePreview(canvas, transform) {
  applyCanvasToPreviewTexture(previewRuntimeState.mesh, canvas, transform);
}

export function applyTextureTransformToPreview(transform) {
  applyTransformToPreviewTexture(previewRuntimeState.mesh, transform);
}
