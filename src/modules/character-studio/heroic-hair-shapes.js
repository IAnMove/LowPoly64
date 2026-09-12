import { loftSurface, taperedTuft } from './low-poly-surfaces.js';

function tint(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  return '#' + [16, 8, 0].map(shift => Math.round(Math.min(255, ((n >> shift) & 255) * factor)).toString(16).padStart(2, '0')).join('');
}

export function applyHeroicHair(model, recipe) {
  const slot = model.slots.find(slot => slot.slotId === 'HEAD');
  const head = slot.pieces.find(piece => piece.name === 'HEAD');
  const anchor = [...(head.pivot || head.offset)];
  const w = 1.4 * recipe.head.scale, h = 1.48 * recipe.head.scale, d = 1.14 * recipe.head.scale;
  const world = ([x, y, z]) => [anchor[0] + x * w, anchor[1] + y * h, anchor[2] + z * d];
  slot.pieces = slot.pieces.filter(piece => !/^HAIR_/.test(piece.name));
  const add = (name, geometry, shade = 1) => {
    const vertices = geometry.vertices.map(v => v.map((value, axis) => value - anchor[axis]));
    const size = [0, 1, 2].map(axis => Math.max(...vertices.map(v => v[axis])) - Math.min(...vertices.map(v => v[axis])));
    slot.pieces.push({ template: 'CUSTOM', name, parent: 'HEAD', pivot: [...anchor], offset: [...anchor], size,
      material: tint(recipe.hair.color, shade), semanticPart: 'hair', params: { vertices, faces: geometry.faces } });
  };
  const cap = loftSurface([
    { y: anchor[1] + h * .74, width: w * 1.02, depth: d * 1.02, cx: anchor[0], cz: anchor[2] - d * .035, corner: .18 },
    { y: anchor[1] + h * .85, width: w * 1.07, depth: d * 1.06, cx: anchor[0], cz: anchor[2] - d * .025, corner: .19 },
    { y: anchor[1] + h * 1.01, width: w * .90, depth: d * .88, cx: anchor[0] - w * .025, cz: anchor[2] - d * .04, corner: .2 },
    { y: anchor[1] + h * 1.115, width: w * .33, depth: d * .35, cx: anchor[0] - w * .04, cz: anchor[2] - d * .06, corner: .22 },
  ]);
  for (const vertex of cap.vertices.slice(0, 8)) vertex[1] = anchor[1] + h * (.74 + .15 * (vertex[2] - anchor[2]) / d);
  add('HAIR_CAP', cap, .93);
  const tufts = [
    ['ASCENT_LEFT', [-.21, .98, -.14], [-.68, 1.69, -.25], [-.35, 1.34, -.15], .65, .50, 1.07],
    ['CROWN_HIGH', [.05, 1.02, -.12], [.07, 1.67, -.28], [.03, 1.30, -.10], .54, .45, 1.13],
    ['CROWN_RIGHT', [.28, .99, -.04], [.68, 1.38, -.04], [.37, 1.21, -.02], .45, .40, 1.03],
    ['CROWN_REAR', [.01, .97, -.37], [.19, 1.35, -.91], [.08, 1.14, -.58], .60, .44, .90],
    ['SIDE_LEFT', [-.40, .91, -.06], [-.91, 1.14, -.25], [-.59, 1.01, -.09], .43, .40, 1.02],
    ['NAPE_LEFT', [-.36, .73, -.35], [-.70, .66, -.78], [-.49, .74, -.57], .37, .38, .81],
    ['NAPE_RIGHT', [.40, .78, -.21], [.67, .70, -.69], [.53, .78, -.43], .42, .38, .85],
    ['FRINGE_LEFT', [-.16, 1.04, .27], [-.30, .61, .52], [-.28, .83, .49], .38, .22, 1.10],
    ['FRINGE_CENTER', [.13, 1.10, .28], [.02, .69, .56], [.10, .88, .52], .46, .25, 1.14],
    ['FRINGE_RIGHT', [.37, .98, .21], [.47, .54, .20], [.50, .76, .30], .26, .25, 1.00],
  ];
  for (const [name, base, tip, bend, width, depth, shade] of tufts) add('HAIR_' + name, taperedTuft({ base: world(base), tip: world(tip), bend: world(bend), width: width * w, depth: depth * d }), shade);
  return model;
}
