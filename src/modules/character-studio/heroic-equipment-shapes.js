import { loftSurface } from './low-poly-surfaces.js';

const all = model => model.slots.flatMap(slot => slot.pieces || []);
const joint = (model, name) => { const piece = all(model).find(p => p.name === name); return [...(piece.pivot || piece.offset)]; };
const plus = (a, b) => a.map((n, i) => n + b[i]);
const mul = (a, n) => a.map(v => v * n);

function add(model, slotId, name, parent, geometry, material, semanticPart) {
  const pivot = joint(model, parent);
  const vertices = geometry.vertices.map(v => v.map((n, i) => n - pivot[i]));
  const size = [0, 1, 2].map(i => Math.max(...vertices.map(v => v[i])) - Math.min(...vertices.map(v => v[i])));
  const slot = model.slots.find(s => s.slotId === slotId);
  slot.pieces = slot.pieces.filter(p => p.name !== name);
  slot.pieces.push({ template: 'CUSTOM', name, parent, pivot, offset: [...pivot], size, material, semanticPart, params: { vertices, faces: geometry.faces } });
}

function box(center, size) {
  return loftSurface([-1, 1].map(sign => ({ y: center[1] + sign * size[1] / 2, cx: center[0], cz: center[2], width: size[0], depth: size[2], corner: .02 })));
}

function polygonSolid(points, depth, transform) {
  // Polygon coordinates are counterclockwise in its own plane.
  const area = points.reduce((n, p, i) => { const q = points[(i + 1) % points.length]; return n + p[0] * q[1] - q[0] * p[1]; }, 0);
  if (area < 0) points = [...points].reverse();
  const count = points.length;
  const vertices = [-depth / 2, depth / 2].flatMap(z => points.map(([x, y]) => transform(x, y, z)));
  const faces = [];
  for (let i = 1; i < count - 1; i++) faces.push([0, i + 1, i], [count, count + i, count + i + 1]);
  for (let i = 0; i < count; i++) { const j = (i + 1) % count; faces.push([i, j, count + j], [i, count + j, count + i]); }
  return { vertices, faces };
}

