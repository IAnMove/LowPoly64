import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RHUBARB_VERSION = '1.14.0';
export const RHUBARB_LIMITS = Object.freeze({
  maxBytes: 16 * 1024 * 1024,
  maxDuration: 90,
  timeoutMs: 90_000,
  maxConcurrent: 1,
});

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const INSTALL_ROOT = path.join(PROJECT_ROOT, 'tools', 'rhubarb-lip-sync', `v${RHUBARB_VERSION}`);

function serviceError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function platformInstallation() {
  if (process.platform === 'win32') return { directory: 'windows', executable: 'rhubarb.exe' };
  if (process.platform === 'darwin') return { directory: 'macos', executable: 'rhubarb' };
  if (process.platform === 'linux') return { directory: 'linux', executable: 'rhubarb' };
  throw serviceError('RHUBARB_UNSUPPORTED_PLATFORM', `Rhubarb no está disponible en ${process.platform}.`, 503);
}

export async function resolveRhubarbInstallation() {
  const platform = platformInstallation();
  const directory = path.join(INSTALL_ROOT, platform.directory);
  const manifestPath = path.join(INSTALL_ROOT, 'manifest.json');
  let manifest = null;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch { /* optional until installer runs */ }
  const relative = manifest?.executableRelative || path.relative(INSTALL_ROOT, path.join(directory, platform.executable));
  const executable = path.resolve(INSTALL_ROOT, relative);
  if (!executable.startsWith(`${path.resolve(INSTALL_ROOT)}${path.sep}`)) return { installed: false, executable, manifest };
  try { await fs.access(executable); } catch { return { installed: false, executable, manifest }; }
  return { installed: true, executable, manifest };
}

function bufferOf(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  throw serviceError('INVALID_WAV', 'El audio debe ser un buffer WAV PCM.', 415);
}

/** Validate the small PCM WAV subset accepted by the local endpoint. */
export function inspectPcmWav(value, limits = RHUBARB_LIMITS) {
  const buffer = bufferOf(value);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw serviceError('INVALID_WAV', 'El archivo debe ser un WAV PCM RIFF válido.', 415);
  }
  const declaredRiffLength = buffer.readUInt32LE(4);
  if (declaredRiffLength !== buffer.length - 8) {
    throw serviceError('INVALID_WAV', 'La longitud RIFF del WAV no coincide con sus datos.', 415);
  }
  let format = null;
  let formatCount = 0;
  let dataCount = 0;
  let dataBytes = 0;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length) throw serviceError('INVALID_WAV', 'El WAV declara un bloque fuera de sus límites.', 415);
    if (id === 'fmt ') {
      formatCount += 1;
      if (formatCount > 1) throw serviceError('INVALID_WAV', 'El WAV debe contener un único bloque fmt.', 415);
      if (size < 16) throw serviceError('INVALID_WAV', 'El bloque fmt del WAV está incompleto.', 415);
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        byteRate: buffer.readUInt32LE(start + 8),
        blockAlign: buffer.readUInt16LE(start + 12),
        bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    } else if (id === 'data') {
      dataCount += 1;
      if (dataCount > 1) throw serviceError('INVALID_WAV', 'El WAV debe contener un único bloque data.', 415);
      dataBytes = size;
    }
    offset = end + (size % 2);
  }
  if (offset !== buffer.length) throw serviceError('INVALID_WAV', 'El WAV contiene un bloque incompleto.', 415);
  if (!format || formatCount !== 1 || dataCount !== 1 || dataBytes <= 0) throw serviceError('INVALID_WAV', 'El WAV necesita bloques fmt y data únicos.', 415);
  if (format.audioFormat !== 1) throw serviceError('UNSUPPORTED_WAV', 'Solo se acepta PCM sin compresión.', 415);
  if (![1, 2].includes(format.channels) || format.sampleRate < 8000 || format.sampleRate > 96000 || ![8, 16, 24, 32].includes(format.bitsPerSample)) {
    throw serviceError('UNSUPPORTED_WAV', 'El WAV debe tener 1–2 canales, 8–96 kHz y 8/16/24/32 bits.', 415);
  }
  const bytesPerSample = format.bitsPerSample / 8;
  const expectedBlockAlign = format.channels * bytesPerSample;
  const expectedByteRate = format.sampleRate * expectedBlockAlign;
  if (format.blockAlign !== expectedBlockAlign || format.byteRate !== expectedByteRate || dataBytes % expectedBlockAlign !== 0) {
    throw serviceError('INVALID_WAV', 'El bloque fmt/data del WAV tiene una longitud o alineación inconsistente.', 415);
  }
  const duration = dataBytes / (format.sampleRate * format.channels * bytesPerSample);
  if (!Number.isFinite(duration) || duration <= 0 || duration > limits.maxDuration) {
    throw serviceError('WAV_TOO_LONG', `El audio debe durar más de 0 y como máximo ${limits.maxDuration} segundos.`, 413);
  }
  return { ...format, dataBytes, duration, bytes: buffer.length };
}

