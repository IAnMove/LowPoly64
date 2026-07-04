import {
  AVATAR_ACCESSORY_PRESET_MAP,
  AVATAR_ACCESSORY_PRESETS,
  AVATAR_BODY_PRESET_MAP,
  AVATAR_BODY_PRESETS,
  AVATAR_BROW_PRESET_MAP,
  AVATAR_BROW_PRESETS,
  AVATAR_EAR_PRESET_MAP,
  AVATAR_EAR_PRESETS,
  AVATAR_EYE_PRESET_MAP,
  AVATAR_EYE_PRESETS,
  AVATAR_HAIR_PRESET_MAP,
  AVATAR_HAIR_PRESETS,
  AVATAR_HEAD_MOLD_MAP,
  AVATAR_HEAD_MOLDS,
  AVATAR_MOLD_FEATURE_BUNDLE_MAP,
  AVATAR_MOLD_FEATURE_BUNDLES,
  AVATAR_MOUTH_PRESET_MAP,
  AVATAR_MOUTH_PRESETS,
  AVATAR_NOSE_PRESET_MAP,
  AVATAR_NOSE_PRESETS,
  AVATAR_PALETTE_MAP,
  AVATAR_PALETTES,
} from '../../data/avatar/catalog.js';
import {
  DEFAULT_GENERATED_HEAD_ID,
  GENERATED_HEAD_PARAM_KEYS,
} from '../../data/avatar/generated-heads.js';

export const AVATAR_RECIPE_VERSION = 2;
export const AVATAR_HEAD_BUILD_MODE_MOLD = 'mold';
export const AVATAR_DEFAULT_ANIMATION_PROFILE = 'HUMANOID_STANDARD_AVATAR_BASE';
export const AVATAR_DEFAULT_SKELETON_ID = 'HUMANOID_STANDARD';
export const AVATAR_DEFAULT_FEATURE_SLAB_PRESET_ID = 'default_embedded';
export const AVATAR_FEATURE_SLAB_PRESET_IDS = Object.freeze([
  'flat_safe',
  AVATAR_DEFAULT_FEATURE_SLAB_PRESET_ID,
  'toy_extruded',
  'mask_plate',
]);

const AVATAR_COLOR_KEYS = ['skin', 'hair', 'iris', 'bodyPrimary', 'bodySecondary', 'accent'];
const AVATAR_FEATURE_KEYS = Object.freeze(['eyes', 'brows', 'nose', 'mouth', 'ears', 'hair']);

export const AVATAR_HEAD_PARAM_LIMITS = Object.freeze({
  skullWidth: Object.freeze({ min: -0.2, max: 0.2, defaultValue: 0 }),
  jawDrop: Object.freeze({ min: -0.25, max: 0.25, defaultValue: 0 }),
  crownRoundness: Object.freeze({ min: -0.3, max: 0.3, defaultValue: 0 }),
  cheekFullness: Object.freeze({ min: -0.3, max: 0.3, defaultValue: 0 }),
});

const AVATAR_FEATURE_PLACEMENT_DEFAULTS = Object.freeze({
  eyes: Object.freeze({ size: 1, offsetX: 0, offsetY: 0, spacing: 0 }),
  brows: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
  nose: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
  mouth: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
  ears: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
  hair: Object.freeze({ size: 1, offsetX: 0, offsetY: 0, length: 0 }),
});

const AVATAR_FEATURE_MAPS = Object.freeze({
  eyes: AVATAR_EYE_PRESET_MAP,
  brows: AVATAR_BROW_PRESET_MAP,
  nose: AVATAR_NOSE_PRESET_MAP,
  mouth: AVATAR_MOUTH_PRESET_MAP,
  ears: AVATAR_EAR_PRESET_MAP,
  hair: AVATAR_HAIR_PRESET_MAP,
});

const AVATAR_DEFAULT_HEAD_MOLD_ID = (
  (AVATAR_HEAD_MOLD_MAP[DEFAULT_GENERATED_HEAD_ID] ? DEFAULT_GENERATED_HEAD_ID : '')
  || AVATAR_HEAD_MOLDS.find((entry) => entry.defaultGeneratedHead)?.id
  || AVATAR_HEAD_MOLDS.find((entry) => entry.generatedPresetId)?.id
  || AVATAR_HEAD_MOLDS[0]?.id
  || 'gen_head_heroic'
);

