import {
  DEFAULT_GENERATED_HEAD_ID,
  GENERATED_HEAD_PRESETS,
} from '../generated-heads.js';

const GENERATED_HEAD_SCALE = Object.freeze({ x: 0.75, y: 0.75, z: 0.75 });
const GENERATED_HEAD_FEATURE_SCALE = Object.freeze({ x: 0.76, y: 0.82, z: 0.28 });

const GENERATED_HEAD_SOURCE = Object.freeze({
  id: 'generated_head_source',
  label: 'Generated Head Source',
  family: 'Generated',
  headMeshId: DEFAULT_GENERATED_HEAD_ID,
  profile: 'generated-head',
  headScale: GENERATED_HEAD_SCALE,
  featureScale: GENERATED_HEAD_FEATURE_SCALE,
  headScaleMode: 'cranium',
  headMountMode: 'root-bottom-center',
  headPath: 'M196 122C220 96 286 90 326 108C358 126 376 180 376 244C376 312 358 372 326 410C298 442 214 442 186 410C154 372 136 314 136 244C136 178 156 128 196 122Z',
  earLeftPath: '',
  earRightPath: '',
  nosePath: '',
  thickness: 0.22,
  backBias: 0.62,
  backBoxiness: 0.64,
  backEnvelopeExponent: 0.74,
  backBoxPower: 0.52,
});

const GENERATED_HEAD_MOUNT_ROLES = Object.freeze({
  eyes: 'eyePair',
  brows: 'browPair',
  nose: 'nose',
  mouth: 'mouth',
  ears: 'earPair',
  hair: 'hairCap',
  accessories: 'accessoryAnchor',
});

const GENERATED_HEAD_MOUNT_ANCHORS = Object.freeze({
  eyePair: Object.freeze({ y: -12, scaleX: 0.64, scaleY: 0.7, originX: 256, originY: 246 }),
  browPair: Object.freeze({ y: -4, scaleX: 0.68, scaleY: 0.7, originX: 256, originY: 218 }),
  nose: Object.freeze({ x: 0, y: -2, scaleX: 0.9, scaleY: 0.45, originX: 256, originY: 274 }),
  mouth: Object.freeze({ y: -6, scaleX: 0.62, scaleY: 0.7, originX: 256, originY: 332 }),
  earPair: Object.freeze({ y: -4, scaleX: 0.94, scaleY: 0.88, originX: 256, originY: 264 }),
  hairCap: Object.freeze({
    capFront: Object.freeze({ y: 2, scaleX: 0.82, scaleY: 0.86, originX: 256, originY: 184 }),
    capBack: Object.freeze({ y: -2, scaleX: 0.88, scaleY: 0.9, originX: 256, originY: 234 }),
    shortFront: Object.freeze({ y: 4, scaleX: 0.78, scaleY: 0.76, originX: 256, originY: 182 }),
    shortBack: Object.freeze({ y: 0, scaleX: 0.82, scaleY: 0.8, originX: 256, originY: 226 }),
    wideFront: Object.freeze({ y: 2, scaleX: 0.88, scaleY: 0.9, originX: 256, originY: 186 }),
    wideBack: Object.freeze({ y: -2, scaleX: 0.92, scaleY: 0.94, originX: 256, originY: 234 }),
    longBack: Object.freeze({ y: 0, scaleX: 0.94, scaleY: 0.98, originX: 256, originY: 236 }),
    ponyFront: Object.freeze({ y: 2, scaleX: 0.82, scaleY: 0.86, originX: 256, originY: 184 }),
    ponyBack: Object.freeze({ y: -4, scaleX: 0.92, scaleY: 0.92, originX: 256, originY: 236 }),
  }),
  accessoryAnchor: Object.freeze({
    eyes: Object.freeze({ y: -2, scaleX: 0.5, scaleY: 0.54, originX: 256, originY: 252 }),
    headband: Object.freeze({ y: -4, scaleX: 0.62, scaleY: 0.66, originX: 256, originY: 188 }),
    topCenter: Object.freeze({ y: -8, scaleX: 0.58, scaleY: 0.62, originX: 256, originY: 174 }),
    clipRight: Object.freeze({ x: 18, y: -4, scaleX: 0.4, scaleY: 0.44, originX: 320, originY: 176 }),
    earRight: Object.freeze({ x: 28, y: 4, scaleX: 0.36, scaleY: 0.4, originX: 332, originY: 296 }),
  }),
});

const GENERATED_HEAD_DEFAULT_FEATURE_PRESET_IDS = Object.freeze({
  hair: 'bob_01',
  eyes: 'wide_01',
  brows: 'soft_01',
  nose: 'nose_soft_01',
  mouth: 'neutral_01',
  ears: 'ear_soft_01',
});

function createGeneratedHeadMoldEntry({
  id,
  label,
  headMeshId = id,
  defaultForMoldMode = false,
  featureSizeMultiplier = 1,
}) {
  return Object.freeze({
    id,
    label,
    family: 'Generated',
    ...(defaultForMoldMode ? { defaultForMoldMode: true } : {}),
    headMeshId,
    sourceHead: GENERATED_HEAD_SOURCE,
    defaultFeatureBundleId: 'generated_head_soft_default_01',
    headScale: GENERATED_HEAD_SCALE,
    featureScale: GENERATED_HEAD_FEATURE_SCALE,
    featureSizeMultiplier,
    headScaleMode: 'cranium',
    headMountMode: 'root-bottom-center',
    mountRoles: GENERATED_HEAD_MOUNT_ROLES,
    mountAnchors: GENERATED_HEAD_MOUNT_ANCHORS,
    defaultFeaturePresetIds: GENERATED_HEAD_DEFAULT_FEATURE_PRESET_IDS,
  });
}

function createGeneratedHeadMold(preset) {
  const isDefaultGeneratedHead = preset.id === DEFAULT_GENERATED_HEAD_ID;
  return Object.freeze({
    ...createGeneratedHeadMoldEntry({
      id: preset.id,
      label: `Generated Head ${preset.name}`,
      headMeshId: preset.id,
      defaultForMoldMode: isDefaultGeneratedHead,
    }),
    generatedPresetId: preset.id,
    defaultGeneratedHead: isDefaultGeneratedHead,
  });
}

export const GENERATED_HEAD_MOLDS = Object.freeze(
  GENERATED_HEAD_PRESETS.map((preset) => createGeneratedHeadMold(preset))
);

export const AVATAR_HEAD_MOLDS = Object.freeze([...GENERATED_HEAD_MOLDS]);
