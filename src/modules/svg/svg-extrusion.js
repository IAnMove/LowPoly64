import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rasterizeSvgToFilledSvg, normalizeSvgMarkup } from './svg-rasterize.js';
import { cloneSvgImportSettings } from './svg-metadata.js';
import {
  applyNormalizationTransform,
  bufferGeometryToCustomData,
  buildNormalizationTransformFromBounds,
  computeCombinedGeometryBounds,
  mergeLayerShapeGeometries,
} from './svg-geometry-utils.js';

const DEFAULT_COMPLEXITY_LIMITS = Object.freeze({
  warningShapeCount: 150,
  warningPointCount: 8000,
  dangerShapeCount: 400,
  dangerPointCount: 20000,
});

const INFLATED_HEAD_PROFILE_PRESETS = Object.freeze({
  default: Object.freeze({
    envelopeExponent: 1.15,
    frontEnvelopeExponent: 1.15,
    frontEnvelopeFloor: 0,
    chinScale: 1,
    chinEnd: 0.3,
    crownScale: 1,
    crownStart: 0.72,
    frontBoxiness: 0,
    frontBoxPower: 1.7,
    backEnvelopeExponent: 1.05,
    backEnvelopeFloor: 0,
    backBoxiness: 0.2,
    backBoxPower: 1.7,
    shellExponent: 1,
    headThickness: 0.28,
    frontBias: 0.58,
    backBias: 0.42,
    featureOffset: 0.006,
    featureDepth: 0.008,
    noseBump: 0.05,
    noseDepth: 0.018,
    shellFront: 0.022,
    shellBack: 0.012,
    hairDepth: 0.065,
    hatDepth: 0.075,
    earDepth: 0.045,
    zBiasScale: 0.35,
  }),
  round: Object.freeze({
    envelopeExponent: 0.95,
    frontEnvelopeExponent: 0.95,
    frontBoxiness: 0,
    frontBoxPower: 1.6,
    backEnvelopeExponent: 0.88,
    backBoxiness: 0.3,
    backBoxPower: 1.6,
    shellExponent: 0.92,
    headThickness: 0.32,
    frontBias: 0.6,
    backBias: 0.4,
    featureOffset: 0.008,
    featureDepth: 0.009,
    noseBump: 0.052,
    noseDepth: 0.02,
    shellFront: 0.024,
    shellBack: 0.014,
    hairDepth: 0.07,
    hatDepth: 0.08,
    earDepth: 0.05,
    zBiasScale: 0.34,
  }),
  'hero-round': Object.freeze({
    envelopeExponent: 1.08,
    frontEnvelopeExponent: 1.08,
    frontBoxiness: 0.08,
    frontBoxPower: 1.3,
    backEnvelopeExponent: 0.84,
    backBoxiness: 0.52,
    backBoxPower: 1.45,
    shellExponent: 1,
    headThickness: 0.3,
    frontBias: 0.6,
    backBias: 0.4,
    featureOffset: 0.007,
    featureDepth: 0.008,
    noseBump: 0.055,
    noseDepth: 0.02,
    shellFront: 0.024,
    shellBack: 0.012,
    hairDepth: 0.07,
    hatDepth: 0.082,
    earDepth: 0.048,
    zBiasScale: 0.35,
  }),
  chibi: Object.freeze({
    envelopeExponent: 0.8,
    frontEnvelopeExponent: 0.8,
    frontBoxiness: 0.05,
    frontBoxPower: 1.2,
    backEnvelopeExponent: 0.75,
    backBoxiness: 0.34,
    backBoxPower: 1.55,
    shellExponent: 0.88,
    headThickness: 0.35,
    frontBias: 0.62,
    backBias: 0.38,
    featureOffset: 0.008,
    featureDepth: 0.01,
    noseBump: 0.04,
    noseDepth: 0.014,
    shellFront: 0.026,
    shellBack: 0.014,
    hairDepth: 0.075,
    hatDepth: 0.085,
    earDepth: 0.05,
    zBiasScale: 0.32,
  }),
  angular: Object.freeze({
    envelopeExponent: 1.6,
    frontEnvelopeExponent: 1.6,
    frontBoxiness: 0.18,
    frontBoxPower: 1.05,
    backEnvelopeExponent: 1.25,
    backBoxiness: 0.42,
    backBoxPower: 1.25,
    shellExponent: 1.2,
    headThickness: 0.26,
    frontBias: 0.56,
    backBias: 0.44,
    featureOffset: 0.005,
    featureDepth: 0.007,
    noseBump: 0.06,
    noseDepth: 0.02,
    shellFront: 0.02,
    shellBack: 0.01,
    hairDepth: 0.06,
    hatDepth: 0.075,
    earDepth: 0.04,
    zBiasScale: 0.36,
  }),
  'psx-buque': Object.freeze({
    envelopeExponent: 0.5,
    frontEnvelopeExponent: 0.54,
    frontBoxiness: 1,
    frontBoxPower: 0.42,
    backEnvelopeExponent: 0.48,
    backBoxiness: 1,
    backBoxPower: 0.4,
    shellExponent: 0.96,
    headThickness: 0.72,
    frontBias: 0.48,
    backBias: 0.52,
    featureOffset: 0.006,
    featureDepth: 0.008,
    noseBump: 0.05,
    noseDepth: 0.02,
    shellFront: 0.022,
    shellBack: 0.015,
    hairDepth: 0.072,
    hatDepth: 0.08,
    earDepth: 0.048,
    zBiasScale: 0.34,
  }),
  'n64-zeppelin': Object.freeze({
    envelopeExponent: 0.38,
    frontEnvelopeExponent: 0.4,
    frontBoxiness: 0.18,
    frontBoxPower: 0.7,
    backEnvelopeExponent: 0.36,
    backBoxiness: 0.24,
    backBoxPower: 0.66,
    shellExponent: 0.9,
    headThickness: 0.76,
    frontBias: 0.5,
    backBias: 0.5,
    featureOffset: 0.007,
    featureDepth: 0.008,
    noseBump: 0.05,
    noseDepth: 0.02,
    shellFront: 0.024,
    shellBack: 0.015,
    hairDepth: 0.074,
    hatDepth: 0.082,
    earDepth: 0.05,
    zBiasScale: 0.33,
  }),
  'psx-skull': Object.freeze({
    envelopeExponent: 0.64,
    frontEnvelopeExponent: 0.68,
    frontBoxiness: 0.7,
    frontBoxPower: 0.58,
    backEnvelopeExponent: 0.62,
    backBoxiness: 0.8,
    backBoxPower: 0.54,
    shellExponent: 1,
    headThickness: 0.54,
    frontBias: 0.46,
    backBias: 0.54,
    featureOffset: 0.006,
    featureDepth: 0.008,
    noseBump: 0.052,
    noseDepth: 0.018,
    shellFront: 0.022,
    shellBack: 0.014,
    hairDepth: 0.068,
    hatDepth: 0.078,
    earDepth: 0.046,
    zBiasScale: 0.34,
  }),
  'n64-skull': Object.freeze({
    envelopeExponent: 0.64,
    frontEnvelopeExponent: 0.66,
    frontBoxiness: 0.14,
    frontBoxPower: 0.92,
    backEnvelopeExponent: 0.62,
    backBoxiness: 0.32,
    backBoxPower: 0.84,
    shellExponent: 0.94,
    headThickness: 0.5,
    frontBias: 0.49,
    backBias: 0.51,
    featureOffset: 0.007,
    featureDepth: 0.008,
    noseBump: 0.05,
    noseDepth: 0.018,
    shellFront: 0.022,
    shellBack: 0.014,
    hairDepth: 0.07,
    hatDepth: 0.08,
    earDepth: 0.048,
    zBiasScale: 0.33,
  }),
  'psx-portrait': Object.freeze({
    envelopeExponent: 0.92,
    frontEnvelopeExponent: 1.08,
    frontEnvelopeFloor: 0.06,
    chinScale: 0.52,
    chinEnd: 0.28,
    crownScale: 0.86,
    crownStart: 0.76,
    frontBoxiness: 1,
    frontBoxPower: 0.9,
    backEnvelopeExponent: 0.78,
    backEnvelopeFloor: 0.32,
    backBoxiness: 0.96,
    backBoxPower: 0.82,
    shellExponent: 0.98,
    headThickness: 0.16,
    frontBias: 0.18,
    backBias: 0.82,
    featureOffset: 0.006,
    featureDepth: 0.007,
    noseBump: 0.05,
    noseDepth: 0.016,
    shellFront: 0.018,
    shellBack: 0.012,
    hairDepth: 0.06,
    hatDepth: 0.076,
    earDepth: 0.042,
    zBiasScale: 0.34,
  }),
});

