// ── Texture Generator ─────────────────────────────────────────────
// Supports OpenAI (gpt-image-1) and local Stable Diffusion (Forge/AUTOMATIC1111)
// Config is stored exclusively in localStorage — no server involved.

import * as THREE from 'three';
import { settlePromisesWithTimeout } from '../shared/promise-utils.js';
import { applyTextureTransform, configureTexture, rememberTextureTransform } from '../shared/textures.js';

export const FACE_DECAL_TEXTURE_TRANSFORM = Object.freeze({
  offset: [0, 1],
  repeat: [1, -1],
  rotation: 0,
  center: [0.5, 0.5],
});
const FACE_DECAL_NO_FLIP_TEXTURE_TRANSFORM = Object.freeze({
  offset: [0, 0],
  repeat: [1, 1],
  rotation: 0,
  center: [0.5, 0.5],
});

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function readBundledAvatarSpriteManifest() {
  if (typeof document === 'undefined') return [];
  const modules = import.meta.glob('../../data/avatar/sprites/sprites-manifest.json', {
    eager: true,
    query: '?raw',
    import: 'default',
  });
  const raw = Object.values(modules)[0];
  if (typeof raw !== 'string') return [];
  try {
    return JSON.parse(raw);
  } catch (_) {
    return [];
  }
}

function readBundledAvatarSpriteAssetUrls() {
  if (typeof document === 'undefined') return {};
  return import.meta.glob('../../data/avatar/sprites/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  });
}

const avatarSpriteAssetModules = readBundledAvatarSpriteAssetUrls();
const AVATAR_SPRITE_ASSET_URLS = Object.freeze(
  Object.fromEntries(Object.entries(avatarSpriteAssetModules).map(([modulePath, url]) => [
    modulePath.split('/').pop(),
    url,
  ])),
);

export const AVATAR_SPRITE_MANIFEST = Object.freeze(
  readBundledAvatarSpriteManifest().map((entry) => {
    const usesImage2IrisKey = entry.kind === 'eye' && String(entry.id || '').startsWith('eye_image2_');
    const tintSlots = { ...(entry.tintSlots || {}) };
    if (usesImage2IrisKey && Object.keys(tintSlots).length === 0) {
      tintSlots['#ff00ff'] = 'iris';
    }
    return Object.freeze({
      id: entry.id,
      kind: entry.kind,
      file: entry.file,
      tintSlots: Object.freeze(tintSlots),
      tintMode: usesImage2IrisKey ? 'magentaKey' : 'exact',
    });
  }),
);
const AVATAR_SPRITE_MAP = new Map(AVATAR_SPRITE_MANIFEST.map((entry) => [entry.id, entry]));
const avatarSpriteCanvasCache = new Map();

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneJsonValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneJsonValue(entry);
    });
    return clone;
  }
  return value;
}

export function cloneFaceDecalSpec(spec) {
  return cloneJsonValue(spec || null);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNormalizedNumber(value) {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isHexColor(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

function normalizeHexColor(value) {
  if (!isHexColor(value)) return null;
  const raw = value.slice(1).toLowerCase();
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  return `#${raw}`;
}

function hexToRgb(value) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function resolveSpriteAssetUrl(entry) {
  const url = AVATAR_SPRITE_ASSET_URLS[entry.file];
  if (!url) throw new Error(`Avatar sprite asset not bundled: ${entry.file}`);
  return url;
}

function spriteCacheKey(entry, tints = {}) {
  const slots = Object.entries(entry.tintSlots || {})
    .map(([placeholder, token]) => {
      const tint = normalizeHexColor(tints[token]) || normalizeHexColor(tints[placeholder]) || normalizeHexColor(placeholder);
      return `${normalizeHexColor(placeholder)}=${tint}`;
    })
    .sort()
    .join('|');
  return `${entry.id}|${slots}`;
}

function buildSpriteReplacements(entry, tints = {}) {
  return Object.entries(entry.tintSlots || {})
    .map(([placeholder, token]) => {
      const from = hexToRgb(placeholder);
      const to = hexToRgb(tints[token]) || hexToRgb(tints[placeholder]);
      return from && to ? { from, to } : null;
    })
    .filter(Boolean);
}

function applySpriteTintSlots(canvas, entry, tints = {}) {
  const replacements = buildSpriteReplacements(entry, tints);
  if (!replacements.length) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not read avatar sprite canvas.');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const replacement = replacements.find(({ from }) => (
      data[index] === from.r
      && data[index + 1] === from.g
      && data[index + 2] === from.b
    ));
    if (replacement) {
      data[index] = replacement.to.r;
      data[index + 1] = replacement.to.g;
      data[index + 2] = replacement.to.b;
      continue;
    }

    if (entry.tintMode !== 'magentaKey' || replacements.length !== 1) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const chroma = Math.min(red, blue) - green;
    if (chroma < 32 || Math.abs(red - blue) > 96) continue;

    const weight = Math.min(Math.max(chroma / 255, 0), 1);
    const base = green;
    const target = replacements[0].to;
    data[index] = Math.round(base + ((target.r - base) * weight));
    data[index + 1] = Math.round(base + ((target.g - base) * weight));
    data[index + 2] = Math.round(base + ((target.b - base) * weight));
  }
  ctx.putImageData(imageData, 0, 0);
}

