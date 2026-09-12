import { loftSurface } from './low-poly-surfaces.js';
import { anchorOf, putShape, ellipsoid, facePanel, ovalPanel } from './plumber-shape-utils.js';

export function applyPlumberBody(model, recipe) {
  const sy = recipe.body.height / 3.2, sx = recipe.body.width / 2;
  const { shoulders = 1, waist = 1, arms = 1, legs = 1, boots = 1 } = recipe.body;
  const p = ([x, y, z]) => [x * sx, y * sy, z * sx];
  const oldHead = anchorOf(model, 'HEAD'), newHead = p([0, 2.59, 0]);
  for (const piece of model.slots.find(s => s.slotId === 'HEAD').pieces) for (const field of ['pivot', 'offset']) if (piece[field]) piece[field] = piece[field].map((n, i) => n + newHead[i] - oldHead[i]);
  const label = (slotId, name, parent, point) => {
    const pivot = p(point), slot = model.slots.find(s => s.slotId === slotId);
    slot.pieces = slot.pieces.filter(piece => piece.name !== name);
    slot.pieces.push({ template: 'LABEL', name, parent, pivot, offset: [...pivot], size: [0, 0, 0], material: recipe.skin, semanticPart: 'body' });
  };
  const ball = (slot, name, parent, pivot, center, radius, color, sides = 12, rings = 6) => putShape(model, slot, name, parent, ellipsoid(p(center), [radius[0] * sx, radius[1] * sy, radius[2] * sx], sides, rings), color, 'body', p(pivot));
  ball('TORSO', 'PELVIS', undefined, [0, 1.4, 0], [0, 1.46, .01], [.91 * waist, .47, .60], recipe.outfit.pants);
  ball('TORSO', 'TORSO', 'PELVIS', [0, 1.6, 0], [0, 2.05, 0], [.91 * waist, .70, .61], recipe.outfit.shirt, 16, 8);
  label('TORSO', 'CHEST', 'TORSO', [0, 2.40, 0]);
  label('TORSO', 'NECK', 'CHEST', [0, 2.54, 0]);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1, sh = .93 * shoulders * sign;
    label('ARM_' + side, 'CLAVICLE_' + side, 'CHEST', [sh, 2.36, 0]);
    ball('ARM_' + side, 'ARM_' + side + '_UPPER', 'CLAVICLE_' + side, [sh, 2.36, 0], [sh + sign * .15, 2.13, .015], [.33 * arms, .40, .34 * arms], recipe.outfit.shirt);
    ball('ARM_' + side, 'ARM_' + side + '_LOWER', 'ARM_' + side + '_UPPER', [sh + sign * .24, 1.98, .025], [sh + sign * .29, 1.78, .05], [.28 * arms, .31, .29 * arms], recipe.outfit.shirt);
    const handX = sh + sign * .36;
    ball(side === 'R' ? 'WEAPON_MAIN' : 'WEAPON_SECONDARY', 'HAND_' + side, 'ARM_' + side + '_LOWER', [handX, 1.57, .08], [handX, 1.36, .13], [.34 * arms, .30, .32 * arms], '#f1eddd');
    const legX = sign * .44;
    ball('LEG_' + side, 'LEG_' + side + '_UPPER', 'PELVIS', [legX, 1.44, 0], [legX, 1.12, .01], [.36 * legs, .47, .39 * legs], recipe.outfit.pants);
    ball('LEG_' + side, 'LEG_' + side + '_LOWER', 'LEG_' + side + '_UPPER', [legX, .88, .015], [legX, .69, .025], [.31 * legs, .34, .32 * legs], recipe.outfit.pants);
    const geometry = loftSurface([
      { y: .025 * sy, width: .83 * sx * boots, depth: 1.26 * sx * boots, cx: legX * sx, cz: .28 * sx, corner: .22 },
      { y: .14 * sy, width: .88 * sx * boots, depth: 1.29 * sx * boots, cx: legX * sx, cz: .28 * sx, corner: .25 },
      { y: .36 * sy, width: .77 * sx * boots, depth: 1.12 * sx * boots, cx: legX * sx, cz: .25 * sx, corner: .27 },
      { y: .49 * sy, width: .52 * sx * boots, depth: .63 * sx * boots, cx: legX * sx, cz: .10 * sx, corner: .29 },
    ]);
    putShape(model, 'LEG_' + side, 'FOOT_' + side, 'LEG_' + side + '_LOWER', geometry, recipe.outfit.shoes, 'body', p([legX, .38, .06]));
  }
  return model;
}

