import assert from 'node:assert/strict';
import test from 'node:test';

import { loftSurface, taperedTuft } from '../src/modules/character-studio/low-poly-surfaces.js';

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function centroid(vertices) {
  return vertices.reduce((sum, vertex) => [
    sum[0] + vertex[0],
    sum[1] + vertex[1],
    sum[2] + vertex[2],
  ], [0, 0, 0]).map((value) => value / vertices.length);
}

function assertFiniteGeometry(geometry) {
  assert.ok(Array.isArray(geometry.vertices) && geometry.vertices.length > 0);
  assert.ok(Array.isArray(geometry.faces) && geometry.faces.length > 0);
  geometry.vertices.forEach((vertex) => {
    assert.equal(vertex.length, 3);
    vertex.forEach((value) => assert.ok(Number.isFinite(value)));
  });
  geometry.faces.forEach((face) => {
    assert.equal(face.length, 3);
    face.forEach((index) => assert.ok(Number.isInteger(index) && index >= 0 && index < geometry.vertices.length));
  });
}

function assertOutward(geometry) {
  const center = centroid(geometry.vertices);
  geometry.faces.forEach((face) => {
    const [a, b, c] = face.map((index) => geometry.vertices[index]);
    const normal = cross(subtract(b, a), subtract(c, a));
    const faceCenter = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    assert.ok(dot(normal, subtract(faceCenter, center)) > 1e-9, 'face winding must point outward');
  });
}

function edgeCounts(geometry) {
  const counts = new Map();
  geometry.faces.forEach((face) => {
    for (let index = 0; index < face.length; index += 1) {
      const a = face[index];
      const b = face[(index + 1) % face.length];
      const key = a < b ? String(a) + ':' + String(b) : String(b) + ':' + String(a);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  return counts;
}

test('loftSurface builds a finite outward closed manifold from cut-corner rings', () => {
  const geometry = loftSurface([
    { y: 0, width: 1.5, depth: 1.1, cx: 0, cz: 0, corner: 0.2 },
    { y: 0.7, width: 1.35, depth: 1.0, cx: 0.06, cz: -0.02, corner: 0.24 },
    { y: 1.5, width: 0.88, depth: 0.72, cx: 0.03, cz: 0.01, corner: 0.18 },
  ]);
  assertFiniteGeometry(geometry);
  assert.equal(geometry.vertices.length, 26);
  assert.equal(geometry.faces.length, 48);
  assertOutward(geometry);
  assert.ok([...edgeCounts(geometry).values()].every((count) => count === 2), 'closed loft edges must have two incident faces');
});

test('loftSurface honors open caps while retaining its octagonal sections', () => {
  const geometry = loftSurface([
    { y: -0.5, width: 1, depth: 0.8 },
    { y: 0.5, width: 0.8, depth: 0.62 },
  ], { capBottom: false, capTop: false });
  assertFiniteGeometry(geometry);
  assert.equal(geometry.vertices.length, 16);
  assert.equal(geometry.faces.length, 16);
  assert.ok([...edgeCounts(geometry).values()].some((count) => count === 1));
});

test('taperedTuft keeps a thick intermediate section and a 3D tip', () => {
  const tip = [0.42, 1.2, 0.28];
  const geometry = taperedTuft({
    base: [0, 0, 0],
    bend: [0.18, 0.38, 0.12],
    tip,
    width: 0.45,
    depth: 0.32,
  });
  assertFiniteGeometry(geometry);
  assert.equal(geometry.vertices.length, 18);
  assert.equal(geometry.faces.length, 32);
  assert.deepEqual(geometry.vertices.at(-1), tip);
  assertOutward(geometry);
  assert.ok([...edgeCounts(geometry).values()].every((count) => count === 2), 'tuft edges must remain manifold');
});