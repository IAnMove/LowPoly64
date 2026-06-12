import { createSceneRuntimeController } from './scene-runtime-flow.js';

export function createSceneController({
  getSceneState = () => ({}),
  createScene,
  createCamera,
  createRenderer,
  addDefaultSceneObjects,
  createUserObjectsGroup,
  createOrbitControls,
  createTransformControls,
  getCanvasElement,
  getDevicePixelRatio,
  getViewportElement,
  resizeViewport,
  bindResizeHandler,
  createRenderLoop,
  updateAnimationMixer,
  updateBones,
  pushAction,
  updatePropertiesPanel,
  createRuntimeController = createSceneRuntimeController,
} = {}) {
  const sceneState = getSceneState();
  const sceneRuntime = createRuntimeController({
    sceneState,
    createScene,
    createCamera,
    createRenderer,
    addDefaultSceneObjects,
    createUserObjectsGroup,
    createOrbitControls,
    createTransformControls,
    getCanvasElement,
    getDevicePixelRatio,
    getViewportElement,
    resizeViewport,
    bindResizeHandler,
    createRenderLoop,
    updateAnimationMixer,
    updateBones,
    pushAction,
    updatePropertiesPanel,
  });

  function initScene() {
    return sceneRuntime.initScene();
  }

  function onResize() {
    return sceneRuntime.onResize();
  }

  function stop() {
    return sceneRuntime.stop();
  }

  return {
    initScene,
    onResize,
    stop,
  };
}
