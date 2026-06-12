import { insertTemplateGroup } from './template-actions.js';
import { buildTemplateGroupFromDefinition } from './template-group-builder.js';

export function findTemplateById(registry, id) {
  return registry.find((template) => template.id === id) || null;
}

export function getTemplateCategoriesFromRegistry(registry) {
  const categories = new Map();
  registry.forEach((template) => {
    if (!categories.has(template.category)) categories.set(template.category, []);
    categories.get(template.category).push(template);
  });
  return categories;
}

export function buildTemplateGroupForRuntime(definition, {
  compileAnimations = true,
  compileAnimation,
  createMaterial,
  getMaterialType,
  buildTemplateGroup = buildTemplateGroupFromDefinition,
} = {}) {
  return buildTemplateGroup(definition, {
    compileAnimations,
    compileAnimation,
    createMaterial,
    materialType: getMaterialType?.(),
  });
}

export function addTemplateFromRegistry(id, {
  registry,
  buildGroup,
  insertTemplate = insertTemplateGroup,
  userObjects,
  getSelectedMesh,
  selectMesh,
  deselect,
  pushAction,
  actionType,
  onMissingTemplate = () => {},
}) {
  const definition = findTemplateById(registry, id);
  if (!definition) {
    onMissingTemplate(id);
    return null;
  }

  const group = buildGroup(definition);
  return insertTemplate(group, {
    userObjects,
    getSelectedMesh,
    selectMesh,
    deselect,
    pushAction,
    actionType,
  });
}
