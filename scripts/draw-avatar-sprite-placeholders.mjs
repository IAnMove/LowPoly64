#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SPRITE_DIR = path.join('src', 'data', 'avatar', 'sprites');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const COLORS = Object.freeze({
  transparent: [0, 0, 0, 0],
  outline: [24, 24, 27, 255],
  white: [248, 250, 252, 255],
  irisSlot: [255, 0, 255, 255],
  lipSlot: [0, 255, 0, 255],
  browSlot: [0, 0, 255, 255],
});

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffers) {
  let crc = 0xffffffff;
  buffers.forEach((buffer) => {
    for (let index = 0; index < buffer.length; index += 1) {
      crc = CRC_TABLE[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
    }
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32([typeBuffer, data]), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + (y * stride), stride).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND'),
  ]);
}

function createCanvas(width, height) {
  return {
    width,
    height,
    pixels: new Uint8Array(width * height * 4),
  };
}

function setPixel(canvas, x, y, color) {
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
  const index = ((Math.floor(y) * canvas.width) + Math.floor(x)) * 4;
  canvas.pixels[index] = color[0];
  canvas.pixels[index + 1] = color[1];
  canvas.pixels[index + 2] = color[2];
  canvas.pixels[index + 3] = color[3];
}

function fillRect(canvas, x, y, width, height, color) {
  for (let py = y; py < y + height; py += 1) {
    for (let px = x; px < x + width; px += 1) {
      setPixel(canvas, px, py, color);
    }
  }
}

function fillEllipse(canvas, cx, cy, rx, ry, color) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if ((dx * dx) + (dy * dy) <= 1) setPixel(canvas, x, y, color);
    }
  }
}

function plotThick(canvas, x, y, radius, color) {
  fillEllipse(canvas, x, y, radius, radius, color);
}

function strokeSmile(canvas, color, radius) {
  for (let x = 10; x <= 38; x += 0.25) {
    const t = (x - 24) / 14;
    const y = 8 + (8 * (1 - (t * t)));
    plotThick(canvas, x, y, radius, color);
  }
}

function drawEyeOval() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 12, 8, COLORS.outline);
  fillEllipse(canvas, 16, 16, 10, 6, COLORS.white);
  fillEllipse(canvas, 16, 16, 4, 5, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 1.5, 2, COLORS.outline);
  setPixel(canvas, 14, 13, COLORS.white);
  return canvas;
}

function drawMouthSmile() {
  const canvas = createCanvas(48, 24);
  strokeSmile(canvas, COLORS.outline, 2.2);
  strokeSmile(canvas, COLORS.lipSlot, 1.1);
  return canvas;
}

function drawBrowFlat() {
  const canvas = createCanvas(48, 16);
  fillRect(canvas, 5, 4, 38, 8, COLORS.outline);
  fillRect(canvas, 7, 6, 34, 4, COLORS.browSlot);
  return canvas;
}

function writeSprite(filename, canvas) {
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  fs.writeFileSync(path.join(SPRITE_DIR, filename), encodePng(canvas.width, canvas.height, canvas.pixels));
}

writeSprite('eye_oval.png', drawEyeOval());
writeSprite('mouth_smile.png', drawMouthSmile());
writeSprite('brow_flat.png', drawBrowFlat());

console.log('Wrote avatar sprite placeholders.');