async function loadImageSource(url) {
  if (typeof fetch === 'function' && typeof createImageBitmap === 'function') {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not load avatar sprite asset: ${url}`);
    return createImageBitmap(await response.blob());
  }
  if (typeof Image === 'undefined') {
    throw new Error('loadSprite requires a browser image runtime.');
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load avatar sprite asset: ${url}`));
    image.src = url;
  });
}

export async function loadSprite(id, tints = {}) {
  const entry = AVATAR_SPRITE_MAP.get(id);
  if (!entry) throw new Error(`Unknown avatar sprite id: ${id}`);
  if (typeof document === 'undefined') {
    throw new Error('loadSprite requires a browser canvas runtime.');
  }

  const key = spriteCacheKey(entry, tints);
  if (avatarSpriteCanvasCache.has(key)) return avatarSpriteCanvasCache.get(key);

  const image = await loadImageSource(resolveSpriteAssetUrl(entry));
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create avatar sprite canvas.');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  if (typeof image.close === 'function') image.close();
  applySpriteTintSlots(canvas, entry, tints);

  avatarSpriteCanvasCache.set(key, canvas);
  return canvas;
}

function getCachedSpriteCanvas(id, tints = {}) {
  const entry = AVATAR_SPRITE_MAP.get(id);
  if (!entry) return null;
  return avatarSpriteCanvasCache.get(spriteCacheKey(entry, tints)) || null;
}