export async function readRequestBody(request, maxBytes = RHUBARB_LIMITS.maxBytes) {
  const declared = Number(request.headers?.['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw serviceError('WAV_TOO_LARGE', `El audio supera el límite de ${maxBytes} bytes.`, 413);
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw serviceError('WAV_TOO_LARGE', `El audio supera el límite de ${maxBytes} bytes.`, 413);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

export function spawnRhubarb(executable, inputPath, outputPath, { timeoutMs, signal, spawnCommand = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const args = ['--quiet', '--recognizer', 'phonetic', '--extendedShapes', 'GHX', '--exportFormat', 'json', '--output', outputPath, inputPath];
    args.unshift('--threads', '1');
    let child;
    try {
      child = spawnCommand(executable, args, { shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (error) {
      reject(serviceError('RHUBARB_PROCESS', 'No se pudo iniciar Rhubarb: ' + error.message, 503));
      return;
    }
    let stderr = '';
    let settled = false;
    let terminationError = null;
    let timer = null;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.('abort', abort);
      if (error) reject(error); else resolve(value);
    };
    const requestTermination = error => {
      if (settled || terminationError) return;
      terminationError = error;
      try { child.kill(); } catch { finish(error); }
    };
    const abort = () => requestTermination(serviceError('RHUBARB_ABORTED', 'El análisis fue cancelado.', 499));
    if (!signal?.aborted) signal?.addEventListener?.('abort', abort, { once: true });
    timer = setTimeout(() => requestTermination(serviceError('RHUBARB_TIMEOUT', 'Rhubarb tardó demasiado en analizar el audio.', 504)), timeoutMs);
    child.stderr?.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 4000) stderr = stderr.slice(-4000); });
    child.once('error', error => {
      if (!terminationError) terminationError = serviceError('RHUBARB_PROCESS', 'No se pudo iniciar Rhubarb: ' + error.message, 503);
    });
    child.once('close', async code => {
      if (settled) return;
      if (terminationError) { finish(terminationError); return; }
      if (code !== 0) {
        finish(serviceError('RHUBARB_FAILED', stderr.trim() || ('Rhubarb terminó con código ' + code + '.'), 422));
        return;
      }
      try {
        const result = JSON.parse(await fs.readFile(outputPath, 'utf8'));
        finish(null, result);
      } catch (error) {
        finish(serviceError('RHUBARB_OUTPUT', 'Rhubarb no produjo JSON válido: ' + error.message, 502));
      }
    });
    if (signal?.aborted) abort();
  });
}
export async function runRhubarbOnWav(value, options = {}) {
  const limits = { ...RHUBARB_LIMITS, ...options };
  const audio = bufferOf(value);
  if (audio.length > limits.maxBytes) throw serviceError('WAV_TOO_LARGE', `El audio supera el límite de ${limits.maxBytes} bytes.`, 413);
  const wav = inspectPcmWav(audio, limits);
  if (options.signal?.aborted) throw serviceError('RHUBARB_ABORTED', 'El análisis fue cancelado.', 499);
  const resolveInstallation = options.resolveInstallation || resolveRhubarbInstallation;
  const installation = await resolveInstallation();
  if (!installation.installed) throw serviceError('RHUBARB_NOT_INSTALLED', 'Rhubarb no está instalado. Ejecuta npm run rhubarb:install.', 503);
  const tempDirectory = options.tempDirectory || os.tmpdir();
  const tempRoot = await fs.mkdtemp(path.join(tempDirectory, 'retrovisor-rhubarb-'));
  const inputPath = path.join(tempRoot, 'input.wav');
  const outputPath = path.join(tempRoot, 'output.json');
  try {
    await fs.writeFile(inputPath, audio);
    const result = await spawnRhubarb(installation.executable, inputPath, outputPath, {
      timeoutMs: limits.timeoutMs,
      signal: options.signal,
      spawnCommand: options.spawnCommand || spawn,
    });
    return { result, wav, engine: { name: 'Rhubarb Lip Sync', version: RHUBARB_VERSION, recognizer: 'phonetic' } };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
}

export function isLoopbackAddress(address) {
  const value = String(address || '').replace(/^::ffff:/, '');
  return value === '127.0.0.1' || value === '::1' || value === 'localhost';
}

function hostName(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('[')) return raw.slice(1, raw.indexOf(']'));
  return raw.split(':')[0];
}

export function isLocalHost(value) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostName(value));
}

