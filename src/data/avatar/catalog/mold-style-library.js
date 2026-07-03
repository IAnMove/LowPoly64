import {
  DEFAULT_GENERATED_HEAD_ID,
  GENERATED_HEAD_PRESETS,
} from '../generated-heads.js';

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

const GENERATED_HEAD_LIBRARY_NOTES = Object.freeze({
  gen_head_round: Object.freeze({
    silhouetteGoal: 'Soft round skull for friendly compact characters.',
    compatibilityNotes: 'Clean generated topology with decal, nose, ears, and hair landmarks.',
  }),
  gen_head_square: Object.freeze({
    silhouetteGoal: 'Angular jaw and flatter planes for stern low-poly characters.',
    compatibilityNotes: 'Uses the same generated-head landmark contract as the default.',
  }),
  gen_head_long: Object.freeze({
    silhouetteGoal: 'Tall narrow skull for older or lean character reads.',
    compatibilityNotes: 'Landmarks are derived from generator parameters, not manual offsets.',
  }),
  gen_head_chibi: Object.freeze({
    silhouetteGoal: 'Oversized compact skull for younger or mascot proportions.',
    compatibilityNotes: 'Shares the decal and procedural hair workflow with every generated preset.',
  }),
  gen_head_slim: Object.freeze({
    silhouetteGoal: 'Narrow skull with reduced cheeks for lean silhouettes.',
    compatibilityNotes: 'Compatible with all generated-head facial presets and sliders.',
  }),
  gen_head_broad: Object.freeze({
    silhouetteGoal: 'Wide skull with fuller cheeks for sturdy silhouettes.',
    compatibilityNotes: 'Feature scale comes from generated landmarks rather than per-head offsets.',
  }),
  gen_head_heroic: Object.freeze({
    silhouetteGoal: 'Adult heroic skull with balanced N64-style proportions.',
    compatibilityNotes: 'Default generated head for new sessions and legacy recipe migration.',
  }),
  gen_head_wide_jaw: Object.freeze({
    silhouetteGoal: 'Strong jaw and broad lower face for stylized character reads.',
    compatibilityNotes: 'Uses the same generated topology and landmark contract as the default.',
  }),
});

const HEAD_MOLD_TARGETS = Object.freeze(
  GENERATED_HEAD_PRESETS.map((preset) => {
    const notes = GENERATED_HEAD_LIBRARY_NOTES[preset.id] || {};
    return entry(
      'headMold',
      preset.id,
      `Generated Head ${preset.name}`,
      'Generated',
      notes.silhouetteGoal || 'Generated low-poly skull with clean landmark-derived facial mounts.',
      notes.compatibilityNotes || 'Compatible with decal facial sprites, 3D nose/ears, and procedural hair.',
      'generated-heads-v2',
      VALIDATED_STATUS,
      Object.freeze({
        buildMode: 'mold',
        mountRole: 'headMold',
        generatedPresetId: preset.id,
        defaultGeneratedHead: preset.id === DEFAULT_GENERATED_HEAD_ID,
      }),
    );
  })
);

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

export const AVATAR_MOLD_LIBRARY_TYPES = Object.freeze([
  'headMold',
  'nose',
  'ears',
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
});

export const AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE = Object.freeze({
  headMold: HEAD_MOLD_TARGETS,
  nose: NOSE_TARGETS,
  ears: EAR_TARGETS,
});

export const AVATAR_MOLD_LIBRARY_TARGETS = Object.freeze(
  AVATAR_MOLD_LIBRARY_TYPES.flatMap((type) => AVATAR_MOLD_LIBRARY_TARGETS_BY_TYPE[type] || [])
);
