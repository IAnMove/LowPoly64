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
    ...(error.params || {}),
    ...(error.params?.allowedValue !== undefined ? { expected: error.params.allowedValue } : {}),
    ...(error.params?.allowedValues ? { allowed: error.params.allowedValues } : {}),
    ...(['id', 'source_id'].some(key => error.instancePath === '/' + key)
      ? { hint: 'Scene IDs start rv_. For a catalog entry, supply catalog_id and omit id/source_id.' }
      : {}),
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

function cloneLossless(value) {
  if (value == null || typeof value !== 'object') return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function base64ByteLength(value) {
  const normalized = String(value || '').replace(/\s+/g, '');
  if (typeof Buffer !== 'undefined') return Buffer.from(normalized, 'base64').byteLength;
  if (typeof atob === 'function') return atob(normalized).length;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(normalized.length * 3 / 4) - padding);
}

function normalizeArtifactKind(rawKind, mimeType, encoding, data) {
  const kind = String(rawKind || '').toLowerCase();
  if (kind === 'png' || kind === 'jpeg' || kind === 'jpg' || kind === 'image') return 'image';
  if (kind === 'json' || kind === 'document') return 'json';
  if (kind === 'binary' || kind === 'file' || kind === 'glb') return 'binary';
  if (String(mimeType || '').startsWith('image/')) return 'image';
  if (String(mimeType || '') === 'application/json' || encoding === 'json') return 'json';
  if (typeof data === 'object' && data !== null) return 'json';
  return 'binary';
}

function normalizeArtifact(raw, command, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AgentCommandError('ARTIFACT_INVALID', `Artifact ${index + 1} must be an object.`);
  }
  let data = raw.data ?? raw.payload ?? raw.value;
  if (data === undefined) {
    throw new AgentCommandError('ARTIFACT_INVALID', `Artifact ${index + 1} is missing data.`);
  }
  let mimeType = String(raw.mimeType || raw.mime || '').trim().toLowerCase();
  const rawEncoding = String(raw.encoding || '').toLowerCase();
  const kind = normalizeArtifactKind(raw.kind || raw.type, mimeType, rawEncoding, data);
  if (!mimeType) {
    mimeType = kind === 'image'
      ? 'image/png'
      : kind === 'json'
        ? 'application/json'
        : 'application/octet-stream';
  }

  let encoding = rawEncoding;
  if (!encoding) encoding = kind === 'json' && typeof data !== 'string' ? 'json' : kind === 'json' ? 'utf8' : 'base64';
  if (encoding === 'base64') {
    if (typeof data !== 'string') {
      throw new AgentCommandError('ARTIFACT_INVALID', `Binary artifact ${index + 1} must use a base64 string.`);
    }
    const dataUrlMatch = data.match(/^data:[^;,]+;base64,(.*)$/s);
    if (dataUrlMatch) data = dataUrlMatch[1];
    data = data.replace(/\s+/g, '');
  } else if (encoding === 'json') {
    data = cloneLossless(data);
  } else {
    encoding = 'utf8';
    data = String(data);
  }

  const id = sanitizeUntrustedText(raw.id || `${command}-artifact-${index + 1}`, 120)
    || `${command}-artifact-${index + 1}`;
  const defaultExtension = kind === 'image' ? 'png' : kind === 'json' ? 'json' : 'bin';
  const filename = sanitizeUntrustedText(
    raw.filename || `${command}-${index + 1}.${defaultExtension}`,
    160,
  ) || `${command}-${index + 1}.${defaultExtension}`;
  const artifactByteLength = encoding === 'base64'
    ? base64ByteLength(data)
    : byteLength(encoding === 'json' ? JSON.stringify(data) : data);
  const artifact = {
    id,
    kind,
    mimeType,
    filename,
    encoding,
    byteLength: artifactByteLength,
    data,
  };
  for (const key of ['width', 'height']) {
    if (Number.isFinite(raw[key])) artifact[key] = Math.max(0, Math.round(raw[key]));
  }
  if (raw.view != null) artifact.view = sanitizeUntrustedText(raw.view, 80);
  return artifact;
}
function inferArtifactCandidates(command, data, options = {}) {
  if (Array.isArray(options.artifacts)) return options.artifacts;
  if (Array.isArray(data?.artifacts)) return data.artifacts;
  if (command === 'capture_viewport' && typeof data?.data === 'string' && data.mimeType) {
    return [{
      id: 'capture-viewport',
      kind: 'image',
      mimeType: data.mimeType,
      filename: 'capture.png',
      encoding: 'base64',
      data: data.data,
      width: data.width,
      height: data.height,
    }];
  }
  if (Array.isArray(data?.views)) {
    return data.views
      .filter((view) => view && typeof view.data === 'string' && view.mimeType)
      .map((view, index) => ({ ...view, id: view.id || `view-${index + 1}` }));
  }
  if ((command === 'export_selected_object' || command === 'export_character_asset')
    && data && data.definition !== undefined) {
    return [{
      id: 'export-definition',
      kind: 'json',
      mimeType: data.mimeType || 'application/json',
      filename: data.filename || 'character-export.json',
      encoding: typeof data.definition === 'string' ? 'utf8' : 'json',
      data: data.definition,
    }];
  }
  if (command === 'export_character_asset' && data && typeof data.data === 'string' && data.mimeType) {
    return [{
      id: 'export-asset',
      kind: data.format === 'json' ? 'json' : 'binary',
      mimeType: data.mimeType,
      filename: data.filename || 'character-export.bin',
      encoding: 'base64',
      data: data.data,
    }];
  }
  if (command === 'get_character_capabilities' && data
    && (data.schema !== undefined || data.capabilities !== undefined || Array.isArray(data.engines))) {
    return [{
      id: 'character-capabilities',
      kind: 'json',
      mimeType: 'application/json',
      filename: 'character-capabilities.json',
      encoding: 'json',
      data: data.schema ?? data.capabilities ?? data,
    }];
  }
  if (command === 'serialize_scene' && data && typeof data === 'object'
    && Number.isFinite(data.version) && Array.isArray(data.objects)) {
    return [{
      id: 'serialized-scene',
      kind: 'json',
      mimeType: 'application/json',
      filename: 'scene.json',
      encoding: 'json',
      data,
    }];
  }
  return [];
}

