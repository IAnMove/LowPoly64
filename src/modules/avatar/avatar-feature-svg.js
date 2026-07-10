import {
  AVATAR_ACCESSORY_PRESETS,
  AVATAR_BROW_PRESETS,
  AVATAR_EAR_PRESETS,
  AVATAR_EYE_PRESETS,
  AVATAR_HAIR_PRESETS,
  AVATAR_MOUTH_PRESETS,
  AVATAR_NOSE_PRESETS,
} from '../../data/avatar/catalog.js';
import { parseSvgFeatureMetadata, SVG_SOURCE_MODE } from '../svg/svg-metadata.js';

export const AVATAR_FEATURE_SVG_VERSION = 1;

const FEATURE_CONFIG = Object.freeze({
  eyes: Object.freeze({ presets: AVATAR_EYE_PRESETS, markup: (preset) => preset.markup }),
  brows: Object.freeze({ presets: AVATAR_BROW_PRESETS, markup: (preset) => preset.markup }),
  nose: Object.freeze({ presets: AVATAR_NOSE_PRESETS, markup: (preset) => preset.markup }),
  mouth: Object.freeze({ presets: AVATAR_MOUTH_PRESETS, markup: (preset) => preset.markup }),
  ears: Object.freeze({ presets: AVATAR_EAR_PRESETS, markup: (preset) => `${preset.leftMarkup || ''}${preset.rightMarkup || ''}` }),
  hair: Object.freeze({ presets: AVATAR_HAIR_PRESETS, markup: (preset) => `${preset.backMarkup || ''}${preset.frontMarkup || ''}` }),
  accessory: Object.freeze({ presets: AVATAR_ACCESSORY_PRESETS, markup: (preset) => preset.markup }),
});

const DEFAULT_FEATURE_COLORS = Object.freeze({
  skin: '#efc2aa',
  skinShade: '#d89f83',
  hair: '#6c3a2a',
  hairLight: '#87513d',
  hairDark: '#472419',
  eyeWhite: '#ffffff',
  iris: '#3a79c2',
  pupil: '#111111',
  lip: '#8e4150',
  accent: '#2b87b6',
  accentDark: '#19546f',
  outline: '#171116',
  outlineSoft: '#3d2a2d',
});

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeToken(value) {
  return String(value || '').trim();
}

function resolvePaletteTokens(markup, colors = {}) {
  const palette = { ...DEFAULT_FEATURE_COLORS, ...colors };
  return markup.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, token) => palette[token] || '#ff00ff');
}

function resolvePreset(featureRole, presetId) {
  const config = FEATURE_CONFIG[featureRole];
  if (!config) throw new Error(`Unsupported avatar feature role: ${featureRole}`);
  const preset = config.presets.find((entry) => entry.id === presetId);
  if (!preset) throw new Error(`Unknown ${featureRole} preset: ${presetId}`);
  return { config, preset };
}

function resolveMountRole(featureRole, preset) {
  return normalizeToken(preset.mountRole) || ({
    eyes: 'eyePair',
    brows: 'browPair',
    nose: 'nose',
    mouth: 'mouth',
    ears: 'earPair',
    hair: 'hairCap',
    accessory: 'accessoryAnchor',
  }[featureRole] || featureRole);
}

export function exportAvatarFeaturePresetSvg(featureRole, presetId, options = {}) {
  const role = normalizeToken(featureRole);
  const { config, preset } = resolvePreset(role, presetId);
  const markup = resolvePaletteTokens(normalizeToken(config.markup(preset)), options.colors);
  if (!markup) {
    throw new Error(`${role} preset ${presetId} has no editable vector markup`);
  }
  const mountRole = resolveMountRole(role, preset);
  const mountTarget = normalizeToken(options.mountTarget) || 'HEAD';
  const viewBox = normalizeToken(options.viewBox) || '0 0 512 512';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttribute(viewBox)}" data-rv-import="layered-plane" data-rv-feature-version="${AVATAR_FEATURE_SVG_VERSION}" data-rv-feature-role="${escapeAttribute(role)}" data-rv-feature-key="${escapeAttribute(role)}" data-rv-mount-role="${escapeAttribute(mountRole)}" data-rv-parent="${escapeAttribute(mountTarget)}" data-rv-source-id="${escapeAttribute(preset.id)}" data-rv-source-kind="avatar-feature-preset"><g data-rv-feature-key="${escapeAttribute(role)}" data-rv-mount-role="${escapeAttribute(mountRole)}">${markup}</g></svg>`;
}

export function parseAvatarFeatureSvg(markup, options = {}) {
  if (typeof markup !== 'string' || !markup.trim()) throw new Error('Avatar feature SVG is empty');
  if (typeof DOMParser === 'undefined') throw new Error('Avatar feature SVG parsing requires DOMParser');
  const documentRoot = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (documentRoot.querySelector('parsererror')) throw new Error('Avatar feature SVG is not valid XML');
  const root = documentRoot.querySelector('svg');
  if (!root) throw new Error('Avatar feature SVG root is missing');

  const metadata = parseSvgFeatureMetadata(markup);
  if (!FEATURE_CONFIG[metadata.role]) throw new Error(`Unsupported avatar feature role: ${metadata.role || 'missing'}`);
  if (!metadata.mountRole) throw new Error('Avatar feature SVG mount role is missing');
  if (!metadata.mountTarget) throw new Error('Avatar feature SVG mount target is missing');
  if (!metadata.sourceId) throw new Error('Avatar feature SVG source id is missing');
  if (metadata.sourceKind !== 'avatar-feature-preset') throw new Error('Avatar feature SVG source kind is invalid');

  const viewBoxValues = metadata.viewBox.split(/[\s,]+/).map(Number);
  if (viewBoxValues.length !== 4 || viewBoxValues.some((value) => !Number.isFinite(value)) || viewBoxValues[2] <= 0 || viewBoxValues[3] <= 0) {
    throw new Error('Avatar feature SVG viewBox is invalid');
  }
  if (!root.querySelector('path, circle, ellipse, rect, polygon, polyline')) {
    throw new Error('Avatar feature SVG has no editable geometry');
  }
  if (options.expectedRole && metadata.role !== options.expectedRole) {
    throw new Error(`Avatar feature role changed from ${options.expectedRole} to ${metadata.role}`);
  }
  if (options.expectedSourceId && metadata.sourceId !== options.expectedSourceId) {
    throw new Error(`Avatar feature source changed from ${options.expectedSourceId} to ${metadata.sourceId}`);
  }

  return {
    version: Number(root.getAttribute('data-rv-feature-version')) || AVATAR_FEATURE_SVG_VERSION,
    metadata,
    markup,
  };
}

export function createAvatarFeatureSvgSource(markup, options = {}) {
  const parsed = parseAvatarFeatureSvg(markup, options);
  return {
    mode: SVG_SOURCE_MODE.CODE,
    markup: parsed.markup,
    filename: `${parsed.metadata.sourceId}.svg`,
    feature: parsed.metadata,
    inputs: {
      featureRole: parsed.metadata.role,
      mountRole: parsed.metadata.mountRole,
      mountTarget: parsed.metadata.mountTarget,
      sourceId: parsed.metadata.sourceId,
    },
  };
}
