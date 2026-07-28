export const PNG_MODEL_VERSION = 1;
export const PNG_MODEL_DEPTH_MAP_SIZE = 64;
export const PNG_MODEL_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const PNG_MODEL_MAX_SOURCE_DIMENSION = 1024;

export const PNG_MODEL_DEFAULT_SETTINGS = Object.freeze({
  name: 'PNG FLAT MODEL',
  targetSize: 4,
  density: 40,
  alphaThreshold: 16,
  thickness: 0.8,
  bulge: 1.35,
  smoothing: 1,
  manualStrength: 0.75,
  mirrorBack: true,
  sideColor: '#665533',
});

const LIMITS = Object.freeze({
  targetSize: [0.25, 50],
  density: [12, 72],
  alphaThreshold: [1, 254],
  thickness: [0.02, 20],
  bulge: [0.25, 4],
  smoothing: [0, 4],
  manualStrength: [0, 2],
});

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function boundedNumber(value, fallback, [min, max], integer = false) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  const bounded = Math.min(max, Math.max(min, safe));
  return integer ? Math.round(bounded) : bounded;
}

function normalizeColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate.toLowerCase() : fallback;
}

export function normalizePngModelSettings(settings = {}) {
  const merged = { ...PNG_MODEL_DEFAULT_SETTINGS, ...cloneValue(settings) };
  return {
    name: String(merged.name || PNG_MODEL_DEFAULT_SETTINGS.name).trim().slice(0, 80) || PNG_MODEL_DEFAULT_SETTINGS.name,
    targetSize: boundedNumber(merged.targetSize, PNG_MODEL_DEFAULT_SETTINGS.targetSize, LIMITS.targetSize),
    density: boundedNumber(merged.density, PNG_MODEL_DEFAULT_SETTINGS.density, LIMITS.density, true),
    alphaThreshold: boundedNumber(merged.alphaThreshold, PNG_MODEL_DEFAULT_SETTINGS.alphaThreshold, LIMITS.alphaThreshold, true),
    thickness: boundedNumber(merged.thickness, PNG_MODEL_DEFAULT_SETTINGS.thickness, LIMITS.thickness),
    bulge: boundedNumber(merged.bulge, PNG_MODEL_DEFAULT_SETTINGS.bulge, LIMITS.bulge),
    smoothing: boundedNumber(merged.smoothing, PNG_MODEL_DEFAULT_SETTINGS.smoothing, LIMITS.smoothing, true),
    manualStrength: boundedNumber(merged.manualStrength, PNG_MODEL_DEFAULT_SETTINGS.manualStrength, LIMITS.manualStrength),
    mirrorBack: merged.mirrorBack !== false,
    sideColor: normalizeColor(merged.sideColor, PNG_MODEL_DEFAULT_SETTINGS.sideColor),
  };
}

export function normalizePngModelSource(source = {}) {
  const dataURL = typeof source.dataURL === 'string' ? source.dataURL : '';
  const width = Math.round(Number(source.width) || 0);
  const height = Math.round(Number(source.height) || 0);
  return {
    version: PNG_MODEL_VERSION,
    dataURL,
    filename: String(source.filename || 'image.png').slice(0, 180),
    mime: source.mime === 'image/webp' ? 'image/webp' : 'image/png',
    width: Math.min(PNG_MODEL_MAX_SOURCE_DIMENSION, Math.max(0, width)),
    height: Math.min(PNG_MODEL_MAX_SOURCE_DIMENSION, Math.max(0, height)),
  };
}

export function validatePngModelSource(source = {}) {
  const normalized = normalizePngModelSource(source);
  if (!normalized.dataURL.startsWith('data:image/png;base64,') && !normalized.dataURL.startsWith('data:image/webp;base64,')) {
    return { ok: false, error: 'The source must be an embedded PNG or WebP data URL.' };
  }
  if (!normalized.width || !normalized.height) {
    return { ok: false, error: 'The source image dimensions are invalid.' };
  }
  if (normalized.dataURL.length > PNG_MODEL_MAX_SOURCE_BYTES * 1.45) {
    return { ok: false, error: 'The normalized source image is too large.' };
  }
  return { ok: true, source: normalized };
}

export function clonePngModelAnalysis(analysis = {}) {
  return cloneValue(analysis);
}

export function clonePngModelDepthMap(depthMap = {}) {
  const size = Math.min(96, Math.max(8, Math.round(Number(depthMap.size) || PNG_MODEL_DEPTH_MAP_SIZE)));
  const expected = size * size;
  const raw = Array.from(depthMap.values || []).slice(0, expected);
  while (raw.length < expected) raw.push(0);
  return {
    size,
    values: raw.map((value) => Math.min(100, Math.max(-100, Math.round(Number(value) || 0)))),
  };
}

export function isPngModelGroup(object) {
  return !!(object?.isGroup && object.userData?.pngModelSource?.dataURL);
}

export function markPngModelGroup(group, { source, settings, analysis, depthMap } = {}) {
  if (!group) return group;
  group.userData.pngModelSource = normalizePngModelSource(source);
  group.userData.pngModelSettings = normalizePngModelSettings(settings);
  group.userData.pngModelAnalysis = clonePngModelAnalysis(analysis);
  group.userData.pngModelDepthMap = clonePngModelDepthMap(depthMap);
  group.userData.pngModelVersion = PNG_MODEL_VERSION;
  return group;
}

export function clonePngModelRecipe(groupOrRecipe = {}) {
  const userData = groupOrRecipe?.userData || groupOrRecipe;
  return {
    source: normalizePngModelSource(userData.pngModelSource || userData.source || {}),
    settings: normalizePngModelSettings(userData.pngModelSettings || userData.settings || {}),
    analysis: clonePngModelAnalysis(userData.pngModelAnalysis || userData.analysis || {}),
    depthMap: clonePngModelDepthMap(userData.pngModelDepthMap || userData.depthMap || {}),
  };
}
