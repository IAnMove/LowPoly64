export const AGENT_ID_PATTERN = '^rv_[A-Za-z0-9_-]{8,80}$';
export const MAX_COMMAND_BYTES = 1_000_000;
export const MAX_TOOL_OUTPUT_BYTES = 750_000;
export const MAX_CAPTURE_BYTES = 4_000_000;
export const MAX_LIST_ITEMS = 100;

const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const vector3 = (minimum, maximum) => ({
  type: 'array',
  items: { type: 'number', minimum, maximum },
  minItems: 3,
  maxItems: 3,
});
const object = (properties = {}, required = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

export const EMPTY_INPUT_SCHEMA = object();
export const AGENT_ID_SCHEMA = { type: 'string', pattern: AGENT_ID_PATTERN };
export const ID_LIST_SCHEMA = {
  type: 'array',
  items: AGENT_ID_SCHEMA,
  minItems: 1,
  maxItems: 50,
  uniqueItems: true,
};
export const POSITION_SCHEMA = vector3(-10_000, 10_000);
export const ROTATION_DEGREES_SCHEMA = vector3(-36_000, 36_000);
export const SCALE_SCHEMA = vector3(0.001, 1_000);
export const OFFSET_SCHEMA = vector3(-10_000, 10_000);
export const COLOR_SCHEMA = {
  type: 'string',
  pattern: '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$',
};
export const MATERIAL_SCHEMA = {
  type: 'string',
  enum: ['Basic', 'Lambert', 'Phong', 'Standard'],
};
export const PRIMITIVE_SCHEMA = {
  type: 'string',
  enum: [
    'cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule',
    'torus', 'wedge', 'pyramid', 'taperedBox', 'limbLoft', 'lathe',
  ],
};
export const TRANSFORM_SCHEMA = object({
  position: nullable(POSITION_SCHEMA),
  rotation_degrees: nullable(ROTATION_DEGREES_SCHEMA),
  scale: nullable(SCALE_SCHEMA),
}, []);
export const OPTIONAL_TRANSFORM_SCHEMA = nullable(TRANSFORM_SCHEMA);

export const TOOL_INPUT_SCHEMAS = Object.freeze({
  get_application_status: EMPTY_INPUT_SCHEMA,
  get_scene_summary: object({
    include_bounds: { type: 'boolean', default: true },
  }),
  list_objects: object({
    limit: { type: 'integer', minimum: 1, maximum: MAX_LIST_ITEMS, default: 50 },
    detail: { type: 'string', enum: ['compact', 'full'], default: 'compact' },
    include_children: { type: 'boolean', default: true },
  }),
  get_object: object({
    id: AGENT_ID_SCHEMA,
    detail: { type: 'string', enum: ['compact', 'full'], default: 'full' },
  }, ['id']),
  get_selection: EMPTY_INPUT_SCHEMA,
  select_objects: object({
    ids: {
      type: 'array',
      items: AGENT_ID_SCHEMA,
      maxItems: 50,
      uniqueItems: true,
    },
    mode: { type: 'string', enum: ['replace', 'add', 'remove'], default: 'replace' },
  }, ['ids']),
  add_primitive: object({
    type: PRIMITIVE_SCHEMA,
    name: nullable({ type: 'string', minLength: 1, maxLength: 120 }),
    transform: OPTIONAL_TRANSFORM_SCHEMA,
  }, ['type']),
  add_template: object({
    template_id: { type: 'string', minLength: 1, maxLength: 120 },
    name: nullable({ type: 'string', minLength: 1, maxLength: 120 }),
    transform: OPTIONAL_TRANSFORM_SCHEMA,
  }, ['template_id']),
  import_object_definition: object({
    definition: {
      type: 'object',
      minProperties: 1,
      maxProperties: 40,
      additionalProperties: true,
    },
    name: nullable({ type: 'string', minLength: 1, maxLength: 120 }),
  }, ['definition']),
  update_object_transform: object({
    id: AGENT_ID_SCHEMA,
    position: nullable(POSITION_SCHEMA),
    rotation_degrees: nullable(ROTATION_DEGREES_SCHEMA),
    scale: nullable(SCALE_SCHEMA),
    relative: { type: 'boolean', default: false },
  }, ['id']),
  update_object_appearance: object({
    id: AGENT_ID_SCHEMA,
    name: nullable({ type: 'string', minLength: 1, maxLength: 120 }),
    color: nullable(COLOR_SCHEMA),
    material: nullable(MATERIAL_SCHEMA),
    opacity: nullable({ type: 'number', minimum: 0, maximum: 1 }),
  }, ['id']),
  group_objects: object({
    ids: {
      type: 'array',
      items: AGENT_ID_SCHEMA,
      minItems: 2,
      maxItems: 50,
      uniqueItems: true,
    },
    name: nullable({ type: 'string', minLength: 1, maxLength: 120 }),
  }, ['ids']),
  ungroup_objects: object({ id: AGENT_ID_SCHEMA }, ['id']),
  duplicate_objects: object({
    ids: ID_LIST_SCHEMA,
    offset: nullable(OFFSET_SCHEMA),
  }, ['ids']),
  delete_objects: object({
    ids: ID_LIST_SCHEMA,
    confirm: { type: 'boolean' },
  }, ['ids', 'confirm']),
  undo: EMPTY_INPUT_SCHEMA,
  redo: EMPTY_INPUT_SCHEMA,
  capture_viewport: object({
    max_width: { type: 'integer', minimum: 64, maximum: 2048, default: 1024 },
    max_height: { type: 'integer', minimum: 64, maximum: 2048, default: 1024 },
    format: { type: 'string', enum: ['png'], default: 'png' },
  }),
  serialize_scene: object({
    detail: { type: 'string', enum: ['summary', 'full'], default: 'full' },
  }),
  export_selected_object: object({
    format: { type: 'string', enum: ['legacy', 'character-model'], default: 'legacy' },
  }),
});

export function makeStrictProviderSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(makeStrictProviderSchema);

  const cloned = {};
  Object.entries(schema).forEach(([key, value]) => {
    if (key === 'default') return;
    cloned[key] = makeStrictProviderSchema(value);
  });

  if (cloned.type === 'object' && cloned.properties) {
    cloned.required = Object.keys(cloned.properties);
    cloned.additionalProperties = false;
    Object.entries(cloned.properties).forEach(([key, property]) => {
      const wasRequired = Array.isArray(schema.required) && schema.required.includes(key);
      if (!wasRequired && !property.anyOf) {
        cloned.properties[key] = { anyOf: [property, { type: 'null' }] };
      }
    });
  }
  return cloned;
}
