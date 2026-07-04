import fs from 'node:fs';
import path from 'node:path';

if (!globalThis.localStorage) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const {
  characterModelToPieces,
  validateCharacterModel,
} = await import('../src/modules/viewport/character-model.js');
const {
  AVATAR_HEAD_MESH_MAP,
  HEAD_LANDMARK_KEYS,
} = await import('../src/data/avatar/catalog/head-meshes.js');
const {
  createMoldAvatarRecipe,
  resolveAvatarRecipe,
} = await import('../src/modules/avatar/avatar-recipe.js');

const DOC_PATH = 'ask-character.md';
const TEMPLATE_ROOT = path.join('src', 'data', 'templates', 'characters');
const EXAMPLE_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, 'n64_simple_villager_cm.json');
const SPRITE_MANIFEST_PATH = path.join('src', 'data', 'avatar', 'sprites', 'sprites-manifest.json');
const STRUCTURAL_SLOTS = ['HEAD', 'TORSO', 'ARM_L', 'ARM_R', 'LEG_L', 'LEG_R'];
const ALL_BINDING_SLOTS = [...STRUCTURAL_SLOTS, 'WEAPON_MAIN', 'WEAPON_SECONDARY'];
const FEATURE_SLAB_EXAMPLE_MARKER = 'avatar-feature-slab-example';
const FEATURE_SLAB_DEPTH_PRESETS = new Set(['flat_safe', 'default_embedded', 'toy_extruded', 'mask_plate']);
const FEATURE_SLAB_CONTRACT = Object.freeze({
  eyes: Object.freeze({ presetField: 'eyePreset', requiredKind: 'eye', tintSlot: 'iris' }),
  brows: Object.freeze({ presetField: 'browPreset', requiredKind: 'brow', tintSlot: 'brow' }),
  mouth: Object.freeze({ presetField: 'mouthPreset', requiredKind: 'mouth', tintSlot: 'lip' }),
});
const REQUIRED_BINDING_NAMES = {
  HEAD: ['HEAD'],
  TORSO: ['PELVIS', 'TORSO', 'CHEST', 'NECK'],
  ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
  ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
  LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
  LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
};
const DECORATION_BLACKLIST = new Set([
  'SHOULDER_L',
  'SHOULDER_R',
  'LEFT_SHOULDER',
  'RIGHT_SHOULDER',
  'PAULDRON_L',
  'PAULDRON_R',
  'WAIST',
  'HIP',
  'HIPS',
  'BODY',
  'UPPER_BODY',
]);
const FACIAL_GEOMETRY_PATTERN = /OJO|EYE|PUPIL|PUPILA|BOCA|MOUTH|CEJA|BROW|NARIZ|NOSE|TEETH|TOOTH|JAW|LIP|SOCKET/i;

function fail(message) {
  console.error(`ask-character.md example check failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${filePath} is not valid JSON (${error.message})`);
  }
}

function extractJsonBlock(markdown, marker) {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`<!-- ${escapedMarker}:start -->\\s*\`\`\`json\\s*([\\s\\S]*?)\\s*\`\`\`\\s*<!-- ${escapedMarker}:end -->`));
  if (!match) fail(`missing fenced JSON between ${marker} markers`);

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`${marker} example is not valid JSON (${error.message})`);
  }
}

function collectPieces(model) {
  return model.slots.flatMap((slot) => slot.pieces.map((piece) => ({
    ...piece,
    slotId: slot.slotId,
  })));
}

function estimateTriangles(piece) {
  const template = String(piece.template || '').toUpperCase();
  const params = piece.params || {};
  switch (template) {
    case 'CUSTOM':
      return Array.isArray(params.faces) ? params.faces.length : 0;
    case 'PLANE':
      return 2;
    case 'CUBE':
    case 'TAPERED_BOX':
      return 12;
    case 'SPHERE': {
      const widthSegments = params.widthSegments ?? 8;
      const heightSegments = params.heightSegments ?? 6;
      return widthSegments * Math.max(heightSegments - 1, 1) * 2;
    }
    case 'LIMB_LOFT': {
      const sides = params.sides ?? 6;
      const sections = Array.isArray(params.sections) ? params.sections.length : 2;
      const sideTriangles = sides * Math.max(sections - 1, 1) * 2;
      const capTriangles = (params.capTop === false ? 0 : sides) + (params.capBottom === false ? 0 : sides);
      return sideTriangles + capTriangles;
    }
    case 'LATHE': {
      const segments = params.segments ?? 8;
      const points = Array.isArray(params.points) ? params.points.length : 4;
      return segments * Math.max(points - 1, 1) * 2;
    }
    case 'CYLINDER':
    case 'CONE':
      return (params.radialSegments ?? 8) * 4;
    default:
      return 32;
  }
}