const LEGACY_HEAD_PREFIX = ['psx', 'mesh', 'portrait'].join('_');
const LEGACY_HEAD_NAME_TOKENS = Object.freeze({
  large: `cabe${'zon'}`,
  hard: 'duro',
  full: 'gordo',
});

function legacyPortraitId(...parts) {
  return [LEGACY_HEAD_PREFIX, ...parts].join('_');
}

function legacyFileId(...parts) {
  return parts.join('');
}

export const AVATAR_LEGACY_HEAD_MOLD_MIGRATIONS = Object.freeze({
  [legacyPortraitId('01')]: 'gen_head_heroic',
  [legacyPortraitId('normal', '175')]: 'gen_head_heroic',
  [legacyPortraitId(LEGACY_HEAD_NAME_TOKENS.large, '175')]: 'gen_head_chibi',
  [legacyPortraitId(LEGACY_HEAD_NAME_TOKENS.hard, '175')]: 'gen_head_square',
  [legacyPortraitId(LEGACY_HEAD_NAME_TOKENS.hard, '250')]: 'gen_head_square',
  [legacyPortraitId(LEGACY_HEAD_NAME_TOKENS.full, '175')]: 'gen_head_broad',
  [legacyPortraitId(LEGACY_HEAD_NAME_TOKENS.full, '275')]: 'gen_head_broad',
  [['white', 'mesh180'].join('_')]: 'gen_head_heroic',
  [legacyFileId('normal', '175')]: 'gen_head_heroic',
  [legacyFileId(LEGACY_HEAD_NAME_TOKENS.large, '175')]: 'gen_head_chibi',
  [legacyFileId(LEGACY_HEAD_NAME_TOKENS.hard, '175')]: 'gen_head_square',
  [legacyFileId(LEGACY_HEAD_NAME_TOKENS.hard, '250')]: 'gen_head_square',
  [legacyFileId(LEGACY_HEAD_NAME_TOKENS.full, '175')]: 'gen_head_broad',
  [legacyFileId(LEGACY_HEAD_NAME_TOKENS.full, '275')]: 'gen_head_broad',
  [['psx', 'portrait', '01'].join('_')]: 'gen_head_heroic',
});

const AVATAR_HEAD_RECIPE_ID_FIELDS = Object.freeze([
  'headMoldId',
  'headMeshId',
  'headShapeId',
  'headId',
  'sourceHeadId',
]);

const AVATAR_DEFAULT_FEATURE_PRESET_IDS = Object.freeze({
  hair: AVATAR_HAIR_PRESETS[1]?.id || 'none_01',
  eyes: AVATAR_EYE_PRESETS[1]?.id || 'none_01',
  brows: AVATAR_BROW_PRESETS[1]?.id || 'none_01',
  nose: AVATAR_NOSE_PRESETS[0]?.id || 'nose_soft_01',
  mouth: AVATAR_MOUTH_PRESETS[1]?.id || 'none_01',
  ears: AVATAR_EAR_PRESETS[0]?.id || 'ear_soft_01',
});

function resolveMoldFeatureBundle(bundleId, headMoldId = '') {
  const directBundle = typeof bundleId === 'string' ? AVATAR_MOLD_FEATURE_BUNDLE_MAP[bundleId] : null;
  if (directBundle) return directBundle;

  const mold = typeof headMoldId === 'string' ? AVATAR_HEAD_MOLD_MAP[headMoldId] : null;
  const moldBundleId = typeof mold?.defaultFeatureBundleId === 'string' ? mold.defaultFeatureBundleId : '';
  if (moldBundleId && AVATAR_MOLD_FEATURE_BUNDLE_MAP[moldBundleId]) {
    return AVATAR_MOLD_FEATURE_BUNDLE_MAP[moldBundleId];
  }

  return AVATAR_MOLD_FEATURE_BUNDLES.find((entry) => entry.headMoldId === headMoldId)
    || AVATAR_MOLD_FEATURE_BUNDLES[0]
    || null;
}

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

function pickKnownId(value, map, fallbackId) {
  if (typeof value === 'string' && map[value]) return value;
  return fallbackId;
}

function normalizeHeadIdValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveHeadMoldTargetId(targetId) {
  return AVATAR_HEAD_MOLD_MAP[targetId] ? targetId : AVATAR_DEFAULT_HEAD_MOLD_ID;
}

function createHeadMigration({ from, to, sourceField, reason }) {
  return Object.freeze({
    type: 'headMold',
    from,
    to,
    sourceField,
    reason,
    messageKey: 'avatarHeadMigratedToast',
  });
}

function resolveHeadMoldResolution(recipe = {}) {
  const source = recipe && typeof recipe === 'object' ? recipe : {};
  let unknownCandidate = null;

  for (const sourceField of AVATAR_HEAD_RECIPE_ID_FIELDS) {
    const sourceId = normalizeHeadIdValue(source[sourceField]);
    if (!sourceId) continue;

    const migratedId = AVATAR_LEGACY_HEAD_MOLD_MIGRATIONS[sourceId];
    if (migratedId) {
      const to = resolveHeadMoldTargetId(migratedId);
      return {
        id: to,
        migration: createHeadMigration({
          from: sourceId,
          to,
          sourceField,
          reason: 'legacy',
        }),
      };
    }

    if (AVATAR_HEAD_MOLD_MAP[sourceId]) {
      return { id: sourceId, migration: null };
    }

    if (!unknownCandidate) unknownCandidate = { sourceId, sourceField };
  }

  if (unknownCandidate) {
    const to = AVATAR_DEFAULT_HEAD_MOLD_ID;
    return {
      id: to,
      migration: createHeadMigration({
        from: unknownCandidate.sourceId,
        to,
        sourceField: unknownCandidate.sourceField,
        reason: 'unknown',
      }),
    };
  }

  return { id: AVATAR_DEFAULT_HEAD_MOLD_ID, migration: null };
}

function resolveHeadMoldId(recipe = {}) {
  return resolveHeadMoldResolution(recipe).id;
}

export function collectAvatarRecipeMigrations(recipe = {}) {
  const migration = resolveHeadMoldResolution(recipe).migration;
  return migration ? [migration] : [];
}

function normalizeHeadBuildMode(value) {
  void value;
  return AVATAR_HEAD_BUILD_MODE_MOLD;
}

function normalizeNumericValue(value, fallback) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function normalizeHeadScale(value) {
  const numeric = normalizeNumericValue(value, 1);
  return Math.min(Math.max(numeric, 0.85), 1.4);
}

function normalizeFeatureSlabPresetId(value) {
  return AVATAR_FEATURE_SLAB_PRESET_IDS.includes(value)
    ? value
    : AVATAR_DEFAULT_FEATURE_SLAB_PRESET_ID;
}

function normalizeHeadParams(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.freeze(
    Object.fromEntries(
      GENERATED_HEAD_PARAM_KEYS.map((key) => {
        const limit = AVATAR_HEAD_PARAM_LIMITS[key] || { min: -1, max: 1, defaultValue: 0 };
        const numeric = Number(source[key]);
        const resolved = Number.isFinite(numeric) ? numeric : limit.defaultValue;
        return [key, Math.min(Math.max(resolved, limit.min), limit.max)];
      })
    )
  );
}

function normalizeHex(hex) {
  if (typeof hex !== 'string') return '';
  const value = hex.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
  }
  return '';
}

function normalizeColorOverrides(colorOverrides) {
  const source = colorOverrides && typeof colorOverrides === 'object' ? colorOverrides : {};
  return Object.fromEntries(
    AVATAR_COLOR_KEYS
      .map((key) => [key, normalizeHex(source[key])])
      .filter(([, value]) => !!value)
  );
}

function resolvePaletteWithOverrides(paletteId, colorOverrides = {}) {
  const palette = AVATAR_PALETTE_MAP[paletteId] || AVATAR_PALETTE_MAP[AVATAR_RECIPE_DEFAULTS.paletteId];
  return {
    ...palette,
    ...normalizeColorOverrides(colorOverrides),
  };
}

