export const SVG_SOURCE_VERSION = 1;

export const SVG_SOURCE_MODE = Object.freeze({
  CODE: 'code',
  FILE: 'file',
  PIXEL: 'pixel',
  TEXT: 'text',
});

export const SVG_DEFAULT_IMPORT_SETTINGS = Object.freeze({
  name: 'SVG MODEL',
  depth: 1,
  smoothness: 0.2,
  targetSize: 4,
  color: '#ffcc00',
  renderMode: 'auto',
  preserveColors: true,
  layerRelief: 0.012,
  autoMount: true,
  forceRasterize: false,
  rasterizeGridSize: 64,
  bevelEnabled: true,
});

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneJsonValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneJsonValue(entry);
    });
    return clone;
  }
  return value;
}

export function cloneSvgImportSettings(settings = {}) {
  return {
    ...SVG_DEFAULT_IMPORT_SETTINGS,
    ...cloneJsonValue(settings),
  };
}

export function createSvgSourceMetadata(source = {}) {
  return {
    version: SVG_SOURCE_VERSION,
    mode: source.mode || SVG_SOURCE_MODE.CODE,
    markup: typeof source.markup === 'string' ? source.markup : '',
    resolvedMarkup: typeof source.resolvedMarkup === 'string' ? source.resolvedMarkup : '',
    filename: typeof source.filename === 'string' ? source.filename : '',
    rasterized: !!source.rasterized,
    inputs: cloneJsonValue(source.inputs || {}),
  };
}

export function cloneSvgSourceMetadata(source = {}) {
  return createSvgSourceMetadata(source);
}

export function isSvgDerivedGroup(object) {
  return !!(object?.isGroup && object.userData?.svgSource?.markup);
}

export function markSvgDerivedGroup(group, { source, settings, analysis } = {}) {
  if (!group) return group;
  group.userData.svgSource = createSvgSourceMetadata(source);
  group.userData.svgImportSettings = cloneSvgImportSettings(settings);
  if (analysis) {
    group.userData.svgImportAnalysis = cloneJsonValue(analysis);
  } else {
    delete group.userData.svgImportAnalysis;
  }
  return group;
}

export function getSvgSourceMetadata(group) {
  return group?.userData?.svgSource ? cloneSvgSourceMetadata(group.userData.svgSource) : null;
}

export function getSvgImportSettings(group) {
  return group?.userData?.svgImportSettings
    ? cloneSvgImportSettings(group.userData.svgImportSettings)
    : cloneSvgImportSettings();
}
