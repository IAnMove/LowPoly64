import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSilhouetteGrid } from '../src/modules/png-model/png-model-analysis.js';
import { createDepthMap } from '../src/modules/png-model/png-model-depth-map.js';
import { generateInflatedPngGeometry } from '../src/modules/png-model/png-model-geometry.js';
import {
  PNG_MODEL_DEFAULT_SETTINGS,
  normalizePngModelSettings,
} from '../src/modules/png-model/png-model-metadata.js';

function rgba(width, height, alphaAt) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      data[index] = 180;
      data[index + 1] = 90;
      data[index + 2] = 30;
      data[index + 3] = alphaAt(x, y);
    }
  }
  return data;
}

const V2_GRID = Object.freeze({
  algorithmVersion: 2,
  alphaThreshold: 16,
  coverageThreshold: 0.15,
  componentMode: 'all',
  minComponentCells: 1,
});

const V2_GEOMETRY = Object.freeze({
  algorithmVersion: 2,
  density: 40,
  targetSize: 4,
  thickness: 2,
  depthProfile: 'organic',
  bulge: 1,
  smoothing: 3,
  manualStrength: 2,
  edgeDepth: 0.03,
  edgeFalloff: 0.18,
});

test('v2 samples alpha-weighted coverage without exceeding real crop dimensions', () => {
  const data = rgba(48, 32, (x, y) => (
    (x >= 4 && x < 44 && y >= 8 && y < 24)
      || (x === 2 && y === 16)
  ) ? 255 : 0);
  const grid = buildSilhouetteGrid(data, 48, 32, {
    ...V2_GRID,
    density: 12,
    coverageThreshold: 0.1,
  });

  assert.ok(grid.columns <= grid.bounds.width);
  assert.ok(grid.rows <= grid.bounds.height);
  assert.equal(grid.sampledCoverage.length, grid.columns * grid.rows);
  assert.ok(Array.from(grid.sampledCoverage).some((coverage) => coverage > 0 && coverage < 1));
});

test('v2 applies largest/all component cleanup with a minimum cell size', () => {
  const data = rgba(20, 10, (x, y) => (
    (x >= 1 && x <= 5 && y >= 2 && y <= 6)
      || (x === 18 && y === 8)
  ) ? 255 : 0);
  const common = {
    ...V2_GRID,
    density: 20,
  };
  const largest = buildSilhouetteGrid(data, 20, 10, {
    ...common,
    componentMode: 'largest',
  });
  const everyComponent = buildSilhouetteGrid(data, 20, 10, {
    ...common,
    componentMode: 'all',
    minComponentCells: 1,
  });
  const cleaned = buildSilhouetteGrid(data, 20, 10, {
    ...common,
    componentMode: 'all',
    minComponentCells: 2,
  });

  assert.equal(largest.componentCount, 1);
  assert.equal(largest.opaqueCells, 25);
  assert.equal(everyComponent.componentCount, 2);
  assert.equal(everyComponent.opaqueCells, 26);
  assert.equal(cleaned.componentCount, 1);
  assert.equal(cleaned.removedCells, 1);
});

test('v2 keeps a one-pixel crop within a constant geometry budget', () => {
  const data = rgba(128, 96, (x, y) => (x === 91 && y === 37 ? 255 : 0));
  const grid = buildSilhouetteGrid(data, 128, 96, {
    ...V2_GRID,
    density: 72,
    componentMode: 'largest',
    minComponentCells: 8,
  });
  const geometry = generateInflatedPngGeometry(grid, V2_GEOMETRY, createDepthMap(8));

  assert.deepEqual(grid.bounds, { x: 91, y: 37, width: 1, height: 1, opaquePixels: 1 });
  assert.equal(grid.columns, 1);
  assert.equal(grid.rows, 1);
  assert.equal(geometry.analysis.surfaceCells, 1);
  assert.equal(geometry.analysis.triangleCount, 12);
  assert.ok(geometry.analysis.vertexCount <= 16);
});