function normalizeAccessoryIds(accessoryIds) {
  const ids = Array.isArray(accessoryIds) ? accessoryIds : [];
  const resolved = ids
    .filter((id) => typeof id === 'string' && AVATAR_ACCESSORY_PRESET_MAP[id])
    .filter((id, index, list) => list.indexOf(id) === index);
  if (resolved.length === 0) return ['none'];
  if (resolved.length > 1) {
    return resolved.filter((id) => id !== 'none');
  }
  return resolved;
}

function resolveFeaturePresetId(featureKey, directValue, featureValue) {
  const map = AVATAR_FEATURE_MAPS[featureKey] || {};
  const fallbackId = AVATAR_DEFAULT_FEATURE_PRESET_IDS[featureKey];
  return pickKnownId(
    typeof featureValue?.presetId === 'string' ? featureValue.presetId : directValue,
    map,
    fallbackId,
  );
}

function normalizeFeaturePlacement(featureKey, placement) {
  const defaults = AVATAR_FEATURE_PLACEMENT_DEFAULTS[featureKey] || {};
  const source = placement && typeof placement === 'object' ? placement : {};
  const normalized = {
    size: normalizeNumericValue(source.size, defaults.size ?? 1),
    offsetX: normalizeNumericValue(source.offsetX, defaults.offsetX ?? 0),
    offsetY: normalizeNumericValue(source.offsetY, defaults.offsetY ?? 0),
  };
  if (featureKey === 'eyes') {
    normalized.spacing = normalizeNumericValue(source.spacing, defaults.spacing ?? 0);
  }
  if (featureKey === 'hair') {
    normalized.length = normalizeNumericValue(source.length, defaults.length ?? 0);
  }
  return normalized;
}

function normalizeFeatureState(featureKey, sourceFeature, directPresetId) {
  const presetId = resolveFeaturePresetId(featureKey, directPresetId, sourceFeature);
  return {
    presetId,
    placement: normalizeFeaturePlacement(featureKey, sourceFeature?.placement),
  };
}

function buildNormalizedFeatures(recipe = {}) {
  const source = recipe.features && typeof recipe.features === 'object' ? recipe.features : {};
  return {
    eyes: normalizeFeatureState('eyes', source.eyes, recipe.eyePresetId),
    brows: normalizeFeatureState('brows', source.brows, recipe.browPresetId),
    nose: normalizeFeatureState('nose', source.nose, recipe.nosePresetId),
    mouth: normalizeFeatureState('mouth', source.mouth, recipe.mouthPresetId),
    ears: normalizeFeatureState('ears', source.ears, recipe.earPresetId),
    hair: normalizeFeatureState('hair', source.hair, recipe.hairPresetId),
  };
}

function mergeFeaturePatch(currentFeatures, patchFeatures) {
  const current = currentFeatures && typeof currentFeatures === 'object' ? currentFeatures : {};
  const patch = patchFeatures && typeof patchFeatures === 'object' ? patchFeatures : {};
  return Object.fromEntries(
    AVATAR_FEATURE_KEYS.map((featureKey) => {
      const currentEntry = current[featureKey] || {};
      const patchEntry = patch[featureKey];
      if (!patchEntry || typeof patchEntry !== 'object') {
        return [featureKey, cloneValue(currentEntry)];
      }
      return [featureKey, {
        ...cloneValue(currentEntry),
        ...cloneValue(patchEntry),
        placement: {
          ...(currentEntry.placement || {}),
          ...(patchEntry.placement && typeof patchEntry.placement === 'object' ? cloneValue(patchEntry.placement) : {}),
        },
      }];
    })
  );
}

const AVATAR_RECIPE_DEFAULTS = Object.freeze({
  version: AVATAR_RECIPE_VERSION,
  label: 'Avatar',
  headBuildMode: AVATAR_HEAD_BUILD_MODE_MOLD,
  bodyPresetId: AVATAR_BODY_PRESETS[0].id,
  headMoldId: AVATAR_DEFAULT_HEAD_MOLD_ID,
  hairPresetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.hair,
  eyePresetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.eyes,
  browPresetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.brows,
  mouthPresetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.mouth,
  accessoryIds: ['none'],
  paletteId: AVATAR_PALETTES[0].id,
  colorOverrides: Object.freeze({}),
  headScale: 1,
  featureSlabPresetId: AVATAR_DEFAULT_FEATURE_SLAB_PRESET_ID,
  headParams: normalizeHeadParams(),
  animationProfile: AVATAR_DEFAULT_ANIMATION_PROFILE,
  skeletonId: AVATAR_DEFAULT_SKELETON_ID,
  features: Object.freeze({
    eyes: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.eyes, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.eyes }),
    brows: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.brows, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.brows }),
    nose: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.nose, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.nose }),
    mouth: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.mouth, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.mouth }),
    ears: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.ears, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.ears }),
    hair: Object.freeze({ presetId: AVATAR_DEFAULT_FEATURE_PRESET_IDS.hair, placement: AVATAR_FEATURE_PLACEMENT_DEFAULTS.hair }),
  }),
});

