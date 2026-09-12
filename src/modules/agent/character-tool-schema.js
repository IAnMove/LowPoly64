import { CHARACTER_DESIGN_SCHEMA } from '../character-studio/character-design.js';

const object = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const id = { type: 'string', pattern: '^rv_[A-Za-z0-9_-]{8,80}$', description: 'Existing scene character ID, beginning rv_. Catalog entries belong in catalog_id. Omit when creating.' };
const draftId = { type: 'string', pattern: '^draft_[a-zA-Z0-9_-]{8,80}$' };
const operationId = { type: 'string', minLength: 1, maxLength: 120, description: 'Unique per requested mutation; reuse only for an identical retry.' };
const revision = { type: 'integer', minimum: 0, maximum: 3 };
const catalogId = { type: 'string', minLength: 1, maxLength: 120, description: 'Exact catalog entry, such as studio:psx-swordsman. For catalog inspection use this field and omit id.' };
const target = { id, draft_id: draftId, revision };
const patch = structuredClone(CHARACTER_DESIGN_SCHEMA);
function optionalProperties(schema) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.type === 'object') schema.required = [];
  Object.values(schema).forEach(value => { if (Array.isArray(value)) value.forEach(optionalProperties); else if (value && typeof value === 'object') optionalProperties(value); });
}
optionalProperties(patch);
// Defaults belong in the generator, not in a patch validator.
function removeDefaults(schema) {
  if (!schema || typeof schema !== 'object') return;
  delete schema.default;
  Object.values(schema).forEach(value => { if (Array.isArray(value)) value.forEach(removeDefaults); else removeDefaults(value); });
}
removeDefaults(patch);

export const CHARACTER_TOOL_SCHEMAS = Object.freeze({
  get_character_capabilities: object(),
  search_character_catalog: object({ query: { type: 'string', maxLength: 120, default: '' }, engine: { type: 'string', enum: ['all', 'studio', 'avatar-forge'], default: 'all' }, limit: { type: 'integer', minimum: 1, maximum: 30, default: 10 } }),
  get_character_recipe: object({ ...target, catalog_id: catalogId }),
  validate_character_recipe: object({ recipe: patch }, ['recipe']),
  build_character_draft: object({ source_id: id, catalog_id: catalogId, recipe: patch, operation_id: operationId }, ['operation_id']),
  patch_character_draft: object({ draft_id: draftId, expected_revision: revision, operation_id: operationId, patch }, ['draft_id', 'expected_revision', 'operation_id', 'patch']),
  render_character_views: object({ ...target, size: { type: 'integer', minimum: 128, maximum: 768, default: 512 } }),
  evaluate_character: object(target),
  commit_character_draft: object({ draft_id: draftId, expected_revision: revision, chosen_revision: revision, operation_id: operationId }, ['draft_id', 'expected_revision', 'operation_id']),
  discard_character_draft: object({ draft_id: draftId, expected_revision: revision, operation_id: operationId }, ['draft_id', 'expected_revision', 'operation_id']),
  export_character_asset: object({ ...target, format: { type: 'string', enum: ['json', 'glb', 'recipe'], default: 'json' } }),
});