const PROJECTED_FEATURE_ROLES = new Set([
  'eye_white',
  'iris',
  'pupil',
  'eyebrow',
  'mouth',
  'cheek',
  'detail',
]);

const SHELL_FRONT_ROLES = new Set(['hair', 'hair_front', 'hat', 'hat_front']);
const SHELL_BACK_ROLES = new Set(['hair_back', 'hat_back']);
const EAR_ROLES = new Set(['ear']);

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function buildProgress(stage, completed, total, percent, note = '') {
  return { stage, completed, total, percent, note };
}

function parseDirectiveNumber(value, { min = 0, max = 1 } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(parsed, min), max);
}

function normalizeDirectiveToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAnchorName(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function resolveInflatedHeadProfile(value) {
  const token = normalizeDirectiveToken(value);
  return INFLATED_HEAD_PROFILE_PRESETS[token] || INFLATED_HEAD_PROFILE_PRESETS.default;
}

function resolveScaledLayerValue(value, fallback, scale, options = {}) {
  const scaled = (Number.isFinite(value) ? value : fallback) * scale;
  if (Number.isFinite(options.min)) return Math.max(options.min, scaled);
  if (Number.isFinite(options.max)) return Math.min(options.max, scaled);
  return scaled;
}

function resolveInflatedHeadZBias(layer, scale, profile) {
  if (!Number.isFinite(layer?.z)) return 0;
  return scale * profile.zBiasScale * layer.z;
}

function resolveRenderMode(settings = {}, directives = null) {
  const explicit = normalizeDirectiveToken(settings.renderMode || '');
  if (explicit === 'plane' || explicit === 'solid' || explicit === 'inflated-head') return explicit;
  return directives?.renderModeHint || 'solid';
}

function readDirectiveFromNode(node, attributeName) {
  let current = node;
  while (current && current.nodeType === 1) {
    const value = current.getAttribute?.(attributeName);
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
    current = current.parentNode;
  }
  return '';
}

function parseSvgDirectives(svgMarkup) {
  const normalized = normalizeSvgMarkup(svgMarkup);
  const defaults = {
    headId: '',
    importMode: '',
    renderModeHint: null,
    mountTarget: '',
    profile: '',
  };

  if (!normalized || typeof DOMParser === 'undefined') return defaults;

  try {
    const doc = new DOMParser().parseFromString(normalized, 'image/svg+xml');
    const root = doc.querySelector('svg');
    if (!root) return defaults;

    const importMode = normalizeDirectiveToken(root.getAttribute('data-rv-import'));
    const headId = normalizeAnchorName(root.getAttribute('data-rv-head'));
    const mountTarget = normalizeAnchorName(root.getAttribute('data-rv-parent'));
    const profile = normalizeDirectiveToken(root.getAttribute('data-rv-profile'));
    const renderModeHint = ['layered-plane', 'face-card', 'decal'].includes(importMode)
      ? 'plane'
      : (['layered-solid', 'flat-fused'].includes(importMode)
        ? 'solid'
        : (importMode === 'inflated-head' ? 'inflated-head' : null));

    return {
      headId,
      importMode,
      renderModeHint,
      mountTarget,
      profile,
    };
  } catch {
    return defaults;
  }
}

function isViewBoxRect(shape, width, height) {
  const points = shape.getPoints(4);
  if (points.length !== 4 && points.length !== 5) return false;
  const bounds = new THREE.Box2();
  points.forEach((point) => bounds.expandByPoint(point));
  const size = new THREE.Vector2();
  bounds.getSize(size);
  const tolerance = 0.01;
  return Math.abs(size.x - width) / width < tolerance && Math.abs(size.y - height) / height < tolerance;
}

function parseViewBox(svgMarkup) {
  const match = svgMarkup.match(/viewBox\s*=\s*["']\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)/i);
  if (!match) return { width: null, height: null };
  return {
    width: parseFloat(match[3]),
    height: parseFloat(match[4]),
  };
}

function resolveSvgColor(rawColor, fallbackColor) {
  if (typeof rawColor === 'string') {
    const trimmed = rawColor.trim();
    if (trimmed && trimmed !== 'none' && trimmed !== 'transparent') {
      try {
        return `#${new THREE.Color(trimmed).getHexString()}`;
      } catch {
        // Fall back below.
      }
    }
  }
  return fallbackColor;
}

function parseSvgOpacity(style = {}, channel = 'fill') {
  const values = [style.opacity, channel === 'stroke' ? style.strokeOpacity : style.fillOpacity];
  let opacity = 1;
  values.forEach((value) => {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      opacity *= Math.max(0, Math.min(1, parsed));
    }
  });
  return Math.max(0, Math.min(1, opacity));
}

function createStrokeShape(subPath, strokeWidth) {
  const points = subPath.getPoints(12);
  if (points.length < 2) return null;

  const halfWidth = strokeWidth / 2;
  const leftSide = [];
  const rightSide = [];

  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const deltaX = next.x - previous.x;
    const deltaY = next.y - previous.y;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
    const normalX = -deltaY / length;
    const normalY = deltaX / length;

    leftSide.push(new THREE.Vector2(current.x + normalX * halfWidth, current.y + normalY * halfWidth));
    rightSide.push(new THREE.Vector2(current.x - normalX * halfWidth, current.y - normalY * halfWidth));
  }

  const shape = new THREE.Shape();
  shape.moveTo(leftSide[0].x, leftSide[0].y);
  for (let index = 1; index < leftSide.length; index++) {
    shape.lineTo(leftSide[index].x, leftSide[index].y);
  }
  for (let index = rightSide.length - 1; index >= 0; index--) {
    shape.lineTo(rightSide[index].x, rightSide[index].y);
  }
  shape.closePath();
  return shape;
}

function buildSvgLayer(
  path,
  shapes,
  {
    color,
    opacity,
    kind,
    order,
    id,
    role,
    featureKey,
    mountRole,
    z,
    depth,
    mountTarget,
    volume,
    thickness,
    project,
    offset,
    shell,
    bump,
    backBias,
    backBoxiness,
    backEnvelopeExponent,
    backBoxPower,
  }
) {
  return {
    color,
    opacity,
    kind,
    order,
    id,
    role,
    featureKey,
    mountRole,
    z,
    depth,
    mountTarget,
    volume,
    thickness,
    project,
    offset,
    shell,
    bump,
    backBias,
    backBoxiness,
    backEnvelopeExponent,
    backBoxPower,
    shapes,
  };
}

export function parseSvgLayers(svgMarkup, options = {}) {
  const normalized = normalizeSvgMarkup(svgMarkup);
  if (!normalized) return [];

  const fallbackColor = options.fallbackColor || '#ffcc00';
  const forcedColor = options.forceColor || (options.preserveColors === false ? fallbackColor : null);
  const loader = new SVGLoader();
  const svgData = loader.parse(normalized);
  const viewBox = parseViewBox(normalized);
  const layers = [];

  svgData.paths.forEach((path, pathIndex) => {
    const style = path.userData?.style || {};
    const node = path.userData?.node || null;
    const layerId = (node?.getAttribute?.('id') || `layer_${pathIndex + 1}`).trim();
    const layerRole = normalizeDirectiveToken(readDirectiveFromNode(node, 'data-rv-role'));
    const layerFeatureKey = normalizeDirectiveToken(readDirectiveFromNode(node, 'data-rv-feature-key'));
    const layerMountRole = normalizeDirectiveToken(readDirectiveFromNode(node, 'data-rv-mount-role'));
    const layerZ = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-z'), { min: -2, max: 2 });
    const layerDepth = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-depth'), { min: 0, max: 2 });
    const layerMountTarget = normalizeAnchorName(readDirectiveFromNode(node, 'data-rv-parent'));
    const layerVolume = normalizeDirectiveToken(readDirectiveFromNode(node, 'data-rv-volume'));
    const layerThickness = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-thickness'), { min: 0, max: 2 });
    const layerProject = normalizeAnchorName(readDirectiveFromNode(node, 'data-rv-project'));
    const layerOffset = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-offset'), { min: -2, max: 2 });
    const layerShell = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-shell'), { min: -2, max: 2 });
    const layerBump = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-bump'), { min: -2, max: 2 });
    const layerBackBias = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-back-bias'), { min: 0, max: 1 });
    const layerBackBoxiness = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-back-boxiness'), { min: 0, max: 1 });
    const layerBackEnvelopeExponent = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-back-exp'), { min: 0.25, max: 4 });
    const layerBackBoxPower = parseDirectiveNumber(readDirectiveFromNode(node, 'data-rv-back-box-power'), { min: 0.25, max: 4 });
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const hasFill = style.fill && style.fill !== 'none' && style.fill !== 'transparent';
    const hasStroke = style.stroke && style.stroke !== 'none' && style.stroke !== 'transparent';

    if (hasFill) {
      const fillShapes = SVGLoader.createShapes(path).filter((shape) => {
        if (!viewBox.width || !viewBox.height) return true;
        return !isViewBoxRect(shape, viewBox.width, viewBox.height);
      });

      if (fillShapes.length > 0) {
        layers.push(buildSvgLayer(path, fillShapes, {
          color: forcedColor || resolveSvgColor(style.fill, fallbackColor),
          opacity: parseSvgOpacity(style, 'fill'),
          kind: 'fill',
          order: pathIndex,
          id: layerId,
          role: layerRole,
          featureKey: layerFeatureKey,
          mountRole: layerMountRole,
          z: layerZ,
          depth: layerDepth,
          mountTarget: layerMountTarget,
          volume: layerVolume,
          thickness: layerThickness,
          project: layerProject,
          offset: layerOffset,
          shell: layerShell,
          bump: layerBump,
          backBias: layerBackBias,
          backBoxiness: layerBackBoxiness,
          backEnvelopeExponent: layerBackEnvelopeExponent,
          backBoxPower: layerBackBoxPower,
        }));
      }
    }

    if (hasStroke) {
      const strokeWidth = parseFloat(style.strokeWidth || '2') || 2;
      const strokeShapes = path.subPaths
        .map((subPath) => createStrokeShape(subPath, strokeWidth))
        .filter(Boolean);

      if (strokeShapes.length > 0) {
        layers.push(buildSvgLayer(path, strokeShapes, {
          color: forcedColor || resolveSvgColor(style.stroke, fallbackColor),
          opacity: parseSvgOpacity(style, 'stroke'),
          kind: 'stroke',
          order: pathIndex,
          id: layerId,
          role: layerRole,
          featureKey: layerFeatureKey,
          mountRole: layerMountRole,
          z: layerZ,
          depth: layerDepth,
          mountTarget: layerMountTarget,
          volume: layerVolume,
          thickness: layerThickness,
          project: layerProject,
          offset: layerOffset,
          shell: layerShell,
          bump: layerBump,
          backBias: layerBackBias,
          backBoxiness: layerBackBoxiness,
          backEnvelopeExponent: layerBackEnvelopeExponent,
          backBoxPower: layerBackBoxPower,
        }));
      }
    }

    if (!hasFill && !hasStroke) {
      const shapes = SVGLoader.createShapes(path).filter((shape) => {
        if (!viewBox.width || !viewBox.height) return true;
        return !isViewBoxRect(shape, viewBox.width, viewBox.height);
      });
      if (shapes.length > 0) {
        layers.push(buildSvgLayer(path, shapes, {
          color: forcedColor || fallbackColor,
          opacity: 1,
          kind: 'fill',
          order: pathIndex,
          id: layerId,
          role: layerRole,
          featureKey: layerFeatureKey,
          mountRole: layerMountRole,
          z: layerZ,
          depth: layerDepth,
          mountTarget: layerMountTarget,
          volume: layerVolume,
          thickness: layerThickness,
          project: layerProject,
          offset: layerOffset,
          shell: layerShell,
          bump: layerBump,
          backBias: layerBackBias,
          backBoxiness: layerBackBoxiness,
          backEnvelopeExponent: layerBackEnvelopeExponent,
          backBoxPower: layerBackBoxPower,
        }));
      }
    }
  });

  return layers;
}

function estimatePointCount(layers) {
  return layers.reduce((sum, layer) => (
    sum + layer.shapes.reduce((shapeSum, shape) => shapeSum + shape.getPoints(12).length, 0)
  ), 0);
}

function countShapes(layers) {
  return layers.reduce((sum, layer) => sum + layer.shapes.length, 0);
}

function describeRisk(pointCount, shapeCount, limits = DEFAULT_COMPLEXITY_LIMITS) {
  if (shapeCount >= limits.dangerShapeCount || pointCount >= limits.dangerPointCount) return 'danger';
  if (shapeCount >= limits.warningShapeCount || pointCount >= limits.warningPointCount) return 'warning';
  return 'ok';
}

export async function prepareSvgForExtrusion(svgMarkup, settings = {}) {
  const resolvedSettings = cloneSvgImportSettings(settings);
  const normalized = normalizeSvgMarkup(svgMarkup);
  if (!normalized) throw new Error('Invalid SVG markup');

  const directives = parseSvgDirectives(normalized);
  let resolvedSvg = normalized;
  let rasterized = false;
  let layers = parseSvgLayers(resolvedSvg, {
    fallbackColor: resolvedSettings.color,
    preserveColors: resolvedSettings.preserveColors !== false,
  });

  const prefersRasterize = resolvedSettings.forceRasterize || (!layers.length && normalized.includes('stroke'));
  if (prefersRasterize || !layers.length) {
    const rasterizedSvg = await rasterizeSvgToFilledSvg(normalized, { gridSize: resolvedSettings.rasterizeGridSize });
    if (rasterizedSvg) {
      resolvedSvg = rasterizedSvg;
      rasterized = true;
      layers = parseSvgLayers(resolvedSvg, {
        fallbackColor: resolvedSettings.color,
        forceColor: resolvedSettings.color,
      });
    }
  }

  if (!layers.length) {
    throw new Error('SVG did not produce any extrudable shapes');
  }

  const pointCount = estimatePointCount(layers);
  const shapeCount = countShapes(layers);
  return {
    normalizedSvg: normalized,
    resolvedSvg,
    rasterized,
    directives,
    layers,
    analysis: {
      importMode: directives.importMode || '',
      layerCount: layers.length,
      mountTarget: directives.mountTarget || '',
      renderMode: resolveRenderMode(resolvedSettings, directives),
      shapeCount,
      pointCount,
      riskLevel: describeRisk(pointCount, shapeCount),
    },
  };
}

function computeExtrudeSettings(allShapes, settings) {
  const shapeGeometry = new THREE.ShapeGeometry(allShapes);
  shapeGeometry.computeBoundingBox();
  const flatSize = new THREE.Vector3();
  shapeGeometry.boundingBox.getSize(flatSize);
  shapeGeometry.dispose();

  const complexity = allShapes.length;
  const qualityScale = complexity > 200 ? 0.3 : complexity > 50 ? 0.6 : 1;
  const maxFlatDimension = Math.max(flatSize.x, flatSize.y, 1);
  const bevelScale = Math.min(maxFlatDimension * 0.02, 1);

  return {
    maxFlatDimension,
    qualityScale,
    extrudeSettings: {
      depth: ((settings.depth || 1) / 10) * maxFlatDimension,
      bevelEnabled: settings.bevelEnabled !== false,
      bevelThickness: bevelScale * (0.15 + settings.smoothness * 0.2),
      bevelSize: bevelScale * (0.15 + settings.smoothness * 0.2),
      bevelSegments: Math.max(1, Math.round((3 + settings.smoothness * 20) * qualityScale)),
      curveSegments: Math.max(4, Math.round((24 + settings.smoothness * 176) * qualityScale)),
    },
  };
}

function buildShapeGeometrySegments(settings, qualityScale = 1) {
  return Math.max(4, Math.round((12 + settings.smoothness * 52) * qualityScale));
}

function subdivideTriangleGeometry(geometry, iterations = 1) {
  if (!geometry || iterations <= 0) return geometry;

  let working = geometry.index ? geometry.toNonIndexed() : geometry.clone();

  for (let iteration = 0; iteration < iterations; iteration++) {
    const position = working.getAttribute('position');
    if (!position || position.count < 3) break;

    const subdividedPositions = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const bc = new THREE.Vector3();
    const ca = new THREE.Vector3();

    const pushTriangle = (p1, p2, p3) => {
      subdividedPositions.push(
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z,
        p3.x, p3.y, p3.z
      );
    };

    for (let index = 0; index < position.count; index += 3) {
      a.fromBufferAttribute(position, index);
      b.fromBufferAttribute(position, index + 1);
      c.fromBufferAttribute(position, index + 2);

      ab.copy(a).add(b).multiplyScalar(0.5);
      bc.copy(b).add(c).multiplyScalar(0.5);
      ca.copy(c).add(a).multiplyScalar(0.5);

      pushTriangle(a, ab, ca);
      pushTriangle(ab, b, bc);
      pushTriangle(ca, bc, c);
      pushTriangle(ab, bc, ca);
    }

    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.Float32BufferAttribute(subdividedPositions, 3));
    working.dispose();
    working = next;
  }

  const merged = BufferGeometryUtils.mergeVertices(working, 1e-5);
  working.dispose();
  merged.computeBoundingBox();
  merged.computeVertexNormals();
  return merged;
}

