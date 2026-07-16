import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  RETRO_AO_DEFAULT_STRENGTH,
  RETRO_AO_MAX_STRENGTH,
  applyVertexColors,
  bakeRetroAO,
  normalizeRetroAO,
  validateRetroAO,
} from '../src/modules/viewport/vertex-colors.js';

function boxMesh() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: '#c08040' }),
  );
}

function colorAtExtremes(mesh) {
  const position = mesh.geometry.getAttribute('position');
  const color = mesh.geometry.getAttribute('color');
  let bottom = null;
  let top = null;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y < minY) { minY = y; bottom = color.getX(i); }
    if (y > maxY) { maxY = y; top = color.getX(i); }
  }
  return { bottom, top };
}

test('bakes a vertical darkening gradient into each mesh', () => {
  const group = new THREE.Group();
  const mesh = boxMesh();
  group.add(mesh);

  const baked = bakeRetroAO(group, { strength: 0.4 });
  const { bottom, top } = colorAtExtremes(mesh);

  assert.equal(baked, 1);
  assert.ok(mesh.geometry.getAttribute('color'));
  assert.ok(Math.abs(bottom - 0.6) < 1e-6);
  assert.ok(Math.abs(top - 1) < 1e-6);
  assert.equal(mesh.material.vertexColors, true);
});

test('multiplies existing vertex colors instead of replacing them', () => {
  const mesh = boxMesh();
  applyVertexColors(mesh.geometry, { top: '#ffffff', bottom: '#ffffff' });
  const group = new THREE.Group();
  group.add(mesh);

  bakeRetroAO(group, { strength: 0.5 });
  const { bottom, top } = colorAtExtremes(mesh);

  assert.ok(Math.abs(bottom - 0.5) < 1e-6);
  assert.ok(Math.abs(top - 1) < 1e-6);
});

test('skips meshes without vertical extent and zero strength', () => {
  const flat = new THREE.BufferGeometry();
  flat.setAttribute('position', new THREE.Float32BufferAttribute([
    -1, 0, -1, 1, 0, -1, 0, 0, 1,
  ], 3));
  const mesh = new THREE.Mesh(flat, new THREE.MeshStandardMaterial());
  const group = new THREE.Group();
  group.add(mesh);

  assert.equal(bakeRetroAO(group, { strength: 0.4 }), 0);
  assert.equal(mesh.geometry.getAttribute('color'), undefined);

  const solid = new THREE.Group();
  solid.add(boxMesh());
  assert.equal(bakeRetroAO(solid, { strength: 0 }), 0);
});

test('normalizes retroAO definitions', () => {
  assert.deepEqual(normalizeRetroAO(true), { strength: RETRO_AO_DEFAULT_STRENGTH });
  assert.deepEqual(normalizeRetroAO({ strength: 0.2 }), { strength: 0.2 });
  assert.deepEqual(normalizeRetroAO({ strength: 99 }), { strength: RETRO_AO_MAX_STRENGTH });
  assert.deepEqual(normalizeRetroAO({}), { strength: RETRO_AO_DEFAULT_STRENGTH });
  assert.equal(normalizeRetroAO(false), null);
  assert.equal(normalizeRetroAO(undefined), null);
});

test('validates retroAO definitions from JSON', () => {
  assert.equal(validateRetroAO(undefined), null);
  assert.equal(validateRetroAO(true), null);
  assert.equal(validateRetroAO(false), null);
  assert.equal(validateRetroAO({ strength: 0.3 }), null);
  assert.match(validateRetroAO('yes'), /retroAO must be/);
  assert.match(validateRetroAO({ strength: 2 }), /strength must be/);
  assert.match(validateRetroAO({ strength: -0.1 }), /strength must be/);
});
