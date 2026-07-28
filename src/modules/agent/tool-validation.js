import Ajv from 'ajv';
import {
  MAX_COMMAND_BYTES,
  MAX_TOOL_OUTPUT_BYTES,
} from './tool-schema.js';
import { getToolDefinition } from './tool-catalog.js';

const ajv = new Ajv({
  allErrors: true,
  coerceTypes: false,
  strict: false,
  useDefaults: true,
});
const validators = new Map();

function byteLength(value) {
  const json = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(json, 'utf8');
  return new TextEncoder().encode(json).byteLength;
}

function formatAjvErrors(errors = []) {
  return errors.map((error) => ({
    path: error.instancePath || '/',
    keyword: error.keyword,
    message: error.message || 'Invalid value',
  }));
}

export class AgentCommandError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = 'AgentCommandError';
    this.code = code;
    this.details = details;
  }
}

export function validateToolArguments(name, args = {}) {
  const definition = getToolDefinition(name);
  if (!definition) {
    throw new AgentCommandError('UNKNOWN_COMMAND', `Unknown command: ${String(name)}`);
  }
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new AgentCommandError('VALIDATION_ERROR', 'Command arguments must be an object.');
  }
  if (byteLength(args) > MAX_COMMAND_BYTES) {
    throw new AgentCommandError('PAYLOAD_TOO_LARGE', `Command payload exceeds ${MAX_COMMAND_BYTES} bytes.`);
  }

  let validate = validators.get(name);
  if (!validate) {
    validate = ajv.compile(definition.inputSchema);
    validators.set(name, validate);
  }

  const cloned = structuredClone(args);
  if (!validate(cloned)) {
    throw new AgentCommandError(
      'VALIDATION_ERROR',
      `Invalid arguments for ${name}.`,
      formatAjvErrors(validate.errors),
    );
  }
  if (definition.requiresConfirmation && cloned.confirm !== true) {
    throw new AgentCommandError(
      'CONFIRMATION_REQUIRED',
      `${name} requires explicit confirm=true.`,
      { command: name },
    );
  }
  if (name === 'update_object_transform'
    && ['position', 'rotation_degrees', 'scale'].every((key) => cloned[key] == null)) {
    throw new AgentCommandError(
      'VALIDATION_ERROR',
      'update_object_transform requires at least one transform field.',
    );
  }
  if (name === 'update_object_appearance'
    && ['name', 'color', 'material', 'opacity'].every((key) => cloned[key] == null)) {
    throw new AgentCommandError(
      'VALIDATION_ERROR',
      'update_object_appearance requires at least one appearance field.',
    );
  }
  return cloned;
}

export function sanitizeUntrustedText(value, maxLength = 500) {
  const normalized = String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(0, maxLength - 1))}…`
    : normalized;
}

export function sanitizeForModel(value, options = {}, depth = 0) {
  const maxDepth = options.maxDepth ?? 8;
  const maxArray = options.maxArray ?? 100;
  const maxString = options.maxString ?? 2_000;
  if (depth > maxDepth) return '[truncated-depth]';
  if (typeof value === 'string') return sanitizeUntrustedText(value, maxString);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || value == null) return value;
  if (Array.isArray(value)) {
    const items = value.slice(0, maxArray).map((entry) => sanitizeForModel(entry, options, depth + 1));
    if (value.length > maxArray) items.push(`[${value.length - maxArray} more items]`);
    return items;
  }
  if (typeof value === 'object') {
    const result = {};
    Object.entries(value).slice(0, 200).forEach(([key, entry]) => {
      const safeKey = sanitizeUntrustedText(key, 120);
      if (/api.?key|authorization|bearer|password|secret|token/i.test(safeKey)) {
        result[safeKey] = '[redacted]';
      } else {
        result[safeKey] = sanitizeForModel(entry, options, depth + 1);
      }
    });
    return result;
  }
  return sanitizeUntrustedText(value, maxString);
}

export function makeSuccessResult(command, data = {}, options = {}) {
  const result = {
    ok: true,
    command,
    changedIds: options.changedIds || [],
    warnings: options.warnings || [],
    data: sanitizeForModel(data),
    scene: sanitizeForModel(options.scene || {}),
    untrustedData: true,
  };
  const maxBytes = options.maxBytes || getToolDefinition(command)?.maxOutputBytes || MAX_TOOL_OUTPUT_BYTES;
  if (byteLength(result) <= maxBytes) return result;
  return {
    ok: true,
    command,
    changedIds: result.changedIds.slice(0, 50),
    warnings: [...result.warnings, 'Result data was truncated to its summary because it exceeded the output limit.'],
    data: { truncated: true, summary: sanitizeForModel(options.summary || {}) },
    scene: result.scene,
    untrustedData: true,
  };
}

export function makeErrorResult(command, error) {
  const known = error instanceof AgentCommandError
    || (error && typeof error.code === 'string' && /^[A-Z][A-Z0-9_]{1,80}$/.test(error.code));
  return {
    ok: false,
    command: sanitizeUntrustedText(command, 120),
    error: {
      code: known ? sanitizeUntrustedText(error.code, 80) : 'COMMAND_FAILED',
      message: sanitizeUntrustedText(error?.message || 'Command failed.', 500),
      details: known ? sanitizeForModel(error.details) : null,
    },
    changedIds: [],
    warnings: [],
    untrustedData: true,
  };
}

export function getSerializedByteLength(value) {
  return byteLength(value);
}
