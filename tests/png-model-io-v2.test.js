import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PNG_MODEL_ALGORITHM_VERSION,
  PNG_MODEL_DEFAULT_SETTINGS,
  PNG_MODEL_VERSION,
  clonePngModelAnalysis,
  inspectPngModelImageHeader,
  normalizePngModelRecipe,
  normalizePngModelSettings,
  validatePngModelSource,
} from '../src/modules/png-model/png-model-metadata.js';
import { prevalidatePngModelFile } from '../src/modules/png-model/png-model-source.js';

function pngHeader(width, height) {
  const bytes = new Uint8Array(32);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function webpExtendedHeader(width, height) {
  const bytes = new Uint8Array(32);
  bytes.set(Buffer.from('RIFF'), 0);
  bytes.set(Buffer.from('WEBP'), 8);
  bytes.set(Buffer.from('VP8X'), 12);
  const write24 = (offset, value) => {
    bytes[offset] = value & 0xff;
    bytes[offset + 1] = (value >> 8) & 0xff;
    bytes[offset + 2] = (value >> 16) & 0xff;
  };
  write24(24, width - 1);
  write24(27, height - 1);
  return bytes;
}

function dataURL(mime, bytes) {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

test('PNG model v2 normalizes only whitelisted settings and declares robust defaults', () => {
  const input = { depthProfile: 'organic', edgeDepth: 99, sideStyle: 'solid' };
  Object.defineProperty(input, 'unknownRecursivePayload', {
    enumerable: true,
    get() {
      throw new Error('unknown fields must not be traversed');
    },
  });
  const normalized = normalizePngModelSettings(input);
  assert.equal(normalized.algorithmVersion, PNG_MODEL_ALGORITHM_VERSION);
  assert.equal(normalized.edgeDepth, 0.25);
  assert.equal(normalized.sideStyle, 'solid');
  assert.equal('unknownRecursivePayload' in normalized, false);
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.edgeDepth, 0.03);
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.edgeFalloff, 0.18);
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.coverageThreshold, 0.2);
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.componentMode, 'largest');
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.minComponentCells, 2);
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.sideStyle, 'sampled');
  assert.equal(PNG_MODEL_DEFAULT_SETTINGS.keepDepthRatio, true);
});

test('legacy recipes migrate explicitly to balanced while v2 preserves its profile', () => {
  const legacy = normalizePngModelRecipe({
    version: 1,
    algorithmVersion: 1,
    source: { version: 1 },
    settings: { depthProfile: 'organic' },
  });
  assert.equal(legacy.version, PNG_MODEL_VERSION);
  assert.equal(legacy.algorithmVersion, PNG_MODEL_ALGORITHM_VERSION);
  assert.equal(legacy.settings.depthProfile, 'balanced');
  assert.deepEqual(legacy.migrations, ['legacy-balanced-v2']);

  const current = normalizePngModelRecipe({
    version: PNG_MODEL_VERSION,
    algorithmVersion: PNG_MODEL_ALGORITHM_VERSION,
    settings: { algorithmVersion: PNG_MODEL_ALGORITHM_VERSION, depthProfile: 'organic' },
  });
  assert.equal(current.settings.depthProfile, 'organic');
  assert.deepEqual(current.migrations, []);
});

test('analysis roundtrip preserves every geometry-v2 metric', () => {
  const emitted = {
    algorithmVersion: 2,
    width: 4,
    height: 2,
    columns: 40,
    rows: 20,
    opaqueCells: 500,
    componentCount: 1,
    originalComponentCount: 3,
    removedCells: 7,
    keptComponentCells: 500,
    discardedComponentCells: 7,
    coverageThreshold: 0.2,
    surfaceCells: 500,
    boundaryEdges: 88,
    boundaryVertexCount: 84,
    boundaryDepthMedian: 0.03,
    boundaryDepthP95: 0.04,
    medianBoundaryDepth: 0.03,
    p95BoundaryDepth: 0.04,
    averageBoundaryDepth: 0.031,
    maximumBoundaryDepth: 0.05,
    boundaryProjectionMean: 0.02,
    boundaryProjectionMax: 0.1,
    silhouetteCoverageErrorBefore: 0.3,
    silhouetteCoverageErrorAfter: 0.1,
    boundaryMedian: 0.03,
    boundaryP95: 0.04,
    sideVertexSavings: 176,
    vertexCount: 2100,
    triangleCount: 4000,
    maximumHalfDepth: 0.5,
    maximumDepth: 1,
    averageHalfDepth: 0.2,
    depthToHeightRatio: 0.5,
    sourceWidth: 1024,
    sourceHeight: 512,
    alphaThreshold: 16,
    bounds: { x: 2, y: 3, width: 1000, height: 500, opaquePixels: 123456 },
  };
  assert.deepEqual(clonePngModelAnalysis(emitted), emitted);
});

test('PNG and WebP headers expose real dimensions and reject oversized pixel bombs', () => {
  assert.deepEqual(inspectPngModelImageHeader(pngHeader(640, 480)), {
    ok: true,
    mime: 'image/png',
    width: 640,
    height: 480,
  });
  assert.deepEqual(inspectPngModelImageHeader(webpExtendedHeader(321, 123)), {
    ok: true,
    mime: 'image/webp',
    width: 321,
    height: 123,
  });
  const oversized = inspectPngModelImageHeader(pngHeader(8192, 8192));
  assert.equal(oversized.ok, false);
  assert.match(oversized.error, /too many pixels/i);
});

test('embedded sources trust the magic header rather than forged MIME or metadata', () => {
  const bytes = pngHeader(320, 200);
  const valid = validatePngModelSource({
    dataURL: dataURL('image/png', bytes),
    mime: 'image/webp',
    width: 1,
    height: 1,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.source.mime, 'image/png');
  assert.equal(valid.source.width, 320);
  assert.equal(valid.source.height, 200);

  const mismatch = validatePngModelSource({
    dataURL: dataURL('image/webp', bytes),
    width: 320,
    height: 200,
  });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.error, /MIME type/i);
});

test('file prevalidation accepts an empty declared MIME when magic is valid', async () => {
  const bytes = pngHeader(128, 96);
  const file = {
    type: '',
    size: bytes.byteLength,
    slice: () => ({
      arrayBuffer: async () => bytes.buffer.slice(0),
    }),
  };
  const inspected = await prevalidatePngModelFile(file);
  assert.equal(inspected.mime, 'image/png');
  assert.equal(inspected.width, 128);
  assert.equal(inspected.height, 96);
});
