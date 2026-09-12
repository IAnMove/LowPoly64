import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_DESIGN_EXAMPLES,
  CHARACTER_DESIGN_SCHEMA,
  CHARACTER_DESIGN_FORMAT,
  CHARACTER_DESIGN_LIMITS,
  createCharacterDesignModel,
  exploradoraN64,
  espadachinPSX,
  getCharacterDesignPart,
  normalizeCharacterDesign,
  regenerateCharacterDesignHair,
  validateCharacterDesign,
} from '../src/modules/character-studio/character-design.js';

function allPieces(model) {
  return model.slots.flatMap((slot) => slot.pieces);
}

function pieceMap(model) {
  return new Map(allPieces(model).map((piece) => [piece.name, piece]));
}

function triangleCount(piece) {
  const template = String(piece.template || '').toUpperCase();
  if (template === 'LABEL') return 0;
  if (template === 'CUSTOM') return piece.params.faces.length;
  if (template === 'PRISM' || template === 'CUBE' || template === 'TAPERED_BOX') return 12;
  if (template === 'LIMB_LOFT') {
    const sides = piece.params?.sides || 6;
    const sections = piece.params?.sections?.length || 2;
    return sides * (sections - 1) * 2 + sides * 2;
  }
  if (template === 'SPHERE') return (piece.params?.widthSegments || 8) * (piece.params?.heightSegments || 6) * 2;
  return 0;
}

function assertOutwardCustomGeometry(piece) {
  const { vertices, faces } = piece.params;
  const center = vertices.reduce((sum, vertex) => {
    sum[0] += vertex[0];
    sum[1] += vertex[1];
    sum[2] += vertex[2];
    return sum;
  }, [0, 0, 0]).map((value) => value / vertices.length);

  faces.forEach(([aIndex, bIndex, cIndex]) => {
    const a = vertices[aIndex];
    const b = vertices[bIndex];
    const c = vertices[cIndex];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const faceCenter = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    const outward = [faceCenter[0] - center[0], faceCenter[1] - center[1], faceCenter[2] - center[2]];
    const dot = normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2];
    assert.ok(dot > 0, piece.name + ' face winding points outward');
  });
}

function pieceLocalYBounds(piece) {
  if (Array.isArray(piece.params?.vertices) && piece.params.vertices.length > 0) {
    const values = piece.params.vertices.map((vertex) => vertex[1]);
    return [Math.min(...values), Math.max(...values)];
  }
  const halfHeight = (piece.size?.[1] || 0) * 0.5;
  return [-halfHeight, halfHeight];
}

function pieceWorldYBounds(piece, anchorY = 0) {
  const [minY, maxY] = pieceLocalYBounds(piece);
  const meshOffset = (piece.offset?.[1] || 0) - (piece.pivot?.[1] || 0);
  const pivotOffset = (piece.pivot?.[1] || 0) - anchorY;
  return [minY + meshOffset + pivotOffset, maxY + meshOffset + pivotOffset];
}
function assertParentsResolve(model) {
  const pieces = pieceMap(model);
  allPieces(model).forEach((piece) => {
    assert.ok(Array.isArray(piece.offset) && piece.offset.length === 3, `${piece.name} offset`);
    piece.offset.forEach((value) => assert.ok(Number.isFinite(value), `${piece.name} offset is finite`));
    if (piece.pivot) {
      assert.equal(piece.pivot.length, 3, `${piece.name} pivot`);
      piece.pivot.forEach((value) => assert.ok(Number.isFinite(value), `${piece.name} pivot is finite`));
    }
    if (piece.parent) assert.ok(pieces.has(piece.parent), `${piece.name} parent ${piece.parent} exists`);
  });
}