export function createDefaultAvatarRecipe(overrides = {}) {
  return createMoldAvatarRecipe(overrides);
}

export function createMoldAvatarRecipe(overrides = {}) {
  const clonedOverrides = cloneValue(overrides);
  const headMoldId = resolveHeadMoldId(clonedOverrides);
  const bundle = resolveMoldFeatureBundle(clonedOverrides.moldFeatureBundleId, headMoldId);
  const bundleFeatures = bundle?.featurePresetIds
    ? Object.fromEntries(
      Object.entries(bundle.featurePresetIds).map(([featureKey, presetId]) => [featureKey, { presetId }])
    )
    : {};

  return normalizeAvatarRecipe({
    ...AVATAR_RECIPE_DEFAULTS,
    headBuildMode: AVATAR_HEAD_BUILD_MODE_MOLD,
    headMoldId,
    ...clonedOverrides,
    features: {
      ...bundleFeatures,
      ...(clonedOverrides.features && typeof clonedOverrides.features === 'object' ? clonedOverrides.features : {}),
    },
  });
}

export function createMoldAvatarRecipeFromBundle(bundleId, overrides = {}) {
  return createMoldAvatarRecipe({
    ...cloneValue(overrides),
    moldFeatureBundleId: bundleId,
  });
}

export function normalizeAvatarRecipe(recipe = {}) {
  const label = typeof recipe.label === 'string' && recipe.label.trim()
    ? recipe.label.trim().slice(0, 64)
    : AVATAR_RECIPE_DEFAULTS.label;
  const features = buildNormalizedFeatures(recipe);
  const headBuildMode = normalizeHeadBuildMode(recipe.headBuildMode);

  const normalized = {
    version: AVATAR_RECIPE_VERSION,
    label,
    headBuildMode,
    bodyPresetId: pickKnownId(recipe.bodyPresetId, AVATAR_BODY_PRESET_MAP, AVATAR_RECIPE_DEFAULTS.bodyPresetId),
    headMoldId: resolveHeadMoldId(recipe),
    hairPresetId: features.hair.presetId,
    eyePresetId: features.eyes.presetId,
    browPresetId: features.brows.presetId,
    mouthPresetId: features.mouth.presetId,
    accessoryIds: normalizeAccessoryIds(recipe.accessoryIds),
    paletteId: pickKnownId(recipe.paletteId, AVATAR_PALETTE_MAP, AVATAR_RECIPE_DEFAULTS.paletteId),
    colorOverrides: normalizeColorOverrides(recipe.colorOverrides),
    headScale: normalizeHeadScale(recipe.headScale),
    featureSlabPresetId: normalizeFeatureSlabPresetId(recipe.featureSlabPresetId),
    headParams: normalizeHeadParams(recipe.headParams),
    animationProfile: typeof recipe.animationProfile === 'string' && recipe.animationProfile.trim()
      ? recipe.animationProfile.trim()
      : AVATAR_RECIPE_DEFAULTS.animationProfile,
    skeletonId: typeof recipe.skeletonId === 'string' && recipe.skeletonId.trim()
      ? recipe.skeletonId.trim()
      : AVATAR_RECIPE_DEFAULTS.skeletonId,
    features,
  };

  return normalized;
}

export function cloneAvatarRecipe(recipe = {}) {
  return normalizeAvatarRecipe(cloneValue(recipe));
}

