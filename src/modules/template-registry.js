const CATEGORY_ORDER = ['Mobiliario', 'Naturaleza', 'Arquitectura', 'Props', 'Personajes'];

function cloneTemplateData(value) {
  return JSON.parse(JSON.stringify(value));
}

function compareTemplates(a, b) {
  const categoryIndexA = CATEGORY_ORDER.indexOf(a.category);
  const categoryIndexB = CATEGORY_ORDER.indexOf(b.category);
  const safeCategoryIndexA = categoryIndexA === -1 ? Number.MAX_SAFE_INTEGER : categoryIndexA;
  const safeCategoryIndexB = categoryIndexB === -1 ? Number.MAX_SAFE_INTEGER : categoryIndexB;

  if (safeCategoryIndexA !== safeCategoryIndexB) {
    return safeCategoryIndexA - safeCategoryIndexB;
  }

  return a.id.localeCompare(b.id);
}

function normalizeTemplateDefinition(rawTemplate, sourcePath) {
  if (!rawTemplate || typeof rawTemplate !== 'object' || Array.isArray(rawTemplate)) {
    console.warn(`Template file "${sourcePath}" does not export an object`);
    return null;
  }

  const template = cloneTemplateData(rawTemplate);
  if (typeof template.id !== 'string' || typeof template.name !== 'string' || typeof template.category !== 'string') {
    console.warn(`Template file "${sourcePath}" is missing id, name, or category`);
    return null;
  }

  if (!Array.isArray(template.pieces) || template.pieces.length === 0) {
    console.warn(`Template file "${sourcePath}" must include a non-empty pieces array`);
    return null;
  }

  return template;
}

const templateModules = import.meta.glob('../data/templates/**/*.json', { eager: true });

export const TEMPLATE_REGISTRY = Object.entries(templateModules)
  .map(([sourcePath, mod]) => normalizeTemplateDefinition(mod.default ?? mod, sourcePath))
  .filter(Boolean)
  .sort(compareTemplates);