function getInflatedHeadSubdivisionIterations(mode) {
  if (mode === 'head') return 2;
  if (mode === 'shell-front' || mode === 'shell-back' || mode === 'nose' || mode === 'ear') return 1;
  return 0;
}

function buildLayerReliefOffset(layer, layerIndex, settings) {
  if (Number.isFinite(layer?.z)) {
    return (settings.targetSize || 4) * layer.z;
  }
  const relief = Math.max(0, settings.layerRelief || 0);
  if (relief === 0 || layerIndex <= 0) return 0;
  return (settings.targetSize || 4) * relief * layerIndex;
}

function buildLayerExtrudeSettings(layer, settings, baseExtrudeSettings, maxFlatDimension) {
  if (!Number.isFinite(layer?.depth)) return { ...baseExtrudeSettings };
  return {
    ...baseExtrudeSettings,
    depth: Math.max(0.0001, maxFlatDimension * layer.depth),
  };
}

function buildPlanarLayerExtrudeSettings(layer, settings, geometrySettings) {
  const scaleBasis = Math.max(
    geometrySettings?.maxFlatDimension || 0,
    settings?.targetSize || 0,
    1
  );
  const minimumDepth = Math.max(0.001, scaleBasis * 0.01);
  const configuredDepth = Number.isFinite(layer?.depth)
    ? Math.max(0.0001, (geometrySettings?.maxFlatDimension || scaleBasis) * layer.depth)
    : 0;

  return {
    depth: Math.max(minimumDepth, configuredDepth),
    bevelEnabled: false,
    curveSegments: buildShapeGeometrySegments(settings, geometrySettings?.qualityScale || 1),
    steps: 1,
  };
}

