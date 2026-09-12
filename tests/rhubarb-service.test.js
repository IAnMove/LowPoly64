import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectPcmWav, readRequestBody, validateLocalRhubarbRequest, createRhubarbRequestHandler, RHUBARB_LIMITS, resolveRhubarbInstallation, runRhubarbOnWav } from '../server/speech/rhubarb-service.js';

function wav({ seconds = 0.1, sampleRate = 8000, channels = 1, bits = 16 } = {}) {
  const bytesPerSample = bits / 8;
  const dataBytes = Math.max(1, Math.floor(seconds * sampleRate * channels * bytesPerSample));
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); buffer.writeUInt16LE(channels * bytesPerSample, 32); buffer.writeUInt16LE(bits, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(dataBytes, 40); return buffer;
}

test('accepts valid PCM WAV and rejects malformed headers, alignment, and unsupported formats', () => {
  const info = inspectPcmWav(wav({ seconds: 1 }));
  assert.equal(info.duration, 1);
  const bad = wav({}); bad.write('NOPE', 0);
  assert.throws(() => inspectPcmWav(bad), error => ['INVALID_WAV', 'UNSUPPORTED_WAV'].includes(error.code) && error.status === 415);
  const misaligned = wav({}); misaligned.writeUInt32LE(1, 32);
  assert.throws(() => inspectPcmWav(misaligned), error => ['INVALID_WAV', 'UNSUPPORTED_WAV'].includes(error.code));
  const compressed = wav({}); compressed.writeUInt16LE(3, 20);
  assert.throws(() => inspectPcmWav(compressed), error => error.code === 'UNSUPPORTED_WAV');
});

test('enforces configurable duration, byte, and streaming body limits', async () => {
  assert.throws(() => inspectPcmWav(wav({ seconds: 2 }), { ...RHUBARB_LIMITS, maxDuration: 1 }), error => error.code === 'WAV_TOO_LONG');
  const request = new EventEmitter(); request.headers = {}; request[Symbol.asyncIterator] = async function* () { yield Buffer.alloc(3); yield Buffer.alloc(3); };
  await assert.rejects(readRequestBody(request, 5), error => error.code === 'WAV_TOO_LARGE');
});

test('allows only loopback host, socket, and origin combinations', () => {
  assert.deepEqual(validateLocalRhubarbRequest({ headers: { host: 'localhost:5173', origin: 'http://127.0.0.1:5173' }, socket: { remoteAddress: '::1' } }), { ok: true });
  assert.equal(validateLocalRhubarbRequest({ headers: { host: 'example.test' }, socket: { remoteAddress: '127.0.0.1' } }).code, 'LOCAL_ONLY');
  assert.equal(validateLocalRhubarbRequest({ headers: { host: 'localhost', origin: 'https://evil.test' }, socket: { remoteAddress: '127.0.0.1' } }).code, 'LOCAL_ORIGIN_ONLY');
});

function response() { const out = new EventEmitter(); out.writableEnded = false; out.destroyed = false; out.writeHead = (status, headers) => { out.status = status; out.headers = headers; }; out.end = body => { out.body = JSON.parse(body); out.writableEnded = true; }; return out; }
function request(url, method = 'GET') { const req = new EventEmitter(); req.url = url; req.method = method; req.headers = { host: 'localhost:5173' }; req.socket = { remoteAddress: '127.0.0.1' }; req[Symbol.asyncIterator] = async function* () {}; return req; }

test('local handler returns status metadata and rejects wrong method/content type', async () => {
  const handler = createRhubarbRequestHandler({ resolveInstallation: async () => ({ installed: false }) });
  const statusResponse = response(); await handler(request('/api/speech/rhubarb/status'), statusResponse); assert.equal(statusResponse.status, 200); assert.equal(typeof statusResponse.body.installed, 'boolean'); assert.equal(statusResponse.body.version, '1.14.0');
  const methodResponse = response(); await handler(request('/api/speech/rhubarb', 'GET'), methodResponse); assert.equal(methodResponse.status, 405);
  const post = request('/api/speech/rhubarb', 'POST'); post.headers['content-type'] = 'text/plain'; const typeResponse = response(); await handler(post, typeResponse); assert.equal(typeResponse.status, 415);
});


async function rhubarbTempRoots() {
  return new Set((await fs.readdir(os.tmpdir(), { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('retrovisor-rhubarb-'))
    .map(entry => entry.name));
}

test('aborts and times out real analyses with stable codes and cleans temporary directories', async t => {
  const installation = await resolveRhubarbInstallation();
  if (!installation.installed) return t.skip('Rhubarb 1.14.0 no está instalado en este entorno');
  const phrase = await fs.readFile(path.resolve('public/speech-demo/phrase.wav'));
  const before = await rhubarbTempRoots();
  const expectCode = async (promise, code) => {
    await assert.rejects(promise, error => error.code === code);
    const after = await rhubarbTempRoots();
    assert.deepEqual([...after].filter(name => !before.has(name)), []);
  };

  const alreadyAborted = new AbortController();
  alreadyAborted.abort();
  await expectCode(runRhubarbOnWav(phrase, { signal: alreadyAborted.signal }), 'RHUBARB_ABORTED');

  const duringAnalysis = new AbortController();
  const abortTimer = setTimeout(() => duringAnalysis.abort(), 25);
  try {
    await expectCode(runRhubarbOnWav(phrase, { signal: duringAnalysis.signal, timeoutMs: 90_000 }), 'RHUBARB_ABORTED');
  } finally {
    clearTimeout(abortTimer);
  }

  await expectCode(runRhubarbOnWav(phrase, { timeoutMs: 1 }), 'RHUBARB_TIMEOUT');
});
test('installed binary and demo WAV are available for real integration coverage', async t => {
  const install = await resolveRhubarbInstallation();
  if (!install.installed) return t.skip('Rhubarb 1.14.0 no está instalado en este entorno');
  const phrase = await fs.readFile(path.resolve('public/speech-demo/phrase.wav'));
  const info = inspectPcmWav(phrase); assert.ok(info.duration > 8 && info.duration < 10);
  const analyzed = await runRhubarbOnWav(phrase);
  assert.equal(analyzed.engine.version, '1.14.0');
  assert.ok(Array.isArray(analyzed.result.mouthCues) || Array.isArray(analyzed.result.cues));
});
