#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const SPRITE_ROOT = path.join('src', 'data', 'avatar', 'sprites');
const MANIFEST_PATH = path.join(SPRITE_ROOT, 'sprites-manifest.json');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_DIMENSIONS = Object.freeze({
  eye: [32, 32],
  mouth: [48, 24],
  brow: [48, 16],
});
const VALID_TINT_TOKENS = new Set(['iris', 'lip', 'brow']);
const HEX_RE = /^#[0-9a-f]{6}$/i;

const errors = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${file}: invalid JSON (${error.message})`);
    return null;
  }
}

function assertSafeSpriteFile(file, id) {
  if (typeof file !== 'string' || !/^[a-z0-9_/-]+\.png$/i.test(file)) {
    errors.push(`${id}: file must be a png path with safe characters`);
    return null;
  }
  if (file.includes('/') || file.includes('\\') || file.includes('..')) {
    errors.push(`${id}: file must stay directly inside ${SPRITE_ROOT}`);
    return null;
  }
  return path.join(SPRITE_ROOT, file);
}

function unfilterScanline(type, row, previous, bpp) {
  const output = Buffer.alloc(row.length);
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bpp ? output[index - bpp] : 0;
    const up = previous ? previous[index] : 0;
    const upLeft = previous && index >= bpp ? previous[index - bpp] : 0;
    let predictor = 0;
    if (type === 1) predictor = left;
    if (type === 2) predictor = up;
    if (type === 3) predictor = Math.floor((left + up) / 2);
    if (type === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upLeft);
      predictor = pa <= pb && pa <= pc ? left : (pb <= pc ? up : upLeft);
    }
    output[index] = (row[index] + predictor) & 0xff;
  }
  return output;
}

function decodePng(file) {
  const bytes = fs.readFileSync(file);
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('missing PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`expected 8-bit RGBA PNG, got bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const bpp = 4;
  const stride = width * bpp;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * bpp);
  let sourceOffset = 0;
  let previous = null;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    if (filter < 0 || filter > 4) throw new Error(`unsupported PNG row filter ${filter}`);
    const row = inflated.subarray(sourceOffset + 1, sourceOffset + 1 + stride);
    const decoded = unfilterScanline(filter, row, previous, bpp);
    decoded.copy(pixels, y * stride);
    previous = decoded;
    sourceOffset += stride + 1;
  }

  return { width, height, pixels };
}

function hexToRgb(hex) {
  const value = hex.slice(1);
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function countColor(pixels, rgb) {
  let count = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (
      pixels[index] === rgb[0]
      && pixels[index + 1] === rgb[1]
      && pixels[index + 2] === rgb[2]
      && pixels[index + 3] > 0
    ) {
      count += 1;
    }
  }
  return count;
}

const manifest = readJson(MANIFEST_PATH);
if (!Array.isArray(manifest)) {
  errors.push(`${MANIFEST_PATH}: manifest must be an array`);
}

const seenIds = new Set();
const entries = Array.isArray(manifest) ? manifest : [];
entries.forEach((entry, index) => {
  const id = typeof entry?.id === 'string' ? entry.id : '';
  const kind = typeof entry?.kind === 'string' ? entry.kind : '';
  const label = id || `entry ${index + 1}`;

  if (!/^[a-z][a-z0-9_]*$/.test(id)) errors.push(`${label}: id must be snake_case`);
  if (seenIds.has(id)) errors.push(`${label}: duplicate sprite id`);
  seenIds.add(id);

  if (!Object.hasOwn(EXPECTED_DIMENSIONS, kind)) {
    errors.push(`${label}: kind must be eye, mouth, or brow`);
  }
  if (kind && id && !id.startsWith(`${kind}_`)) {
    errors.push(`${label}: id must start with ${kind}_`);
  }

  const file = assertSafeSpriteFile(entry?.file, label);
  const tintSlots = entry?.tintSlots;
  if (!tintSlots || typeof tintSlots !== 'object' || Array.isArray(tintSlots)) {
    errors.push(`${label}: tintSlots must be an object`);
  }

  if (!file || !fs.existsSync(file)) {
    errors.push(`${label}: missing PNG file ${entry?.file || '<missing>'}`);
    return;
  }

  let png = null;
  try {
    png = decodePng(file);
  } catch (error) {
    errors.push(`${label}: invalid PNG (${error.message})`);
    return;
  }

  const [expectedWidth, expectedHeight] = EXPECTED_DIMENSIONS[kind] || [];
  if (png.width !== expectedWidth || png.height !== expectedHeight) {
    errors.push(`${label}: PNG dimensions ${png.width}x${png.height}, expected ${expectedWidth}x${expectedHeight}`);
  }

  Object.entries(tintSlots || {}).forEach(([placeholder, token]) => {
    if (!HEX_RE.test(placeholder)) errors.push(`${label}: tint placeholder ${placeholder} must be #rrggbb`);
    if (!VALID_TINT_TOKENS.has(token)) errors.push(`${label}: unsupported tint token ${token}`);
    if (HEX_RE.test(placeholder) && png && countColor(png.pixels, hexToRgb(placeholder)) === 0) {
      errors.push(`${label}: placeholder ${placeholder} is declared but absent from ${entry.file}`);
    }
  });
});

if (errors.length) {
  console.error(`Avatar sprite manifest check FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

console.log(`Avatar sprite manifest check passed (${entries.length} sprites).`);
