import { createTexturePreviewLoop } from './texture-editor-preview-loop.js';
import {
  bindTexturePreviewHover,
  createTexturePreviewRenderer,
  createTexturePreviewScene,
} from './texture-editor-preview-scene.js';

export function createTexturePreviewRuntimeState() {
  return {
    renderer: null,
    scene: null,
    camera: null,
    mesh: null,
    previewLoop: null,
    cleanupPreviewHover: null,
    autoRotate: true,
    shouldResumeAutoRotate: () => true,
  };
}

export function disposeTexturePreviewRuntime(state) {
  state.previewLoop?.stop();
  state.previewLoop = null;
  state.cleanupPreviewHover?.();
  state.cleanupPreviewHover = null;
  if (state.renderer) {
    state.renderer.dispose();
    state.renderer = null;
  }
  state.scene = null;
  state.camera = null;
  state.mesh = null;
  state.shouldResumeAutoRotate = () => true;
}

export function initializeTexturePreviewRuntime(state, sourceMesh, {
  container,
  shouldResumeAutoRotate = () => true,
  disposeRuntime = disposeTexturePreviewRuntime,
  createPreviewScene = createTexturePreviewScene,
  createPreviewRenderer = createTexturePreviewRenderer,
  bindPreviewHover = bindTexturePreviewHover,
  createPreviewLoop = createTexturePreviewLoop,
} = {}) {
  if (!container) return false;

  disposeRuntime(state);
  container.replaceChildren();
  state.autoRotate = true;
  state.shouldResumeAutoRotate = shouldResumeAutoRotate;

  ({
    scene: state.scene,
    camera: state.camera,
    mesh: state.mesh,
  } = createPreviewScene(sourceMesh));

  state.renderer = createPreviewRenderer(container);
  state.cleanupPreviewHover = bindPreviewHover(state.renderer.domElement, {
    pauseAutoRotate: () => {
      state.autoRotate = false;
    },
    resumeAutoRotate: () => {
      if (state.shouldResumeAutoRotate()) state.autoRotate = true;
    },
  });

  state.previewLoop = createPreviewLoop({
    shouldRotate: () => Boolean(state.mesh && state.autoRotate),
    rotatePreview: () => {
      state.mesh.rotation.y += 0.01;
    },
    renderFrame: () => {
      if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
      }
    },
  });
  state.previewLoop.start();
  return true;
}