function validatePromptModel(model, label) {
  const formatError = validateCharacterModel(model);
  if (formatError) fail(`${label}: ${formatError}`);

  if (model.assetRole !== 'characterModel') fail(`${label}: assetRole must be "characterModel"`);
  if (model.archetype !== 'HUMANOID') fail(`${label}: archetype must be "HUMANOID"`);
  if (model.skeletonId !== 'HUMANOID_STANDARD') fail(`${label}: skeletonId must be "HUMANOID_STANDARD"`);
  if (!model.slotBindings || typeof model.slotBindings !== 'object' || Array.isArray(model.slotBindings)) {
    fail(`${label}: slotBindings must be an object`);
  }

  const { pieces, slotMap } = characterModelToPieces(model);
  const pieceNames = new Set(pieces.map((piece) => piece.name));
  const slots = new Set(model.slots.map((slot) => slot.slotId));

  for (const slotId of STRUCTURAL_SLOTS) {
    if (!slots.has(slotId)) fail(`${label}: missing structural slot ${slotId}`);
    if (!Array.isArray(slotMap[slotId]) || slotMap[slotId].length === 0) {
      fail(`${label}: slot ${slotId} must contain pieces`);
    }
  }

  for (const slotId of ALL_BINDING_SLOTS) {
    if (!Array.isArray(model.slotBindings[slotId])) {
      fail(`${label}: slotBindings.${slotId} must be an array`);
    }
  }

  for (const [slotId, names] of Object.entries(REQUIRED_BINDING_NAMES)) {
    for (const name of names) {
      if (!model.slotBindings[slotId].includes(name)) {
        fail(`${label}: slotBindings.${slotId} must include ${name}`);
      }
      if (!pieceNames.has(name)) {
        fail(`${label}: slotBindings.${slotId} references missing piece ${name}`);
      }
    }
  }

  for (const [slotId, names] of Object.entries(model.slotBindings)) {
    for (const name of names) {
      if (!pieceNames.has(name)) {
        fail(`${label}: slotBindings.${slotId} references missing piece ${name}`);
      }
    }
  }

  const allPieces = collectPieces(model);
  const faceDecals = allPieces.filter((piece) => piece.name === 'FACE_DECAL' && piece.decal);
  if (faceDecals.length !== 1) fail(`${label}: expected exactly one legacy FACE_DECAL with decal spec`);

  for (const piece of allPieces) {
    const normalizedName = String(piece.name || '').toUpperCase();
    if (DECORATION_BLACKLIST.has(normalizedName)) {
      fail(`${label}: blacklisted decorative name ${piece.name}`);
    }
    if (normalizedName !== 'FACE_DECAL' && FACIAL_GEOMETRY_PATTERN.test(normalizedName)) {
      fail(`${label}: facial detail ${piece.name} must be inside FACE_DECAL`);
    }
    if (piece.decal?.layers) {
      for (const layer of piece.decal.layers) {
        if (layer.style) fail(`${label}: procedural decal style is forbidden; use sprite layers`);
        if (!layer.sprite) fail(`${label}: decal layer on ${piece.name} must declare sprite`);
      }
    }
  }

  const triangleBudget = allPieces.reduce((sum, piece) => sum + estimateTriangles(piece), 0);
  if (triangleBudget > 900) fail(`${label}: estimated triangle budget ${triangleBudget} exceeds 900`);

  return { pieceCount: allPieces.length, triangleBudget };
}

function buildSpriteManifestMap() {
  const entries = readJson(SPRITE_MANIFEST_PATH);
  if (!Array.isArray(entries)) fail(`${SPRITE_MANIFEST_PATH} must be an array`);
  return new Map(entries.map((entry) => [entry.id, entry]));
}