function isInflatedHeadProjectedLayer(layer) {
  const role = normalizeDirectiveToken(layer?.role);
  if (role === 'head' || normalizeDirectiveToken(layer?.volume) === 'head') return false;
  if (role === 'nose') return true;
  if (SHELL_FRONT_ROLES.has(role) || SHELL_BACK_ROLES.has(role) || EAR_ROLES.has(role)) return false;
  if (normalizeAnchorName(layer?.project)) return true;
  return PROJECTED_FEATURE_ROLES.has(role);
}

function buildLayerGeometry(layer, renderMode, settings, geometrySettings) {
  if (renderMode === 'plane' || (renderMode === 'inflated-head' && isInflatedHeadProjectedLayer(layer))) {
    return new THREE.ExtrudeGeometry(
      layer.shapes,
      buildPlanarLayerExtrudeSettings(layer, settings, geometrySettings)
    );
  }
  return new THREE.ExtrudeGeometry(
    layer.shapes,
    buildLayerExtrudeSettings(layer, settings, geometrySettings.extrudeSettings, geometrySettings.maxFlatDimension)
  );
}

function getGeometryBoundsMetrics(geometry) {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return null;

  const bounds = geometry.boundingBox.clone();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);

  return {
    bounds,
    center,
    size,
    halfWidth: Math.max(size.x / 2, 0.0001),
    halfHeight: Math.max(size.y / 2, 0.0001),
  };
}

