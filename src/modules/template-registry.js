const CATEGORY_ORDER = ['Mobiliario', 'Naturaleza', 'Arquitectura', 'Props', 'Personajes'];
const CATEGORY_BY_FOLDER = {
  furniture: 'Mobiliario',
  nature: 'Naturaleza',
  architecture: 'Arquitectura',
  props: 'Props',
  characters: 'Personajes',
};
const CATEGORY_ALIASES = {
  furniture: 'Mobiliario',
  nature: 'Naturaleza',
  architecture: 'Arquitectura',
  props: 'Props',
  characters: 'Personajes',
  characters_es: 'Personajes',
  mobiliario: 'Mobiliario',
  naturaleza: 'Naturaleza',
  arquitectura: 'Arquitectura',
  personajes: 'Personajes',
};

function cloneTemplateData(value) {
  return JSON.parse(JSON.stringify(value));
}

function getFileStem(sourcePath) {
  const normalizedPath = sourcePath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop() || '';
  return filename.replace(/\.json$/i, '');
}

function getFolderName(sourcePath) {
  const normalizedPath = sourcePath.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  return parts.length >= 2 ? parts[parts.length - 2].toLowerCase() : '';
}

function normalizeCategory(category, sourcePath) {
  if (typeof category === 'string' && category.trim()) {
    const key = category.trim().toLowerCase().replace(/\s+/g, '_');
    return CATEGORY_ALIASES[key] || category.trim();
  }
  return CATEGORY_BY_FOLDER[getFolderName(sourcePath)] || '';
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
  if (typeof template.id !== 'string' || !template.id.trim()) {
    template.id = getFileStem(sourcePath);
  }

  template.category = normalizeCategory(template.category, sourcePath);

  if (typeof template.name !== 'string' || !template.name.trim()) {
    console.warn(`Template file "${sourcePath}" is missing name`);
    return null;
  }

  if (typeof template.id !== 'string' || !template.id.trim() || typeof template.category !== 'string' || !template.category.trim()) {
    console.warn(`Template file "${sourcePath}" is missing id or category and could not be inferred`);
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