test('schema is closed at every design object boundary', () => {
  assert.equal(CHARACTER_DESIGN_SCHEMA.additionalProperties, false);
  assert.equal(CHARACTER_DESIGN_SCHEMA.properties.equipment.additionalProperties, false);
  assert.equal(CHARACTER_DESIGN_SCHEMA.properties.equipment.properties.sword.additionalProperties, false);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.hair.properties.style.enum, ['none', 'short', 'spiky', 'swept_spikes', 'hero_spikes', 'plumber_cap']);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.body.properties.profile.enum, ['classic', 'heroic', 'plumber']);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.head.properties.profile.enum, ['classic', 'heroic', 'plumber']);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.outfit.properties.style.enum, ['plain', 'sleeveless', 'tunic', 'soldier', 'overalls']);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.equipment.properties.sword.properties.profile.enum, ['classic', 'buster']);
  assert.deepEqual(CHARACTER_DESIGN_SCHEMA.properties.equipment.properties.pauldron.properties.profile.enum, ['plate', 'shell']);
});

test('validation reports exact paths and never accepts unknown presets', () => {
  const result = validateCharacterDesign({
    format: CHARACTER_DESIGN_FORMAT,
    version: 1,
    style: 'psx',
    hair: { style: 'cloud', color: 'gold' },
    equipment: { pauldron: { side: 'centre' } },
    skin: '#12345',
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === 'hair.style' && error.allowed.includes('swept_spikes')));
  assert.ok(result.errors.some((error) => error.path === 'hair.color'));
  assert.ok(result.errors.some((error) => error.path === 'equipment.pauldron.side'));
  assert.ok(result.errors.some((error) => error.path === 'skin'));
  const profileErrors = validateCharacterDesign({
    style: 'psx',
    body: { profile: 'giant', shoulders: 2 },
    head: { profile: 'robot', jaw: 2 },
    hair: { style: 'hero_spikes', color: '#112233' },
    outfit: { style: 'soldier', shirt: '#112233', pants: '#223344', shoes: '#334455' },
    equipment: {
      sword: { enabled: true, profile: 'longsword', width: .3, length: 1.6, color: '#aabbcc' },
      pauldron: { enabled: true, profile: 'shell', side: 'right', size: .6, color: '#aabbcc' },
    },
  });
  assert.equal(profileErrors.ok, false);
  for (const path of ['body.profile', 'body.shoulders', 'head.profile', 'head.jaw', 'equipment.sword.profile']) {
    assert.ok(profileErrors.errors.some((error) => error.path === path), path);
  }
  assert.throws(() => normalizeCharacterDesign({ style: 'dreamcast' }), /style/);
});

test('defaults normalize to a complete canonical recipe with bounded values', () => {
  const recipe = normalizeCharacterDesign({ style: 'N64', name: '  Scout  ' });
  assert.equal(recipe.format, CHARACTER_DESIGN_FORMAT);
  assert.equal(recipe.version, 1);
  assert.equal(recipe.name, 'Scout');
  assert.equal(recipe.style, 'n64');
  assert.equal(recipe.head.style, 'n64');
  assert.equal(recipe.body.height, CHARACTER_DESIGN_LIMITS.bodyHeight.default);
  assert.equal(recipe.equipment.sword.enabled, false);
  assert.equal(recipe.equipment.pauldron.enabled, false);
});

