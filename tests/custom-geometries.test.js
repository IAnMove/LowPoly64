import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCustomGeometry,
  normalizeGeometryDefinition,
  serializeGeometryDefinition,
} from '../src/modules/viewport/custom-geometries.js';

const VERTICES = [
  [-1, -1, 0],
  [1, -1, 0],
  [0, 1, 0.5],
];
const FACES = [[0, 1, 2]];
const UVS = [[0, 1], [1, 1], [0.5, 0]];

test('custom geometry preserves explicit UV coordinates', () => {
  const geometry = createCustomGeometry(VERTICES, FACES, UVS);
  const uv = geometry.getAttribute('uv');

  assert.equal(uv.count, VERTICES.length);
  assert.deepEqual(Array.from(uv.array), UVS.flat());
  assert.deepEqual(geometry.parameters.uvs, UVS);
});

test('custom geometry definitions normalize and serialize explicit UVs', () => {
  const normalized = normalizeGeometryDefinition({
    type: 'custom',
    vertices: VERTICES,
    faces: FACES,
    uvs: UVS,
  });

  assert.deepEqual(normalized.params.uvs, UVS);
  assert.deepEqual(serializeGeometryDefinition(normalized.type, normalized.params), {
    type: 'custom',
    vertices: VERTICES,
    faces: FACES,
    uvs: UVS,
  });
});

test('custom geometry still generates fallback UVs when none are supplied', () => {
  const geometry = createCustomGeometry(VERTICES, FACES);

  assert.equal(geometry.getAttribute('uv').count, VERTICES.length);
  assert.equal(Object.hasOwn(geometry.parameters, 'uvs'), false);
});
