import {
  AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE,
} from '../../data/avatar/catalog.js';

export const AVATAR_COLOR_FIELDS = Object.freeze([
  { key: 'skin', inputId: 'avatar-color-skin', valueId: 'avatar-color-skin-value' },
  { key: 'hair', inputId: 'avatar-color-hair', valueId: 'avatar-color-hair-value' },
  { key: 'iris', inputId: 'avatar-color-iris', valueId: 'avatar-color-iris-value' },
  { key: 'bodyPrimary', inputId: 'avatar-color-body-primary', valueId: 'avatar-color-body-primary-value' },
  { key: 'bodySecondary', inputId: 'avatar-color-body-secondary', valueId: 'avatar-color-body-secondary-value' },
  { key: 'accent', inputId: 'avatar-color-accent', valueId: 'avatar-color-accent-value' },
]);

export const AVATAR_PLACEMENT_FIELD_CONFIG = Object.freeze({
  size: Object.freeze({ labelKey: 'avatarPlacementSize', min: 0.7, max: 1.35, step: 0.01, defaultValue: 1 }),
  offsetX: Object.freeze({ labelKey: 'avatarPlacementX', min: -48, max: 48, step: 1, defaultValue: 0 }),
  offsetY: Object.freeze({ labelKey: 'avatarPlacementY', min: -48, max: 48, step: 1, defaultValue: 0 }),
  spacing: Object.freeze({ labelKey: 'avatarPlacementSpacing', min: -32, max: 32, step: 1, defaultValue: 0 }),
  length: Object.freeze({ labelKey: 'avatarPlacementLength', min: -48, max: 48, step: 1, defaultValue: 0 }),
});

export const AVATAR_FEATURE_PLACEMENT_CONTROLS = Object.freeze([
  Object.freeze({ featureKey: 'hair', labelKey: 'avatarHair', fields: Object.freeze(['size', 'offsetY', 'length']) }),
  Object.freeze({ featureKey: 'eyes', labelKey: 'avatarEyes', fields: Object.freeze(['size', 'offsetX', 'offsetY', 'spacing']) }),
  Object.freeze({ featureKey: 'brows', labelKey: 'avatarBrows', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'nose', labelKey: 'avatarNose', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'mouth', labelKey: 'avatarMouth', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'ears', labelKey: 'avatarEars', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
  Object.freeze({ featureKey: 'fullFace', labelKey: 'avatarFullFace', fields: Object.freeze(['size', 'offsetX', 'offsetY']) }),
]);

export const AVATAR_HEAD_PARAM_CONTROLS = Object.freeze([
  Object.freeze({ key: 'skullWidth', label: 'SKULL W', min: -0.2, max: 0.2, step: 0.01 }),
  Object.freeze({ key: 'jawDrop', label: 'JAW DROP', min: -0.25, max: 0.25, step: 0.01 }),
  Object.freeze({ key: 'crownRoundness', label: 'CROWN', min: -0.3, max: 0.3, step: 0.01 }),
  Object.freeze({ key: 'cheekFullness', label: 'CHEEKS', min: -0.3, max: 0.3, step: 0.01 }),
]);

export function getAccessoryValue(recipe) {
  const selectedId = (recipe.accessoryIds || []).find((id) => id && id !== 'none');
  return selectedId || 'none';
}

export function buildPlacementInputId(featureKey, fieldKey) {
  return `avatar-feature-${featureKey}-${fieldKey}`;
}

export function buildPlacementValueId(featureKey, fieldKey) {
  return `${buildPlacementInputId(featureKey, fieldKey)}-value`;
}

export function buildHeadParamInputId(key) {
  return `avatar-head-param-${key}`;
}

export function buildHeadParamValueId(key) {
  return `${buildHeadParamInputId(key)}-value`;
}

export function formatPlacementValue(fieldKey, value) {
  if (fieldKey === 'size') {
    return Number(value).toFixed(2).replace(/\.?0+$/, '');
  }
  return String(Math.round(Number(value) || 0));
}

export function formatHeadParamValue(value) {
  const numeric = Number(value) || 0;
  const formatted = numeric.toFixed(2);
  return numeric > 0 ? `+${formatted}` : formatted;
}

export function populateSelect(selectId, entries, { selectedId = '', labelForEntry = null } = {}) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '';
  entries.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = labelForEntry ? labelForEntry(entry) : entry.label;
    if (entry.id === selectedId) option.selected = true;
    select.appendChild(option);
  });
}

export function sortCatalogEntriesByTargetOrder(type, entries) {
  const sourceEntries = Array.isArray(entries) ? [...entries] : [];
  const targetEntries = AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE?.[type] || [];
  if (!targetEntries.length) return sourceEntries;

  const targetOrder = new Map(targetEntries.map((entry, index) => [entry.id, index]));
  return sourceEntries.sort((a, b) => {
    const indexA = targetOrder.has(a.id) ? targetOrder.get(a.id) : Number.MAX_SAFE_INTEGER;
    const indexB = targetOrder.has(b.id) ? targetOrder.get(b.id) : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return String(a.label || a.id).localeCompare(String(b.label || b.id));
  });
}