function getPositionZMetrics(position) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < position.count; index++) {
    const z = position.getZ(index);
    if (z < min) min = z;
    if (z > max) max = z;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }

  return {
    min,
    max,
    size: Math.max(max - min, 0),
  };
}

function sampleEnvelope(x, y, metrics, exponent = 1) {
  if (!metrics) return 0;
  const nx = (x - metrics.center.x) / metrics.halfWidth;
  const ny = (y - metrics.center.y) / metrics.halfHeight;
  const radial = Math.max(0, 1 - ((nx * nx) + (ny * ny)));
  return Math.pow(radial, exponent);
}

function sampleBoxEnvelope(x, y, metrics, exponent = 1) {
  if (!metrics) return 0;
  const nx = Math.abs((x - metrics.center.x) / metrics.halfWidth);
  const ny = Math.abs((y - metrics.center.y) / metrics.halfHeight);
  const distance = Math.max(nx, ny);
  const box = Math.max(0, 1 - distance);
  return Math.pow(box, exponent);
}

function sampleVerticalHeadBand(y, metrics, profile) {
  if (!metrics) return 1;
  const minY = metrics.center.y - metrics.halfHeight;
  const maxY = metrics.center.y + metrics.halfHeight;
  const t = THREE.MathUtils.clamp((y - minY) / Math.max(maxY - minY, 0.0001), 0, 1);
  const chinEnd = THREE.MathUtils.clamp(
    Number.isFinite(profile?.chinEnd) ? profile.chinEnd : 0.3,
    0.05,
    0.5
  );
  const crownStart = THREE.MathUtils.clamp(
    Number.isFinite(profile?.crownStart) ? profile.crownStart : 0.72,
    0.5,
    0.95
  );
  const chinScale = THREE.MathUtils.clamp(
    Number.isFinite(profile?.chinScale) ? profile.chinScale : 1,
    0.1,
    1.5
  );
  const crownScale = THREE.MathUtils.clamp(
    Number.isFinite(profile?.crownScale) ? profile.crownScale : 1,
    0.1,
    1.5
  );

  if (t < chinEnd) {
    const chinT = THREE.MathUtils.smoothstep(t, 0, chinEnd);
    return THREE.MathUtils.lerp(chinScale, 1, chinT);
  }
  if (t > crownStart) {
    const crownT = THREE.MathUtils.smoothstep(t, crownStart, 1);
    return THREE.MathUtils.lerp(1, crownScale, crownT);
  }
  return 1;
}