export function validateFaceDecalSpec(spec, pieceIndex = 0) {
  if (spec === undefined || spec === null) return null;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return `Piece ${pieceIndex + 1}: decal must be an object.`;
  }

  if (!Array.isArray(spec.resolution) || spec.resolution.length !== 2) {
    return `Piece ${pieceIndex + 1}: decal.resolution must be [width, height].`;
  }
  const [width, height] = spec.resolution;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 || width > 512 || height > 512) {
    return `Piece ${pieceIndex + 1}: decal.resolution values must be integers from 8 to 512.`;
  }

  if (spec.background !== undefined && spec.background !== 'transparent' && !isHexColor(spec.background)) {
    return `Piece ${pieceIndex + 1}: decal.background must be "transparent" or a hex color.`;
  }

  if (!Array.isArray(spec.layers) || spec.layers.length === 0 || spec.layers.length > 64) {
    return `Piece ${pieceIndex + 1}: decal.layers must contain 1-64 layers.`;
  }

  for (let index = 0; index < spec.layers.length; index += 1) {
    const layer = spec.layers[index];
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1} must be an object.`;
    }
    if (!['eye', 'mouth', 'brow', 'fullface'].includes(layer.kind)) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1} has unsupported kind.`;
    }
    if (typeof layer.sprite !== 'string' || !/^[a-z][a-z0-9_]*$/.test(layer.sprite)) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.sprite is required and must be a sprite id.`;
    }
    const spriteEntry = AVATAR_SPRITE_MAP.get(layer.sprite);
    if (AVATAR_SPRITE_MAP.size > 0 && !spriteEntry) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.sprite is unknown.`;
    }
    if (spriteEntry && spriteEntry.kind !== layer.kind) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.sprite kind must match layer.kind.`;
    }
    for (const key of ['x', 'y', 'w', 'h']) {
      if (!isNormalizedNumber(layer[key])) {
        return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.${key} must be between 0 and 1.`;
      }
    }
    if (layer.w <= 0 || layer.h <= 0) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1} size must be positive.`;
    }
    if (layer.side !== undefined && !['L', 'R'].includes(layer.side)) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.side must be "L" or "R".`;
    }
    if (layer.angle !== undefined && (!isFiniteNumber(layer.angle) || Math.abs(layer.angle) > 360)) {
      return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.angle must be finite degrees.`;
    }
    if (layer.sourceBounds !== undefined) {
      if (!Array.isArray(layer.sourceBounds) || layer.sourceBounds.length !== 4) {
        return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.sourceBounds must be [x, y, w, h].`;
      }
      if (!layer.sourceBounds.every((value) => isNormalizedNumber(value)) || layer.sourceBounds[2] <= 0 || layer.sourceBounds[3] <= 0) {
        return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.sourceBounds values must be normalized and positive.`;
      }
    }
    for (const colorKey of ['color', 'iris']) {
      if (layer[colorKey] !== undefined && !isHexColor(layer[colorKey])) {
        return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.${colorKey} must be a hex color.`;
      }
    }
    if (layer.tint !== undefined) {
      if (!layer.tint || typeof layer.tint !== 'object' || Array.isArray(layer.tint)) {
        return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.tint must be an object.`;
      }
      for (const [token, color] of Object.entries(layer.tint)) {
        if (!/^[a-z][a-z0-9_]*$/i.test(token) || !isHexColor(color)) {
          return `Piece ${pieceIndex + 1}: decal layer ${index + 1}.tint values must be hex colors keyed by token.`;
        }
      }
    }
  }

  return null;
}

function normalizeFaceDecalSpec(spec = {}) {
  const width = Array.isArray(spec.resolution) ? spec.resolution[0] : 64;
  const height = Array.isArray(spec.resolution) ? spec.resolution[1] : 32;
  return {
    resolution: [
      Number.isInteger(width) ? width : 64,
      Number.isInteger(height) ? height : 32,
    ],
    background: spec.background || 'transparent',
    layers: Array.isArray(spec.layers) ? cloneJsonValue(spec.layers) : [],
    flipY: spec.flipY === false ? false : true,
  };
}

function resolveLayerTint(layer) {
  if (layer?.tint && typeof layer.tint === 'object') return layer.tint;
  if (layer.kind === 'eye') return { iris: layer.iris || layer.color || '#2563eb' };
  if (layer.kind === 'mouth') return { lip: layer.color || '#7a3b2e' };
  if (layer.kind === 'brow') return { brow: layer.color || '#4a2f1f' };
  if (layer.kind === 'fullface') return {};
  return {};
}

function decalSpriteLayerKey(layer) {
  if (!layer?.sprite) return '';
  return `${layer.sprite}|${spriteCacheKey(AVATAR_SPRITE_MAP.get(layer.sprite) || { id: layer.sprite, tintSlots: {} }, resolveLayerTint(layer))}`;
}

function drawSpriteLayer(ctx, layer, spriteCanvas, width, height) {
  const cx = layer.x * width;
  const cy = layer.y * height;
  const w = layer.w * width;
  const h = layer.h * height;
  const angle = THREE.MathUtils.degToRad(layer.angle || 0);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (layer.side === 'R') ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  if (Array.isArray(layer.sourceBounds) && layer.sourceBounds.length === 4) {
    const [sx, sy, sw, sh] = layer.sourceBounds;
    ctx.drawImage(
      spriteCanvas,
      sx * spriteCanvas.width,
      sy * spriteCanvas.height,
      sw * spriteCanvas.width,
      sh * spriteCanvas.height,
      -w / 2,
      -h / 2,
      w,
      h,
    );
  } else {
    ctx.drawImage(spriteCanvas, -w / 2, -h / 2, w, h);
  }
  ctx.restore();
}

function applyAlphaEdgeBleed(canvas, radius = 3) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  const offsetFor = (x, y) => ((y * width) + x) * 4;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = offsetFor(x, y);
      if (copy[offset + 3] !== 0) continue;

      let bestOffset = -1;
      let bestDistance = Infinity;
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (ox === 0 && oy === 0) continue;
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighborOffset = offsetFor(nx, ny);
          if (copy[neighborOffset + 3] === 0) continue;
          const distance = (ox * ox) + (oy * oy);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestOffset = neighborOffset;
          }
        }
      }

      if (bestOffset >= 0) {
        data[offset] = copy[bestOffset];
        data[offset + 1] = copy[bestOffset + 1];
        data[offset + 2] = copy[bestOffset + 2];
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function hasSpriteLayers(spec) {
  return Array.isArray(spec?.layers) && spec.layers.some((layer) => !!layer?.sprite);
}

async function preloadDecalSpriteCanvases(layers = []) {
  const spriteCanvases = new Map();
  await Promise.all(layers.map(async (layer) => {
    if (!layer?.sprite) return;
    const tint = resolveLayerTint(layer);
    const canvas = await loadSprite(layer.sprite, tint);
    spriteCanvases.set(decalSpriteLayerKey(layer), canvas);
  }));
  return spriteCanvases;
}

export function renderDecalLayers(spec, options = {}) {
  const normalized = normalizeFaceDecalSpec(spec);
  const [width, height] = normalized.resolution;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const spriteCanvases = options.spriteCanvases instanceof Map ? options.spriteCanvases : null;

  if (normalized.background && normalized.background !== 'transparent') {
    ctx.fillStyle = normalized.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  normalized.layers.forEach((layer) => {
    const tint = resolveLayerTint(layer);
    const spriteCanvas = spriteCanvases?.get(decalSpriteLayerKey(layer)) || getCachedSpriteCanvas(layer.sprite, tint);
    if (spriteCanvas) {
      drawSpriteLayer(ctx, layer, spriteCanvas, width, height);
    }
  });

  applyAlphaEdgeBleed(canvas, 3);
  return canvas;
}

export async function renderDecalLayersAsync(spec) {
  const normalized = normalizeFaceDecalSpec(spec);
  const spriteCanvases = await preloadDecalSpriteCanvases(normalized.layers);
  return renderDecalLayers(normalized, { spriteCanvases });
}

function createFaceDecalTextureFromCanvas(normalized, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  const transform = normalized.flipY === false
    ? FACE_DECAL_NO_FLIP_TEXTURE_TRANSFORM
    : FACE_DECAL_TEXTURE_TRANSFORM;
  applyTextureTransform(texture, transform);
  texture.needsUpdate = true;

  return {
    texture,
    textureDefinition: {
      dataURL: canvas.toDataURL('image/png'),
      transform: cloneJsonValue(transform),
      decal: cloneJsonValue(normalized),
      processing: { generatedDecal: true },
    },
  };
}

export function createFaceDecalTexture(spec) {
  const normalized = normalizeFaceDecalSpec(spec);
  const canvas = renderDecalLayers(normalized);
  return createFaceDecalTextureFromCanvas(normalized, canvas);
}

export async function createFaceDecalTextureAsync(spec) {
  const normalized = normalizeFaceDecalSpec(spec);
  const canvas = await renderDecalLayersAsync(normalized);
  return createFaceDecalTextureFromCanvas(normalized, canvas);
}

function assignFaceDecalTexture(mesh, texture, textureDefinition) {
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.userData.textureDefinition = cloneJsonValue(textureDefinition);
  mesh.userData.decalSpec = cloneJsonValue(textureDefinition.decal);
  mesh.userData.colorBeforeTexture = mesh.material?.color?.getHex?.() ?? 0xffffff;
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.color.set(0xffffff);
  mesh.material.transparent = true;
  mesh.material.alphaTest = 0.01;
  mesh.material.depthWrite = false;
  mesh.material.side = THREE.DoubleSide;
  mesh.material.needsUpdate = true;
}

export function applyFaceDecalTexture(mesh, spec) {
  if (!mesh || !mesh.material || !spec) return null;
  const normalized = normalizeFaceDecalSpec(spec);
  const { texture, textureDefinition } = createFaceDecalTexture(normalized);
  assignFaceDecalTexture(mesh, texture, textureDefinition);

  if (hasSpriteLayers(normalized)) {
    mesh.userData.decalTextureReady = createFaceDecalTextureAsync(normalized)
      .then((next) => {
        assignFaceDecalTexture(mesh, next.texture, next.textureDefinition);
        return next.textureDefinition;
      })
      .catch((error) => {
        console.warn('Could not compose sprite face decal:', error);
        return textureDefinition;
      });
  } else {
    mesh.userData.decalTextureReady = Promise.resolve(textureDefinition);
  }

  return textureDefinition;
}

export async function applyFaceDecalTextureAsync(mesh, spec) {
  if (!mesh || !mesh.material || !spec) return null;
  const next = await createFaceDecalTextureAsync(spec);
  assignFaceDecalTexture(mesh, next.texture, next.textureDefinition);
  mesh.userData.decalTextureReady = Promise.resolve(next.textureDefinition);
  return next.textureDefinition;
}

const DEFAULT_FACE_DECAL_WAIT_TIMEOUT_MS = 5000;

export async function waitForFaceDecalTextures(root, options = {}) {
  const promises = [];
  root?.traverse?.((node) => {
    if (node?.userData?.decalTextureReady && typeof node.userData.decalTextureReady.then === 'function') {
      promises.push(node.userData.decalTextureReady);
    }
  });
  const requestedTimeout = Number(options.timeoutMs);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(0, requestedTimeout)
    : DEFAULT_FACE_DECAL_WAIT_TIMEOUT_MS;
  const result = await settlePromisesWithTimeout(promises, timeoutMs);
  if (result.timedOut) {
    console.warn(`Face decal composition timed out after ${timeoutMs}ms; using current textures.`);
  }
  return result;
}

const KEY_METHOD      = 'lp64_texgen_method';   // 'openai' | 'stable-diffusion'
const KEY_API_KEY     = 'lp64_openai_key';
const KEY_MODEL       = 'lp64_openai_model';
const KEY_SIZE        = 'lp64_openai_size';
const KEY_QUALITY     = 'lp64_openai_quality';
const KEY_SD_URL      = 'lp64_sd_url';
const KEY_SD_W        = 'lp64_sd_width';
const KEY_SD_H        = 'lp64_sd_height';
const KEY_SD_STEPS    = 'lp64_sd_steps';
const KEY_OLLAMA_URL  = 'lp64_ollama_url';
const KEY_OLLAMA_MODEL= 'lp64_ollama_model';

export function getTexGenConfig() {
  return {
    method:       localStorage.getItem(KEY_METHOD)        || 'openai',
    openaiKey:    localStorage.getItem(KEY_API_KEY)       || '',
    model:        localStorage.getItem(KEY_MODEL)         || 'gpt-image-1-mini',
    size:         localStorage.getItem(KEY_SIZE)          || '1024x1024',
    quality:      localStorage.getItem(KEY_QUALITY)       || 'low',
    sdUrl:        localStorage.getItem(KEY_SD_URL)        || 'http://127.0.0.1:7860',
    sdWidth:      parseInt(localStorage.getItem(KEY_SD_W)     || '512'),
    sdHeight:     parseInt(localStorage.getItem(KEY_SD_H)     || '512'),
    sdSteps:      parseInt(localStorage.getItem(KEY_SD_STEPS) || '20'),
    ollamaUrl:    localStorage.getItem(KEY_OLLAMA_URL)    || 'http://127.0.0.1:11434',
    ollamaModel:  localStorage.getItem(KEY_OLLAMA_MODEL)  || '',
  };
}

export function saveTexGenConfig(cfg) {
  localStorage.setItem(KEY_METHOD,       cfg.method      || 'openai');
  localStorage.setItem(KEY_MODEL,        cfg.model       || 'gpt-image-1-mini');
  localStorage.setItem(KEY_SIZE,         cfg.size        || '1024x1024');
  localStorage.setItem(KEY_QUALITY,      cfg.quality     || 'low');
  localStorage.setItem(KEY_SD_URL,       cfg.sdUrl       || 'http://127.0.0.1:7860');
  localStorage.setItem(KEY_SD_W,         cfg.sdWidth     || '512');
  localStorage.setItem(KEY_SD_H,         cfg.sdHeight    || '512');
  localStorage.setItem(KEY_SD_STEPS,     cfg.sdSteps     || '20');
  localStorage.setItem(KEY_OLLAMA_URL,   cfg.ollamaUrl   || 'http://127.0.0.1:11434');
  if (cfg.ollamaModel) localStorage.setItem(KEY_OLLAMA_MODEL, cfg.ollamaModel);
  // Only overwrite the OpenAI key if the user actually typed something new
  if (cfg.openaiKey) localStorage.setItem(KEY_API_KEY, cfg.openaiKey);
}

// Fetch available models from an Ollama endpoint
export async function fetchOllamaModels(endpoint) {
  const base = (endpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const res = await fetch(`${base}/api/tags`);
  if (!res.ok) throw new Error(`Ollama error ${res.status}. Is the server running at ${base}?`);
  const data = await res.json();
  return (data.models || []).map((m) => m.name);
}

// Use Ollama to enhance a prompt for texture/image generation
export async function enhancePromptWithOllama(prompt) {
  const cfg = getTexGenConfig();
  if (!cfg.ollamaUrl) throw new Error('Ollama URL not configured. Open CONFIG.');
  if (!cfg.ollamaModel) throw new Error('No Ollama model selected. Open CONFIG to pick one.');

  const base = cfg.ollamaUrl.replace(/\/$/, '');
  const system = `You are an expert at writing prompts for AI image generation, specialized in retro PS1/N64-style game textures. Improve the given prompt to produce better results. Be specific about style (PS1, pixel art, dithering, limited palette), viewing angle, and seamlessness. Return ONLY the improved prompt text, no explanation, no quotes, no preamble.`;

  const res = await fetch(`${base}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: cfg.ollamaModel, prompt, system, stream: false }),
  });

  if (!res.ok) throw new Error(`Ollama generate error ${res.status}`);
  const data = await res.json();
  return (data.response || '').trim();
}

