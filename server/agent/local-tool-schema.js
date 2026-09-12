import { TOOL_CATALOG } from '../../src/modules/agent/tool-catalog.js';

// Local chat templates benefit from genuinely optional fields. Responses
// strict mode makes every field required and nullable for a different protocol.
export function localToolSchema(input) {
  if (Array.isArray(input)) return input.map(localToolSchema);
  if (!input || typeof input !== 'object') return input;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (['$schema', 'default', 'title'].includes(key)) continue;
    result[key] = localToolSchema(value);
  }
  if (Object.hasOwn(result, 'const')) {
    result.enum = [result.const];
    result.type ||= Number.isInteger(result.const) ? 'integer' : typeof result.const;
    delete result.const;
  }
  if (result.enum?.length && !result.type) result.type = typeof result.enum[0];
  return result;
}

export const LOCAL_CHAT_TOOLS = Object.freeze(TOOL_CATALOG.map(tool => ({
  type: 'function',
  function: { name: tool.name, description: tool.description, parameters: localToolSchema(tool.inputSchema) },
})));
