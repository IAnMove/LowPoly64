import { TEMPLATE_REGISTRY } from '../viewport/template-registry.js';
import { GENERATED_CHARACTER_MOLDS, makeFaceColors } from '../../data/templates/generated-character-molds.js';
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

function buildPaletteTokens(palette) {
  return {
    skin: normalizeHex(palette.skin, '#efc2aa'),
    bodyPrimary: normalizeHex(palette.bodyPrimary, '#8a4b68'),
    bodySecondary: normalizeHex(palette.bodySecondary, '#46527a'),
    accent: normalizeHex(palette.accent, '#2d9cc2'),
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
// distance of the mounted skull so wide heads (gordo/cabezon) don't end up
// with the reference head's tiny eyes and nose. The calibration head is the
// mesh every feature preset was originally tuned against.
const FEATURE_SIZE_REFERENCE_HEAD_MESH_ID = 'psx_mesh_portrait_01';

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

const DECAL_FALLBACK_STYLE_BY_SPRITE = Object.freeze({
  eye_dot: 'dot',
  eye_halfmoon: 'halfmoon',
  eye_angry: 'angry',
  eye_lash: 'oval',
  eye_oval: 'oval',
  eye_star: 'oval',
  mouth_flat: 'flat',
  mouth_frown: 'frown',
  mouth_open: 'open',
  mouth_grin: 'smile',
  mouth_smile: 'smile',
  brow_angled: 'angled',
  brow_flat: 'flat',
  brow_thick: 'flat',
});

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

// Max mesh depth (z) inside a horizontal band of the face, so the decal can
// follow the real skull surface instead of assuming a flat plane. Bulbous
// heads (cabezon, gordo) protrude beyond their landmarks and would otherwise
// swallow a flat decal quad.
function sampleMeshMaxDepth(vertices, minX, maxX, minY, maxY, fallback = 0) {
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

export function buildFaceDecalPart(resolved, headGeometryEntry) {
  const landmarks = headGeometryEntry?.landmarks;
  if (!landmarks?.eyeL || !landmarks?.eyeR || !landmarks?.mouth) return null;

  const colors = buildPaletteTokens(resolved.palette);
  const eyeL = landmarks.eyeL;
  const eyeR = landmarks.eyeR;
  const mouth = landmarks.mouth;
  const noseTip = landmarks.noseTip || [
    (eyeL[0] + eyeR[0]) * 0.5,
    (eyeL[1] + eyeR[1] + mouth[1]) / 3,
    Math.max(eyeL[2] || 0, eyeR[2] || 0, mouth[2] || 0),
  ];
  const interocular = Math.max(distance3(eyeL, eyeR), 0.12);
  const width = interocular * 1.9;
  const top = Math.max(eyeL[1], eyeR[1]) + (interocular * 0.58);
  const bottom = mouth[1] - (interocular * 0.58);
  const height = width;
  const centerX = ((eyeL[0] + eyeR[0]) * 0.5 + mouth[0]) / 2;
  const left = centerX - (width * 0.5);
  const right = centerX + (width * 0.5);
  const resolvedBottom = ((top + bottom) * 0.5) - (height * 0.5);
  const resolvedTop = resolvedBottom + height;

  const mapPoint = (point, feature = null) => {
    const offset = placementOffset(feature, interocular);
    return {
      x: Math.min(Math.max(((point[0] + offset.x) - left) / width, 0.05), 0.95),
      y: Math.min(Math.max(1 - (((point[1] + offset.y) - resolvedBottom) / height), 0.08), 0.92),
    };
  };

  const eyeSprite = resolved.eyePreset?.spriteId || null;
  const browSprite = resolved.browPreset?.spriteId || null;
  const mouthSprite = resolved.mouthPreset?.spriteId || null;
  const eyeStyle = DECAL_FALLBACK_STYLE_BY_SPRITE[eyeSprite] || null;
  const browStyle = DECAL_FALLBACK_STYLE_BY_SPRITE[browSprite] || null;
  const mouthStyle = DECAL_FALLBACK_STYLE_BY_SPRITE[mouthSprite] || null;
  const eyeScale = placementScale(resolved.eyePreset, resolved.features?.eyes);
  const browScale = placementScale(resolved.browPreset, resolved.features?.brows);
  const mouthScale = placementScale(resolved.mouthPreset, resolved.features?.mouth);
  const spacing = Number.isFinite(resolved.features?.eyes?.placement?.spacing)
    ? resolved.features.eyes.placement.spacing / 32 * 0.07
    : 0;
  const layers = [];

  if (eyeSprite) {
    const leftEye = mapPoint(eyeL, resolved.features?.eyes);
    const rightEye = mapPoint(eyeR, resolved.features?.eyes);
    leftEye.x = Math.max(leftEye.x - spacing, 0.05);
    rightEye.x = Math.min(rightEye.x + spacing, 0.95);
    layers.push(
      { kind: 'eye', side: 'L', sprite: eyeSprite, tint: { iris: colors.iris }, style: eyeStyle || 'oval', iris: colors.iris, x: leftEye.x, y: leftEye.y, w: 0.17 * eyeScale, h: 0.17 * eyeScale },
      { kind: 'eye', side: 'R', sprite: eyeSprite, tint: { iris: colors.iris }, style: eyeStyle || 'oval', iris: colors.iris, x: rightEye.x, y: rightEye.y, w: 0.17 * eyeScale, h: 0.17 * eyeScale },
    );
  }

  if (browSprite && eyeSprite) {
    const leftBrow = mapPoint([eyeL[0], eyeL[1] + (interocular * 0.28), eyeL[2]], resolved.features?.brows);
    const rightBrow = mapPoint([eyeR[0], eyeR[1] + (interocular * 0.28), eyeR[2]], resolved.features?.brows);
    leftBrow.x = Math.max(leftBrow.x - spacing, 0.05);
    rightBrow.x = Math.min(rightBrow.x + spacing, 0.95);
    layers.push(
      { kind: 'brow', side: 'L', sprite: browSprite, tint: { brow: colors.hairDark }, style: browStyle || 'flat', color: colors.hairDark, x: leftBrow.x, y: leftBrow.y, w: 0.2 * browScale, h: 0.06 * browScale, angle: browStyle === 'angled' ? -9 : 0 },
      { kind: 'brow', side: 'R', sprite: browSprite, tint: { brow: colors.hairDark }, style: browStyle || 'flat', color: colors.hairDark, x: rightBrow.x, y: rightBrow.y, w: 0.2 * browScale, h: 0.06 * browScale, angle: browStyle === 'angled' ? 9 : 0 },
    );
  }

  if (mouthSprite) {
    const mouthPoint = mapPoint(mouth, resolved.features?.mouth);
    const mouthHeight = 0.12 * mouthScale;
    const chinY = Array.isArray(landmarks.chin)
      ? 1 - ((landmarks.chin[1] - resolvedBottom) / height)
      : 0.95;
    mouthPoint.y = Math.min(mouthPoint.y + 0.11, chinY - (mouthHeight * 0.55), 0.8 - (mouthHeight * 0.5));
    layers.push({
      kind: 'mouth',
      sprite: mouthSprite,
      tint: { lip: colors.lip },
      style: mouthStyle || 'smile',
      color: colors.lip,
      x: mouthPoint.x,
      y: mouthPoint.y,
      w: 0.32 * mouthScale,
      h: mouthHeight,
    });
  }

  if (layers.length === 0) return null;

  // Curved vertical profile: one row per facial band, each pushed just past
  // the deepest mesh point in that band (landmarks alone are not enough on
  // bulbous heads whose cheeks/brow protrude beyond the eye/mouth points).
  const meshVertices = headGeometryEntry?.customGeometry?.vertices || null;
  const clearance = interocular * 0.1;
  const band = interocular * 0.32;
  const eyeRowY = (eyeL[1] + eyeR[1]) * 0.5;
  const mouthRowY = Math.min(mouth[1], eyeRowY - (interocular * 0.22));
  const eyeLmZ = Math.max(eyeL[2] || 0, eyeR[2] || 0);
  const chinLmZ = Array.isArray(landmarks.chin) ? (landmarks.chin[2] || 0) : (mouth[2] || 0);
  const rowDepth = (y, landmarkZ) => Math.max(
    landmarkZ,
    sampleMeshMaxDepth(meshVertices, left, right, y - band, y + band, landmarkZ),
  ) + clearance;
  const zTop = rowDepth(resolvedTop, eyeLmZ);
  const zEye = rowDepth(eyeRowY, eyeLmZ);
  const zMouth = rowDepth(mouthRowY, mouth[2] || 0);
  const zBottom = rowDepth(resolvedBottom, chinLmZ);

  return {
    id: 'FACE_DECAL',
    role: 'FACE_DECAL',
    featureKey: 'faceDecal',
    color: '#ffffff',
    scaleWithHead: true,
    customGeometry: {
      vertices: [
        [left, resolvedBottom, zBottom],
        [right, resolvedBottom, zBottom],
        [left, mouthRowY, zMouth],
        [right, mouthRowY, zMouth],
        [left, eyeRowY, zEye],
        [right, eyeRowY, zEye],
        [left, resolvedTop, zTop],
        [right, resolvedTop, zTop],
      ],
      faces: [
        [0, 1, 3],
        [0, 3, 2],
        [2, 3, 5],
        [2, 5, 4],
        [4, 5, 7],
        [4, 7, 6],
      ],
    },
    decal: {
      resolution: [128, 128],
      background: 'transparent',
      flipY: false,
      layers,
    },
  };
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
  const faceDecalPart = buildFaceDecalPart(resolved, headGeometryEntry);
  const headExtraParts = [
    ...(hairHelmetParts || []),
    ...(faceDecalPart ? [faceDecalPart] : []),
  ];
  const suppressFeatureKeys = [
    ...(hairHelmetParts ? ['hair'] : []),
    ...(faceDecalPart ? ['eyes', 'brows', 'mouth'] : []),
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
  nextGroup.userData.animationProfile = resolved.recipe.animationProfile;
  nextGroup.userData.skeletonId = resolved.recipe.skeletonId;

  await waitForFaceDecalTextures(nextGroup);
  return nextGroup;
}