// Returns a base64-encoded PNG string (no data-URL prefix)
export async function generateTexture(prompt) {
  const cfg = getTexGenConfig();
  if (cfg.method === 'openai') {
    return _generateOpenAI(prompt, cfg);
  }
  return _generateSD(prompt, cfg);
}

async function _generateOpenAI(prompt, cfg) {
  if (!cfg.openaiKey) throw new Error('OpenAI API key not set. Open CONFIG to add it.');

  const body = {
    model: cfg.model,
    prompt,
    size: cfg.size,
    quality: cfg.quality,
  };

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.openaiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `OpenAI error ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }

  const data = await res.json();
  return data.data[0].b64_json;
}

// ── Tile editing (img2img / inpainting) ───────────────────────────
// tileBase64: base64 PNG of the tile (no data-URL prefix)
// editPrompt: "change expression to happy", etc.
export async function editTile(tileBase64, editPrompt) {
  const cfg = getTexGenConfig();
  if (cfg.method === 'openai') return _editTileOpenAI(tileBase64, editPrompt, cfg);
  return _editTileSD(tileBase64, editPrompt, cfg);
}

async function _editTileOpenAI(b64, prompt, cfg) {
  if (!cfg.openaiKey) throw new Error('OpenAI API key not set. Open CONFIG.');

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/png' });

  const fd = new FormData();
  fd.append('image', blob, 'tile.png');
  fd.append('prompt', prompt);
  fd.append('model', cfg.model);
  fd.append('size', cfg.size);

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.openaiKey}` },
    body: fd,
  });

  if (!res.ok) {
    let msg = `OpenAI edit error ${res.status}`;
    try { const j = await res.json(); msg = j.error?.message || msg; } catch (_) {}
    throw new Error(msg);
  }
  const data = await res.json();
  return data.data[0].b64_json;
}

async function _editTileSD(b64, prompt, cfg) {
  const base = (cfg.sdUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');

  const res = await fetch(`${base}/sdapi/v1/img2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      init_images: [b64],
      denoising_strength: 0.75,
      width:  cfg.sdWidth,
      height: cfg.sdHeight,
      steps:  cfg.sdSteps,
    }),
  });

  if (!res.ok) throw new Error(`SD img2img error ${res.status}`);
  const data = await res.json();
  if (!data.images || !data.images[0]) throw new Error('SD returned no images.');
  return data.images[0];
}

async function _generateSD(prompt, cfg) {
  const base = (cfg.sdUrl || 'http://127.0.0.1:7860').replace(/\/$/, '');

  const res = await fetch(`${base}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      steps:  cfg.sdSteps,
      width:  cfg.sdWidth,
      height: cfg.sdHeight,
    }),
  });

  if (!res.ok) throw new Error(`Stable Diffusion error ${res.status}. Is the server running at ${base}?`);

  const data = await res.json();
  if (!data.images || !data.images[0]) throw new Error('SD returned no images.');
  return data.images[0];
}