function sampleHeadEnvelope(x, y, context, side = 'front') {
  const verticalBand = sampleVerticalHeadBand(y, context.headMetrics, context.profile);
  const frontRadial = sampleEnvelope(
    x,
    y,
    context.headMetrics,
    Number.isFinite(context.profile.frontEnvelopeExponent)
      ? context.profile.frontEnvelopeExponent
      : context.profile.envelopeExponent
  );
  const frontBox = sampleBoxEnvelope(
    x,
    y,
    context.headMetrics,
    Number.isFinite(context.profile.frontBoxPower) ? context.profile.frontBoxPower : 1.6
  );
  const frontBoxiness = THREE.MathUtils.clamp(
    Number.isFinite(context.profile.frontBoxiness) ? context.profile.frontBoxiness : 0,
    0,
    1
  );
  const frontFloor = THREE.MathUtils.clamp(
    Number.isFinite(context.profile.frontEnvelopeFloor) ? context.profile.frontEnvelopeFloor : 0,
    0,
    0.98
  );
  const frontEnvelope = frontFloor + ((1 - frontFloor) * THREE.MathUtils.lerp(frontRadial, frontBox, frontBoxiness) * verticalBand);
  if (side !== 'back') return frontEnvelope;
  const backRadial = sampleEnvelope(
    x,
    y,
    context.headMetrics,
    Number.isFinite(context.profile.backEnvelopeExponent)
      ? context.profile.backEnvelopeExponent
      : context.profile.envelopeExponent
  );
  const box = sampleBoxEnvelope(
    x,
    y,
    context.headMetrics,
    Number.isFinite(context.profile.backBoxPower) ? context.profile.backBoxPower : 1.6
  );
  const boxiness = THREE.MathUtils.clamp(
    Number.isFinite(context.profile.backBoxiness) ? context.profile.backBoxiness : 0,
    0,
    1
  );
  const backFloor = THREE.MathUtils.clamp(
    Number.isFinite(context.profile.backEnvelopeFloor) ? context.profile.backEnvelopeFloor : 0,
    0,
    0.98
  );
  return backFloor + ((1 - backFloor) * THREE.MathUtils.lerp(backRadial, box, boxiness) * verticalBand);
}

function identifyInflatedHeadMode(layer, headId) {
  const role = normalizeDirectiveToken(layer?.role);
  const id = normalizeAnchorName(layer?.id);
  const volume = normalizeDirectiveToken(layer?.volume);
  const project = normalizeAnchorName(layer?.project);

  if (volume === 'head' || role === 'head' || id === headId || id === 'HEAD_BASE') return 'head';
  if (role === 'nose' || Number.isFinite(layer?.bump)) return 'nose';
  if (SHELL_BACK_ROLES.has(role)) return 'shell-back';
  if (SHELL_FRONT_ROLES.has(role) || Number.isFinite(layer?.shell)) return 'shell-front';
  if (EAR_ROLES.has(role)) return 'ear';
  if (project && (!headId || project === headId)) return 'project';
  if (PROJECTED_FEATURE_ROLES.has(role)) return 'project';
  return 'solid';
}

function resolveInflatedHeadDepth(layer, mode, scale, profile, zMetrics) {
  if (zMetrics?.size > 0.0001) return zMetrics.size;
  if (Number.isFinite(layer?.depth)) return Math.max(0.0001, layer.depth * scale);

  const role = normalizeDirectiveToken(layer?.role);
  if (mode === 'head') return Math.max(0.0001, profile.headThickness * scale);
  if (mode === 'nose') return Math.max(0.0001, profile.noseDepth * scale);
  if (mode === 'project') return Math.max(0.0001, profile.featureDepth * scale);
  if (mode === 'ear') return Math.max(0.0001, profile.earDepth * scale);
  if (role === 'hair_back') return Math.max(0.0001, profile.hairDepth * scale * 1.18);
  if (role === 'hat_back') return Math.max(0.0001, profile.hatDepth * scale);
  if (SHELL_FRONT_ROLES.has(role) || SHELL_BACK_ROLES.has(role)) {
    return Math.max(0.0001, (role.startsWith('hat') ? profile.hatDepth : profile.hairDepth) * scale);
  }
  if (mode === 'shell-front' || mode === 'shell-back') return Math.max(0.0001, profile.hairDepth * scale);
  return Math.max(0.0001, profile.featureDepth * scale);
}

