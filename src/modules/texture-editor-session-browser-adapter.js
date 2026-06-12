import { t } from './i18n.js';
import { state } from './state.js';
import { createTextureEditorSessionController } from './texture-editor-session-controller.js';
import { createTextureEditorDomAdapter } from './texture-editor-dom.js';
import { getChildMesh, showToast } from './ui.js';

export function createBrowserTextureEditorSession({
  root = globalThis.document,
  getTextureEditorState = () => state,
  createTextureEditorDom = createTextureEditorDomAdapter,
  createFacadeController = createTextureEditorSessionController,
  getChildMeshCommand = getChildMesh,
  showToastCommand = showToast,
  translate = t,
  showTextureEditorModalCommand,
  hideTextureEditorModalCommand,
} = {}) {
  const textureEditorDom = showTextureEditorModalCommand && hideTextureEditorModalCommand
    ? null
    : createTextureEditorDom({ root });

  return createFacadeController({
    getTextureEditorState,
    getChildMesh: getChildMeshCommand,
    showToast: showToastCommand,
    translate,
    showTextureEditorModalCommand: showTextureEditorModalCommand ?? textureEditorDom.showTextureEditorModal,
    hideTextureEditorModalCommand: hideTextureEditorModalCommand ?? textureEditorDom.hideTextureEditorModal,
  });
}
