import { createBrowserTemplateController } from './template-browser-adapter.js';
import { TEMPLATE_REGISTRY } from './template-registry.js';

const templateController = createBrowserTemplateController({
  registry: TEMPLATE_REGISTRY,
});

export function buildGroupFromDefinition(def, { compileAnimations = true } = {}) {
  return templateController.buildGroupFromDefinition(def, { compileAnimations });
}

export function addTemplate(id) {
  return templateController.addTemplate(id);
}

export function getCategories() {
  return templateController.getCategories();
}

export function generateTemplateListUI(container, onTemplateSelected = addTemplate) {
  return templateController.generateTemplateListUI(container, onTemplateSelected);
}
