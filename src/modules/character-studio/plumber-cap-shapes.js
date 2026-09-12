import { anchorOf, putShape } from './plumber-shape-utils.js';

const CROWN_RINGS = [
  { y: 1.50, rx: .925, rz: .675, z: -.075 },
  { y: 1.60, rx: 1.005, rz: .77, z: -.045 },
  { y: 1.76, rx: 1.06, rz: .815, z: -.04 },
  { y: 1.95, rx: .98, rz: .795, z: -.06 },
  { y: 2.11, rx: .76, rz: .645, z: -.025 },
  { y: 2.22, rx: .40, rz: .39, z: 0 },
];

function crownGeometry() {
  const sides = 24, vertices = [], faces = [];
  for (const ring of CROWN_RINGS) for (let i = 0; i < sides; i++) {
    const a = i * Math.PI * 2 / sides;
    vertices.push([ring.rx * Math.cos(a), ring.y, ring.z + ring.rz * Math.sin(a)]);
  }
  const bottom = vertices.length; vertices.push([0, 1.50, -.075]);
  const top = vertices.length; vertices.push([0, 2.265, .025]);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    faces.push([bottom, i, next]);
    for (let j = 0; j < CROWN_RINGS.length - 1; j++) {
      const a = j * sides + i, b = j * sides + next;
      faces.push([a, a + sides, b + sides], [a, b + sides, b]);
    }
    const last = (CROWN_RINGS.length - 1) * sides;
    faces.push([top, last + next, last + i]);
  }
  return { vertices, faces };
}

function bandGeometry() {
  const vertices = [], faces = [], sides = 24, tube = 6;
  for (let i = 0; i < sides; i++) for (let j = 0; j < tube; j++) {
    const a = i * Math.PI * 2 / sides, b = j * Math.PI * 2 / tube;
    vertices.push([(.926 + .018 * Math.cos(b)) * Math.cos(a), 1.501 + .024 * Math.sin(b), -.075 + (.676 + .018 * Math.cos(b)) * Math.sin(a)]);
  }
  for (let i = 0; i < sides; i++) for (let j = 0; j < tube; j++) {
    const a = i * tube + j, b = ((i + 1) % sides) * tube + j;
    const c = ((i + 1) % sides) * tube + (j + 1) % tube, d = i * tube + (j + 1) % tube;
    faces.push([a, d, c], [a, c, b]);
  }
  return { vertices, faces };
}

function brimGeometry() {
  const vertices = [], faces = [], widthSteps = 20, depthSteps = 5, columns = widthSteps + 1;
  for (const bottom of [false, true]) for (let j = 0; j <= depthSteps; j++) for (let i = 0; i <= widthSteps; i++) {
    const u = (i / widthSteps * 2 - 1) * .985, v = j / depthSteps, x = .93 * u;
    // The back edge follows the forehead band; the front edge is a curved crescent.
    const back = -.075 + .675 * Math.sqrt(1 - (x / .925) ** 2);
    const depth = .10 + 1.20 * Math.sqrt(1 - u * u) - back;
    const y = 1.55 - .065 * u * u - .065 * v + .027 * Math.sin(Math.PI * v);
    vertices.push([x, y - (bottom ? .045 : 0), back + depth * v]);
  }
  const layer = columns * (depthSteps + 1);
  for (let j = 0; j < depthSteps; j++) for (let i = 0; i < widthSteps; i++) {
    const a = j * columns + i, b = a + 1, c = a + columns + 1, d = a + columns;
    faces.push([a, c, b], [a, d, c], [a + layer, b + layer, c + layer], [a + layer, c + layer, d + layer]);
  }
  const boundary = [];
  for (let i = 0; i <= widthSteps; i++) boundary.push(i);
  for (let j = 1; j <= depthSteps; j++) boundary.push(j * columns + widthSteps);
  for (let i = widthSteps - 1; i >= 0; i--) boundary.push(depthSteps * columns + i);
  for (let j = depthSteps - 1; j > 0; j--) boundary.push(j * columns);
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    faces.push([a, b, b + layer], [a, b + layer, a + layer]);
  }
  return { vertices, faces };
}

// Project decoration onto the actual flat-shaded triangles, including the puffed overhang.
function frontOf(geometry, x, y) {
  let front = -Infinity;
  for (const indices of geometry.faces) {
    const [a, b, c] = indices.map(i => geometry.vertices[i]);
    const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(denominator) < 1e-10) continue;
    const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / denominator;
    const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / denominator;
    if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7) front = Math.max(front, u * a[2] + v * b[2] + (1 - u - v) * c[2]);
  }
  if (!Number.isFinite(front)) throw new Error('Cap decoration lies outside the crown');
  return front;
}

function badgeGeometry(front) {
  const center = [0, 1.846], vertices = [[...center, front(...center)]], faces = [], sides = 24, rings = 4;
  for (let j = 1; j <= rings; j++) for (let i = 0; i < sides; i++) {
    const a = i * 2 * Math.PI / sides, x = .27 * j / rings * Math.cos(a), y = center[1] + .248 * j / rings * Math.sin(a);
    vertices.push([x, y, front(x, y)]);
  }
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides; faces.push([0, 1 + i, 1 + next]);
    for (let j = 0; j < rings - 1; j++) {
      const a = 1 + j * sides + i, b = 1 + j * sides + next;
      faces.push([a, a + sides, b + sides], [a, b + sides, b]);
    }
  }
  return { vertices, faces };
}

function curvedStroke(a, b, width, front) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / length * width / 2, ny = (b[0] - a[0]) / length * width / 2;
  const vertices = [], faces = [], steps = 12;
  for (let i = 0; i <= steps; i++) for (const sign of [-1, 1]) {
    const x = a[0] + (b[0] - a[0]) * i / steps + sign * nx;
    const y = a[1] + (b[1] - a[1]) * i / steps + sign * ny;
    vertices.push([x, y, front(x, y)]);
  }
  for (let i = 0; i < steps; i++) { const k = i * 2; faces.push([k, k + 2, k + 3], [k, k + 3, k + 1]); }
  return { vertices, faces };
}

function shade(hex, factor) {
  return '#' + hex.slice(1).match(/../g).map(channel => Math.round(parseInt(channel, 16) * factor).toString(16).padStart(2, '0')).join('');
}

export function applyPlumberCap(model, recipe) {
  const slot = model.slots.find(s => s.slotId === 'HEAD');
  slot.pieces = slot.pieces.filter(p => !/^HAIR_/.test(p.name));
  const anchor = anchorOf(model, 'HEAD'), scale = recipe.head.scale;
  const add = (name, geometry, color = recipe.hair.color) => {
    const world = { ...geometry, vertices: geometry.vertices.map(vertex => vertex.map((n, i) => anchor[i] + n * scale)) };
    return putShape(model, 'HEAD', 'HAIR_' + name, 'HEAD', world, color, 'hair', anchor);
  };
  const crown = crownGeometry(), brim = brimGeometry();
  add('CAP', crown);
  add('CAP_BAND', bandGeometry(), shade(recipe.hair.color, .80));
  add('CAP_BRIM', brim);
  const badgeFront = (x, y) => frontOf(crown, x, y) + .020;
  add('CAP_BADGE', badgeGeometry(badgeFront), '#fff8ed');
  const m = [[-.135, 1.725], [-.09, 1.985], [0, 1.855], [.09, 1.985], [.135, 1.725]];
  for (let i = 0; i < m.length - 1; i++) add('CAP_M_' + i, curvedStroke(m[i], m[i + 1], .064, (x, y) => badgeFront(x, y) + .017));
  return model;
}
