import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRetroBodyModel,
  createRetroCharacterModel,
  normalizeRetroCharacterRecipe,
  validateRetroCharacterRecipe,
} from '../src/modules/character-studio/character-model.js';

function triangleCount(piece) {
  const template = String(piece.template || '').toUpperCase();
  if (template === 'LABEL') return 0;
  if (template === 'CUSTOM') return piece.params.faces.length;
  if (template === 'PRISM') return 8;
  if (template === 'CUBE' || template === 'TAPERED_BOX' || template === 'PYRAMID') return 12;
  if (template === 'LIMB_LOFT') {
    const params = piece.params || {};
    const sides = params.sides || 6;
    const sections = params.sections?.length || 2;
    return sides * (sections - 1) * 2 + (params.capTop === false ? 0 : sides) + (params.capBottom === false ? 0 : sides);
  }
  if (template === 'SPHERE') {
    const widthSegments = piece.params?.widthSegments || 8;
    const heightSegments = piece.params?.heightSegments || 6;
    return widthSegments * heightSegments * 2;
  }
  return 0;
}

function allPieces(model) {
  return model.slots.flatMap((slot) => slot.pieces);
}

function pieceMap(model) {
  return new Map(allPieces(model).map((piece) => [piece.name, piece]));
}

function assertFiniteVector(vector) {
  assert.ok(Array.isArray(vector) && vector.length === 3);
  vector.forEach((value) => assert.ok(Number.isFinite(value), `expected finite vector entry, got ${value}`));
}

for (const style of ['n64', 'psx']) {
  test(`${style} default model is a valid bounded CharacterModel`, () => {
    const model = createRetroCharacterModel({ style, headStyle: style });
    assert.equal(model.archetype, 'HUMANOID');
    assert.equal(model.retroCharacterRecipe.format, 'retrovisor-character');
    assert.equal(model.retroCharacterRecipe.includeHead, true);
    assert.equal(model.skeletonId, 'HUMANOID_STANDARD');
    assert.equal(model.animationProfile, 'HUMANOID_STANDARD_AVATAR_BASE');
    assert.ok(model.slots.every((slot) => slot.pieces.length > 0), 'all humanoid slots need a piece or anchor');
    const triangles = allPieces(model).reduce((sum, piece) => sum + triangleCount(piece), 0);
    assert.ok(triangles <= 1200, `default ${style} model has ${triangles} triangles`);
  });
}

test('headless body keeps a replaceable HEAD joint and preserves the rig contract', () => {
  const model = createRetroBodyModel({ style: 'n64' });
  assert.equal(model.archetype, 'HUMANOID');
  assert.equal(model.retroCharacterRecipe.includeHead, false);
  const headSlot = model.slots.find((slot) => slot.slotId === 'HEAD');
  assert.deepEqual(headSlot.pieces.map((piece) => piece.name), ['HEAD']);
  assert.equal(headSlot.pieces[0].template, 'LABEL');
  assert.equal(headSlot.pieces[0].parent, 'NECK');
  assert.deepEqual(model.slotBindings.HEAD, ['HEAD']);
});

test('styles produce deliberately different silhouettes and head geometry', () => {
  const n64 = createRetroCharacterModel({ style: 'n64', headStyle: 'n64' });
  const psx = createRetroCharacterModel({ style: 'psx', headStyle: 'psx' });
  const n64Pieces = pieceMap(n64);
  const psxPieces = pieceMap(psx);
  assert.equal(n64Pieces.get('HEAD').template, 'CUSTOM');
  assert.equal(psxPieces.get('HEAD').template, 'CUSTOM');
  assert.notDeepEqual(n64Pieces.get('TORSO').params, psxPieces.get('TORSO').params);
  assert.notEqual(n64Pieces.get('ARM_L_UPPER').params.sides, psxPieces.get('ARM_L_UPPER').params.sides);
});

test('every piece has finite placement and every parent resolves to a pivot', () => {
  const model = createRetroCharacterModel({ style: 'psx', headStyle: 'n64', hair: 'spiky' });
  const pieces = pieceMap(model);
  allPieces(model).forEach((piece) => {
    assertFiniteVector(piece.offset);
    if (piece.pivot) assertFiniteVector(piece.pivot);
    if (piece.size) assertFiniteVector(piece.size);
    if (piece.parent) assert.ok(pieces.has(piece.parent), `${piece.name} parent ${piece.parent} missing`);
  });
  const feet = ['FOOT_L', 'FOOT_R'].map((name) => pieces.get(name));
  feet.forEach((foot) => {
    const minY = foot.offset[1] - foot.size[1] / 2;
    assert.ok(Math.abs(minY) < 1e-9, `${foot.name} should sit on Y=0 (got ${minY})`);
  });
});

test('recipe normalization and validation reject unsupported inputs without losing safe defaults', () => {
  const normalized = normalizeRetroCharacterRecipe({
    version: 1,
    style: 'PSX',
    headStyle: 'N64',
    includeHead: false,
    headScale: 99,
    colors: { skin: '#abc' },
  });
  assert.equal(normalized.style, 'psx');
  assert.equal(normalized.headStyle, 'n64');
  assert.equal(normalized.includeHead, false);
  assert.equal(normalized.headScale, 1.45);
  assert.equal(normalized.colors.skin, '#aabbcc');

  const validation = validateRetroCharacterRecipe({ format: 'wrong', version: 2, style: 'dreamcast', includeHead: 'yes' });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.includes('format')));
  assert.ok(validation.errors.some((error) => error.includes('version')));
  assert.ok(validation.errors.some((error) => error.includes('style')));
  assert.ok(validation.errors.some((error) => error.includes('includeHead')));
  assert.throws(() => createRetroCharacterModel({ version: 2 }), /version/);
  assert.throws(() => createRetroBodyModel({ style: 'dreamcast' }), /style/);
});





