import { state } from './state.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';
import { createMaterialDomAdapter } from './material-dom.js';
import { createMaterialController } from './material-controller.js';

export function createBrowserMaterialController({
  getMaterialState = () => state,
  createFacadeController = createMaterialController,
  root = globalThis.document,
  createMaterialDom = createMaterialDomAdapter,
} = {}) {
  const materialDom = createMaterialDom({ root });

  return createFacadeController({
    getMaterialState,
    translate: t,
    syncColorInputs: materialDom.syncColorInputs,
    pushAction,
  });
}