test('v2 locks boundary depth through smoothing and clamps manual inflation to max depth', () => {
  const data = rgba(48, 40, (x, y) => (
    ((x - 23.5) / 19) ** 2 + ((y - 19.5) / 15) ** 2 <= 1
  ) ? 255 : 0);
  const grid = buildSilhouetteGrid(data, 48, 40, {
    ...V2_GRID,
    density: 40,
    componentMode: 'largest',
  });
  const depthMap = createDepthMap(32);
  depthMap.values.fill(1);
  const geometry = generateInflatedPngGeometry(grid, V2_GEOMETRY, depthMap);
  const deflateMap = createDepthMap(32);
  deflateMap.values.fill(-1);
  const deflated = generateInflatedPngGeometry(grid, V2_GEOMETRY, deflateMap);
  const expectedBoundaryDepth = V2_GEOMETRY.thickness * V2_GEOMETRY.edgeDepth;

  assert.ok(geometry.analysis.maximumDepth <= V2_GEOMETRY.thickness);
  assert.equal(geometry.analysis.maximumDepth, V2_GEOMETRY.thickness);
  assert.ok(Math.abs(geometry.analysis.boundaryDepthMedian - expectedBoundaryDepth) < 1e-12);
  assert.ok(Math.abs(geometry.analysis.boundaryDepthP95 - expectedBoundaryDepth) < 1e-12);
  assert.equal(geometry.analysis.medianBoundaryDepth, geometry.analysis.boundaryDepthMedian);
  assert.equal(geometry.analysis.p95BoundaryDepth, geometry.analysis.boundaryDepthP95);
  assert.equal(geometry.analysis.maximumBoundaryDepth, geometry.analysis.boundaryDepthP95);
  assert.ok(geometry.analysis.boundaryDepthP95 < geometry.analysis.maximumDepth * 0.05);
  assert.ok(deflated.analysis.maximumDepth >= expectedBoundaryDepth);
  assert.ok(Math.abs(deflated.analysis.maximumDepth - expectedBoundaryDepth) < 1e-12);
});

test('v2 projects partial-alpha boundary vertices and reduces silhouette coverage error', () => {
  const data = rgba(52, 44, (x, y) => {
    const signedDistance = 17.25 - Math.hypot(x - 25.5, y - 21.5);
    if (signedDistance >= 0.75) return 255;
    if (signedDistance <= -0.75) return 0;
    return Math.round(((signedDistance + 0.75) / 1.5) * 255);
  });
  const grid = buildSilhouetteGrid(data, 52, 44, {
    ...V2_GRID,
    density: 14,
    coverageThreshold: 0.08,
    componentMode: 'largest',
  });
  const geometry = generateInflatedPngGeometry(grid, {
    ...V2_GEOMETRY,
    density: 14,
    smoothing: 0,
  }, createDepthMap(8));

  assert.ok(geometry.analysis.boundaryProjectionMean > 0);
  assert.ok(geometry.analysis.boundaryProjectionMax <= Math.SQRT2 * 0.4);
  assert.ok(
    geometry.analysis.silhouetteCoverageErrorAfter
      < geometry.analysis.silhouetteCoverageErrorBefore,
  );
});

test('v2 reuses boundary vertices for continuous side walls', () => {
  const data = rgba(18, 14, (x, y) => (
    x >= 2 && x <= 15 && y >= 2 && y <= 11
  ) ? 255 : 0);
  const grid = buildSilhouetteGrid(data, 18, 14, {
    ...V2_GRID,
    density: 18,
    componentMode: 'largest',
  });
  const geometry = generateInflatedPngGeometry(grid, {
    ...V2_GEOMETRY,
    smoothing: 0,
  }, createDepthMap(8));
  const incidence = new Uint16Array(geometry.sides.vertices.length);
  geometry.sides.faces.forEach((face) => {
    face.forEach((index) => {
      assert.ok(index >= 0 && index < geometry.sides.vertices.length);
      incidence[index] += 1;
    });
  });

  assert.equal(geometry.sides.faces.length, geometry.analysis.boundaryEdges * 2);
  assert.equal(geometry.sides.vertices.length, geometry.analysis.boundaryVertexCount * 2);
  assert.ok(geometry.sides.vertices.length < geometry.analysis.boundaryEdges * 4);
  assert.ok(Array.from(incidence).every((uses) => uses >= 2));
  const surfacePositions = new Set(
    geometry.surface.vertices.map((vertex) => vertex.map((value) => value.toPrecision(15)).join(',')),
  );
  assert.ok(geometry.sides.vertices.every((vertex) => (
    surfacePositions.has(vertex.map((value) => value.toPrecision(15)).join(','))
  )));
  assert.ok(geometry.analysis.sideVertexSavings > 0);
  assert.equal(geometry.analysis.componentCount, 1);
});

