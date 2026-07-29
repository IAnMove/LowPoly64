export const PNG_MODEL_VERSION = 2;
export const PNG_MODEL_ALGORITHM_VERSION = 2;
export const PNG_MODEL_DEPTH_MAP_SIZE = 64;
export const PNG_MODEL_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const PNG_MODEL_MAX_SOURCE_DIMENSION = 1024;
export const PNG_MODEL_MAX_INPUT_DIMENSION = 8192;
export const PNG_MODEL_MAX_INPUT_PIXELS = 32 * 1024 * 1024;
export const PNG_MODEL_DEPTH_PROFILES = Object.freeze(['balanced', 'organic', 'relief']);
export const PNG_MODEL_COMPONENT_MODES = Object.freeze(['largest', 'all']);
export const PNG_MODEL_SIDE_STYLES = Object.freeze(['sampled', 'solid']);

export const PNG_MODEL_DEFAULT_SETTINGS = Object.freeze({
  algorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
  name: 'PNG FLAT MODEL',
  targetSize: 4,
  density: 40,
  alphaThreshold: 16,
  thickness: 0.8,
  bulge: 1.35,
  depthProfile: 'balanced',
  smoothing: 1,
  manualStrength: 0.75,
  mirrorBack: true,
  sideColor: '#665533',
  edgeDepth: 0.03,
  edgeFalloff: 0.18,
  coverageThreshold: 0.2,
  componentMode: 'largest',
  minComponentCells: 2,
  sideStyle: 'sampled',
  keepDepthRatio: true,
});

export const PNG_MODEL_NEW_SETTINGS = Object.freeze({
  ...PNG_MODEL_DEFAULT_SETTINGS,
  thickness: 1.1,
  bulge: 1,
  depthProfile: 'organic',
  smoothing: 2,
  manualStrength: 1,
});

const LIMITS = Object.freeze({
  targetSize: [0.25, 50],
  density: [12, 72],
  alphaThreshold: [1, 254],
  thickness: [0.02, 20],
  bulge: [0.25, 4],
  smoothing: [0, 4],
  manualStrength: [0, 2],
  edgeDepth: [0, 0.25],
  edgeFalloff: [0.02, 0.8],
  coverageThreshold: [0.01, 1],
  minComponentCells: [1, 256],
});

const ANALYSIS_NUMBER_KEYS = Object.freeze([
  'algorithmVersion',
  'width',
  'height',
  'columns',
  'rows',
  'opaqueCells',
  'surfaceCells',
  'boundaryEdges',
  'vertexCount',
  'triangleCount',
  'maximumHalfDepth',
  'maximumDepth',
  'averageHalfDepth',
  'medianBoundaryDepth',
  'p95BoundaryDepth',
  'maximumBoundaryDepth',
  'averageBoundaryDepth',
  'silhouetteCoverageErrorBefore',
  'silhouetteCoverageErrorAfter',
  'boundaryProjectionMean',
  'boundaryProjectionMax',
  'depthToHeightRatio',
  'sourceWidth',
  'sourceHeight',
  'alphaThreshold',
  'componentCount',
  'originalComponentCount',
  'removedCells',
  'keptComponentCells',
  'discardedComponentCells',
  'coverageThreshold',
  'boundaryVertexCount',
  'boundaryDepthMedian',
  'boundaryDepthP95',
  'boundaryMedian',
  'boundaryP95',
  'sideVertexSavings',
]);

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

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function readUint32BE(bytes, offset) {
  return (((bytes[offset] << 24) >>> 0)
    + (bytes[offset + 1] << 16)
    + (bytes[offset + 2] << 8)
    + bytes[offset + 3]) >>> 0;
}

function readUint24LE(bytes, offset) {
  return bytes[offset] + (bytes[offset + 1] << 8) + (bytes[offset + 2] << 16);
}

function ascii(bytes, offset, length) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function validateInputDimensions(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    return 'The source image dimensions are invalid.';
  }
  if (width > PNG_MODEL_MAX_INPUT_DIMENSION || height > PNG_MODEL_MAX_INPUT_DIMENSION) {
    return `The source image dimensions must not exceed ${PNG_MODEL_MAX_INPUT_DIMENSION}px.`;
  }
  if (width * height > PNG_MODEL_MAX_INPUT_PIXELS) {
    return 'The source image contains too many pixels.';
  }
  return null;
}

