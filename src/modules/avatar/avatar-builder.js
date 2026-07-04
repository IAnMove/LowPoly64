import { TEMPLATE_REGISTRY } from '../viewport/template-registry.js';
import { GENERATED_CHARACTER_MOLDS, makeFaceColors } from '../../data/templates/generated-character-molds.js';
import { DEFAULT_GENERATED_HEAD_ID } from '../../data/avatar/generated-heads.js';
import { instantiateTemplateDefinition } from '../viewport/templates.js';
import { buildGroupWithSvgHead } from '../svg/svg-head-integration.js';
import { waitForFaceDecalTextures } from '../texture/texture-generator.js';
import {
  AVATAR_HEAD_MESH_MAP,
  buildGeneratedRuntimeHeadMesh,
} from '../../data/avatar/catalog/head-meshes.js';
import { createAvatarHeadSource } from './avatar-head-svg.js';
import { buildHairHelmetGeometry, resolveHairHelmetStyle } from './hair-helmet.js';
import {
  AVATAR_HEAD_BUILD_MODE_MOLD,
  cloneAvatarRecipe,
  resolveAvatarRecipe,
} from './avatar-recipe.js';

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneValue(entry);
    });
    return clone;
  }
  return value;
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(hex, fallback = '#ffcc00') {
  if (typeof hex !== 'string') return fallback;
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  return fallback;
}

