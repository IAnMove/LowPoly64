import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PNG_MODEL_DEFAULT_SETTINGS,
  normalizePngModelSettings,
  clonePngModelDepthMap,
} from '../src/modules/png-model/png-model-metadata.js';
import {
  findAlphaBounds,
  buildSilhouetteGrid,
} from '../src/modules/png-model/png-model-analysis.js';
import {
  createDepthMap,
  paintDepthMap,
  sampleDepthMap,
  serializeDepthMap,
  deserializeDepthMap,
} from '../src/modules/png-model/png-model-depth-map.js';
import { generateInflatedPngGeometry } from '../src/modules/png-model/png-model-geometry.js';

function rgba(width, height, predicate) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = 240;
      data[index + 1] = 100;
      data[index + 2] = 30;
      data[index + 3] = predicate(x, y) ? 255 : 0;
    }
  }
  return data;
}

test('normalizes PNG model settings and bounded metadata', () => {
  const normalized = normalizePngModelSettings({ density: 999, thickness: -4, alphaThreshold: 0, sideColor: 'red' });
  assert.equal(normalized.density, 72);
  assert.equal(normalized.thickness, 0.02);
  assert.equal(normalized.alphaThreshold, 1);
  assert.equal(normalized.sideColor, PNG_MODEL_DEFAULT_SETTINGS.sideColor);
  const map = clonePngModelDepthMap({ size: 8, values: [999, -999] });
  assert.equal(map.values[0], 100);
  assert.equal(map.values[1], -100);
  assert.equal(map.values.length, 64);
});

test('detects alpha bounds and rejects a fully transparent source', () => {
  const data = rgba(8, 6, (x, y) => x >= 2 && x <= 6 && y >= 1 && y <= 4);
  assert.deepEqual(findAlphaBounds(data, 8, 6, 16), { x: 2, y: 1, width: 5, height: 4, opaquePixels: 20 });
  assert.equal(findAlphaBounds(new Uint8ClampedArray(8 * 6 * 4), 8, 6, 16), null);
});

test('samples cell alpha by covered area so thin features survive', () => {
  const data = rgba(40, 20, (x, y) => (x >= 8 && x <= 31 && y >= 5 && y <= 14) || (x === 35 && y === 10));
  const grid = buildSilhouetteGrid(data, 40, 20, { density: 12, alphaThreshold: 16 });
  assert.ok(grid.opaqueCells > 0);
  assert.ok(grid.maxDistance > 0);
  assert.equal(grid.mask.length, grid.columns * grid.rows);
});

test('manual depth painting supports inflate, deflate and quantized roundtrip', () => {
  const map = createDepthMap(16);
  paintDepthMap(map, { tool: 'inflate', u: 0.5, v: 0.5, radius: 4, strength: 0.8 });
  const inflated = sampleDepthMap(map, 0.5, 0.5);
  assert.ok(inflated > 0.5);
  paintDepthMap(map, { tool: 'deflate', u: 0.5, v: 0.5, radius: 4, strength: 1 });
  assert.ok(sampleDepthMap(map, 0.5, 0.5) < inflated);
  const restored = deserializeDepthMap(serializeDepthMap(map));
  assert.ok(Math.abs(sampleDepthMap(restored, 0.5, 0.5) - sampleDepthMap(map, 0.5, 0.5)) <= 0.011);
});

test('generates finite front/back surfaces, UVs and two side triangles per boundary edge', () => {
  const data = rgba(20, 20, (x, y) => x >= 4 && x <= 15 && y >= 4 && y <= 15);
  const grid = buildSilhouetteGrid(data, 20, 20, { density: 12, alphaThreshold: 16 });
  const depthMap = createDepthMap(16);
  const geometry = generateInflatedPngGeometry(grid, { density: 12, smoothing: 0, thickness: 1 }, depthMap);
  assert.equal(geometry.surface.vertices.length, geometry.surface.uvs.length);
  assert.equal(geometry.sides.faces.length, geometry.analysis.boundaryEdges * 2);
  assert.equal(geometry.surface.faces.length, geometry.analysis.surfaceCells * 4);
  geometry.surface.vertices.flat().forEach((value) => assert.ok(Number.isFinite(value)));
  geometry.surface.uvs.flat().forEach((value) => assert.ok(value >= 0 && value <= 1));
  assert.ok(geometry.analysis.maximumHalfDepth > 0);
});

test('manual inflate changes generated local maximum depth', () => {
  const data = rgba(24, 24, (x, y) => Math.hypot(x - 11.5, y - 11.5) <= 9);
  const grid = buildSilhouetteGrid(data, 24, 24, { density: 16, alphaThreshold: 16 });
  const map = createDepthMap(32);
  const before = generateInflatedPngGeometry(grid, { density: 16, smoothing: 0, thickness: 1 }, map);
  paintDepthMap(map, { tool: 'inflate', u: 0.5, v: 0.5, radius: 8, strength: 1 });
  const after = generateInflatedPngGeometry(grid, { density: 16, smoothing: 0, thickness: 1 }, map);
  assert.ok(after.analysis.maximumHalfDepth > before.analysis.maximumHalfDepth);
});
