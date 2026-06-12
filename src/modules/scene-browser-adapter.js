import { state } from './state.js';
import { updatePropertiesPanel } from './ui.js';
import { pushAction } from './undo.js';
import { updateAnimationMixer } from './animation.js';
import { updateBones } from './bone-visualization.js';
import {
  addDefaultSceneObjects,
  createEditorCamera,
  createEditorOrbitControls,
  createEditorRenderer,
  createEditorScene,
  createUserObjectsGroup,
  resizeViewport,
} from './scene-setup.js';
import { createEditorTransformControls } from './scene-transform-controls.js';
import { createSceneDomAdapter } from './scene-dom.js';
import { createSceneRenderLoop } from './scene-render-loop.js';
import { createSceneController } from './scene-controller.js';

export function createBrowserSceneController({
  root = globalThis.document,
  viewport = globalThis.window,
  getSceneState = () => state,
  createSceneDom = createSceneDomAdapter,
  createFacadeController = createSceneController,
} = {}) {
  const sceneDom = createSceneDom({ root, viewport });

  return createFacadeController({
    getSceneState,
    createScene: createEditorScene,
    createCamera: createEditorCamera,
    createRenderer: createEditorRenderer,
    addDefaultSceneObjects,
    createUserObjectsGroup,
    createOrbitControls: createEditorOrbitControls,
    createTransformControls: createEditorTransformControls,
    getCanvasElement: sceneDom.getCanvasElement,
    getDevicePixelRatio: sceneDom.getDevicePixelRatio,
    getViewportElement: sceneDom.getViewportElement,
    resizeViewport,
    bindResizeHandler: sceneDom.bindResizeHandler,
    createRenderLoop: createSceneRenderLoop,
    updateAnimationMixer,
    updateBones,
    pushAction,
    updatePropertiesPanel,
  });
}
