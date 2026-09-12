export const allPieces = model => model.slots.flatMap(slot => slot.pieces || []);
export function anchorOf(model, name) { const piece = allPieces(model).find(p => p.name === name); return [...(piece.pivot || piece.offset)]; }

export function putShape(model, slotId, name, parent, geometry, material, part = 'body', anchor) {
  const pivot = anchor || (parent ? anchorOf(model, parent) : [0, 0, 0]);
  const vertices = geometry.vertices.map(v => v.map((n, i) => n - pivot[i]));
  const slot = model.slots.find(s => s.slotId === slotId);
  const piece = { template: 'CUSTOM', name, parent, pivot: [...pivot], offset: [...pivot], material, semanticPart: part,
    size: [0, 1, 2].map(i => Math.max(...vertices.map(v => v[i])) - Math.min(...vertices.map(v => v[i]))), params: { vertices, faces: geometry.faces } };
  slot.pieces = slot.pieces.filter(p => p.name !== name); slot.pieces.push(piece); return piece;
}

export function ellipsoid(center, radius, sides = 12, rings = 6) {
  const vertices = [[center[0], center[1] - radius[1], center[2]]], faces = [];
  for (let j = 1; j < rings; j++) {
    const lat = -Math.PI / 2 + j * Math.PI / rings;
    for (let i = 0; i < sides; i++) { const a = i * Math.PI * 2 / sides; vertices.push([center[0] + radius[0] * Math.cos(lat) * Math.cos(a), center[1] + radius[1] * Math.sin(lat), center[2] + radius[2] * Math.cos(lat) * Math.sin(a)]); }
  }
  const top = vertices.length; vertices.push([center[0], center[1] + radius[1], center[2]]);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides; faces.push([0, 1 + i, 1 + next]);
    for (let j = 0; j < rings - 2; j++) { const a = 1 + j * sides + i, b = 1 + j * sides + next; faces.push([a, b, b + sides], [a, b + sides, a + sides]); }
    faces.push([top, 1 + (rings - 2) * sides + next, 1 + (rings - 2) * sides + i]);
  }
  // Keep winding outward regardless of the latitude parameterization.
  for (const face of faces) {
    const [a, b, c] = face.map(i => vertices[i]);
    const u = b.map((n, i) => n - a[i]), v = c.map((n, i) => n - a[i]);
    const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (normal.reduce((n, x, i) => n + x * (a[i] - center[i]), 0) < 0) [face[1], face[2]] = [face[2], face[1]];
  }
  return { vertices, faces };
}

export function facePanel(points, front) {
  const vertices = points.map(([x, y]) => [x, y, front(x, y)]);
  const area = points.reduce((n, p, i) => { const q = points[(i + 1) % points.length]; return n + p[0] * q[1] - q[0] * p[1]; }, 0);
  const center = points.reduce((sum, p) => [sum[0] + p[0] / points.length, sum[1] + p[1] / points.length], [0, 0]);
  const ci = vertices.length; vertices.push([center[0], center[1], front(...center)]);
  const faces = []; for (let i = 0; i < points.length; i++) { const j = (i+1) % points.length; faces.push(area > 0 ? [ci, i, j] : [ci, j, i]); }
  return { vertices, faces };
}

export function ovalPanel(x, y, rx, ry, front, sides = 16) {
  const points = Array.from({ length: sides }, (_, i) => { const a = i * Math.PI * 2 / sides; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
  return facePanel(points, front);
}

export function stripe(a, b, width, front) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const dx = -(b[1] - a[1]) / length * width / 2, dy = (b[0] - a[0]) / length * width / 2;
  return facePanel([[a[0] - dx, a[1] - dy], [b[0] - dx, b[1] - dy], [b[0] + dx, b[1] + dy], [a[0] + dx, a[1] + dy]], front);
}