test('PSX swordsman composes an asymmetric hair, hand-held sword and left pauldron', () => {
  const model = createCharacterDesignModel(espadachinPSX);
  const pieces = pieceMap(model);
  assert.equal(model.archetype, 'HUMANOID');
  assert.equal(model.characterDesignRecipe.style, 'psx');
  assert.equal(model.semanticParts.EQUIP_SWORD_BLADE, 'equipment.sword');
  assert.equal(model.semanticParts.EQUIP_PAULDRON_LEFT, 'equipment.pauldron');
  assert.equal(getCharacterDesignPart('EQUIP_SWORD_BLADE'), 'equipment.sword');
  assert.equal(getCharacterDesignPart('HAIR_SWEEP_MAIN'), 'hair');

  const sword = pieces.get('EQUIP_SWORD_BLADE');
  assert.equal(sword.parent, 'HAND_R');
  assert.deepEqual(sword.pivot, pieces.get('HAND_R').pivot);
  assert.ok(Math.max(...sword.params.vertices.map((vertex) => vertex[1])) - Math.min(...sword.params.vertices.map((vertex) => vertex[1])) >= espadachinPSX.equipment.sword.length);
  assert.equal(sword.material, espadachinPSX.equipment.sword.color);

  const pauldron = pieces.get('EQUIP_PAULDRON_LEFT');
  assert.equal(pauldron.parent, 'CLAVICLE_L');
  assert.deepEqual(pauldron.pivot, pieces.get('CLAVICLE_L').pivot);
  const sweepPieces = allPieces(model).filter((piece) => piece.name.startsWith('HAIR_SWEEP_'));
  assert.equal(sweepPieces.length, 4);
  sweepPieces.forEach((piece) => {
    assert.equal(piece.template, 'CUSTOM');
    assert.equal(piece.params.vertices.length, 5);
    assert.equal(piece.params.faces.length, 6);
    assertOutwardCustomGeometry(piece);
    const tip = piece.params.vertices.reduce((highest, vertex) => vertex[1] > highest[1] ? vertex : highest);
    assert.notEqual(tip[0], 0, piece.name + ' should lean sideways');
  });
  assert.notEqual(pieces.get('HAIR_SWEEP_MAIN').offset[0], pieces.get('HAIR_SWEEP_SIDE').offset[0]);
  const cap = pieces.get('HAIR_CAP');
  const headAnchorY = pieces.get('HEAD').pivot[1];
  const [, capMaxY] = pieceWorldYBounds(cap, headAnchorY);
  const [tuftMinY, tuftMaxY] = pieceWorldYBounds(sweepPieces[0], headAnchorY);
  assert.ok(tuftMinY < capMaxY, 'the main tuft base must overlap the cap');
  assert.ok(tuftMaxY > capMaxY + 0.15, 'the main tuft tip must clear the scalp');
  assert.equal(pieces.get('ARM_L_UPPER').material, espadachinPSX.skin);
  assert.equal(pieces.get('ARM_R_UPPER').material, espadachinPSX.skin);
  const mouth = pieces.get('MOUTH');
  assert.notEqual(mouth.material, espadachinPSX.hair.color);
  const hairChanged = createCharacterDesignModel({
    ...espadachinPSX,
    hair: { ...espadachinPSX.hair, color: '#fff200' },
  });
  assert.equal(pieceMap(hairChanged).get('MOUTH').material, mouth.material);
  assert.ok(allPieces(model).some((piece) => piece.semanticPart === 'outfit'));
  assertParentsResolve(model);
  assert.ok(allPieces(model).reduce((sum, piece) => sum + triangleCount(piece), 0) < 1200);
});

test('N64 explorer remains distinct and uses a tunic without equipment', () => {
  const model = createCharacterDesignModel(exploradoraN64);
  const pieces = pieceMap(model);
  assert.equal(model.characterDesignRecipe.style, 'n64');
  assert.equal(pieces.get('HEAD').template, 'CUSTOM');
  assert.equal(pieces.get('OUTFIT_TUNIC').semanticPart, 'outfit');
  assert.equal(pieces.has('EQUIP_SWORD_BLADE'), false);
  assert.equal(pieces.has('EQUIP_PAULDRON_RIGHT'), false);
  assert.equal(model.semanticParts.OUTFIT_TUNIC, 'outfit');
  assertParentsResolve(model);
});