export function applyHeroicOutfit(model, recipe) {
  if (recipe.outfit.style !== 'soldier') return model;
  for (const slot of model.slots) slot.pieces = slot.pieces.filter(p => !/^OUTFIT_/.test(p.name));
  const sy = recipe.body.height / 4.5, sx = recipe.body.width / 1.7;
  const shoulders = recipe.body.shoulders ?? 1;
  const waist = recipe.body.waist ?? 1, arms = recipe.body.arms ?? 1, boots = recipe.body.boots ?? 1;
  const torso = joint(model, 'TORSO'), neck = joint(model, 'NECK');
  const leather = '#3f3436', trim = '#655054', brass = '#afa077';
  const addOutfit = (slot, name, parent, shape, color) => add(model, slot, 'OUTFIT_' + name, parent, shape, color, 'outfit');
  const ring = (y, width, depth, cx = 0, cz = 0, corner = .20) => ({ y, width, depth, cx, cz, corner });
  addOutfit('TORSO', 'COLLAR', 'NECK', loftSurface([
    ring(neck[1] - .045 * sy, .53 * sx, .44 * sx, neck[0], neck[2]),
    ring(neck[1] + .20 * sy, .48 * sx, .41 * sx, neck[0], neck[2]),
  ]), recipe.outfit.shirt);
  addOutfit('TORSO', 'COLLAR_EDGE', 'NECK', loftSurface([
    ring(neck[1] + .17 * sy, .495 * sx, .425 * sx), ring(neck[1] + .20 * sy, .495 * sx, .425 * sx),
  ]), '#59516d');
  addOutfit('TORSO', 'WAIST_BELT', 'TORSO', loftSurface([
    ring(torso[1] - .005 * sy, 1.07 * sx * waist, .645 * sx), ring(torso[1] + .16 * sy, 1.025 * sx * waist, .64 * sx),
  ]), leather);
  addOutfit('TORSO', 'BUCKLE', 'TORSO', box([0, torso[1] + .08 * sy, .345 * sx], [.25 * sx, .15 * sy, .055 * sx]), brass);
  addOutfit('TORSO', 'BUCKLE_INSET', 'TORSO', box([0, torso[1] + .08 * sy, .377 * sx], [.13 * sx, .065 * sy, .014 * sx]), leather);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    // Narrow straps sit on the changing chest surface, with back continuations.
    const strapShape = front => polygonSolid([
      [sign * .29 * sx * waist, torso[1] + .17 * sy], [sign * .39 * sx * waist, torso[1] + .17 * sy],
      [sign * .54 * sx * shoulders, torso[1] + .96 * sy], [sign * .44 * sx * shoulders, torso[1] + .96 * sy],
    ], .018 * sx, (x, y, z) => [x, y, front * (.315 + .065 * (y - torso[1]) / sy) * sx + z]);
    addOutfit('TORSO', 'STRAP_' + side, 'TORSO', strapShape(1), leather);
    addOutfit('TORSO', 'STRAP_BACK_' + side, 'TORSO', strapShape(-1), leather);
    addOutfit('TORSO', 'STRAP_CLASP_' + side, 'TORSO', box([sign * (.185 * waist + .223 * shoulders) * sx, torso[1] + .53 * sy, .366 * sx], [.125 * sx, .09 * sy, .035 * sx]), brass);
    const hand = joint(model, 'HAND_' + side);
    addOutfit(side === 'R' ? 'WEAPON_MAIN' : 'WEAPON_SECONDARY', 'GLOVE_' + side, 'HAND_' + side, loftSurface([
      ring(hand[1] - .33 * sy, .405 * sx * arms, .435 * sx * arms, hand[0], hand[2] + .035 * sx),
      ring(hand[1] - .10 * sy, .405 * sx * arms, .38 * sx * arms, hand[0], hand[2] + .01 * sx),
      ring(hand[1] + .10 * sy, .305 * sx * arms, .34 * sx * arms, hand[0], hand[2]),
    ]), leather);
    addOutfit(`ARM_${side}`, 'WRIST_GUARD_' + side, 'ARM_' + side + '_LOWER', loftSurface([
      ring(hand[1] + .09 * sy, .325 * sx * arms, .35 * sx * arms, hand[0], hand[2]),
      ring(hand[1] + .20 * sy, .38 * sx * arms, .42 * sx * arms, hand[0], hand[2] - .02 * sx),
    ]), trim);
    const knee = joint(model, 'LEG_' + side + '_LOWER');
    addOutfit('LEG_' + side, 'BOOT_CUFF_' + side, 'LEG_' + side + '_LOWER', loftSurface([
      ring(knee[1] - .085 * sy, .57 * sx * boots, .585 * sx * boots, knee[0], knee[2] - .01 * sx),
      ring(knee[1] + .03 * sy, .555 * sx * boots, .58 * sx * boots, knee[0], knee[2] - .01 * sx),
    ]), trim);
    const foot = joint(model, 'FOOT_' + side);
    addOutfit('LEG_' + side, 'BOOT_SOLE_' + side, 'FOOT_' + side, loftSurface([
      ring(.025 * sy, .592 * sx * boots, 1.045 * sx * boots, foot[0], .23 * sx, .15),
      ring(.092 * sy, .592 * sx * boots, 1.045 * sx * boots, foot[0], .23 * sx, .15),
    ]), '#241f27');
  }
  return model;
}

