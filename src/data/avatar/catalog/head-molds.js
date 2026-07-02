import {
  DEFAULT_GENERATED_HEAD_ID,
  GENERATED_HEAD_PRESETS,
} from '../generated-heads.js';

const MESH_PORTRAIT_HEAD_SCALE = Object.freeze({ x: 0.75, y: 0.75, z: 0.75 });
const MESH_PORTRAIT_FEATURE_SCALE = Object.freeze({ x: 0.76, y: 0.82, z: 0.28 });

const MESH_PORTRAIT_SOURCE_HEAD = Object.freeze({
  id: 'psx_mesh_portrait_source',
  label: 'PSX Mesh Portrait Source',
  family: 'PSX',
  headMeshId: 'psx_mesh_portrait_01',
  profile: 'psx-portrait',
  headScale: MESH_PORTRAIT_HEAD_SCALE,
  featureScale: MESH_PORTRAIT_FEATURE_SCALE,
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

const MESH_PORTRAIT_MOUNT_ROLES = Object.freeze({
  eyes: 'eyePair',
  brows: 'browPair',
  nose: 'nose',
  mouth: 'mouth',
  ears: 'earPair',
  hair: 'hairCap',
  accessories: 'accessoryAnchor',
});

const MESH_PORTRAIT_MOUNT_ANCHORS = Object.freeze({
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

const MESH_PORTRAIT_DEFAULT_FEATURE_PRESET_IDS = Object.freeze({
  hair: 'bob_01',
  eyes: 'wide_01',
  brows: 'soft_01',
  nose: 'nose_soft_01',
  mouth: 'neutral_01',
  ears: 'ear_soft_01',
});

function createMeshPortraitMold({
  id,
  label,
  headMeshId = id,
  defaultForMoldMode = false,
  featureSizeMultiplier = 1,
}) {
  return Object.freeze({
    id,
    label,
    family: 'PSX',
    ...(defaultForMoldMode ? { defaultForMoldMode: true } : {}),
    headMeshId,
    sourceHead: MESH_PORTRAIT_SOURCE_HEAD,
    defaultFeatureBundleId: 'psx_mesh_soft_default_01',
    headScale: MESH_PORTRAIT_HEAD_SCALE,
    featureScale: MESH_PORTRAIT_FEATURE_SCALE,
    featureSizeMultiplier,
    headScaleMode: 'cranium',
    headMountMode: 'root-bottom-center',
    mountRoles: MESH_PORTRAIT_MOUNT_ROLES,
    mountAnchors: MESH_PORTRAIT_MOUNT_ANCHORS,
    defaultFeaturePresetIds: MESH_PORTRAIT_DEFAULT_FEATURE_PRESET_IDS,
  });
}

function createGeneratedHeadMold(preset) {
  return Object.freeze({
    ...createMeshPortraitMold({
      id: preset.id,
      label: `Generated Head ${preset.name}`,
      headMeshId: preset.id,
    }),
    family: 'Generated',
    generatedPresetId: preset.id,
    defaultGeneratedHead: preset.id === DEFAULT_GENERATED_HEAD_ID,
  });
}

export const GENERATED_HEAD_MOLDS = Object.freeze(
  GENERATED_HEAD_PRESETS.map((preset) => createGeneratedHeadMold(preset))
);

export const AVATAR_HEAD_MOLDS = Object.freeze([
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_01',
    label: 'PSX Mesh Portrait',
    defaultForMoldMode: true,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_normal_175',
    label: 'PSX Mesh Portrait Normal',
    featureSizeMultiplier: 0.96,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_cabezon_175',
    label: 'PSX Mesh Portrait Cabezon',
    featureSizeMultiplier: 0.78,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_duro_175',
    label: 'PSX Mesh Portrait Duro 175',
    featureSizeMultiplier: 0.84,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_duro_250',
    label: 'PSX Mesh Portrait Duro 250',
    featureSizeMultiplier: 0.84,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_gordo_175',
    label: 'PSX Mesh Portrait Gordo 175',
    featureSizeMultiplier: 0.7,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_gordo_275',
    label: 'PSX Mesh Portrait Gordo 275',
    featureSizeMultiplier: 0.7,
  }),
  ...GENERATED_HEAD_MOLDS,
]);
