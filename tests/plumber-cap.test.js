import test from 'node:test';
import assert from 'node:assert/strict';
import { createCharacterDesignModel } from '../src/modules/character-studio/character-design.js';
import { MARIO64_RECIPE } from '../src/modules/character-studio/plumber-presets.js';

test('cap crown, band and curved visor are closed outward solids without degenerate faces', () => {
  const pieces = createCharacterDesignModel(MARIO64_RECIPE).slots.flatMap(slot => slot.pieces);
  for (const name of ['HAIR_CAP', 'HAIR_CAP_BAND', 'HAIR_CAP_BRIM']) {
    const { vertices, faces } = pieces.find(piece => piece.name === name).params;
    const edges = new Map(); let volume = 0;
    for (const face of faces) {
      const [a, b, c] = face.map(i => vertices[i]);
      const u = b.map((value, i) => value - a[i]), v = c.map((value, i) => value - a[i]);
      const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      assert.ok(Math.hypot(...cross) > 1e-10, `${name}: degenerate triangle`);
      volume += a.reduce((sum, value, i) => sum + value * cross[i], 0) / 6;
      for (let i = 0; i < 3; i++) {
        const from = face[i], to = face[(i + 1) % 3], key = [Math.min(from, to), Math.max(from, to)].join(':');
        const edge = edges.get(key) || { count: 0, direction: 0 };
        edge.count++; edge.direction += from < to ? 1 : -1; edges.set(key, edge);
      }
    }
    for (const edge of edges.values()) assert.deepEqual(edge, { count: 2, direction: 0 }, `${name}: open or flipped seam`);
    assert.ok(volume > 0, `${name}: inward surface`);
  }
});

test('cap decorations face forward and the cloth leaves room for the eyebrows', () => {
  const pieces = createCharacterDesignModel(MARIO64_RECIPE).slots.flatMap(slot => slot.pieces);
  const crown = pieces.find(piece => piece.name === 'HAIR_CAP');
  const lowestCloth = Math.min(...crown.params.vertices.map(v => v[1]));
  const highestBrow = Math.max(...pieces.filter(piece => piece.name.startsWith('BROW_')).flatMap(piece => piece.params.vertices.map(v => v[1])));
  assert.ok(lowestCloth > highestBrow);
  for (const piece of pieces.filter(piece => /^HAIR_CAP_(BADGE|M_)/.test(piece.name))) {
    for (const face of piece.params.faces) {
      const [a, b, c] = face.map(i => piece.params.vertices[i]);
      const facing = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      assert.ok(facing > 0, `${piece.name}: back-facing decoration`);
    }
  }
});