function getHeadSurfaceZ(x, y, context, side = 'front') {
  const envelope = sampleHeadEnvelope(x, y, context, side);
  if (side === 'back') {
    return context.headBaseZ - (context.headBackDepth * envelope);
  }
  return context.headBaseZ + (context.headFrontDepth * envelope);
}

function applyInflatedHeadDeformation(layerParts, directives, settings) {
  const headId = normalizeAnchorName(directives?.headId) || 'HEAD_BASE';
  const baseProfile = resolveInflatedHeadProfile(directives?.profile);
  const partModes = layerParts.map((part) => identifyInflatedHeadMode(part, headId));

  layerParts.forEach((part, index) => {
    const iterations = getInflatedHeadSubdivisionIterations(partModes[index]);
    if (iterations <= 0) return;
    const subdividedGeometry = subdivideTriangleGeometry(part.geometry, iterations);
    if (!subdividedGeometry || subdividedGeometry === part.geometry) return;
    part.geometry.dispose();
    part.geometry = subdividedGeometry;
  });

  const partMetrics = layerParts.map((part) => getGeometryBoundsMetrics(part.geometry));
  const headIndex = partModes.findIndex((mode) => mode === 'head');
  if (headIndex < 0 || !partMetrics[headIndex]) return false;

  const headPart = layerParts[headIndex];
  const headMetrics = partMetrics[headIndex];
  const scale = Math.max(headMetrics.size.x, headMetrics.size.y, settings.targetSize || 4, 0.0001);
  const resolvedBackBias = Number.isFinite(headPart.backBias) ? headPart.backBias : baseProfile.backBias;
  const clampedBackBias = THREE.MathUtils.clamp(resolvedBackBias, 0, 1);
  const profile = {
    ...baseProfile,
    backBias: clampedBackBias,
    frontBias: 1 - clampedBackBias,
    backBoxiness: Number.isFinite(headPart.backBoxiness) ? headPart.backBoxiness : baseProfile.backBoxiness,
    backEnvelopeExponent: Number.isFinite(headPart.backEnvelopeExponent)
      ? headPart.backEnvelopeExponent
      : baseProfile.backEnvelopeExponent,
    backBoxPower: Number.isFinite(headPart.backBoxPower) ? headPart.backBoxPower : baseProfile.backBoxPower,
  };
  const headThickness = resolveScaledLayerValue(headPart.thickness, profile.headThickness, scale, { min: 0.0001 });
  const context = {
    headBaseZ: resolveInflatedHeadZBias(headPart, scale, profile),
    headBackDepth: headThickness * profile.backBias,
    headFrontDepth: headThickness * profile.frontBias,
    headMetrics,
    profile,
    scale,
  };

  layerParts.forEach((part, index) => {
    const geometry = part.geometry;
    const metrics = partMetrics[index];
    const mode = partModes[index];
    const role = normalizeDirectiveToken(part?.role);
    const position = geometry.getAttribute('position');
    if (!position || !metrics) return;

    const zMetrics = getPositionZMetrics(position);
    const depth = resolveInflatedHeadDepth(part, mode, scale, profile, zMetrics);
    const zBias = resolveInflatedHeadZBias(part, scale, profile);
    const offset = resolveScaledLayerValue(part.offset, 0, scale) + zBias;
    const shellFallback = mode === 'shell-back' && role === 'hair_back'
      ? profile.shellBack + (profile.hairDepth * 0.14)
      : (mode === 'shell-back' ? profile.shellBack : profile.shellFront);
    const shellLift = resolveScaledLayerValue(
      part.shell,
      shellFallback,
      scale
    ) + zBias;
    const bump = resolveScaledLayerValue(part.bump, mode === 'nose' ? profile.noseBump : 0, scale);

    for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex++) {
      const x = position.getX(vertexIndex);
      const y = position.getY(vertexIndex);
      const z = position.getZ(vertexIndex);
      const t = zMetrics.size > 0.0001 ? (z - zMetrics.min) / zMetrics.size : 1;
      const localEnvelope = sampleEnvelope(x, y, metrics, mode === 'head' ? profile.envelopeExponent : profile.shellExponent);
      let nextZ = z;

      if (mode === 'head') {
        const backEnvelope = sampleHeadEnvelope(x, y, context, 'back');
        const back = context.headBaseZ - (context.headBackDepth * backEnvelope);
        const front = context.headBaseZ + (context.headFrontDepth * localEnvelope);
        nextZ = THREE.MathUtils.lerp(back, front, zMetrics.size > 0.0001 ? t : 0.5);
      } else if (mode === 'nose') {
        const surface = getHeadSurfaceZ(x, y, context, 'front');
        // Give nose meshes extra internal length. Landmark mounting reanchors
        // the tip afterward, so the visible tip stays put while the base sinks
        // into the skull instead of sitting as a surface decal.
        const front = surface + offset + (bump * localEnvelope) + (depth * 1.85);
        const back = surface + offset - (depth * 0.65 * localEnvelope);
        nextZ = zMetrics.size > 0.0001 ? THREE.MathUtils.lerp(back, front, t) : front;
      } else if (mode === 'project') {
        const surface = getHeadSurfaceZ(x, y, context, 'front');
        const front = surface + offset + depth;
        const back = surface + offset;
        nextZ = zMetrics.size > 0.0001 ? THREE.MathUtils.lerp(back, front, t) : front;
      } else if (mode === 'shell-back') {
        const surface = getHeadSurfaceZ(x, y, context, 'back');
        const backDepthScale = role === 'hair_back' ? 0.92 : 0.75;
        const frontDepthScale = role === 'hair_back' ? 0.16 : 0.1;
        const back = surface - shellLift - (depth * backDepthScale * localEnvelope);
        const front = surface - shellLift + (depth * frontDepthScale * localEnvelope);
        nextZ = zMetrics.size > 0.0001 ? THREE.MathUtils.lerp(back, front, t) : front;
      } else if (mode === 'shell-front' || mode === 'ear') {
        const surface = getHeadSurfaceZ(x, y, context, 'front');
        const back = surface + shellLift - (depth * 0.12 * localEnvelope);
        const front = surface + shellLift + (depth * 0.88 * localEnvelope);
        nextZ = zMetrics.size > 0.0001 ? THREE.MathUtils.lerp(back, front, t) : front;
      } else {
        const back = offset - (depth * 0.5 * localEnvelope);
        const front = offset + (depth * 0.5 * localEnvelope);
        nextZ = zMetrics.size > 0.0001 ? THREE.MathUtils.lerp(back, front, t) : front;
      }

      position.setZ(vertexIndex, nextZ);
    }

    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
  });

  return true;
}

