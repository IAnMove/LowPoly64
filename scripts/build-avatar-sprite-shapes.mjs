#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { buildStableRadialContour, polygonHasSelfIntersections } from './avatar-sprite-contour.mjs';

const SPRITE_ROOT = path.join('src', 'data', 'avatar', 'sprites');
const MANIFEST_PATH = path.join(SPRITE_ROOT, 'sprites-manifest.json');
const OUT_PATH = path.join('src', 'data', 'avatar', 'sprite-shapes.js');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CONTOUR_POINT_COUNT = 28;
const ALPHA_THRESHOLD = 12;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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
    throw new Error(`${file}: missing PNG signature`);
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
    throw new Error(`${file}: expected 8-bit RGBA PNG, got bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const stride = width * 4;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * 4);
  let sourceOffset = 0;
  let previous = null;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    const row = inflated.subarray(sourceOffset + 1, sourceOffset + 1 + stride);
    const decoded = unfilterScanline(filter, row, previous, 4);
    decoded.copy(pixels, y * stride);
    previous = decoded;
    sourceOffset += stride + 1;
  }

  return { width, height, pixels };
}

function pixelOffset(width, x, y) {
  return ((y * width) + x) * 4;
}

function isOpaque(png, x, y) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return false;
  return png.pixels[pixelOffset(png.width, x, y) + 3] > ALPHA_THRESHOLD;
}

function colorAt(png, x, y) {
  const offset = pixelOffset(png.width, x, y);
  return [png.pixels[offset], png.pixels[offset + 1], png.pixels[offset + 2]];
}

function luma([r, g, b]) {
  return (r * 0.299) + (g * 0.587) + (b * 0.114);
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`;
}

function averageColor(colors) {
  if (!colors.length) return '#222222';
  const sum = colors.reduce((acc, color) => [
    acc[0] + color[0],
    acc[1] + color[1],
    acc[2] + color[2],
  ], [0, 0, 0]);
  return toHex(sum.map((value) => value / colors.length));
}

function collectMaskStats(png) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const boundary = [];
  let opaqueCount = 0;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (!isOpaque(png, x, y)) continue;
      opaqueCount += 1;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
      if (
        !isOpaque(png, x - 1, y)
        || !isOpaque(png, x + 1, y)
        || !isOpaque(png, x, y - 1)
        || !isOpaque(png, x, y + 1)
      ) {
        boundary.push({ x: x + 0.5, y: y + 0.5, color: colorAt(png, x, y) });
      }
    }
  }

  if (opaqueCount === 0) return null;
  return { bounds, boundary, opaqueCount };
}

function normalizedBounds(png, bounds) {
  const pad = 1;
  const minX = Math.max(0, bounds.minX - pad);
  const minY = Math.max(0, bounds.minY - pad);
  const maxX = Math.min(png.width - 1, bounds.maxX + pad);
  const maxY = Math.min(png.height - 1, bounds.maxY + pad);
  return [
    Number((minX / png.width).toFixed(4)),
    Number((minY / png.height).toFixed(4)),
    Number(((maxX + 1 - minX) / png.width).toFixed(4)),
    Number(((maxY + 1 - minY) / png.height).toFixed(4)),
  ];
}

function buildRadialContour(png, stats, bounds) {
  const crop = {
    x: bounds[0] * png.width,
    y: bounds[1] * png.height,
    w: bounds[2] * png.width,
    h: bounds[3] * png.height,
  };
  return buildStableRadialContour(stats.boundary, crop, CONTOUR_POINT_COUNT);
}

function buildShapeForEntry(entry) {
  const file = path.join(SPRITE_ROOT, entry.file);
  const png = decodePng(file);
  const stats = collectMaskStats(png);
  if (!stats) {
    return {
      mode: 'rect',
      bounds: [0, 0, 1, 1],
      edgeColor: '#222222',
      coverage: 0,
    };
  }

  const bounds = normalizedBounds(png, stats.bounds);
  const boundaryColors = stats.boundary.map((point) => point.color);
  const darkBoundaryColors = boundaryColors.filter((color) => luma(color) < 150);
  const edgeColor = averageColor(darkBoundaryColors.length >= 4 ? darkBoundaryColors : boundaryColors);
  const coverage = stats.opaqueCount / (png.width * png.height);

  if (entry.kind === 'fullface') {
    return {
      mode: 'rect',
      bounds,
      edgeColor,
      coverage: Number(coverage.toFixed(4)),
    };
  }

  return {
    mode: 'contour',
    bounds,
    contour: buildRadialContour(png, stats, bounds),
    edgeColor,
    coverage: Number(coverage.toFixed(4)),
  };
}

function stableStringify(value, indent = 0) {
  const pad = ' '.repeat(indent);
  const nextPad = ' '.repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.every((entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'number'))) {
      return `[${value.map((entry) => `[${entry.join(', ')}]`).join(', ')}]`;
    }
    return `[\n${value.map((entry) => `${nextPad}${stableStringify(entry, indent + 2)}`).join(',\n')}\n${pad}]`;
  }
  if (value && typeof value === 'object') {
    return `{\n${Object.entries(value).map(([key, entry]) => `${nextPad}${JSON.stringify(key)}: ${stableStringify(entry, indent + 2)}`).join(',\n')}\n${pad}}`;
  }
  return JSON.stringify(value);
}

function main() {
  const manifest = readJson(MANIFEST_PATH);
  const shapes = {};
  manifest.forEach((entry) => {
    shapes[entry.id] = buildShapeForEntry(entry);
    if (polygonHasSelfIntersections(shapes[entry.id].contour)) {
      throw new Error(`${entry.id}: generated contour intersects itself`);
    }
  });

  const source = `// Generated by scripts/build-avatar-sprite-shapes.mjs. Do not edit by hand.\n`
    + `export const AVATAR_SPRITE_SHAPES = Object.freeze(${stableStringify(shapes)});\n\n`
    + `export function getAvatarSpriteShape(id) {\n`
    + `  return AVATAR_SPRITE_SHAPES[id] || null;\n`
    + `}\n`;
  fs.writeFileSync(OUT_PATH, source, 'utf8');
  console.log(`Wrote ${Object.keys(shapes).length} sprite shape entries to ${OUT_PATH}.`);
}

main();