export function extractLosslessArtifacts(command, data = {}, options = {}) {
  return inferArtifactCandidates(command, data, options)
    .map((artifact, index) => normalizeArtifact(artifact, command, index));
}

export function summarizeLosslessArtifacts(artifacts = []) {
  return artifacts.map((artifact) => {
    const summary = {
      id: artifact.id,
      kind: artifact.kind,
      mimeType: artifact.mimeType,
      filename: artifact.filename,
      encoding: artifact.encoding,
      byteLength: artifact.byteLength,
      truncated: false,
    };
    for (const key of ['width', 'height']) {
      if (artifact[key] !== undefined) summary[key] = artifact[key];
    }
    if (artifact.view !== undefined) summary.view = artifact.view;
    return summary;
  });
}

export function compactArtifactResult(result, options = {}) {
  if (!result || typeof result !== 'object') return sanitizeForModel(result, options);
  const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
  const compact = { ...result };
  delete compact.artifacts;
  if (artifacts.length) compact.artifactSummary = summarizeLosslessArtifacts(artifacts);
  if (compact.data && typeof compact.data === 'object' && !Array.isArray(compact.data)) {
    compact.data = { ...compact.data };
    const jsonArtifact = artifacts.find((artifact) => artifact.kind === 'json');
    if (jsonArtifact && (compact.command === 'export_selected_object'
      || compact.command === 'export_character_asset')) {
      compact.data.definition = { artifactId: jsonArtifact.id, full: true };
    }
    if (typeof compact.data.data === 'string') {
      const dataArtifact = artifacts.find((artifact) => artifact.encoding === 'base64');
      if (dataArtifact) {
        compact.data.data = `[artifact:${dataArtifact.id}]`;
        compact.data.artifactId = dataArtifact.id;
        compact.data.dataOmitted = true;
      }
    }
    if (Array.isArray(compact.data.views)) {
      compact.data.views = compact.data.views.map((view) => {
        const artifact = artifacts.find((candidate) => candidate.id === view?.id
          || candidate.id === view?.view
          || candidate.view === view?.view);
        return artifact && typeof view?.data === 'string'
          ? { ...view, data: `[artifact:${artifact.id}]` }
          : view;
      });
    }
    if (Array.isArray(compact.data.artifacts)) compact.data.artifacts = summarizeLosslessArtifacts(artifacts);
  }
  return sanitizeForModel(compact, options);
}
function artifactFailure(command, code, message, details, options = {}, summaries = []) {
  return {
    ok: false,
    command: sanitizeUntrustedText(command, 120),
    error: {
      code,
      message,
      details: sanitizeForModel(details),
    },
    changedIds: options.changedIds || [],
    warnings: options.warnings || [],
    scene: sanitizeForModel(options.scene || {}),
    artifactSummary: summaries.map((summary) => ({ ...summary, truncated: true })),
    untrustedData: true,
  };
}
export function makeSuccessResult(command, data = {}, options = {}) {
  let artifacts = [];
  try {
    artifacts = extractLosslessArtifacts(command, data, options);
  } catch (error) {
    return artifactFailure(
      command,
      error.code || 'ARTIFACT_INVALID',
      sanitizeUntrustedText(error.message || 'Artifact is invalid.', 500),
      error.details || null,
      options,
    );
  }
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
  if (artifacts.length) {
    const summaries = summarizeLosslessArtifacts(artifacts);
    const losslessResult = {
      ...result,
      artifacts,
      artifactSummary: summaries,
    };
    const compactObservation = compactArtifactResult(losslessResult, {
      maxString: 2_000,
      maxArray: 100,
    });
    const transportResult = {
      ...losslessResult,
      data: compactObservation.data,
    };
    const oversized = summaries.find((artifact) => artifact.byteLength > maxBytes);
    if (oversized || byteLength(transportResult) > maxBytes) {
      return artifactFailure(
        command,
        'ARTIFACT_TOO_LARGE',
        'The complete artifact exceeds the tool output limit and was not truncated.',
        {
          artifactId: oversized?.id || null,
          byteLength: oversized?.byteLength || byteLength(transportResult),
          maxBytes,
        },
        options,
        summaries,
      );
    }
    return transportResult;
  }
  if (byteLength(result) <= maxBytes) return result;
  return {
    ...artifactFailure(
      command,
      'RESULT_TOO_LARGE',
      'The complete tool result exceeds the output limit and was not truncated into a success.',
      {
        byteLength: byteLength(result),
        maxBytes,
      },
      options,
    ),
    data: { truncated: true, summary: sanitizeForModel(options.summary || {}) },
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
