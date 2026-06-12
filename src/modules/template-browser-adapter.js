import { state } from './state.js';
import { createMaterial } from './materials.js';
import { selectMesh, deselect } from './selection.js';
import { t } from './i18n.js';
import { pushAction } from './undo.js';
import { compileAnimation } from './animation-compiler.js';
import { createTemplateController } from './template-controller.js';
import { createTemplateListDomAdapter } from './template-list-dom.js';

export function createBrowserTemplateController({
  registry = [],
  root = globalThis.document,
  getTemplateState = () => state,
  createTemplateListDom = createTemplateListDomAdapter,
  createFacadeController = createTemplateController,
  onMissingTemplate = (templateId) => console.warn(`Template not found: ${templateId}`),
} = {}) {
  const templateListDom = createTemplateListDom({ root });

  return createFacadeController({
    registry,
    createMaterial,
    getTemplateState,
    selectMesh,
    deselect,
    pushAction,
    compileAnimation,
    translate: t,
    renderTemplateListCommand: templateListDom.renderTemplateList,
    onMissingTemplate,
  });
}
