import { state } from './state.js';
import { t } from './i18n.js';
import { createSnapController } from './snap-controller.js';
import { createSnapDomAdapter } from './snap-dom.js';

export function createBrowserSnapController({
  root = globalThis.document,
  getSnapState = () => state,
  createSnapDom = createSnapDomAdapter,
  createFacadeController = createSnapController,
} = {}) {
  const snapDom = createSnapDom({ root });

  return createFacadeController({
    getSnapState,
    translate: t,
    updateSnapIndicatorCommand: snapDom.updateSnapIndicator,
  });
}
