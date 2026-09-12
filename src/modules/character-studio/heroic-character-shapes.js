import { loftSurface } from './low-poly-surfaces.js';

const pieces = model => model.slots.flatMap(slot => slot.pieces || []);
const find = (model, name) => pieces(model).find(piece => piece.name === name);
const point = piece => [...(piece.pivot || piece.offset)];

function put(model, slotId, piece) {
  const slot = model.slots.find(item => item.slotId === slotId);
  const index = slot.pieces.findIndex(item => item.name === piece.name);
  if (index < 0) slot.pieces.push(piece); else slot.pieces[index] = piece;
}

function label(name, parent, pivot, material) {
  return { template: 'LABEL', name, parent, pivot, offset: [...pivot], size: [0, 0, 0], material, semanticPart: 'body' };
}

function custom(name, parent, pivot, geometry, material, semanticPart = 'body') {
  const vertices = geometry.vertices.map(v => v.map((value, axis) => value - pivot[axis]));
  const size = [0, 1, 2].map(axis => Math.max(...vertices.map(v => v[axis])) - Math.min(...vertices.map(v => v[axis])));
  return { template: 'CUSTOM', name, parent, pivot: [...pivot], offset: [...pivot], size, material, params: { vertices, faces: geometry.faces }, semanticPart };
}

function shiftHead(model, delta) {
  const head = model.slots.find(slot => slot.slotId === 'HEAD');
  for (const piece of head.pieces) for (const field of ['offset', 'pivot']) {
    if (piece[field]) piece[field] = piece[field].map((value, axis) => value + delta[axis]);
  }
}

/** Sculpted cross sections over the existing named humanoid joints. */
export function applyHeroicBody(model, recipe) {
  const sy = recipe.body.height / 4.5;
  const sx = recipe.body.width / 1.7;
  const shoulders = recipe.body.shoulders ?? 1;
  const waist = recipe.body.waist ?? 1;
  const arms = recipe.body.arms ?? 1;
  const legs = recipe.body.legs ?? 1;
  const boots = recipe.body.boots ?? 1;
  const skin = recipe.skin, shirt = recipe.outfit.shirt, pants = recipe.outfit.pants, shoes = recipe.outfit.shoes;
  const scale = p => [p[0] * sx, p[1] * sy, p[2] * sx];
  const headAnchor = scale([0, 3.42, 0]);
  const oldHead = point(find(model, 'HEAD'));
  shiftHead(model, headAnchor.map((value, axis) => value - oldHead[axis]));
  const make = (slot, name, parent, pivot, rings, color, category = 'body') => {
    const geometry = loftSurface(rings.map(([y, width, depth, cx = 0, cz = 0, corner = .22]) => ({ y: y * sy, width: width * sx, depth: depth * sx, cx: cx * sx, cz: cz * sx, corner })));
    put(model, slot, custom(name, parent, scale(pivot), geometry, color, category));
  };
  make('TORSO', 'PELVIS', undefined, [0, 1.91, 0], [
    [1.68, .94 * waist, .52], [1.83, 1.14 * waist, .64, 0, -.015], [2.14, 1.02 * waist, .57],
  ], pants);
  make('TORSO', 'TORSO', 'PELVIS', [0, 2.08, 0], [
    [2.08, .94 * waist, .55], [2.30, .98 * waist, .58], [2.91, 1.43 * shoulders, .76, 0, .025], [3.13, 1.37 * shoulders, .69], [3.35, .66, .48, 0, -.01],
  ], shirt);
  put(model, 'TORSO', label('CHEST', 'TORSO', scale([0, 3.13, 0]), shirt));
  make('TORSO', 'NECK', 'CHEST', [0, 3.29, 0], [[3.26, .41, .38], [3.55, .37, .35]], skin);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    const shoulder = sign * .91 * shoulders;
    const elbow = shoulder + sign * .12;
    const wrist = shoulder + sign * .10;
    const leg = sign * .35;
    put(model, `ARM_${side}`, label(`CLAVICLE_${side}`, 'CHEST', scale([shoulder, 3.16, 0]), skin));
    make(`ARM_${side}`, `ARM_${side}_UPPER`, `CLAVICLE_${side}`, [shoulder, 3.16, 0], [
      [2.44, .29 * arms, .31 * arms, elbow, .015], [2.77, .46 * arms, .47 * arms, shoulder + sign * .075, 0, .3], [3.05, .52 * arms, .50 * arms, shoulder, 0, .3], [3.24, .27 * arms, .32 * arms, shoulder - sign * .05, 0, .3],
    ], skin);
    make(`ARM_${side}`, `ARM_${side}_LOWER`, `ARM_${side}_UPPER`, [elbow, 2.46, .015], [
      [1.92, .25 * arms, .28 * arms, wrist, .11], [2.17, .38 * arms, .41 * arms, elbow + sign * .035, .07, .27], [2.47, .30 * arms, .32 * arms, elbow, .015],
    ], skin);
    make(side === 'R' ? 'WEAPON_MAIN' : 'WEAPON_SECONDARY', `HAND_${side}`, `ARM_${side}_LOWER`, [wrist, 1.94, .11], [
      [1.51, .30 * arms, .32 * arms, wrist, .17], [1.62, .40 * arms, .43 * arms, wrist, .15], [1.85, .39 * arms, .36 * arms, wrist, .12], [1.97, .25 * arms, .28 * arms, wrist, .11],
    ], skin);
    make(`LEG_${side}`, `LEG_${side}_UPPER`, 'PELVIS', [leg, 1.93, 0], [
      [1.00, .39 * legs, .45 * legs, leg, .055], [1.28, .56 * legs, .55 * legs, leg + sign * .015, .02], [1.65, .68 * legs, .65 * legs, leg, -.025], [1.96, .55 * legs, .55 * legs, leg, -.01],
    ], pants);
    make(`LEG_${side}`, `LEG_${side}_LOWER`, `LEG_${side}_UPPER`, [leg, 1.04, .055], [
      [.28, .39 * boots, .46 * boots, leg, -.005], [.53, .44 * boots, .51 * boots, leg, -.035], [.92, .54 * boots, .54 * boots, leg, .015], [1.075, .49 * boots, .52 * boots, leg, .04],
    ], shoes);
    make(`LEG_${side}`, `FOOT_${side}`, `LEG_${side}_LOWER`, [leg, .31, 0], [
      [.03, .57 * boots, 1.03 * boots, leg, .23, .15], [.17, .58 * boots, 1.01 * boots, leg, .23, .18], [.34, .48 * boots, .78 * boots, leg, .15, .23], [.43, .38 * boots, .46 * boots, leg, -.025, .23],
    ], shoes);
  }
  model.heroicBody = { headAnchor, height: sy, width: sx };
  return model;
}

export const HERO_STUDY_RECIPE = Object.freeze({
  name: 'Cloud · estudio PSX', style: 'psx',
  body: { height: 4.5, width: 1.7 }, head: { style: 'psx', scale: 1 },
  hair: { style: 'swept_spikes', color: '#eec34b' }, skin: '#e4ad83',
  outfit: { style: 'plain', shirt: '#34325b', pants: '#49436d', shoes: '#392e2b' },
  equipment: { sword: { enabled: false }, pauldron: { enabled: false } },
});

export { applyHeroicHead } from './heroic-face-shapes.js';

export { applyHeroicHair } from './heroic-hair-shapes.js';

export { applyHeroicOutfit, applyHeroicEquipment, applyHeroicPresentation } from './heroic-equipment-shapes.js';