export function validateLocalRhubarbRequest(request) {
  if (!isLocalHost(request.headers?.host)) return { ok: false, status: 403, code: 'LOCAL_ONLY', message: 'Este análisis solo está disponible desde localhost.' };
  if (request.socket?.remoteAddress && !isLoopbackAddress(request.socket.remoteAddress)) return { ok: false, status: 403, code: 'LOCAL_ONLY', message: 'Este análisis solo está disponible desde el equipo local.' };
  const origin = request.headers?.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || !isLocalHost(url.host)) return { ok: false, status: 403, code: 'LOCAL_ORIGIN_ONLY', message: 'El origen debe ser localhost.' };
    } catch { return { ok: false, status: 403, code: 'LOCAL_ORIGIN_ONLY', message: 'El origen de la petición no es válido.' }; }
  }
  return { ok: true };
}

function respond(response, status, body) {
  if (response.headersSent || response.destroyed) return;
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

export function createRhubarbRequestHandler(options = {}) {
  const limits = { ...RHUBARB_LIMITS, ...options };
  let active = 0;
  return async function handle(request, response, next = () => {}) {
    const pathname = String(request.url || '').split('?')[0];
    if (pathname !== '/api/speech/rhubarb' && pathname !== '/api/speech/rhubarb/status') return next();
    const local = validateLocalRhubarbRequest(request);
    if (!local.ok) { respond(response, local.status, { ok: false, error: { code: local.code, message: local.message } }); return true; }
    if (pathname.endsWith('/status')) {
      if (request.method !== 'GET') { respond(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa GET para consultar el estado.' } }); return true; }
      const installation = await resolveRhubarbInstallation();
      respond(response, 200, { ok: true, installed: installation.installed, version: RHUBARB_VERSION, limits: { maxBytes: limits.maxBytes, maxDuration: limits.maxDuration, timeoutMs: limits.timeoutMs } });
      return true;
    }
    if (request.method !== 'POST') { respond(response, 405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Usa POST con un WAV PCM.' } }); return true; }
    if (active >= limits.maxConcurrent) { respond(response, 429, { ok: false, error: { code: 'RHUBARB_BUSY', message: 'Ya hay un análisis en curso.' } }); return true; }
    const contentType = String(request.headers?.['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('audio/wav') && !contentType.includes('audio/x-wav') && !contentType.includes('application/octet-stream')) {
      respond(response, 415, { ok: false, error: { code: 'UNSUPPORTED_WAV', message: 'Envía el audio como audio/wav.' } }); return true;
    }
    active += 1;
    const abortController = new AbortController();
    const onRequestAborted = () => abortController.abort();
    const onResponseClosed = () => { if (!response.writableEnded) abortController.abort(); };
    request.once?.('aborted', onRequestAborted);
    response.once?.('close', onResponseClosed);
    try {
      const body = await readRequestBody(request, limits.maxBytes);
      if (abortController.signal.aborted) throw serviceError('RHUBARB_ABORTED', 'El análisis fue cancelado.', 499);
      const result = await runRhubarbOnWav(body, { ...limits, signal: abortController.signal });
      respond(response, 200, { ok: true, ...result });
    } catch (error) {
      respond(response, error.status || 500, { ok: false, error: { code: error.code || 'RHUBARB_ERROR', message: error.message || 'No se pudo analizar el audio.' } });
    } finally {
      request.removeListener?.('aborted', onRequestAborted);
      response.removeListener?.('close', onResponseClosed);
      active -= 1;
    }
    return true;
  };
}

export function sha256File(filePath) {
  return fs.readFile(filePath).then(buffer => crypto.createHash('sha256').update(buffer).digest('hex'));
}

