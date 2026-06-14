import { TEMPLATE_REGISTRY } from '../viewport/template-registry.js';
import { GENERATED_CHARACTER_MOLDS, makeFaceColors } from '../../data/templates/generated-character-molds.js';
import { instantiateTemplateDefinition } from '../viewport/templates.js';
import { buildGroupWithSvgHead } from '../svg/svg-head-integration.js';
import { AVATAR_HEAD_MESH_MAP } from '../../data/avatar/catalog/head-meshes.js';
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
  return AVATAR_HEAD_MESH_MAP[meshId] || null;
}

// When the head has real 3D landmarks we replace the extruded flat hair
// plaques with a procedural helmet carved from the skull itself, so the hair
// follows the head shape from every angle.
function buildHairHelmetParts(resolved, headGeometryEntry) {
  if (!headGeometryEntry?.customGeometry || !headGeometryEntry?.landmarks) return null;
  const style = resolveHairHelmetStyle(resolved.recipe.hairPresetId);
  if (!style) return null;

  const helmetGeometry = buildHairHelmetGeometry(
    headGeometryEntry.customGeometry,
    headGeometryEntry.landmarks,
    style
  );
  if (!helmetGeometry) return null;

  return [{
    id: 'HAIR_HELMET',
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

function resolveHeadBuildSettings(resolved) {
  const sourceHeadShape = resolveHeadBuildSourceShape(resolved);
  const mold = resolved.headBuildMode === AVATAR_HEAD_BUILD_MODE_MOLD ? resolved.headMold : null;

  return {
    sourceHeadShape,
    headScale: mold?.headScale || sourceHeadShape?.headScale || null,
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
  const nextGroup = await buildGroupWithSvgHead(bodyGroup, headSource, {
    name: `${label} Head`,
    renderMode: 'inflated-head',
    headScale: headBuildSettings.headScale,
    featureScale: headBuildSettings.featureScale,
    headScaleMode: headBuildSettings.headScaleMode,
    headMountMode: headBuildSettings.headMountMode,
    headGeometryOverride: headGeometryEntry?.customGeometry || null,
    headLandmarks: headGeometryEntry?.landmarks || null,
    headExtraParts: hairHelmetParts || null,
    suppressFeatureKeys: hairHelmetParts ? ['hair'] : null,
    featurePlacements: buildFeaturePlacements(resolved),
    featureRelativeSizeFactor: resolveFeatureRelativeSizeFactor(headGeometryEntry, resolved),
  });

  nextGroup.userData.name = label;
  nextGroup.name = label;
  nextGroup.userData.avatarRecipe = cloneAvatarRecipe(resolved.recipe);
  nextGroup.userData.animationProfile = resolved.recipe.animationProfile;
  nextGroup.userData.skeletonId = resolved.recipe.skeletonId;

  return nextGroup;
}
