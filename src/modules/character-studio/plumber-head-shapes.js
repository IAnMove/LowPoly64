import { anchorOf, putShape, ellipsoid, facePanel, ovalPanel } from './plumber-shape-utils.js';

export function applyPlumberHead(model, recipe) {
  const slot = model.slots.find(s => s.slotId === 'HEAD');
  const anchor = anchorOf(model, 'HEAD'), scale = recipe.head.scale;
  slot.pieces = slot.pieces.filter(p => /^HAIR_/.test(p.name) || !/^(HEAD$|EYE|PUPIL|BROW|NOSE|MOUTH|EAR|FACE_)/.test(p.name));
  const world = ([x, y, z]) => [anchor[0] + x * scale, anchor[1] + y * scale, anchor[2] + z * scale];
  const add = (name, geometry, color) => putShape(model, 'HEAD', name, 'HEAD', geometry, color, 'head', anchor);
  const ball = (name, center, radius, color, sides = 12, rings = 6) => add(name, ellipsoid(world(center), radius.map(n => n * scale), sides, rings), color);
  const head = putShape(model, 'HEAD', 'HEAD', 'NECK', ellipsoid(world([0, .79, -.055]), [.96 * scale, .79 * scale, .72 * scale], 16, 10), recipe.skin, 'head', anchor);
  head.size = [1.92 * scale, 1.58 * scale, 1.44 * scale];
  const front = (x, y) => anchor[2] - .055 * scale + .72 * scale * Math.sqrt(Math.max(.02, 1 - ((x - anchor[0]) / (.96 * scale)) ** 2 - ((y - anchor[1] - .79 * scale) / (.79 * scale)) ** 2));
  const oval = (name, center, radius, color, lift = .025) => {
    const [x, y] = world([center[0], center[1], 0]);
    add(name, ovalPanel(x, y, radius[0] * scale, radius[1] * scale, (xx, yy) => front(xx, yy) + lift * scale, 16), color);
  };
  // Puffy cheeks support the moustache and keep the lower face round.
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    ball('FACE_CHEEK_' + side, [sign * .43, .43, .42], [.36, .29, .23], recipe.skin);
    ball('EAR_' + side, [sign * .965, .79, -.06], [.205, .275, .205], recipe.skin, 10, 6);
    ball('FACE_EAR_INNER_' + side, [sign * 1.02, .81, .07], [.10, .17, .055], '#cf956f', 8, 5);
    const x = sign * .305;
    oval('EYE_' + side + '_OUTLINE', [x, 1.135], [.183, .252], '#57362a', .022);
    oval('EYE_' + side + '_WHITE', [x, 1.135], [.174, .245], '#fffbed', .032);
    oval('PUPIL_' + side + '_IRIS', [x - sign * .012, 1.12], [.093, .175], '#268dcc', .044);
    oval('PUPIL_' + side + '_CORE', [x - sign * .016, 1.115], [.052, .133], '#142334', .055);
    oval('PUPIL_' + side + '_LIGHT', [x - .037, 1.205], [.025, .039], '#ffffff', .065);
    const brow = [[.125, 1.365], [.19, 1.44], [.305, 1.47], [.415, 1.425], [.485, 1.34], [.448, 1.31], [.372, 1.365], [.285, 1.397], [.205, 1.377], [.145, 1.32]];
    add('BROW_' + side, facePanel(brow.map(([xx, y]) => { const v = world([sign * xx, y, 0]); return v.slice(0, 2); }), (xx, yy) => front(xx, yy) + .035 * scale), '#34221f');
    // Curved temple hair wraps toward the ear and ends in a tapered point.
    const outline = [[.72, 1.38], [.88, 1.30], [.925, 1.06], [.86, .80], [.78, .73], [.735, .85]];
    add('FACE_SIDEBURN_' + side, facePanel(outline.map(([xx, y]) => world([sign * xx, y, 0]).slice(0, 2)), (xx, yy) => front(xx, yy) + .028 * scale), '#573023');
  }
  ball('NOSE', [0, .81, .845], [.385, .32, .38], recipe.skin, 14, 8);
  // One coherent scalloped silhouette, with its ends rising toward the cheeks.
  const whisker = [[0, .58], [.18, .675], [.35, .71], [.53, .75], [.63, .69], [.65, .60], [.61, .53], [.55, .50], [.50, .445], [.42, .425], [.34, .45], [.285, .395], [.20, .385], [.13, .42], [.06, .405], [0, .44]];
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    add('FACE_MOUSTACHE_' + (side === 'L' ? '0' : '1'), facePanel(whisker.map(([x, y]) => world([sign * x, y, 0]).slice(0, 2)), (xx, yy) => {
      const x = (xx - anchor[0]) / scale;
      return anchor[2] + (.762 - .24 * x * x) * scale;
    }), '#2a1c19');
  }
  // A slim resting smile. The speech laboratory replaces only this piece.
  const smile = [];
  for (let i = 0; i <= 8; i++) { const x = -.265 + i * .53 / 8; smile.push([x, .275 + .35 * x * x]); }
  for (let i = 8; i >= 0; i--) { const x = -.265 + i * .53 / 8; smile.push([x, .252 + .35 * x * x]); }
  add('MOUTH', facePanel(smile.map(([x, y]) => world([x, y, 0]).slice(0, 2)), () => anchor[2] + .642 * scale), '#763e32');
  model.speechAnchor = { parent: 'HEAD', position: [0, .32 * scale, .55 * scale], rotation: [.65, 0, 0], width: .70 * scale, height: .45 * scale, depth: .16 * scale };
  // Chestnut hair follows the back of the skull, below the cap.
  const hair = ellipsoid(world([0, .99, -.12]), [.967 * scale, .54 * scale, .755 * scale], 16, 8);
  hair.faces = hair.faces.filter(face => face.every(i => hair.vertices[i][2] < anchor[2] - .11 * scale));
  add('FACE_HAIR_BACK', hair, '#573023');
  return model;
}

export { applyPlumberCap } from './plumber-cap-shapes.js';
