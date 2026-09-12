import { loftSurface } from './low-poly-surfaces.js';

function addPiece(model, name, geometry, material, pivot, size, parent = 'HEAD') {
  const piece = { template: 'CUSTOM', name, parent, pivot: [...pivot], offset: [...pivot], size,
    material, semanticPart: 'head', params: { vertices: geometry.vertices.map(v => v.map((value, axis) => value - pivot[axis])), faces: geometry.faces } };
  model.slots.find(slot => slot.slotId === 'HEAD').pieces.push(piece);
  return piece;
}

export function applyHeroicHead(model, recipe) {
  const slot = model.slots.find(slot => slot.slotId === 'HEAD');
  const previous = slot.pieces.find(piece => piece.name === 'HEAD');
  const anchor = [...(previous.pivot || previous.offset)];
  const w = 1.40 * recipe.head.scale, h = 1.48 * recipe.head.scale, d = 1.14 * recipe.head.scale;
  const jaw = recipe.head.jaw ?? 1;
  const rows = [
    [0, .34 * jaw, .43, .045], [.13, .67 * jaw, .73, .025], [.38, .91, .91, 0], [.63, 1, 1, -.015], [.84, .92, .96, -.035], [1, .65, .67, -.025],
  ];
  slot.pieces = slot.pieces.filter(piece => /^HAIR_/.test(piece.name) || !/^(HEAD$|EYE|PUPIL|BROW|NOSE|MOUTH|EAR|FACE_)/.test(piece.name));
  const geometry = loftSurface(rows.map(([t, width, depth, cz]) => ({ y: anchor[1] + t * h, width: w * width, depth: d * depth, cz: anchor[2] + cz * d, cx: anchor[0], corner: .18 })));
  addPiece(model, 'HEAD', geometry, recipe.skin, anchor, [w, h, d], 'NECK');

  const front = t => {
    let a = rows[0], b = rows.at(-1);
    for (let i = 1; i < rows.length; i++) if (t <= rows[i][0]) { a = rows[i - 1]; b = rows[i]; break; }
    const u = Math.max(0, Math.min(1, (t - a[0]) / Math.max(.001, b[0] - a[0])));
    return anchor[2] + d * ((a[2] * .5 + a[3]) * (1 - u) + (b[2] * .5 + b[3]) * u);
  };
  const panel = (name, coords, material, lift = .014) => {
    const vertices = coords.map(([x, y]) => [anchor[0] + x * w, anchor[1] + y * h, front(y) + lift * d]);
    const area = coords.reduce((sum, p, i) => { const q = coords[(i + 1) % coords.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    const faces = []; for (let i = 1; i < vertices.length - 1; i++) faces.push(area > 0 ? [0, i, i + 1] : [0, i + 1, i]);
    return addPiece(model, name, { vertices, faces }, material, anchor, [w, h, .01]);
  };
  for (const side of ['L', 'R']) {
    const sign = side === 'L' ? -1 : 1;
    const eye = [[.082, .572], [.168, .618], [.320, .60], [.290, .494], [.129, .495]];
    const center = [.205, .55];
    panel(`EYE_${side}_OUTLINE`, eye.map(([x, y]) => [sign * (center[0] + (x - center[0]) * 1.10), center[1] + (y - center[1]) * 1.14]), '#39302c', .012);
    panel(`EYE_${side}_WHITE`, eye.map(([x, y]) => [sign * x, y]), '#e9e4cb', .018);
    panel(`PUPIL_${side}_IRIS`, [[.181, .510], [.230, .505], [.250, .536], [.245, .590], [.199, .601], [.179, .570]].map(([x, y]) => [sign * x, y]), '#579bab', .022);
    panel(`PUPIL_${side}_CORE`, [[.207, .511], [.230, .518], [.232, .584], [.208, .588]].map(([x, y]) => [sign * x, y]), '#203954', .026);
    panel(`PUPIL_${side}_LIGHT`, [[.189, .576], [.206, .576], [.208, .598], [.190, .598]].map(([x, y]) => [sign * x, y]), '#fff4d5', .030);
    panel(`BROW_${side}`, [[.070, .651], [.091, .679], [.303, .742], [.340, .707], [.178, .672]].map(([x, y]) => [sign * x, y]), '#8b602d', .018);
    const earX = anchor[0] + sign * w * .51;
    const earY = anchor[1] + h * .47;
    const ear = loftSurface([
      { y: earY - h * .105, width: w * .10, depth: d * .13, cx: earX, cz: anchor[2] + d * .025, corner: .22 },
      { y: earY + h * .015, width: w * .15, depth: d * .24, cx: earX, cz: anchor[2] + d * .04, corner: .22 },
      { y: earY + h * .115, width: w * .10, depth: d * .20, cx: earX - sign * w * .016, cz: anchor[2] + d * .01, corner: .22 },
    ]);
    addPiece(model, `EAR_${side}`, ear, recipe.skin, anchor, [w * .15, h * .22, d * .24]);
  }
  const nose = [
    [anchor[0], anchor[1] + h * .585, front(.585) + .008 * d],
    [anchor[0] - w * .05, anchor[1] + h * .379, front(.379) + .012 * d],
    [anchor[0] + w * .05, anchor[1] + h * .379, front(.379) + .012 * d],
    [anchor[0], anchor[1] + h * .403, front(.403) + .095 * d],
  ];
  addPiece(model, 'NOSE', { vertices: nose, faces: [[0, 1, 3], [0, 3, 2], [1, 2, 3], [0, 2, 1]] }, recipe.skin, anchor, [w * .1, h * .20, d * .1]);
  panel('MOUTH', [[-.085, .248], [.071, .253], [.083, .269], [.072, .273], [-.085, .262]], '#815347', .012);
  panel('FACE_LIP', [[-.058, .232], [.055, .235], [.073, .245], [-.066, .244]], '#c58a70', .011);
  model.heroicHead = { anchor, width: w, height: h, depth: d };
  return model;
}
