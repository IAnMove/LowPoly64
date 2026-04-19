const PLANNED_STATUS = 'planned';
const DRAFT_STATUS = 'draft';
const VALIDATED_STATUS = 'validated';

function entry(type, id, label, family, silhouetteGoal, compatibilityNotes, rolloutPass, validationStatus = PLANNED_STATUS, extras = null) {
  return Object.freeze({
    id,
    label,
    type,
    family,
    silhouetteGoal,
    compatibilityNotes,
    rolloutPass,
    validationStatus,
    ...(extras && typeof extras === 'object' ? extras : {}),
  });
}

const HEAD_MOLD_TARGETS = Object.freeze([
  entry(
    'headMold',
    'psx_mesh_portrait_01',
    'PSX Mesh Portrait',
    'PSX',
    'Canonical lowpoly portrait cranium with reliable frontal and side read.',
    'Primary head mold for the new detached-feature workflow.',
    'mold-foundation',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_normal_175',
    'PSX Mesh Portrait Normal',
    'PSX',
    'Baseline normal variant sharing the canonical small-head mount layout.',
    'Uses the same detached-feature anchors as the canonical mold.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_cabezon_175',
    'PSX Mesh Portrait Cabezon',
    'PSX',
    'Slightly larger cranial mass while preserving the same face layout.',
    'Useful for broader forehead reads without changing detached-feature anchors.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_duro_175',
    'PSX Mesh Portrait Duro 175',
    'PSX',
    'Sharper 175-face hard-surface variant with the same canonical mount space.',
    'Keeps the detached-feature workflow aligned while hardening planes.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_duro_250',
    'PSX Mesh Portrait Duro 250',
    'PSX',
    'Denser hard-surface portrait head with stronger facial planes.',
    'Shares the same placement rig so presets transfer directly from the canonical mold.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_gordo_175',
    'PSX Mesh Portrait Gordo 175',
    'PSX',
    'Wider fuller face variant tuned to the same detached-feature landmarks.',
    'Useful for softer or heavier face reads without reauthoring placements.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
  entry(
    'headMold',
    'psx_mesh_portrait_gordo_275',
    'PSX Mesh Portrait Gordo 275',
    'PSX',
    'Denser fuller-face portrait mold with the same mount and scale baseline.',
    'Matches the canonical mold setup while offering a sturdier side silhouette.',
    'mold-variants',
    DRAFT_STATUS,
    Object.freeze({ buildMode: 'mold', mountRole: 'headMold' }),
  ),
]);

const NOSE_TARGETS = Object.freeze([
  entry('nose', 'nose_soft_01', 'Soft Nose', 'Bridge', 'Neutral small bridge and soft tip.', 'Default mold nose for broad compatibility.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'nose' })),
  entry('nose', 'nose_button_01', 'Button Nose', 'Bridge', 'Compact rounded button nose.', 'Useful for softer and younger face reads.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'nose' })),
  entry('nose', 'nose_bridge_01', 'Bridge Nose', 'PSX', 'Straighter bridge with firmer vertical read.', 'Supports more realistic portrait heads.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'nose' })),
  entry('nose', 'nose_point_01', 'Point Nose', 'PSX', 'Sharper point with stronger triangle read.', 'Pairs with more angular faces and stronger brows.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'nose' })),
  entry('nose', 'nose_flat_01', 'Flat Nose', 'N64', 'Short flatter nose with restrained projection.', 'Useful when a compact cartoon read is needed.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'nose' })),
]);

const EAR_TARGETS = Object.freeze([
  entry('ears', 'ear_soft_01', 'Soft Ears', 'Bridge', 'Default soft ear silhouette with light lobe.', 'Baseline ear pair for the mold workflow.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'earPair' })),
  entry('ears', 'ear_round_01', 'Round Ears', 'N64', 'Rounder ear pair with toy-like read.', 'Useful on softer stylized characters.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'earPair' })),
  entry('ears', 'ear_point_01', 'Point Ears', 'PSX', 'Pointed ear pair with stronger planar read.', 'Supports more stylized fantasy or angular characters.', 'mold-features', DRAFT_STATUS, Object.freeze({ buildMode: 'mold', mountRole: 'earPair' })),
]);

const LEGACY_HEAD_SHAPE_TARGETS = Object.freeze([
  entry('legacyHeadShape', 'psx_skull_01', 'PSX Skull', 'PSX', 'Slim rigid skull with compact facial mask.', 'Legacy fallback skull kept for old recipes.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'psx_portrait_01', 'PSX Portrait', 'PSX', 'Adult PS1 portrait head with flatter front plane.', 'Legacy fallback portrait head for old recipes.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'square_mii_01', 'PSX Soft Block', 'PSX', 'Rounded block head with softened corners.', 'Legacy fallback blocky head for old recipes.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'psx_hero_jaw_01', 'PSX Hero Jaw', 'PSX', 'Heroic jawline with stronger lower face.', 'Legacy fallback for sharper silhouettes.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'wide_cheek_01', 'N64 Cartool', 'N64', 'Cheek-heavy oval with broader central mass.', 'Legacy fallback for broader cartoon reads.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'n64_skull_01', 'N64 Skull', 'N64', 'Compact N64 skull with smaller facial mask.', 'Legacy fallback for rounder cartoon faces.', 'legacy-heads', VALIDATED_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'psx_mesh_portrait_01', 'PSX Mesh Portrait', 'PSX', 'Mesh-driven portrait silhouette used as canonical mold source.', 'Bridges the old selector and the new mold pipeline.', 'legacy-heads', DRAFT_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
  entry('legacyHeadShape', 'psx_portrait_skull_01', 'PSX Portrait Skull', 'PSX', 'Minimal portrait skull without built-in ears or nose.', 'Legacy fallback used for bald review and migration.', 'legacy-heads', DRAFT_STATUS, Object.freeze({ buildMode: 'legacy', mountRole: 'headShape' })),
]);

export const AVATAR_MOLD_LIBRARY_TYPES = Object.freeze([
  'headMold',
  'nose',
  'ears',
  'legacyHeadShape',
]);

export const AVATAR_MOLD_LIBRARY_REQUIRED_FIELDS = Object.freeze([
  'id',
  'label',
  'type',
  'family',
  'silhouetteGoal',
  'compatibilityNotes',
  'rolloutPass',
  'validationStatus',
  'buildMode',
  'mountRole',
]);

export const AVATAR_MOLD_LIBRARY_TYPE_CONFIG = Object.freeze({
  headMold: Object.freeze({ minimumTarget: 1, requireFamilyCoverage: false }),
  nose: Object.freeze({ minimumTarget: 5, requireFamilyCoverage: false }),
  ears: Object.freeze({ minimumTarget: 3, requireFamilyCoverage: false }),
  legacyHeadShape: Object.freeze({ minimumTarget: 0, requireFamilyCoverage: false }),
});

export const AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE = Object.freeze({
  headMold: HEAD_MOLD_TARGETS,
  nose: NOSE_TARGETS,
  ears: EAR_TARGETS,
  legacyHeadShape: LEGACY_HEAD_SHAPE_TARGETS,
});

export const AVATAR_MOLD_LIBRARY_TARGETS = Object.freeze(
  AVATAR_MOLD_LIBRARY_TYPES.flatMap((type) => AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE[type] || [])
);