export function inspectPngModelImageHeader(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  let mime = '';
  let width = 0;
  let height = 0;

  const isPng = bytes.length >= 24
    && bytes[0] === 0x89
    && ascii(bytes, 1, 3) === 'PNG'
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
    && ascii(bytes, 12, 4) === 'IHDR';

  if (isPng) {
    mime = 'image/png';
    width = readUint32BE(bytes, 16);
    height = readUint32BE(bytes, 20);
  } else if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    mime = 'image/webp';
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8X' && bytes.length >= 30) {
      width = readUint24LE(bytes, 24) + 1;
      height = readUint24LE(bytes, 27) + 1;
    } else if (
      chunk === 'VP8 '
      && bytes.length >= 30
      && bytes[23] === 0x9d
      && bytes[24] === 0x01
      && bytes[25] === 0x2a
    ) {
      width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      width = 1 + bytes[21] + ((bytes[22] & 0x3f) << 8);
      height = 1 + ((bytes[22] & 0xc0) >> 6) + (bytes[23] << 2) + ((bytes[24] & 0x0f) << 10);
    }
  }

  if (!mime) {
    return { ok: false, error: 'The file header is not a supported PNG or WebP image.' };
  }
  const dimensionError = validateInputDimensions(width, height);
  if (dimensionError) return { ok: false, error: dimensionError };
  return { ok: true, mime, width, height };
}