export async function extrudeSvgToCustomGeometry(svgMarkup, settings = {}, options = {}) {
  const resolvedSettings = cloneSvgImportSettings(settings);
  const prepared = await prepareSvgForExtrusion(svgMarkup, resolvedSettings);
  const renderMode = resolveRenderMode(resolvedSettings, prepared.directives);
  const allShapes = prepared.layers.flatMap((layer) => layer.shapes);
  const geometrySettings = computeExtrudeSettings(allShapes, resolvedSettings);
  const batchSize = options.batchSize || 20;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const signal = options.signal;
  const totalShapeCount = countShapes(prepared.layers);
  const layerParts = [];
  let completedShapes = 0;

  if (onProgress) {
    onProgress(buildProgress('preflight', 0, totalShapeCount, 2, prepared.analysis.riskLevel));
  }

  for (let layerIndex = 0; layerIndex < prepared.layers.length; layerIndex++) {
    const layer = prepared.layers[layerIndex];
    const layerGeometries = [];

    for (let shapeIndex = 0; shapeIndex < layer.shapes.length; shapeIndex++) {
      if (signal?.aborted) throw new Error('SVG extrusion cancelled');
      const singleShapeLayer = { ...layer, shapes: [layer.shapes[shapeIndex]] };
      layerGeometries.push(buildLayerGeometry(singleShapeLayer, renderMode, resolvedSettings, geometrySettings));
      completedShapes++;

      if (completedShapes % batchSize === 0 || completedShapes === totalShapeCount) {
        if (onProgress) {
          onProgress(buildProgress('extrude', completedShapes, totalShapeCount, Math.round((completedShapes / totalShapeCount) * 82)));
        }
        await yieldToMain();
      }
    }

    const geometry = mergeLayerShapeGeometries(layerGeometries);
    if (!geometry) continue;

    layerParts.push({
      bump: layer.bump,
      color: layer.color,
      depth: layer.depth,
      featureKey: layer.featureKey,
      mountRole: layer.mountRole,
      geometry,
      id: layer.id,
      kind: layer.kind,
      mountTarget: layer.mountTarget,
      opacity: layer.opacity,
      order: layer.order,
      offset: layer.offset,
      project: layer.project,
      renderMode,
      role: layer.role,
      shell: layer.shell,
      thickness: layer.thickness,
      volume: layer.volume,
      z: layer.z,
      backBias: layer.backBias,
      backBoxiness: layer.backBoxiness,
      backEnvelopeExponent: layer.backEnvelopeExponent,
      backBoxPower: layer.backBoxPower,
    });
  }

  if (signal?.aborted) throw new Error('SVG extrusion cancelled');
  if (layerParts.length === 0) throw new Error('Unable to build SVG layer geometries');

  if (onProgress) onProgress(buildProgress('merge', totalShapeCount, totalShapeCount, 90));
  await yieldToMain();

  const combinedBounds = computeCombinedGeometryBounds(layerParts.map((part) => part.geometry));
  if (!combinedBounds) throw new Error('Unable to compute SVG layer bounds');
  const normalization = buildNormalizationTransformFromBounds(combinedBounds, resolvedSettings.targetSize || 4);

  let totalVertexCount = 0;
  let totalFaceCount = 0;

  layerParts.forEach((part, layerIndex) => {
    applyNormalizationTransform(part.geometry, normalization);
    const zOffset = renderMode === 'inflated-head' ? 0 : buildLayerReliefOffset(part, layerIndex, resolvedSettings);
    if (zOffset !== 0) {
      part.geometry.translate(0, 0, zOffset);
      part.geometry.computeBoundingBox();
      part.geometry.computeVertexNormals();
    }
  });

  if (renderMode === 'inflated-head') {
    applyInflatedHeadDeformation(layerParts, prepared.directives, resolvedSettings);
  }

  layerParts.forEach((part) => {
    part.customGeometry = bufferGeometryToCustomData(part.geometry);
    totalVertexCount += part.customGeometry.vertices.length;
    totalFaceCount += part.customGeometry.faces.length;
  });

  if (onProgress) onProgress(buildProgress('finalize', totalShapeCount, totalShapeCount, 100));

  return {
    parts: layerParts.map((part) => ({
      color: part.color,
      customGeometry: part.customGeometry,
      featureKey: part.featureKey,
      mountRole: part.mountRole,
      geometry: part.geometry,
      id: part.id,
      kind: part.kind,
      mountTarget: part.mountTarget,
      opacity: part.opacity,
      order: part.order,
      renderMode: part.renderMode,
      role: part.role,
      z: part.z,
    })),
    normalizedSvg: prepared.normalizedSvg,
    resolvedSvg: prepared.resolvedSvg,
    rasterized: prepared.rasterized,
    directives: prepared.directives,
    analysis: {
      ...prepared.analysis,
      faceCount: totalFaceCount,
      importMode: prepared.directives?.importMode || prepared.analysis.importMode || '',
      mountTarget: prepared.directives?.mountTarget || prepared.analysis.mountTarget || '',
      partCount: layerParts.length,
      renderMode,
      triangleCount: totalFaceCount,
      vertexCount: totalVertexCount,
      riskLevel: describeRisk(prepared.analysis.pointCount, prepared.analysis.shapeCount),
    },
  };
}
