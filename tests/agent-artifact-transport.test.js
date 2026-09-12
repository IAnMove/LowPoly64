import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { ApprovalManager } from '../server/agent/approval-manager.js';
import { runAssistantTurn } from '../server/agent/assistant-runner.js';
import { mcpResult } from '../server/agent/mcp-server.js';
import {
  compactArtifactResult,
  getSerializedByteLength,
  makeSuccessResult,
} from '../src/modules/agent/tool-validation.js';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function makePng() {
  const width = 64;
  const height = 64;
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let row = 0; row < height; row += 1) {
    scanlines[row * (1 + width * 4)] = 0;
    for (let column = 0; column < width; column += 1) {
      const offset = row * (1 + width * 4) + 1 + column * 4;
      scanlines[offset] = (row * 3) % 256;
      scanlines[offset + 1] = (column * 5) % 256;
      scanlines[offset + 2] = 180;
      scanlines[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', (() => {
      const header = Buffer.alloc(13);
      header.writeUInt32BE(width, 0);
      header.writeUInt32BE(height, 4);
      header[8] = 8;
      header[9] = 6;
      return header;
    })()),
    pngChunk('tEXt', Buffer.concat([Buffer.from('fixture\0', 'ascii'), Buffer.alloc(2_300, 65)])),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('capture PNG is lossless in artifacts while data stays a compact observation', () => {
  const png = makePng();
  assert.ok(png.length > 2_000);
  const encoded = png.toString('base64');
  const result = makeSuccessResult('capture_viewport', {
    mimeType: 'image/png',
    width: 64,
    height: 64,
    data: encoded,
  }, { maxBytes: 100_000 });
  assert.equal(result.ok, true);
  assert.equal(result.data.data, '[artifact:capture-viewport]');
  assert.equal(result.artifacts.length, 1);
  assert.deepEqual(Buffer.from(result.artifacts[0].data, 'base64'), png);
  assert.equal(result.artifacts[0].byteLength, png.length);
  assert.equal(result.artifactSummary[0].byteLength, png.length);
});

test('deep JSON export survives artifact roundtrip without array truncation', () => {
  const definition = {
    version: 2,
    objects: Array.from({ length: 150 }, (_, index) => ({
      id: `rv_${String(index).padStart(8, '0')}`,
      points: Array.from({ length: 4 }, (_, point) => [index, point, index + point]),
    })),
  };
  const result = makeSuccessResult('export_character_asset', {
    format: 'json',
    mimeType: 'application/json',
    filename: 'character.json',
    definition,
  }, { maxBytes: 200_000 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.artifacts[0].data, definition);
  assert.deepEqual(JSON.parse(JSON.stringify(result.artifacts[0].data)), definition);
  assert.deepEqual(result.data.definition, { artifactId: 'export-definition', full: true });
  assert.equal(result.artifacts[0].byteLength, Buffer.byteLength(JSON.stringify(definition), 'utf8'));
});

test('oversized lossless artifacts fail explicitly instead of returning a false success', () => {
  const result = makeSuccessResult('export_character_asset', {
    format: 'glb',
    mimeType: 'model/gltf-binary',
    filename: 'character.glb',
    data: Buffer.alloc(256, 7).toString('base64'),
  }, { maxBytes: 128 });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'ARTIFACT_TOO_LARGE');
  assert.equal(result.artifacts, undefined);
  assert.ok(result.artifactSummary[0].byteLength >= 256);

  const generic = makeSuccessResult('serialize_scene', {
    payload: 'x'.repeat(10_000),
  }, { maxBytes: 128, summary: { objectCount: 2 } });
  assert.equal(generic.ok, false);
  assert.equal(generic.error.code, 'RESULT_TOO_LARGE');
  assert.equal(generic.data.truncated, true);
  assert.equal(generic.data.summary.objectCount, 2);
});

test('MCP returns complete GLB resource and compact structured metadata', () => {
  const glb = Buffer.from([0x67, 0x6c, 0x54, 0x46, 1, 2, 3, 4]);
  const result = makeSuccessResult('export_character_asset', {
    format: 'glb',
    mimeType: 'model/gltf-binary',
    filename: 'character.glb',
    data: glb.toString('base64'),
  }, { maxBytes: 10_000 });
  const response = mcpResult(result);
  const resource = response.content.find((item) => item.type === 'resource');
  assert.deepEqual(resource.resource.blob, glb.toString('base64'));
  assert.equal(response.structuredContent.artifacts, undefined);
  assert.equal(response.structuredContent.artifactSummary[0].filename, 'character.glb');
  assert.ok(getSerializedByteLength(response.structuredContent) < 10_000);
});

test('runner attaches every rendered PNG while keeping base64 out of provider text', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'not-a-real-key';
  const pngA = makePng();
  const pngB = Buffer.concat([pngA, Buffer.from([9, 8, 7])]);
  const views = [
    { view: 'front', mimeType: 'image/png', width: 64, height: 64, data: pngA.toString('base64') },
    { view: 'profile', mimeType: 'image/png', width: 64, height: 64, data: pngB.toString('base64') },
  ];
  const requests = [];
  let sequence = 0;
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    sequence += 1;
    if (sequence === 1) {
      return jsonResponse({
        output: [{
          type: 'function_call',
          call_id: 'render-1',
          name: 'render_character_views',
          arguments: JSON.stringify({ id: 'rv_12345678', size: 512 }),
        }],
      });
    }
    return jsonResponse({
      output: [{ type: 'message', content: [{ type: 'output_text', text: 'Vistas revisadas.' }] }],
    });
  };
  const events = [];
  try {
    for await (const event of runAssistantTurn({
      provider: 'openai',
      model: 'test-model',
      messages: [{ role: 'user', content: 'Renderiza las vistas.' }],
      approvals: new ApprovalManager(),
      callCommand: async () => makeSuccessResult('render_character_views', { views }, { maxBytes: 100_000 }),
    })) {
      events.push(event);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
  const secondInput = requests[1].input;
  const imageMessage = secondInput.find((item) => (
    item.role === 'user'
    && Array.isArray(item.content)
    && item.content.filter((content) => content.type === 'input_image').length === 2
  ));
  assert.ok(imageMessage);
  const imageUrls = imageMessage.content
    .filter((content) => content.type === 'input_image')
    .map((content) => content.image_url);
  assert.ok(imageUrls.includes(`data:image/png;base64,${pngA.toString('base64')}`));
  assert.ok(imageUrls.includes(`data:image/png;base64,${pngB.toString('base64')}`));
  const functionOutput = secondInput.find((item) => item.type === 'function_call_output').output;
  assert.equal(functionOutput.includes(pngA.toString('base64')), false);
  assert.equal(functionOutput.includes(pngB.toString('base64')), false);
  const completed = events.find((event) => event.type === 'tool_completed');
  assert.equal(completed.artifacts.length, 2);
  assert.equal(completed.artifacts[0].view, 'front');
});