export function applyPlumberOutfit(model, recipe) {
  if (recipe.outfit.style !== 'overalls') return model;
  const sy = recipe.body.height / 3.2, sx = recipe.body.width / 2, waist = recipe.body.waist ?? 1;
  const torso = anchorOf(model, 'TORSO');
  const p = (x, y, z) => [x * sx, torso[1] + (y - 1.6) * sy, z * sx];
  const front = (x, y) => .61 * sx * Math.sqrt(Math.max(.1, 1 - (x / (.91 * sx * waist)) ** 2 - ((y - p(0, 2.05, 0)[1]) / (.70 * sy)) ** 2)) + .025 * sx;
  const panel = (name, coords, color, back = false) => {
    const corners = coords.map(([x, y]) => p(x * waist, y, 0));
    const vertices = [], faces = [], n = 6;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = i / n, v = j / n;
      const x = (1-v)*((1-u)*corners[0][0]+u*corners[1][0])+v*((1-u)*corners[3][0]+u*corners[2][0]);
      const y = (1-v)*((1-u)*corners[0][1]+u*corners[1][1])+v*((1-u)*corners[3][1]+u*corners[2][1]);
      vertices.push([x, y, front(x, y) * (back ? -1 : 1)]);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j*(n+1)+i, b=a+1, c=a+n+2, d=a+n+1; faces.push([a,b,c],[a,c,d]); }
    const area = corners.reduce((sum, p, i) => { const q = corners[(i + 1) % corners.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    if ((area < 0) !== back) faces.forEach(face => face.reverse());
    putShape(model, 'TORSO', 'OUTFIT_' + name, 'TORSO', {vertices,faces}, color, 'outfit');
  };
  panel('BIB', [[-.56, 1.49], [.56, 1.49], [.45, 2.30], [-.45, 2.30]], recipe.outfit.pants);
  panel('BIB_BACK', [[-.56, 1.49], [.56, 1.49], [.45, 2.32], [-.45, 2.32]], recipe.outfit.pants, true);
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    panel('STRAP_' + side, [[sign * .27, 2.15], [sign * .47, 2.15], [sign * .61, 2.58], [sign * .40, 2.62]], recipe.outfit.pants);
    panel('STRAP_BACK_' + side, [[sign * .27, 2.15], [sign * .47, 2.15], [sign * .61, 2.58], [sign * .40, 2.62]], recipe.outfit.pants, true);
    const center = p(sign * .365 * waist, 2.28, 0);
    putShape(model, 'TORSO', 'OUTFIT_BUTTON_' + side, 'TORSO', ovalPanel(center[0], center[1], .112 * sx, .112 * sy, (x, y) => front(x, y) + .025 * sx), '#f0c63f', 'outfit');
    const hand = anchorOf(model, 'HAND_' + side), arms = recipe.body.arms ?? 1;
    putShape(model, 'ARM_' + side, 'OUTFIT_CUFF_' + side, 'ARM_' + side + '_LOWER', ellipsoid([hand[0], hand[1] + .025 * sy, hand[2]], [.285 * sx * arms, .105 * sy, .29 * sx * arms], 10, 4), '#f7f0df', 'outfit');
    putShape(model, side === 'R' ? 'WEAPON_MAIN' : 'WEAPON_SECONDARY', 'OUTFIT_THUMB_' + side, 'HAND_' + side, ellipsoid([hand[0] - sign * .25 * sx * arms, hand[1] - .19 * sy, hand[2] + .20 * sx], [.14 * sx * arms, .18 * sy, .16 * sx * arms], 8, 4), '#f1eddd', 'outfit');
    for (let i = 0; i < 3; i++) {
      const x = hand[0] + sign * (-.12 + i * .10) * sx * arms;
      putShape(model, side === 'R' ? 'WEAPON_MAIN' : 'WEAPON_SECONDARY', 'OUTFIT_GLOVE_LINE_' + side + i, 'HAND_' + side,
        facePanel([[x - .009, hand[1] - .24 * sy], [x + .009, hand[1] - .24 * sy], [x + .009, hand[1] - .09 * sy], [x - .009, hand[1] - .09 * sy]], () => hand[2] + .338 * sx * arms), '#b0a99c', 'outfit');
    }
  }
  return model;
}
