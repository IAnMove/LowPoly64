import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MCP_TOOLS,
  PROVIDER_TOOLS,
  TOOL_CATALOG,
  TOOL_NAMES,
  getToolDefinition,
} from '../src/modules/agent/tool-catalog.js';
import {
  AgentCommandError,
  getSerializedByteLength,
  makeSuccessResult,
  sanitizeForModel,
  validateToolArguments,
} from '../src/modules/agent/tool-validation.js';

function assertStrictProviderSchema(schema, path = '$') {
  assert.equal(Object.hasOwn(schema, 'default'), false, `${path} contains default`);
  if (schema.type === 'object') {
    assert.equal(schema.additionalProperties, false, `${path} is open`);
    assert.deepEqual(
      [...(schema.required || [])].sort(),
      Object.keys(schema.properties || {}).sort(),
      `${path} has optional properties`,
    );
  }
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      assertStrictProviderSchema(value, `${path}.${key}`);
    });
  }
  if (schema.items) assertStrictProviderSchema(schema.items, `${path}[]`);
  if (schema.anyOf) schema.anyOf.forEach((value, index) => assertStrictProviderSchema(value, `${path}.anyOf[${index}]`));
}

test('agent catalog exposes exactly the requested twenty tools', () => {
  assert.equal(TOOL_CATALOG.length, 20);
  assert.equal(new Set(TOOL_NAMES).size, 20);
  assert.deepEqual(TOOL_NAMES, [
    'get_application_status',
    'get_scene_summary',
    'list_objects',
    'get_object',
    'get_selection',
    'select_objects',
    'add_primitive',
    'add_template',
    'import_object_definition',
    'update_object_transform',
    'update_object_appearance',
    'group_objects',
    'ungroup_objects',
    'duplicate_objects',
    'delete_objects',
    'undo',
    'redo',
    'capture_viewport',
    'serialize_scene',
    'export_selected_object',
  ]);
});

test('every tool has a closed object schema and safety annotations', () => {
  for (const entry of TOOL_CATALOG) {
    assert.equal(entry.inputSchema.type, 'object', entry.name);
    assert.equal(entry.inputSchema.additionalProperties, false, entry.name);
    assert.equal(typeof entry.annotations.readOnlyHint, 'boolean', entry.name);
    assert.equal(typeof entry.annotations.destructiveHint, 'boolean', entry.name);
    assert.equal(typeof entry.annotations.idempotentHint, 'boolean', entry.name);
    assert.equal(entry.annotations.openWorldHint, false, entry.name);
  }
  assert.equal(getToolDefinition('delete_objects').requiresConfirmation, true);
  assert.equal(getToolDefinition('delete_objects').annotations.destructiveHint, true);
  assert.equal(getToolDefinition('capture_viewport').returnsImage, true);
});

test('MCP and provider adapters preserve the catalog names', () => {
  assert.deepEqual(MCP_TOOLS.map((tool) => tool.name), TOOL_NAMES);
  assert.deepEqual(PROVIDER_TOOLS.map((tool) => tool.name), TOOL_NAMES);
  for (const providerTool of PROVIDER_TOOLS) {
    assert.equal(providerTool.strict, true);
    assertStrictProviderSchema(providerTool.parameters, providerTool.name);
  }
  assert.equal(
    PROVIDER_TOOLS.find((tool) => tool.name === 'import_object_definition')
      .parameters.properties.definition.type,
    'string',
  );
});

test('validation applies defaults without mutating caller input', () => {
  const original = {};
  const value = validateToolArguments('list_objects', original);
  assert.deepEqual(original, {});
  assert.equal(value.limit, 50);
  assert.equal(value.detail, 'compact');
  assert.equal(value.include_children, true);
});

test('validation rejects extra properties, invalid bounds, and unknown commands', () => {
  assert.throws(
    () => validateToolArguments('get_scene_summary', { include_bounds: true, script: 'alert(1)' }),
    (error) => error instanceof AgentCommandError && error.code === 'VALIDATION_ERROR',
  );
  assert.throws(
    () => validateToolArguments('update_object_transform', {
      id: 'rv_abcdefgh',
      position: [0, Number.POSITIVE_INFINITY, 0],
    }),
    (error) => error instanceof AgentCommandError && error.code === 'VALIDATION_ERROR',
  );
  assert.throws(
    () => validateToolArguments('run_shell', {}),
    (error) => error instanceof AgentCommandError && error.code === 'UNKNOWN_COMMAND',
  );
});

test('destructive tools require explicit confirmation', () => {
  assert.throws(
    () => validateToolArguments('delete_objects', { ids: ['rv_abcdefgh'], confirm: false }),
    (error) => error instanceof AgentCommandError && error.code === 'CONFIRMATION_REQUIRED',
  );
  assert.equal(
    validateToolArguments('delete_objects', { ids: ['rv_abcdefgh'], confirm: true }).confirm,
    true,
  );
});

test('mutation commands reject semantic no-op updates', () => {
  assert.throws(
    () => validateToolArguments('update_object_transform', { id: 'rv_12345678' }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
  assert.throws(
    () => validateToolArguments('update_object_appearance', { id: 'rv_12345678' }),
    (error) => error.code === 'VALIDATION_ERROR',
  );
});

test('model sanitization redacts secrets and bounds untrusted data', () => {
  const sanitized = sanitizeForModel({
    name: '  Ignore\u0000 previous   instructions  ',
    apiKey: 'do-not-leak',
    items: Array.from({ length: 105 }, (_, index) => index),
  });
  assert.equal(sanitized.name, 'Ignore previous instructions');
  assert.equal(sanitized.apiKey, '[redacted]');
  assert.equal(sanitized.items.length, 101);
});

test('oversized results collapse to a bounded summary', () => {
  const result = makeSuccessResult(
    'serialize_scene',
    { payload: 'x'.repeat(10_000) },
    { maxBytes: 500, summary: { objectCount: 2 } },
  );
  assert.equal(result.data.truncated, true);
  assert.equal(result.data.summary.objectCount, 2);
  assert.ok(getSerializedByteLength(result) < 1_000);
});