export function inspectPngModelDataURL(dataURL) {
  if (typeof dataURL !== 'string') {
    return { ok: false, error: 'The source must be an embedded PNG or WebP data URL.' };
  }
  const match = /^data:(image\/(?:png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(dataURL);
  if (!match) {
    return { ok: false, error: 'The source must be an embedded PNG or WebP data URL.' };
  }
  const payload = match[2].replace(/\s/g, '');
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const byteLength = Math.max(0, Math.floor(payload.length * 3 / 4) - padding);
  if (byteLength > PNG_MODEL_MAX_SOURCE_BYTES) {
    return { ok: false, error: 'The normalized source image is too large.' };
  }

  try {
    const headerPayload = payload.slice(0, Math.min(payload.length, 88));
    const decoded = atob(headerPayload);
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    const header = inspectPngModelImageHeader(bytes);
    if (!header.ok) return header;
    if (header.mime !== match[1].toLowerCase()) {
      return { ok: false, error: 'The image MIME type does not match its file header.' };
    }
    return { ...header, byteLength };
  } catch {
    return { ok: false, error: 'The embedded image data is not valid base64.' };
  }
}

export function normalizePngModelSettings(settings = {}, options = {}) {
  const input = settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
  const legacyBalanced = options.legacy === true;
  const fallback = PNG_MODEL_DEFAULT_SETTINGS;
  return {
    algorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
    name: String(input.name || fallback.name).trim().slice(0, 80) || fallback.name,
    targetSize: boundedNumber(input.targetSize, fallback.targetSize, LIMITS.targetSize),
    density: boundedNumber(input.density, fallback.density, LIMITS.density, true),
    alphaThreshold: boundedNumber(input.alphaThreshold, fallback.alphaThreshold, LIMITS.alphaThreshold, true),
    thickness: boundedNumber(input.thickness, fallback.thickness, LIMITS.thickness),
    bulge: boundedNumber(input.bulge, fallback.bulge, LIMITS.bulge),
    depthProfile: legacyBalanced
      ? 'balanced'
      : enumValue(input.depthProfile, PNG_MODEL_DEPTH_PROFILES, fallback.depthProfile),
    smoothing: boundedNumber(input.smoothing, fallback.smoothing, LIMITS.smoothing, true),
    manualStrength: boundedNumber(input.manualStrength, fallback.manualStrength, LIMITS.manualStrength),
    mirrorBack: input.mirrorBack !== false,
    sideColor: normalizeColor(input.sideColor, fallback.sideColor),
    edgeDepth: boundedNumber(input.edgeDepth, fallback.edgeDepth, LIMITS.edgeDepth),
    edgeFalloff: boundedNumber(input.edgeFalloff, fallback.edgeFalloff, LIMITS.edgeFalloff),
    coverageThreshold: boundedNumber(input.coverageThreshold, fallback.coverageThreshold, LIMITS.coverageThreshold),
    componentMode: enumValue(input.componentMode, PNG_MODEL_COMPONENT_MODES, fallback.componentMode),
    minComponentCells: boundedNumber(input.minComponentCells, fallback.minComponentCells, LIMITS.minComponentCells, true),
    sideStyle: enumValue(input.sideStyle, PNG_MODEL_SIDE_STYLES, fallback.sideStyle),
    keepDepthRatio: input.keepDepthRatio !== false,
  };
}

export function normalizePngModelSource(source = {}) {
  const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  return {
    version: PNG_MODEL_VERSION,
    dataURL: typeof input.dataURL === 'string' ? input.dataURL : '',
    filename: String(input.filename || 'image.png').slice(0, 180),
    mime: input.mime === 'image/webp' ? 'image/webp' : 'image/png',
    width: Math.max(0, Math.round(Number(input.width) || 0)),
    height: Math.max(0, Math.round(Number(input.height) || 0)),
  };
}

export function validatePngModelSource(source = {}) {
  const input = source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  const inspection = inspectPngModelDataURL(input.dataURL);
  if (!inspection.ok) return inspection;
  const normalized = normalizePngModelSource({
    dataURL: input.dataURL,
    filename: input.filename,
    mime: inspection.mime,
    width: inspection.width,
    height: inspection.height,
  });
  return { ok: true, source: normalized, inspection };
}

export function clonePngModelAnalysis(analysis = {}) {
  const input = analysis && typeof analysis === 'object' && !Array.isArray(analysis) ? analysis : {};
  const cloned = {};
  ANALYSIS_NUMBER_KEYS.forEach((key) => {
    const value = Number(input[key]);
    if (Number.isFinite(value)) cloned[key] = value;
  });
  if (input.bounds && typeof input.bounds === 'object' && !Array.isArray(input.bounds)) {
    const bounds = {};
    ['x', 'y', 'width', 'height', 'opaquePixels'].forEach((key) => {
      const value = Number(input.bounds[key]);
      if (Number.isFinite(value)) bounds[key] = value;
    });
    if (Object.keys(bounds).length) cloned.bounds = bounds;
  }
  return cloned;
}

export function clonePngModelDepthMap(depthMap = {}) {
  const input = depthMap && typeof depthMap === 'object' && !Array.isArray(depthMap) ? depthMap : {};
  const size = Math.min(96, Math.max(8, Math.round(Number(input.size) || PNG_MODEL_DEPTH_MAP_SIZE)));
  const expected = size * size;
  const raw = Array.from(input.values || []).slice(0, expected);
  while (raw.length < expected) raw.push(0);
  return {
    size,
    values: raw.map((value) => Math.min(100, Math.max(-100, Math.round(Number(value) || 0)))),
  };
}

function recipeVersion(userData, rawSource, rawSettings) {
  const version = Number(userData.pngModelVersion ?? userData.version ?? rawSource?.version);
  const algorithmVersion = Number(
    userData.pngModelAlgorithmVersion
    ?? userData.algorithmVersion
    ?? rawSettings?.algorithmVersion,
  );
  return {
    version: Number.isFinite(version) ? version : 1,
    algorithmVersion: Number.isFinite(algorithmVersion) ? algorithmVersion : 1,
  };
}

export function normalizePngModelRecipe(groupOrRecipe = {}) {
  const userData = groupOrRecipe?.userData || groupOrRecipe || {};
  const rawSource = userData.pngModelSource || userData.source || {};
  const rawSettings = userData.pngModelSettings || userData.settings || {};
  const detected = recipeVersion(userData, rawSource, rawSettings);
  const legacy = detected.version < PNG_MODEL_VERSION
    || detected.algorithmVersion < PNG_MODEL_ALGORITHM_VERSION;
  const migrations = Array.from(new Set(
    (Array.isArray(userData.pngModelMigrations) ? userData.pngModelMigrations : userData.migrations || [])
      .filter((entry) => entry === 'legacy-balanced-v2'),
  ));
  if (legacy && !migrations.includes('legacy-balanced-v2')) migrations.push('legacy-balanced-v2');
  return {
    version: PNG_MODEL_VERSION,
    algorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
    source: normalizePngModelSource(rawSource),
    settings: normalizePngModelSettings(rawSettings, { legacy }),
    analysis: clonePngModelAnalysis(userData.pngModelAnalysis || userData.analysis || {}),
    depthMap: clonePngModelDepthMap(userData.pngModelDepthMap || userData.depthMap || {}),
    migrations,
  };
}

export function isPngModelGroup(object) {
  return !!(object?.isGroup && object.userData?.pngModelSource?.dataURL);
}

export function markPngModelGroup(group, {
  source,
  settings,
  analysis,
  depthMap,
  version,
  algorithmVersion,
  migrations,
} = {}) {
  if (!group) return group;
  const recipe = normalizePngModelRecipe({
    source,
    settings,
    analysis,
    depthMap,
    version: version ?? PNG_MODEL_VERSION,
    algorithmVersion: algorithmVersion ?? PNG_MODEL_ALGORITHM_VERSION,
    migrations,
  });
  group.userData.pngModelSource = recipe.source;
  group.userData.pngModelSettings = recipe.settings;
  group.userData.pngModelAnalysis = recipe.analysis;
  group.userData.pngModelDepthMap = recipe.depthMap;
  group.userData.pngModelVersion = PNG_MODEL_VERSION;
  group.userData.pngModelAlgorithmVersion = PNG_MODEL_ALGORITHM_VERSION;
  if (recipe.migrations.length) group.userData.pngModelMigrations = recipe.migrations;
  else delete group.userData.pngModelMigrations;
  return group;
}

export function clonePngModelRecipe(groupOrRecipe = {}) {
  return normalizePngModelRecipe(groupOrRecipe);
}