test('direct v2 APIs share coverage and edge contracts with normalized settings', () => {
  const data = rgba(24, 20, (x, y) => (
    x >= 3 && x <= 20 && y >= 3 && y <= 16
  ) ? 255 : 0);
  const grid = buildSilhouetteGrid(data, 24, 20, {
    algorithmVersion: 2,
    density: 20,
  });
  assert.equal(grid.coverageThreshold, PNG_MODEL_DEFAULT_SETTINGS.coverageThreshold);

  const raw = {
    ...V2_GEOMETRY,
    edgeDepth: 0,
    edgeFalloff: 0,
    smoothing: 0,
  };
  const normalized = normalizePngModelSettings(raw);
  assert.equal(normalized.edgeDepth, 0);
  assert.equal(normalized.edgeFalloff, 0.02);
  const direct = generateInflatedPngGeometry(grid, raw, createDepthMap(8));
  const normalizedGeometry = generateInflatedPngGeometry(grid, normalized, createDepthMap(8));
  assert.equal(direct.analysis.maximumBoundaryDepth, 0);
  assert.equal(direct.analysis.averageHalfDepth, normalizedGeometry.analysis.averageHalfDepth);

  const directUpper = generateInflatedPngGeometry(grid, {
    ...raw,
    edgeFalloff: 99,
  }, createDepthMap(8));
  const normalizedUpper = generateInflatedPngGeometry(grid, normalizePngModelSettings({
    ...raw,
    edgeFalloff: 99,
  }), createDepthMap(8));
  assert.equal(directUpper.analysis.averageHalfDepth, normalizedUpper.analysis.averageHalfDepth);
});

test('v2 keeps a 1024x683 density-56 fish-like source within the interaction budget', () => {
  const width = 1024;
  const height = 683;
  const data = rgba(width, height, (x, y) => {
    const body = ((x - 585) / 330) ** 2 + ((y - 341) / 205) ** 2 <= 1;
    const tailWidth = Math.max(0, 180 - Math.abs(y - 341) * 0.72);
    const tail = x >= 65 && x <= 255 && x <= 65 + tailWidth;
    const fin = y <= 341 && y >= 105 && x >= 430 && x <= 650
      && y >= 105 + Math.abs(x - 540) * 0.55;
    return body || tail || fin ? 255 : 0;
  });
  const settings = {
    ...V2_GRID,
    density: 56,
    coverageThreshold: 0.2,
    componentMode: 'largest',
  };
  const analysisStart = performance.now();
  const grid = buildSilhouetteGrid(data, width, height, settings);
  const analysisMs = performance.now() - analysisStart;
  const geometryStart = performance.now();
  const geometry = generateInflatedPngGeometry(grid, {
    ...V2_GEOMETRY,
    density: 56,
    smoothing: 2,
  }, createDepthMap());
  const geometryMs = performance.now() - geometryStart;

  assert.equal(grid.columns, 56);
  assert.ok(grid.rows > 20 && grid.rows < 56);
  assert.ok(geometry.analysis.triangleCount < 15000);
  // Deliberately generous for slower CI: this catches accidental per-cell
  // rescans of the full image or unbounded grid growth, not minor jitter.
  assert.ok(analysisMs < 750, `analysis took ${analysisMs.toFixed(1)}ms`);
  assert.ok(geometryMs < 250, `geometry took ${geometryMs.toFixed(1)}ms`);
});