function shadeHex(hex, amount = 0) {
  const value = normalizeHex(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  const factor = amount >= 0 ? amount : -amount;
  const next = amount >= 0
    ? [
        r + ((255 - r) * factor),
        g + ((255 - g) * factor),
        b + ((255 - b) * factor),
      ]
    : [
        r * (1 - factor),
        g * (1 - factor),
        b * (1 - factor),
      ];
  return `#${clampChannel(next[0]).toString(16).padStart(2, '0')}${clampChannel(next[1]).toString(16).padStart(2, '0')}${clampChannel(next[2]).toString(16).padStart(2, '0')}`;
}

function tintSurfaceColors(surfaceColors, baseColor) {
  if (!surfaceColors || typeof surfaceColors !== 'object' || Array.isArray(surfaceColors)) {
    return surfaceColors;
  }

  const adjustments = {
    top: 0.12,
    bottom: -0.14,
    left: -0.06,
    right: 0.06,
    front: 0.08,
    back: -0.12,
  };

  return Object.fromEntries(
    Object.keys(surfaceColors).map((key) => [key, shadeHex(baseColor, adjustments[key] ?? 0)])
  );
}

function buildSlotLookup(slotMap = {}) {
  const lookup = {};
  Object.entries(slotMap).forEach(([slotId, names]) => {
    (names || []).forEach((name) => {
      lookup[name] = slotId;
    });
  });
  return lookup;
}

function resolvePaletteColorToken(pieceName, slotId, slotColorMap = {}) {
  // Structural piece names win over the slot-level color so hands and necks
  // stay skin-toned and boots/belts read as accents on every body preset.
  const normalizedName = String(pieceName || '').toUpperCase();
  if (normalizedName.includes('HAND') || normalizedName.includes('NECK')) return 'skin';
  if (normalizedName.includes('BELT') || normalizedName.includes('COLLAR') || normalizedName.includes('RIBBON')) return 'accent';
  if (normalizedName.includes('FOOT')) return 'accent';
  if (normalizedName.includes('PELVIS')) return 'bodySecondary';
  if (normalizedName.includes('_PAD')) return 'bodyPrimary';

  if (slotColorMap[slotId]) return slotColorMap[slotId];

  if (slotId === 'HEAD') return 'skin';
  if (slotId === 'TORSO' || slotId === 'BODY') return 'bodyPrimary';
  if (slotId === 'ARM_L' || slotId === 'ARM_R' || slotId === 'LEG_L' || slotId === 'LEG_R') return 'bodySecondary';
  return 'bodyPrimary';
}

function darkenHexColor(hex, amount = 0.4) {
  const raw = String(hex || '').replace('#', '').padEnd(6, '0').slice(0, 6);
  const channel = (offset) => Math.max(0, Math.round(Number.parseInt(raw.slice(offset, offset + 2), 16) * (1 - amount)))
    .toString(16)
    .padStart(2, '0');
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function buildPaletteTokens(palette) {
  const hair = normalizeHex(palette.hair, '#6c3a2a');
  return {
    skin: normalizeHex(palette.skin, '#efc2aa'),
    bodyPrimary: normalizeHex(palette.bodyPrimary, '#8a4b68'),
    bodySecondary: normalizeHex(palette.bodySecondary, '#46527a'),
    accent: normalizeHex(palette.accent, '#2d9cc2'),
    hair,
    // Sprite tint tokens: palettes declare skin/hair/iris; lip and the brow
    // shade are derived so every palette tints the full face sprite set.
    hairDark: darkenHexColor(hair, 0.42),
    iris: normalizeHex(palette.iris, '#5a88cf'),
    lip: normalizeHex(palette.lip, darkenHexColor(normalizeHex(palette.skin, '#efc2aa'), 0.45)),
  };
}

// The generated body molds bake faceColors arrays whose 6-quad shading
// pattern we can rebuild from any base color, so the avatar palette can
// recolor them. JSON molds keep their hand-authored arrays untouched.
const PALETTE_DRIVEN_MOLD_IDS = new Set(GENERATED_CHARACTER_MOLDS.map((mold) => mold.id));

function createAvatarBodyTemplateDefinition(resolvedRecipe) {
  const template = TEMPLATE_REGISTRY.find((entry) => entry.id === resolvedRecipe.bodyPreset.moldId);
  if (!template) {
    throw new Error(`Body mold not found: ${resolvedRecipe.bodyPreset.moldId}`);
  }
  if (template?._archetypeMeta?.archetype !== 'HUMANOID') {
    throw new Error(`Body mold is not humanoid: ${resolvedRecipe.bodyPreset.moldId}`);
  }

  const definition = cloneValue(template);
  const slotLookup = buildSlotLookup(definition._archetypeMeta?.slotMap || {});
  const palette = buildPaletteTokens(resolvedRecipe.palette);
  const slotColorMap = resolvedRecipe.bodyPreset.slotColorMap || {};

  const paletteDrivenFaceColors = PALETTE_DRIVEN_MOLD_IDS.has(resolvedRecipe.bodyPreset.moldId);

  definition.pieces = (definition.pieces || []).map((piece) => {
    const slotId = slotLookup[piece.name] || null;
    const token = resolvePaletteColorToken(piece.name, slotId, slotColorMap);
    const baseColor = palette[token] || palette.bodyPrimary;
    const nextPiece = {
      ...piece,
      color: baseColor,
    };

    if (piece.vertexColors) {
      nextPiece.vertexColors = tintSurfaceColors(piece.vertexColors, baseColor);
    }
    if (piece.faceColors) {
      nextPiece.faceColors = paletteDrivenFaceColors && Array.isArray(piece.faceColors)
        ? makeFaceColors(baseColor)
        : tintSurfaceColors(piece.faceColors, baseColor);
    }

    return nextPiece;
  });

  if (definition._archetypeMeta) {
    definition._archetypeMeta.animationProfile = resolvedRecipe.recipe.animationProfile;
    definition._archetypeMeta.skeletonId = resolvedRecipe.recipe.skeletonId;
  }

  definition.animationProfile = resolvedRecipe.recipe.animationProfile;
  definition.skeletonId = resolvedRecipe.recipe.skeletonId;

  return definition;
}

function applyTargetTransform(group, targetGroup) {
  if (!group || !targetGroup) return;
  group.position.copy(targetGroup.position);
  group.rotation.copy(targetGroup.rotation);
  group.scale.copy(targetGroup.scale);
}

function resolveHeadBuildSourceShape(resolved) {
  return resolved.headMold?.sourceHead || null;
}

function resolveHeadGeometryEntry(resolved, sourceHeadShape) {
  const meshId = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD
    ? (
      (typeof resolved.headMold?.headMeshId === 'string' ? resolved.headMold.headMeshId.trim() : '')
      || (typeof sourceHeadShape?.headMeshId === 'string' ? sourceHeadShape.headMeshId.trim() : '')
    )
    : (typeof sourceHeadShape?.headMeshId === 'string' ? sourceHeadShape.headMeshId.trim() : '');
  if (!meshId) return null;
  if (resolved.headMold?.generatedPresetId === meshId && hasHeadParamDeltas(resolved.recipe?.headParams)) {
    return buildGeneratedRuntimeHeadMesh(meshId, resolved.recipe.headParams);
  }
  return AVATAR_HEAD_MESH_MAP[meshId] || null;
}

function hasHeadParamDeltas(headParams) {
  if (!headParams || typeof headParams !== 'object') return false;
  return Object.values(headParams).some((value) => Number.isFinite(value) && Math.abs(value) > 1e-6);
}

// When the head has real 3D landmarks we replace the extruded flat hair
// plaques with a procedural helmet carved from the skull itself, so the hair
// follows the head shape from every angle.
function buildHairHelmetParts(resolved, headGeometryEntry) {
  if (!headGeometryEntry?.customGeometry || !headGeometryEntry?.landmarks) return null;
  const style = resolveHairHelmetStyle(resolved.recipe.hairPresetId, resolved.features?.hair?.placement);
  if (!style) return null;

  const helmetGeometry = buildHairHelmetGeometry(
    headGeometryEntry.customGeometry,
    headGeometryEntry.landmarks,
    style
  );
  if (!helmetGeometry) return null;

  return [{
    id: 'HAIR_HELM_BACK',
    role: 'hair_helmet',
    color: normalizeHex(resolved.palette.hair, '#6c3a2a'),
    customGeometry: helmetGeometry,
    scaleWithHead: true,
  }];
}

// Skull-relative feature sizing: facial features scale with the interocular
// distance of the mounted skull so broad generated heads don't inherit the
// default head's smaller eyes and nose.
const FEATURE_SIZE_REFERENCE_HEAD_MESH_ID = DEFAULT_GENERATED_HEAD_ID;

function interocularDistance(landmarks) {
  const eyeL = landmarks?.eyeL;
  const eyeR = landmarks?.eyeR;
  if (!Array.isArray(eyeL) || !Array.isArray(eyeR)) return 0;
  return Math.hypot(
    (eyeR[0] || 0) - (eyeL[0] || 0),
    (eyeR[1] || 0) - (eyeL[1] || 0),
    (eyeR[2] || 0) - (eyeL[2] || 0),
  );
}

function resolveFeatureRelativeSizeFactor(headGeometryEntry, resolved) {
  const current = interocularDistance(headGeometryEntry?.landmarks);
  const reference = interocularDistance(
    AVATAR_HEAD_MESH_MAP[FEATURE_SIZE_REFERENCE_HEAD_MESH_ID]?.landmarks,
  );
  const relative = (current > 0 && reference > 0) ? current / reference : 1;
  const moldMultiplier = Number.isFinite(resolved?.headMold?.featureSizeMultiplier)
    ? resolved.headMold.featureSizeMultiplier
    : 1;
  return relative * moldMultiplier;
}

function scaleVector3(vector, factor = 1) {
  if (!vector || typeof vector !== 'object') return vector || null;
  const scale = Number.isFinite(factor) ? factor : 1;
  return {
    x: (Number.isFinite(vector.x) ? vector.x : 1) * scale,
    y: (Number.isFinite(vector.y) ? vector.y : 1) * scale,
    z: (Number.isFinite(vector.z) ? vector.z : 1) * scale,
  };
}

function buildFeaturePlacements(resolved) {
  const features = resolved?.features;
  if (!features || typeof features !== 'object') return null;
  const placements = {};
  Object.entries(features).forEach(([key, feature]) => {
    if (feature?.placement && typeof feature.placement === 'object') {
      placements[key] = { ...feature.placement };
    }
  });
  return Object.keys(placements).length > 0 ? placements : null;
}

function distance3(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  return Math.hypot(
    (b[0] || 0) - (a[0] || 0),
    (b[1] || 0) - (a[1] || 0),
    (b[2] || 0) - (a[2] || 0),
  );
}

function placementScale(preset, feature) {
  const base = Number.isFinite(preset?.placementDefaults?.size) ? preset.placementDefaults.size : 1;
  const user = Number.isFinite(feature?.placement?.size) ? feature.placement.size : 1;
  return Math.min(Math.max(base * user, 0.35), 1.8);
}

function placementOffset(feature, interocular) {
  const placement = feature?.placement || {};
  return {
    x: (Number.isFinite(placement.offsetX) ? placement.offsetX : 0) / 48 * interocular * 0.5,
    y: -(Number.isFinite(placement.offsetY) ? placement.offsetY : 0) / 48 * interocular * 0.5,
  };
}

export const DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID = 'default_embedded';

export const FEATURE_SLAB_DEPTH_PRESETS = Object.freeze({
  flat_safe: Object.freeze({
    id: 'flat_safe',
    depthFactor: 0.1,
    headDepthRatio: 0.12,
    embeddedRatio: 0.78,
    frontProtrusionRatio: 0.22,
    sidePadding: 0.04,
    materialSkinFallback: '#efc2aa',
    description: 'Shallow relief for conservative faces and tight silhouettes.',
  }),
  default_embedded: Object.freeze({
    id: 'default_embedded',
    depthFactor: 0.18,
    headDepthRatio: 0.18,
    embeddedRatio: 0.65,
    frontProtrusionRatio: 0.35,
    sidePadding: 0.02,
    materialSkinFallback: '#efc2aa',
    description: 'Default embedded relief: roughly 18% of head depth, with most volume inside the skull.',
  }),
  toy_extruded: Object.freeze({
    id: 'toy_extruded',
    depthFactor: 0.26,
    headDepthRatio: 0.24,
    embeddedRatio: 0.5,
    frontProtrusionRatio: 0.5,
    sidePadding: 0.01,
    materialSkinFallback: '#efc2aa',
    description: 'Thicker toy-like relief with half the slab visible outside the skull surface.',
  }),
  mask_plate: Object.freeze({
    id: 'mask_plate',
    depthFactor: 0.14,
    headDepthRatio: 0.15,
    embeddedRatio: 0.72,
    frontProtrusionRatio: 0.28,
    sidePadding: 0.08,
    materialSkinFallback: '#efc2aa',
    description: 'Inset mask-like plate with a smaller decal area and subdued protrusion.',
  }),
});

function resolveFeatureSlabPresetId(value) {
  return typeof value === 'string' && FEATURE_SLAB_DEPTH_PRESETS[value]
    ? value
    : DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID;
}

export function resolveFeatureSlabDepthPreset(resolved, headGeometryEntry = null) {
  const candidates = [
    resolved?.headMold?.featureSlabPresetId,
    resolved?.headMold?.sourceHead?.featureSlabPresetId,
    headGeometryEntry?.featureSlabPresetId,
  ];
  const presetId = candidates.find((id) => typeof id === 'string' && FEATURE_SLAB_DEPTH_PRESETS[id]);
  return FEATURE_SLAB_DEPTH_PRESETS[resolveFeatureSlabPresetId(presetId)];
}

function resolveLayerSpanFromSidePadding(sidePadding) {
  const inset = Number.isFinite(sidePadding) ? Math.max(0, Math.min(sidePadding, 0.45)) : 0;
  return Math.max(0.1, 1 - (inset * 2));
}

// Max mesh depth (z) inside a horizontal band of the face, so the decal can
// follow the real skull surface instead of assuming a flat plane.
export function sampleMeshMaxDepth(vertices, minX, maxX, minY, maxY, fallback = 0) {
  let max = -Infinity;
  if (Array.isArray(vertices)) {
    for (const vertex of vertices) {
      if (!Array.isArray(vertex) || vertex.length < 3) continue;
      if (vertex[0] < minX || vertex[0] > maxX) continue;
      if (vertex[1] < minY || vertex[1] > maxY) continue;
      if (vertex[2] > max) max = vertex[2];
    }
  }
  return max === -Infinity ? fallback : max;
}

function measureMeshHeadDepth(vertices) {
  let minZ = Infinity;
  let maxZ = -Infinity;
  if (Array.isArray(vertices)) {
    for (const vertex of vertices) {
      if (!Array.isArray(vertex) || vertex.length < 3) continue;
      minZ = Math.min(minZ, vertex[2]);
      maxZ = Math.max(maxZ, vertex[2]);
    }
  }
  const depth = maxZ - minZ;
  return Number.isFinite(depth) && depth > 0 ? depth : 0;
}

function resolveFeatureSlabDepth(interocular, slabPreset, meshVertices) {
  const headDepth = measureMeshHeadDepth(meshVertices);
  const headDepthRatio = Number(slabPreset?.headDepthRatio);
  if (headDepth > 0 && Number.isFinite(headDepthRatio) && headDepthRatio > 0) {
    return {
      depth: headDepth * headDepthRatio,
      headDepth,
      depthSource: 'headDepthRatio',
    };
  }
  return {
    depth: interocular * slabPreset.depthFactor,
    headDepth,
    depthSource: 'interocularFallback',
  };
}

function buildSlabGeometry(centerX, centerY, frontZ, width, height, depth) {
  const halfW = width * 0.5;
  const halfH = height * 0.5;
  const x0 = centerX - halfW;
  const x1 = centerX + halfW;
  const y0 = centerY - halfH;
  const y1 = centerY + halfH;
  const z0 = frontZ - depth;
  const z1 = frontZ;

  return {
    vertices: [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
    ],
    faces: [
      [0, 1, 2], [0, 2, 3],
      [5, 4, 7], [5, 7, 6],
      [4, 0, 3], [4, 3, 7],
      [1, 5, 6], [1, 6, 2],
      [3, 2, 6], [3, 6, 7],
      [4, 5, 1], [4, 1, 0],
    ],
  };
}

function resolveFeatureSurfaceZ(vertices, centerX, centerY, width, height, fallbackZ) {
  const sampled = sampleMeshMaxDepth(
    vertices,
    centerX - (width * 0.5),
    centerX + (width * 0.5),
    centerY - (height * 0.5),
    centerY + (height * 0.5),
    Number.NaN,
  );
  return Number.isNaN(sampled) ? fallbackZ : Math.max(sampled, fallbackZ);
}

function makeFeatureSlabPart({
  id,
  kind,
  side = null,
  sprite,
  tint,
  color,
  center,
  width,
  height,
  depth,
  headDepth,
  depthSource,
  surfaceZ,
  resolution,
  slabPreset,
}) {
  const resolvedPreset = slabPreset || FEATURE_SLAB_DEPTH_PRESETS[DEFAULT_FEATURE_SLAB_DEPTH_PRESET_ID];
  const layerSpan = resolveLayerSpanFromSidePadding(resolvedPreset.sidePadding);
  const frontZ = surfaceZ + (depth * resolvedPreset.frontProtrusionRatio);
  const layer = {
    kind,
    sprite,
    tint,
    x: 0.5,
    y: 0.5,
    w: layerSpan,
    h: layerSpan,
  };
  if (side) layer.side = side;

  return {
    id,
    role: 'FACE_FEATURE_SLAB',
    color,
    scaleWithHead: true,
    customGeometry: buildSlabGeometry(center.x, center.y, frontZ, width, height, depth),
    decal: {
      resolution,
      background: 'transparent',
      flipY: false,
      layers: [layer],
    },
    featureSlab: {
      kind,
      side,
      presetId: resolvedPreset.id,
      surfaceZ,
      frontZ,
      depth,
      headDepth,
      headDepthRatio: resolvedPreset.headDepthRatio,
      depthFactor: resolvedPreset.depthFactor,
      embeddedRatio: resolvedPreset.embeddedRatio,
      depthSource,
      protrusionRatio: resolvedPreset.frontProtrusionRatio,
      sidePadding: resolvedPreset.sidePadding,
    },
  };
}

export function buildFeatureSlabParts(resolved, headGeometryEntry) {
  const landmarks = headGeometryEntry?.landmarks;
  if (!landmarks?.eyeL || !landmarks?.eyeR || !landmarks?.mouth) return [];

  const colors = buildPaletteTokens(resolved.palette);
  const eyeL = landmarks.eyeL;
  const eyeR = landmarks.eyeR;
  const mouth = landmarks.mouth;
  const interocular = Math.max(distance3(eyeL, eyeR), 0.12);
  const slabPreset = resolveFeatureSlabDepthPreset(resolved, headGeometryEntry);
  const meshVertices = headGeometryEntry?.customGeometry?.vertices || null;
  const depthSpec = resolveFeatureSlabDepth(interocular, slabPreset, meshVertices);
  const depth = depthSpec.depth;
  const skinColor = normalizeHex(colors.skin, slabPreset.materialSkinFallback);
  const parts = [];

  const eyeSprite = resolved.eyePreset?.spriteId || null;
  const browSprite = resolved.browPreset?.spriteId || null;
  const mouthSprite = resolved.mouthPreset?.spriteId || null;
  const eyeScale = placementScale(resolved.eyePreset, resolved.features?.eyes);
  const browScale = placementScale(resolved.browPreset, resolved.features?.brows);
  const mouthScale = placementScale(resolved.mouthPreset, resolved.features?.mouth);
  const eyeOffset = placementOffset(resolved.features?.eyes, interocular);
  const browOffset = placementOffset(resolved.features?.brows, interocular);
  const mouthOffset = placementOffset(resolved.features?.mouth, interocular);
  const spacing = Number.isFinite(resolved.features?.eyes?.placement?.spacing)
    ? (resolved.features.eyes.placement.spacing / 32) * interocular * 0.25
    : 0;

  if (eyeSprite) {
    const eyeWidth = interocular * 0.52 * eyeScale;
    const eyeHeight = eyeWidth;
    [
      { id: 'EYE_SLAB_L', side: 'L', point: eyeL, spacingSign: -1 },
      { id: 'EYE_SLAB_R', side: 'R', point: eyeR, spacingSign: 1 },
    ].forEach(({ id, side, point, spacingSign }) => {
      const center = {
        x: point[0] + eyeOffset.x + (spacingSign * spacing),
        y: point[1] + eyeOffset.y,
      };
      const surfaceZ = resolveFeatureSurfaceZ(meshVertices, center.x, center.y, eyeWidth, eyeHeight, point[2] || 0);
      parts.push(makeFeatureSlabPart({
        id,
        kind: 'eye',
        side,
        sprite: eyeSprite,
        tint: { iris: colors.iris },
        color: skinColor,
        center,
        width: eyeWidth,
        height: eyeHeight,
        depth,
        headDepth: depthSpec.headDepth,
        depthSource: depthSpec.depthSource,
        surfaceZ,
        resolution: [32, 32],
        slabPreset,
      }));
    });
  }

  if (browSprite) {
    const browWidth = interocular * 0.54 * browScale;
    const browHeight = browWidth / 3;
    [
      { id: 'BROW_SLAB_L', side: 'L', point: [eyeL[0], eyeL[1] + (interocular * 0.4), eyeL[2]], spacingSign: -1 },
      { id: 'BROW_SLAB_R', side: 'R', point: [eyeR[0], eyeR[1] + (interocular * 0.4), eyeR[2]], spacingSign: 1 },
    ].forEach(({ id, side, point, spacingSign }) => {
      const center = {
        x: point[0] + browOffset.x + (spacingSign * spacing),
        y: point[1] + browOffset.y,
      };
      const surfaceZ = resolveFeatureSurfaceZ(meshVertices, center.x, center.y, browWidth, browHeight, point[2] || 0);
      parts.push(makeFeatureSlabPart({
        id,
        kind: 'brow',
        side,
        sprite: browSprite,
        tint: { brow: colors.hairDark },
        color: skinColor,
        center,
        width: browWidth,
        height: browHeight,
        depth,
        headDepth: depthSpec.headDepth,
        depthSource: depthSpec.depthSource,
        surfaceZ,
        resolution: [48, 16],
        slabPreset,
      }));
    });
  }

  if (mouthSprite) {
    const mouthWidth = interocular * 0.62 * mouthScale;
    const mouthHeight = mouthWidth / 2;
    const center = {
      x: mouth[0] + mouthOffset.x,
      y: mouth[1] + mouthOffset.y,
    };
    const surfaceZ = resolveFeatureSurfaceZ(meshVertices, center.x, center.y, mouthWidth, mouthHeight, mouth[2] || 0);
    parts.push(makeFeatureSlabPart({
      id: 'MOUTH_SLAB',
      kind: 'mouth',
      sprite: mouthSprite,
      tint: { lip: colors.lip },
      color: skinColor,
      center,
      width: mouthWidth,
      height: mouthHeight,
      depth,
      headDepth: depthSpec.headDepth,
      depthSource: depthSpec.depthSource,
      surfaceZ,
      resolution: [48, 24],
      slabPreset,
    }));
  }

  return parts;
}

function resolveHeadBuildSettings(resolved) {
  const sourceHeadShape = resolveHeadBuildSourceShape(resolved);
  const mold = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD ? resolved.headMold : null;
  const headScaleFactor = Number.isFinite(resolved.recipe?.headScale) ? resolved.recipe.headScale : 1;
  const baseHeadScale = mold?.headScale || sourceHeadShape?.headScale || null;

  return {
    sourceHeadShape,
    headScale: scaleVector3(baseHeadScale, headScaleFactor),
    featureScale: mold?.featureScale || sourceHeadShape?.featureScale || null,
    headScaleMode: mold?.headScaleMode || sourceHeadShape?.headScaleMode || '',
    headMountMode: mold?.headMountMode || sourceHeadShape?.headMountMode || '',
  };
}

export function buildAvatarTemplateDefinition(recipeInput) {
  const resolved = resolveAvatarRecipe(recipeInput);
  if (!resolved.ok) {
    throw new Error(resolved.errors.join(' | ') || 'Invalid avatar recipe');
  }
  return createAvatarBodyTemplateDefinition(resolved);
}

export async function buildAvatarGroup(recipeInput, options = {}) {
  const resolved = resolveAvatarRecipe(recipeInput);
  if (!resolved.ok) {
    throw new Error(resolved.errors.join(' | ') || 'Invalid avatar recipe');
  }

  const bodyTemplate = createAvatarBodyTemplateDefinition(resolved);
  const bodyGroup = instantiateTemplateDefinition(bodyTemplate);
  const label = resolved.recipe.label || options.targetGroup?.userData?.name || 'Avatar';
  bodyGroup.userData.name = label;
  bodyGroup.name = label;
  const headBuildSettings = resolveHeadBuildSettings(resolved);
  const headGeometryEntry = resolveHeadGeometryEntry(resolved, headBuildSettings.sourceHeadShape);

  if (options.targetGroup) {
    applyTargetTransform(bodyGroup, options.targetGroup);
  }

  const headSource = createAvatarHeadSource(resolved.recipe);
  const hairHelmetParts = buildHairHelmetParts(resolved, headGeometryEntry);
  const featureSlabParts = buildFeatureSlabParts(resolved, headGeometryEntry);
  const featureSlabKeys = new Set(featureSlabParts.map((part) => part.featureSlab?.kind).filter(Boolean));
  const headExtraParts = [
    ...(hairHelmetParts || []),
    ...featureSlabParts,
  ];
  const suppressFeatureKeys = [
    ...(hairHelmetParts ? ['hair'] : []),
    ...(featureSlabKeys.has('eye') ? ['eyes'] : []),
    ...(featureSlabKeys.has('brow') ? ['brows'] : []),
    ...(featureSlabKeys.has('mouth') ? ['mouth'] : []),
  ];
  const nextGroup = await buildGroupWithSvgHead(bodyGroup, headSource, {
    name: `${label} Head`,
    renderMode: 'inflated-head',
    headScale: headBuildSettings.headScale,
    featureScale: headBuildSettings.featureScale,
    headScaleMode: headBuildSettings.headScaleMode,
    headMountMode: headBuildSettings.headMountMode,
    headDepthCenterMode: headBuildSettings.headScaleMode === 'cranium' ? 'pivot' : '',
    headGeometryOverride: headGeometryEntry?.customGeometry || null,
    headLandmarks: headGeometryEntry?.landmarks || null,
    headExtraParts,
    suppressFeatureKeys,
    featurePlacements: buildFeaturePlacements(resolved),
    featureRelativeSizeFactor: resolveFeatureRelativeSizeFactor(headGeometryEntry, resolved),
  });

  nextGroup.userData.name = label;
  nextGroup.name = label;
  nextGroup.userData.avatarRecipe = cloneAvatarRecipe(resolved.recipe);
  if (resolved.migrations?.length) {
    nextGroup.userData.avatarRecipeMigrations = resolved.migrations.map((entry) => ({ ...entry }));
  }
  nextGroup.userData.animationProfile = resolved.recipe.animationProfile;
  nextGroup.userData.skeletonId = resolved.recipe.skeletonId;

  await waitForFaceDecalTextures(nextGroup);
  return nextGroup;
}