function validateFeatureSlabExample(source, label) {
  const serialized = JSON.stringify(source);
  if (serialized.includes('FACE_DECAL')) {
    fail(`${label}: new generated-head examples must not request FACE_DECAL`);
  }

  const depthPresetId = source.featureSlabDepthPresetId || source.featureSlabPresetId || '';
  if (!FEATURE_SLAB_DEPTH_PRESETS.has(depthPresetId)) {
    fail(`${label}: featureSlabDepthPresetId must be one of ${[...FEATURE_SLAB_DEPTH_PRESETS].join(', ')}`);
  }

  const recipe = createMoldAvatarRecipe(source);
  const resolved = resolveAvatarRecipe(recipe);
  if (!resolved.ok) fail(`${label}: ${resolved.errors.join('; ')}`);
  if (resolved.recipe.skeletonId !== 'HUMANOID_STANDARD') fail(`${label}: skeletonId must be HUMANOID_STANDARD`);
  if (!resolved.headMold?.generatedPresetId) fail(`${label}: headMoldId must point to a generated skull preset`);
  if (!resolved.hairPreset || resolved.hairPreset.id === 'none_01') fail(`${label}: generated skull example must include hair`);

  const headMeshId = resolved.headMold.headMeshId || resolved.headMold.id;
  const headMesh = AVATAR_HEAD_MESH_MAP[headMeshId];
  if (!headMesh?.landmarks) fail(`${label}: generated skull ${headMeshId} is missing runtime landmarks`);
  for (const key of HEAD_LANDMARK_KEYS) {
    if (!Array.isArray(headMesh.landmarks[key])) fail(`${label}: generated skull ${headMeshId} missing landmark ${key}`);
  }

  const spriteManifest = buildSpriteManifestMap();
  const sourceFeatures = source.features && typeof source.features === 'object' ? source.features : {};
  for (const [featureKey, contract] of Object.entries(FEATURE_SLAB_CONTRACT)) {
    const preset = resolved[contract.presetField];
    if (!preset?.spriteId) fail(`${label}: ${featureKey} preset must resolve to spriteId`);
    const manifestEntry = spriteManifest.get(preset.spriteId);
    if (!manifestEntry) fail(`${label}: spriteId ${preset.spriteId} is missing from ${SPRITE_MANIFEST_PATH}`);
    if (manifestEntry.kind !== contract.requiredKind) {
      fail(`${label}: spriteId ${preset.spriteId} must be kind ${contract.requiredKind}, got ${manifestEntry.kind}`);
    }

    const requestedFeature = sourceFeatures[featureKey] || {};
    if (requestedFeature.spriteId !== preset.spriteId) {
      fail(`${label}: features.${featureKey}.spriteId must match preset spriteId ${preset.spriteId}`);
    }
    if (!Array.isArray(requestedFeature.tintSlots) || !requestedFeature.tintSlots.includes(contract.tintSlot)) {
      fail(`${label}: features.${featureKey}.tintSlots must include ${contract.tintSlot}`);
    }
    const manifestSlots = new Set(Object.values(manifestEntry.tintSlots || {}));
    if (!manifestSlots.has(contract.tintSlot)) {
      fail(`${label}: manifest tint slots for ${preset.spriteId} must include ${contract.tintSlot}`);
    }
  }

  return {
    headMoldId: resolved.recipe.headMoldId,
    hairPresetId: resolved.hairPreset.id,
    eyeSpriteId: resolved.eyePreset.spriteId,
    browSpriteId: resolved.browPreset.spriteId,
    mouthSpriteId: resolved.mouthPreset.spriteId,
    depthPresetId,
  };
}

const markdown = fs.readFileSync(DOC_PATH, 'utf8');
const example = extractJsonBlock(markdown, 'character-example');
const result = validatePromptModel(example, 'embedded example');
const slabResult = validateFeatureSlabExample(
  extractJsonBlock(markdown, FEATURE_SLAB_EXAMPLE_MARKER),
  'generated feature-slab example'
);

if (fs.existsSync(EXAMPLE_TEMPLATE_PATH)) {
  const template = readJson(EXAMPLE_TEMPLATE_PATH);
  if (JSON.stringify(template) !== JSON.stringify(example)) {
    fail(`${EXAMPLE_TEMPLATE_PATH} must match the embedded villager example`);
  }
}

const templateFiles = fs.existsSync(TEMPLATE_ROOT)
  ? fs.readdirSync(TEMPLATE_ROOT)
    .filter((name) => /_(villager|guard)_cm\.json$/i.test(name))
    .map((name) => path.join(TEMPLATE_ROOT, name))
  : [];

for (const filePath of templateFiles) {
  validatePromptModel(readJson(filePath), filePath);
}

console.log(
  `ask-character.md examples passed (${result.pieceCount} legacy pieces, ~${result.triangleBudget} triangles; `
  + `${slabResult.headMoldId}/${slabResult.hairPresetId}, `
  + `${slabResult.eyeSpriteId}/${slabResult.browSpriteId}/${slabResult.mouthSpriteId}, `
  + `${slabResult.depthPresetId}).`
);
