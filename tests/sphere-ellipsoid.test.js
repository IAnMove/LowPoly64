import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.localStorage ||= { getItem: () => null, setItem() {} };
const { createSphereGeometry } = await import('../src/modules/viewport/custom-geometries.js');
const { characterModelToPieces, piecesToCharacterModel } = await import('../src/modules/viewport/character-model.js');

function extent(geometry) {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  return [max.x - min.x, max.y - min.y, max.z - min.z].map((value) => Math.round(value * 1000) / 1000);
}

test('round spheres keep the classic parameters', () => {
  const geometry = createSphereGeometry({ radius: 0.5, widthSegments: 6, heightSegments: 4 });
  assert.equal(geometry.parameters.radius, 0.5);
  assert.equal(geometry.parameters.radiusY, undefined);
  assert.equal(geometry.parameters.radiusZ, undefined);
});

test('per-axis radii bake an ellipsoid into the geometry', () => {
  const geometry = createSphereGeometry({ radius: 0.55, radiusY: 0.5, radiusZ: 0.62, widthSegments: 16, heightSegments: 12 });
  const [x, y, z] = extent(geometry);
  assert.ok(Math.abs(x - 1.1) < 0.02, `x extent ${x}`);
  assert.ok(Math.abs(y - 1.0) < 0.02, `y extent ${y}`);
  assert.ok(Math.abs(z - 1.24) < 0.03, `z extent ${z}`);
  assert.equal(geometry.parameters.radiusY, 0.5);
  assert.equal(geometry.parameters.radiusZ, 0.62);
});

test('invalid radii fall back to a unit sphere instead of NaN geometry', () => {
  const geometry = createSphereGeometry({ radius: -2, radiusY: Number.NaN });
  assert.deepEqual(extent(geometry), [2, 2, 2]);
});

test('CharacterModel SPHERE sizes survive the pieces roundtrip as ellipsoids', () => {
  const model = {
    name: 'EGG',
    archetype: 'PROP',
    slots: [{
      slotId: 'BODY',
      pieces: [
        { template: 'SPHERE', name: 'SHELL', size: [1.1, 1, 1.24], offset: [0, 1, 0], material: '#f8fafc' },
        { template: 'SPHERE', name: 'YOLK', size: [0.4, 0.4, 0.4], offset: [0, 1, 0], material: '#facc15' },
      ],
    }],
  };
  const { pieces } = characterModelToPieces(model);
  const shell = pieces.find((piece) => piece.name === 'SHELL');
  const yolk = pieces.find((piece) => piece.name === 'YOLK');
  assert.equal(shell.geometry.params.radius, 0.55);
  assert.equal(shell.geometry.params.radiusY, 0.5);
  assert.equal(shell.geometry.params.radiusZ, 0.62);
  assert.deepEqual(Object.keys(yolk.geometry.params).sort(), ['radius']);

  const back = piecesToCharacterModel(pieces, { archetype: 'PROP', slotMap: { BODY: ['SHELL', 'YOLK'] } });
  const backShell = back.slots[0].pieces.find((piece) => piece.name === 'SHELL');
  assert.deepEqual(backShell.size, [1.1, 1, 1.24]);
});
