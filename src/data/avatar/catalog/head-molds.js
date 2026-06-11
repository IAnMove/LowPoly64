const MESH_PORTRAIT_HEAD_SCALE = Object.freeze({ x: 0.75, y: 0.75, z: 0.75 });
const MESH_PORTRAIT_FEATURE_SCALE = Object.freeze({ x: 0.76, y: 0.82, z: 0.28 });

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
  nose: Object.freeze({ x: 0, y: -2, scaleX: 0.9, scaleY: 0.92, originX: 256, originY: 274 }),
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

const MESH_PORTRAIT_PART_PRESET_OFFSETS = Object.freeze({
  hairBack: Object.freeze({
    bob_01: Object.freeze({ y: 4, scaleX: 0.88, scaleY: 0.9, originX: 256, originY: 234 }),
    side_part_01: Object.freeze({ x: 4, y: 0, scaleX: 0.94, scaleY: 0.94, originX: 256, originY: 236 }),
    psx_layered_hero_01: Object.freeze({ x: 6, y: 0, scaleX: 0.96, scaleY: 0.98, originX: 256, originY: 232 }),
    psx_slick_back_01: Object.freeze({ x: 4, y: -2, scaleX: 0.96, scaleY: 0.98, originX: 256, originY: 228 }),
    psx_buzz_cut_01: Object.freeze({ y: -6, scaleX: 0.92, scaleY: 0.94, originX: 256, originY: 224 }),
    n64_round_bangs_01: Object.freeze({ x: 2, y: -2, scaleX: 0.94, scaleY: 0.96, originX: 256, originY: 236 }),
    bridge_bowl_01: Object.freeze({ x: 2, y: -2, scaleX: 0.94, scaleY: 0.96, originX: 256, originY: 236 }),
  }),
  hairFront: Object.freeze({
    bob_01: Object.freeze({ x: 0, y: 6, scaleX: 0.84, scaleY: 0.86, originX: 256, originY: 186 }),
    side_part_01: Object.freeze({ x: 3, y: 2, scaleX: 0.96, scaleY: 0.98, originX: 256, originY: 180 }),
    psx_layered_hero_01: Object.freeze({ x: 3, y: 4, scaleX: 0.96, scaleY: 1, originX: 256, originY: 178 }),
    psx_slick_back_01: Object.freeze({ x: 2, y: 2, scaleX: 0.94, scaleY: 0.96, originX: 256, originY: 176 }),
    psx_buzz_cut_01: Object.freeze({ y: -2, scaleX: 0.9, scaleY: 0.9, originX: 256, originY: 176 }),
    n64_round_bangs_01: Object.freeze({ x: 2, y: 2, scaleX: 0.96, scaleY: 0.98, originX: 256, originY: 180 }),
    n64_wavy_mid_01: Object.freeze({ x: 2, y: 6, scaleX: 0.94, scaleY: 0.96, originX: 256, originY: 182 }),
    bridge_bowl_01: Object.freeze({ x: 2, y: 2, scaleX: 0.96, scaleY: 0.96, originX: 256, originY: 180 }),
    bridge_low_pony_01: Object.freeze({ x: 2, y: 4, scaleX: 0.96, scaleY: 0.98, originX: 256, originY: 180 }),
  }),
  eyes: Object.freeze({
    wide_01: Object.freeze({ y: 10, scaleX: 0.54, scaleY: 0.62, originX: 256, originY: 246 }),
    psx_hero_square_01: Object.freeze({ y: 4, scaleX: 0.58, scaleY: 0.64, originX: 256, originY: 246 }),
    n64_round_toon_eye_01: Object.freeze({ y: 6, scaleX: 0.54, scaleY: 0.62, originX: 256, originY: 246 }),
  }),
  mouth: Object.freeze({
    open_01: Object.freeze({ y: -16, scaleX: 0.52, scaleY: 0.58, originX: 256, originY: 336 }),
    grin_01: Object.freeze({ y: -18, scaleX: 0.58, scaleY: 0.64, originX: 256, originY: 334 }),
    bridge_toothy_grin_01: Object.freeze({ y: -20, scaleX: 0.54, scaleY: 0.6, originX: 256, originY: 338 }),
  }),
  accessories: Object.freeze({
    ribbon_blue: Object.freeze({ y: -4, scaleX: 0.58, scaleY: 0.6, originX: 256, originY: 170 }),
    round_glasses: Object.freeze({ y: 0, scaleX: 0.78, scaleY: 0.82, originX: 256, originY: 252 }),
    star_clip: Object.freeze({ x: 8, y: -2, scaleX: 0.42, scaleY: 0.44, originX: 320, originY: 172 }),
    psx_square_glasses_01: Object.freeze({ y: 0, scaleX: 0.8, scaleY: 0.84, originX: 256, originY: 252 }),
    psx_visor_strip_01: Object.freeze({ y: -2, scaleX: 0.66, scaleY: 0.68, originX: 256, originY: 202 }),
    psx_bandana_knot_01: Object.freeze({ y: -4, scaleX: 0.64, scaleY: 0.68, originX: 256, originY: 180 }),
    psx_eyepatch_01: Object.freeze({ x: -10, y: 0, scaleX: 0.76, scaleY: 0.8, originX: 232, originY: 246 }),
    n64_headband_sport_01: Object.freeze({ y: -2, scaleX: 0.64, scaleY: 0.68, originX: 256, originY: 184 }),
    n64_goggles_up_01: Object.freeze({ y: -4, scaleX: 0.62, scaleY: 0.66, originX: 256, originY: 178 }),
    n64_flower_pin_01: Object.freeze({ x: 8, y: -2, scaleX: 0.46, scaleY: 0.48, originX: 320, originY: 174 }),
    n64_leaf_clip_01: Object.freeze({ x: 10, y: -2, scaleX: 0.44, scaleY: 0.46, originX: 320, originY: 174 }),
    bridge_hairpin_duo_01: Object.freeze({ x: 8, y: -2, scaleX: 0.48, scaleY: 0.5, originX: 320, originY: 182 }),
    bridge_tiny_horns_01: Object.freeze({ y: -6, scaleX: 0.6, scaleY: 0.62, originX: 256, originY: 170 }),
    bridge_jewel_circlet_01: Object.freeze({ y: -4, scaleX: 0.68, scaleY: 0.7, originX: 256, originY: 188 }),
    bridge_mono_earring_01: Object.freeze({ x: 30, y: 6, scaleX: 0.36, scaleY: 0.38, originX: 336, originY: 302 }),
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

function createMeshPortraitMold({ id, label, headMeshId = id, defaultForMoldMode = false }) {
  return Object.freeze({
    id,
    label,
    family: 'PSX',
    ...(defaultForMoldMode ? { defaultForMoldMode: true } : {}),
    headMeshId,
    sourceHeadShapeId: 'psx_mesh_portrait_01',
    defaultFeatureBundleId: 'psx_mesh_soft_default_01',
    headScale: MESH_PORTRAIT_HEAD_SCALE,
    featureScale: MESH_PORTRAIT_FEATURE_SCALE,
    headScaleMode: 'cranium',
    headMountMode: 'root-bottom-center',
    mountRoles: MESH_PORTRAIT_MOUNT_ROLES,
    mountAnchors: MESH_PORTRAIT_MOUNT_ANCHORS,
    partPresetOffsets: MESH_PORTRAIT_PART_PRESET_OFFSETS,
    defaultFeaturePresetIds: MESH_PORTRAIT_DEFAULT_FEATURE_PRESET_IDS,
  });
}

export const AVATAR_HEAD_MOLDS = Object.freeze([
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_01',
    label: 'PSX Mesh Portrait',
    defaultForMoldMode: true,
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_normal_175',
    label: 'PSX Mesh Portrait Normal',
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_cabezon_175',
    label: 'PSX Mesh Portrait Cabezon',
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_duro_175',
    label: 'PSX Mesh Portrait Duro 175',
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_duro_250',
    label: 'PSX Mesh Portrait Duro 250',
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_gordo_175',
    label: 'PSX Mesh Portrait Gordo 175',
  }),
  createMeshPortraitMold({
    id: 'psx_mesh_portrait_gordo_275',
    label: 'PSX Mesh Portrait Gordo 275',
  }),
]);
