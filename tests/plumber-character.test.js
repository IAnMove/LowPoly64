import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createCharacterDesignModel, validateCharacterDesign } from '../src/modules/character-studio/character-design.js';
import { MARIO64_RECIPE } from '../src/modules/character-studio/plumber-presets.js';
const pieces = model => model.slots.flatMap(slot => slot.pieces);

test('Mario recipe builds finite geometry with named joints and parented face, cap and gloves', () => {
  assert.equal(validateCharacterDesign(MARIO64_RECIPE).ok, true);
  const model = createCharacterDesignModel(MARIO64_RECIPE), all = pieces(model), map = new Map(all.map(p => [p.name, p]));
  assert.equal(map.size, all.length);
  for (const piece of all) {
    if (piece.parent) assert.ok(map.has(piece.parent), `${piece.name}: ${piece.parent}`);
    for (const vertex of piece.params?.vertices || []) assert.ok(vertex.every(Number.isFinite), piece.name);
    assert.ok(piece.offset.every(Number.isFinite), piece.name);
  }
  for (const name of ['HEAD', 'CHEST', 'PELVIS', 'CLAVICLE_L', 'CLAVICLE_R', 'HAND_L', 'HAND_R', 'LEG_L_LOWER', 'LEG_R_LOWER', 'FOOT_L', 'FOOT_R']) assert.ok(map.has(name), name);
  for (const name of ['NOSE', 'EYE_L_WHITE', 'FACE_MOUSTACHE_0', 'HAIR_CAP', 'HAIR_CAP_M_0', 'MOUTH']) assert.equal(map.get(name).parent, 'HEAD');
  assert.equal(map.get('OUTFIT_THUMB_R').parent, 'HAND_R');
  assert.equal(map.get('OUTFIT_BIB_BACK').parent, 'TORSO');
  assert.equal(model.speechAnchor.parent, 'HEAD');
});

test('both overall straps face outwards and front/back clothes survive backface culling', () => {
  const all = pieces(createCharacterDesignModel(MARIO64_RECIPE));
  for (const piece of all.filter(p => /^OUTFIT_(BIB|STRAP)/.test(p.name))) {
    const [ia, ib, ic] = piece.params.faces[0], [a, b, c] = [ia, ib, ic].map(i => piece.params.vertices[i]);
    const normalZ = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    assert.ok(piece.name.includes('BACK') ? normalZ < 0 : normalZ > 0, piece.name);
  }
});

test('Mario proportions change independently, and Cloud canonical recipe is preserved byte for byte', () => {
  const baseline = createCharacterDesignModel(MARIO64_RECIPE), alteredRecipe = structuredClone(MARIO64_RECIPE);
  alteredRecipe.head.scale = .8; alteredRecipe.body.height = 3.8;
  const altered = createCharacterDesignModel(alteredRecipe);
  const get = (m, name) => pieces(m).find(p => p.name === name);
  assert.equal(get(altered, 'HEAD').size[0] / get(baseline, 'HEAD').size[0], .8);
  assert.ok(get(altered, 'HEAD').pivot[1] > get(baseline, 'HEAD').pivot[1]);
  const cloud = fs.readFileSync('docs/examples/character-design/cloud-hero.recipe.json');
  assert.equal(createHash('sha256').update(cloud).digest('hex').toUpperCase(), '5D44920515A9C228A582C6666C2FF2A431123813A32DBCEF7EA38B7DAF611588');
  assert.deepEqual(fs.readFileSync('public/character-examples/mario64/cloud.recipe.json'), cloud);
});