export function applyHeroicEquipment(model, recipe) {
  const sy = recipe.body.height / 4.5, sx = recipe.body.width / 1.7;
  const sword = recipe.equipment.sword, pauldron = recipe.equipment.pauldron;
  if (sword.enabled && sword.profile === 'buster') {
    for (const slot of model.slots) slot.pieces = slot.pieces.filter(p => !/^EQUIP_SWORD_/.test(p.name));
    const hand = joint(model, 'HAND_R');
    const origin = plus(hand, [0, -.20 * sy, .075 * sx]);
    // Local +Y runs along the blade. The basis is right handed.
    const axis = [.80, -.56, .2144761059];
    const across = [-.5734623444, -.8192319205, 0];
    const normal = [.17572, -.12300, -.97610];
    // The visible detailed face points forwards, along across × axis.
    const transform = (x, y, z) => plus(origin, plus(mul(across, x), plus(mul(axis, y), mul(normal, -z))));
    const width = sword.width, length = sword.length;
    const bladeStart = .35 * sy;
    const addSword = (name, shape, color) => add(model, 'WEAPON_MAIN', 'EQUIP_SWORD_' + name, 'HAND_R', shape, color, 'equipment.sword');
    const blade = [[-width / 2, bladeStart], [width / 2, bladeStart], [width / 2, bladeStart + length - width * .55], [-width / 2, bladeStart + length]];
    addSword('BLADE', polygonSolid(blade, .125 * sx, transform), sword.color);
    const inset = [[-width / 2 + .06 * sx, bladeStart + .03 * sy], [width / 2 - .10 * sx, bladeStart + .03 * sy], [width / 2 - .10 * sx, bladeStart + length - width * .60], [-width / 2 + .06 * sx, bladeStart + length - .12 * sy]];
    addSword('FACE', polygonSolid(inset, .012 * sx, (x, y, z) => transform(x, y, z + .069 * sx)), '#778491');
    addSword('GUARD', polygonSolid([[-width * .73, bladeStart - .14 * sy], [width * .73, bladeStart - .14 * sy], [width * .73, bladeStart], [-width * .73, bladeStart]], .25 * sx, transform), '#34343e');
    addSword('GRIP', polygonSolid([[-.105 * sx, -.34 * sy], [.105 * sx, -.34 * sy], [.105 * sx, bladeStart - .14 * sy], [-.105 * sx, bladeStart - .14 * sy]], .20 * sx, transform), '#563c35');
    addSword('POMMEL', polygonSolid([[-.15 * sx, -.40 * sy], [.15 * sx, -.40 * sy], [.15 * sx, -.29 * sy], [-.15 * sx, -.29 * sy]], .24 * sx, transform), '#a5a7ac');
    for (let i = 0; i < 2; i++) {
      const y = bladeStart + (.20 + i * .24) * sy;
      const points = Array.from({ length: 8 }, (_, n) => { const a = n * Math.PI / 4; return [Math.cos(a) * .065 * sx, y + Math.sin(a) * .065 * sy]; });
      addSword('SOCKET_' + i, polygonSolid(points, .012 * sx, (x, y, z) => transform(x, y, z + .083 * sx)), '#252b32');
    }
  }
  if (pauldron.enabled && pauldron.profile === 'shell') {
    for (const slot of model.slots) slot.pieces = slot.pieces.filter(p => !/^EQUIP_PAULDRON_/.test(p.name));
    const sides = pauldron.side === 'both' ? ['L', 'R'] : [pauldron.side === 'right' ? 'R' : 'L'];
    for (const side of sides) {
      const shoulder = joint(model, 'CLAVICLE_' + side);
      const sign = side === 'L' ? -1 : 1;
      const center = plus(shoulder, [sign * .055 * sx, .06 * sy, 0]);
      const size = pauldron.size;
      const ring = (y, width, depth) => ({ y: center[1] + y * size, cx: center[0], cz: center[2], width: width * size, depth: depth * size, corner: .27 });
      const addArmor = (suffix, shape, color) => add(model, 'ARM_' + side, 'EQUIP_PAULDRON_' + (side === 'L' ? 'LEFT' : 'RIGHT') + suffix, 'CLAVICLE_' + side, shape, color, 'equipment.pauldron');
      addArmor('', loftSurface([ring(-.24, .84, .99), ring(.05, 1.0, 1.1), ring(.31, .62, .78), ring(.39, .26, .38)]), pauldron.color);
      addArmor('_RIM', loftSurface([ring(-.27, .90, 1.045), ring(-.16, .955, 1.085)]), '#323745');
      for (let i = -1; i <= 1; i++) {
        const x = center[0] + i * size * .235;
        addArmor('_STUD_' + (i + 1), loftSurface([
          { y: center[1] + .23 * size, cx: x, cz: center[2] + .05 * size, width: .115 * size, depth: .115 * size, corner: .27 },
          { y: center[1] + .39 * size, cx: x, cz: center[2] + .05 * size, width: .09 * size, depth: .09 * size, corner: .27 },
        ]), '#b0b8bd');
      }
    }
  }
  return model;
}

/** A display pose only: joint transforms change, the bind shape stays intact. */
export function applyHeroicPresentation(group) {
  const rotate = (name, axis, angle) => { const node = group.getObjectByName(name); if (node) node.rotation[axis] += angle; };
  rotate('TORSO', 'z', -.025);
  rotate('HEAD', 'y', -.14);
  rotate('ARM_L_UPPER', 'z', -.10);
  rotate('ARM_L_LOWER', 'x', -.12);
  rotate('ARM_R_UPPER', 'z', .10);
  rotate('ARM_R_LOWER', 'x', -.12);
  rotate('HAND_R', 'z', .20);
  rotate('LEG_L_UPPER', 'z', -.055);
  rotate('LEG_R_UPPER', 'z', .045);
  group.updateMatrixWorld(true);
  return group;
}