test('heroic profiles compose body, face, soldier outfit and buster equipment', () => {
  const model = createCharacterDesignModel({
    name: 'Heroic tester',
    style: 'psx',
    body: { height: 4.6, width: 1.8, profile: 'heroic', shoulders: 1.18, waist: .92, arms: 1.08, legs: 1.06, boots: 1.14 },
    head: { style: 'psx', scale: 1.02, profile: 'heroic', jaw: 1.08 },
    hair: { style: 'hero_spikes', color: '#d47a32' },
    outfit: { style: 'soldier', shirt: '#3e4b72', pants: '#252b45', shoes: '#27222a' },
    skin: '#c58b68',
    equipment: {
      sword: { enabled: true, profile: 'buster', width: .46, length: 2.4, color: '#b9c7d8' },
      pauldron: { enabled: true, profile: 'shell', side: 'right', size: .78, color: '#596477' },
    },
  });
  const pieces = pieceMap(model);
  assert.equal(model.characterDesignRecipe.body.profile, 'heroic');
  assert.equal(model.characterDesignRecipe.head.profile, 'heroic');
  assert.ok(model.heroicBody);
  assert.ok(model.heroicHead);
  assert.equal(pieces.get('HEAD').template, 'CUSTOM');
  assert.equal(pieces.get('FACE_LIP').semanticPart, 'head');
  assert.equal(pieces.get('MOUTH').material, '#815347');
  assert.equal(getCharacterDesignPart('FACE_LIP'), 'head');
  assert.ok(pieces.has('HAIR_CROWN_HIGH'));
  assert.equal(pieces.has('HAIR_TUFT_1'), false);
  assert.ok(pieces.has('OUTFIT_COLLAR'));
  assert.equal(pieces.has('OUTFIT_TUNIC'), false);
  assert.equal(pieces.get('ARM_L_UPPER').material, '#c58b68');
  assert.equal(pieces.get('ARM_R_UPPER').material, '#c58b68');
  assert.equal(pieces.get('LEG_L_LOWER').material, '#27222a');
  assert.equal(pieces.get('LEG_R_LOWER').material, '#27222a');
  assert.ok(pieces.has('EQUIP_SWORD_BLADE'));
  assert.ok(pieces.has('EQUIP_SWORD_FACE'));
  assert.equal(pieces.get('EQUIP_SWORD_BLADE').parent, 'HAND_R');
  assert.ok(pieces.has('EQUIP_PAULDRON_RIGHT'));
  assert.equal(pieces.get('EQUIP_PAULDRON_RIGHT').parent, 'CLAVICLE_R');
  assert.equal(allPieces(model).filter((piece) => piece.name === 'EQUIP_SWORD_BLADE').length, 1);
  assert.equal(allPieces(model).filter((piece) => piece.name === 'EQUIP_PAULDRON_RIGHT').length, 1);
  assertParentsResolve(model);
});
test('hair regeneration keeps manual body/head/equipment edits intact', () => {
  const original = createCharacterDesignModel(espadachinPSX);
  const originalPieces = pieceMap(original);
  originalPieces.get('TORSO').material = '#112233';
  originalPieces.get('HEAD').offset[0] = 0.17;
  originalPieces.get('EQUIP_SWORD_BLADE').material = '#ff00aa';
  const next = regenerateCharacterDesignHair(original, { style: 'short', color: '#ffffff' });
  const nextPieces = pieceMap(next);
  assert.equal(nextPieces.get('TORSO').material, '#112233');
  assert.equal(nextPieces.get('HEAD').offset[0], 0.17);
  assert.equal(nextPieces.get('EQUIP_SWORD_BLADE').material, '#ff00aa');
  assert.equal(next.characterDesignRecipe.hair.style, 'short');
  assert.equal(next.characterDesignRecipe.hair.color, '#ffffff');
  assert.equal(allPieces(next).some((piece) => piece.name.startsWith('HAIR_SWEEP_')), false);
  assert.equal(next.semanticParts.HAIR_CAP, 'hair');
  assertParentsResolve(next);
});

test('published examples are independent originals', () => {
  assert.notEqual(CHARACTER_DESIGN_EXAMPLES.espadachinPSX.name, CHARACTER_DESIGN_EXAMPLES.exploradoraN64.name);
  assert.equal(CHARACTER_DESIGN_EXAMPLES.espadachinPSX.equipment.sword.enabled, true);
  assert.equal(CHARACTER_DESIGN_EXAMPLES.exploradoraN64.equipment.sword.enabled, false);
  assert.notDeepEqual(CHARACTER_DESIGN_EXAMPLES.espadachinPSX, CHARACTER_DESIGN_EXAMPLES.exploradoraN64);
});