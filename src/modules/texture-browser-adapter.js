import * as THREE from 'three';
import { state } from './state.js';
import { showToast, getChildMesh } from './ui.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';
import { loadImageFile } from './browser-image-adapter.js';
import { configureTexture } from './texture-core.js';
import { createTextureController } from './texture-controller.js';
import { createTexturePanelDomAdapter } from './texture-panel-dom.js';

export function createBrowserTextureController({
  getTextureState = () => state,
  createFacadeController = createTextureController,
  root = globalThis.document,
  createTexturePanelDom = createTexturePanelDomAdapter,
} = {}) {
  const texturePanelDom = createTexturePanelDom({ root });

  return createFacadeController({
    getTextureState,
    TextureClass: THREE.Texture,
    nearestFilter: THREE.NearestFilter,
    linearFilter: THREE.LinearFilter,
    loadImageFile,
    configureTexture,
    getTargetMesh: getChildMesh,
    showToast,
    pushAction,
    translate: t,
    bindTextureDropZone: texturePanelDom.bindTextureDropZone,
    showPreview: texturePanelDom.showPreview,
    showUvControls: texturePanelDom.showUvControls,
  });
}