export function mergeAvatarRecipe(recipe = {}, patch = {}) {
  const current = normalizeAvatarRecipe(recipe);
  const merged = {
    ...cloneValue(current),
    ...cloneValue(patch),
  };
  if (patch.accessoryIds !== undefined) {
    merged.accessoryIds = cloneValue(patch.accessoryIds);
  }
  if (patch.colorOverrides !== undefined) {
    merged.colorOverrides = {
      ...(current.colorOverrides || {}),
      ...cloneValue(patch.colorOverrides),
    };
  }
  if (patch.headParams !== undefined) {
    merged.headParams = {
      ...(current.headParams || {}),
      ...cloneValue(patch.headParams),
    };
  }
  if (patch.features !== undefined) {
    merged.features = mergeFeaturePatch(current.features, patch.features);
  }
  return normalizeAvatarRecipe(merged);
}

export function validateAvatarRecipe(recipe = {}) {
  const normalized = normalizeAvatarRecipe(recipe);
  const errors = [];

  if (!AVATAR_BODY_PRESET_MAP[normalized.bodyPresetId]) errors.push('Unknown body preset');
  if (!AVATAR_HEAD_MOLD_MAP[normalized.headMoldId]) {
    errors.push('Unknown head mold');
  }
  if (!AVATAR_FEATURE_SLAB_PRESET_IDS.includes(normalized.featureSlabPresetId)) {
    errors.push('Unknown feature slab preset');
  }
  if (!AVATAR_HAIR_PRESET_MAP[normalized.hairPresetId]) errors.push('Unknown hair preset');
  if (!AVATAR_EYE_PRESET_MAP[normalized.eyePresetId]) errors.push('Unknown eye preset');
  if (!AVATAR_BROW_PRESET_MAP[normalized.browPresetId]) errors.push('Unknown eyebrow preset');
  if (!AVATAR_MOUTH_PRESET_MAP[normalized.mouthPresetId]) errors.push('Unknown mouth preset');
  if (!AVATAR_PALETTE_MAP[normalized.paletteId]) errors.push('Unknown palette');
  if (!Array.isArray(normalized.accessoryIds) || normalized.accessoryIds.length === 0) {
    errors.push('At least one accessory state is required');
  }

  AVATAR_FEATURE_KEYS.forEach((featureKey) => {
    const map = AVATAR_FEATURE_MAPS[featureKey] || {};
    const presetId = normalized.features?.[featureKey]?.presetId || '';
    if (!map[presetId]) {
      errors.push(`Unknown ${featureKey} preset`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    recipe: normalized,
  };
}

export function resolveAvatarRecipe(recipe = {}) {
  const validation = validateAvatarRecipe(recipe);
  const normalized = validation.recipe;
  const migrations = collectAvatarRecipeMigrations(recipe);
  const resolvedFeatures = Object.freeze(
    Object.fromEntries(
      AVATAR_FEATURE_KEYS.map((featureKey) => {
        const feature = normalized.features[featureKey];
        return [featureKey, Object.freeze({
          ...feature,
          preset: AVATAR_FEATURE_MAPS[featureKey]?.[feature.presetId] || null,
        })];
      })
    )
  );

  return {
    ...validation,
    migrations,
    migrated: migrations.length > 0,
    bodyPreset: AVATAR_BODY_PRESET_MAP[normalized.bodyPresetId],
    headBuildMode: normalized.headBuildMode,
    headMold: AVATAR_HEAD_MOLD_MAP[normalized.headMoldId] || null,
    hairPreset: AVATAR_HAIR_PRESET_MAP[normalized.hairPresetId],
    eyePreset: AVATAR_EYE_PRESET_MAP[normalized.eyePresetId],
    browPreset: AVATAR_BROW_PRESET_MAP[normalized.browPresetId],
    mouthPreset: AVATAR_MOUTH_PRESET_MAP[normalized.mouthPresetId],
    nosePreset: AVATAR_NOSE_PRESET_MAP[normalized.features.nose.presetId] || null,
    earPreset: AVATAR_EAR_PRESET_MAP[normalized.features.ears.presetId] || null,
    features: resolvedFeatures,
    accessories: normalized.accessoryIds
      .map((id) => AVATAR_ACCESSORY_PRESET_MAP[id])
      .filter(Boolean),
    palettePreset: AVATAR_PALETTE_MAP[normalized.paletteId],
    palette: resolvePaletteWithOverrides(normalized.paletteId, normalized.colorOverrides),
  };
}
