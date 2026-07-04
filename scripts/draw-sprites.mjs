#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SPRITE_DIR = path.join('src', 'data', 'avatar', 'sprites');
const DOC_DIR = path.join('docs', 'avatar-sprites');
const CONTACT_SHEET_PATH = path.join(DOC_DIR, 'h2.2-contact-sheet.png');
const MANIFEST_PATH = path.join(SPRITE_DIR, 'sprites-manifest.json');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const COLORS = Object.freeze({
  transparent: [0, 0, 0, 0],
  outline: [17, 17, 17, 255],
  outlineSoft: [39, 39, 42, 255],
  white: [255, 255, 255, 255],
  tooth: [250, 250, 245, 255],
  irisSlot: [255, 0, 255, 255],
  lipSlot: [0, 255, 0, 255],
  browSlot: [0, 0, 255, 255],
  shadow: [0, 0, 0, 255],
  sheetBg: [24, 24, 27, 255],
  sheetCell: [39, 39, 42, 255],
  sheetCellAlt: [31, 31, 35, 255],
  sheetGrid: [82, 82, 91, 255],
});

const TINT_SLOTS = Object.freeze({
  eye: Object.freeze({ '#ff00ff': 'iris' }),
  mouth: Object.freeze({ '#00ff00': 'lip' }),
  brow: Object.freeze({ '#0000ff': 'brow' }),
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

function createCanvas(width, height, fill = COLORS.transparent) {
  const canvas = {
    width,
    height,
    pixels: new Uint8Array(width * height * 4),
  };
  clearCanvas(canvas, fill);
  return canvas;
}

function setPixel(canvas, x, y, color) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return;
  const index = ((py * canvas.width) + px) * 4;
  canvas.pixels[index] = color[0];
  canvas.pixels[index + 1] = color[1];
  canvas.pixels[index + 2] = color[2];
  canvas.pixels[index + 3] = color[3];
}

function getPixel(canvas, x, y) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return COLORS.transparent;
  const index = ((py * canvas.width) + px) * 4;
  return [
    canvas.pixels[index],
    canvas.pixels[index + 1],
    canvas.pixels[index + 2],
    canvas.pixels[index + 3],
  ];
}

function clearCanvas(canvas, color = COLORS.transparent) {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      setPixel(canvas, x, y, color);
    }
  }
}

function fillRect(canvas, x, y, width, height, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + height); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + width); px += 1) {
      setPixel(canvas, px, py, color);
    }
  }
}

function clearRect(canvas, x, y, width, height) {
  fillRect(canvas, x, y, width, height, COLORS.transparent);
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

function fillPolygon(canvas, points, color) {
  const minY = Math.floor(Math.min(...points.map((point) => point[1])));
  const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));
  for (let y = minY; y <= maxY; y += 1) {
    const scanY = y + 0.5;
    const intersections = [];
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      if ((a[1] <= scanY && b[1] > scanY) || (b[1] <= scanY && a[1] > scanY)) {
        const t = (scanY - a[1]) / (b[1] - a[1]);
        intersections.push(a[0] + (t * (b[0] - a[0])));
      }
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index < intersections.length; index += 2) {
      const start = Math.floor(intersections[index]);
      const end = Math.ceil(intersections[index + 1]);
      for (let x = start; x < end; x += 1) setPixel(canvas, x, y, color);
    }
  }
}

function plotThick(canvas, x, y, radius, color) {
  fillEllipse(canvas, x, y, radius, radius, color);
}

function strokeLine(canvas, x0, y0, x1, y1, radius, color) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    plotThick(canvas, x0 + ((x1 - x0) * t), y0 + ((y1 - y0) * t), radius, color);
  }
}

function strokeCurve(canvas, x0, x1, yForX, radius, color) {
  const steps = Math.max(1, Math.ceil(Math.abs(x1 - x0) * 3));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const x = x0 + ((x1 - x0) * t);
    plotThick(canvas, x, yForX(x, t), radius, color);
  }
}

function fillStar(canvas, cx, cy, outer, inner, color) {
  const points = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (-Math.PI / 2) + (index * Math.PI / 5);
    points.push([cx + (Math.cos(angle) * radius), cy + (Math.sin(angle) * radius)]);
  }
  fillPolygon(canvas, points, color);
}

function strokePolyline(canvas, points, radius, color) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    strokeLine(canvas, a[0], a[1], b[0], b[1], radius, color);
  }
}

function fillHeart(canvas, cx, cy, scale, color) {
  fillEllipse(canvas, cx - (3 * scale), cy - (2.2 * scale), 3.4 * scale, 3.1 * scale, color);
  fillEllipse(canvas, cx + (3 * scale), cy - (2.2 * scale), 3.4 * scale, 3.1 * scale, color);
  fillPolygon(canvas, [
    [cx - (7.2 * scale), cy - (1.1 * scale)],
    [cx + (7.2 * scale), cy - (1.1 * scale)],
    [cx, cy + (8.2 * scale)],
  ], color);
}

function drawEyeOval() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 11, 12, COLORS.outline);
  fillEllipse(canvas, 16, 16, 8.8, 10, COLORS.white);
  fillEllipse(canvas, 16, 16, 4.3, 6.3, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 1.6, 4.3, COLORS.outline);
  fillRect(canvas, 13, 11, 2, 2, COLORS.white);
  setPixel(canvas, 15, 10, COLORS.white);
  return canvas;
}

function drawEyeDot() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 7.2, 7.2, COLORS.outline);
  fillEllipse(canvas, 16, 16, 5.4, 5.4, COLORS.white);
  fillEllipse(canvas, 16, 16, 2.8, 2.8, COLORS.irisSlot);
  fillEllipse(canvas, 16, 16, 1.1, 1.7, COLORS.outline);
  setPixel(canvas, 14, 14, COLORS.white);
  return canvas;
}

function drawEyeHalfmoon() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 18, 12, 7.4, COLORS.outline);
  fillEllipse(canvas, 16, 18, 9.8, 5.4, COLORS.white);
  fillEllipse(canvas, 16, 18, 3.9, 4.5, COLORS.irisSlot);
  fillEllipse(canvas, 16, 19, 1.2, 2.2, COLORS.outline);
  clearRect(canvas, 3, 5, 26, 10);
  strokeLine(canvas, 5, 15, 27, 15, 1.5, COLORS.outline);
  strokeLine(canvas, 8, 16, 24, 16, 0.75, COLORS.outlineSoft);
  return canvas;
}

function drawEyeAngry() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[4, 14], [14, 8], [28, 15], [23, 24], [8, 22]], COLORS.outline);
  fillPolygon(canvas, [[8, 15], [15, 12], [24, 16], [20, 21], [10, 20]], COLORS.white);
  fillEllipse(canvas, 17, 17, 3.8, 4.6, COLORS.irisSlot);
  fillEllipse(canvas, 17, 18, 1.2, 2.5, COLORS.outline);
  strokeLine(canvas, 6, 10, 28, 16, 1.25, COLORS.outline);
  setPixel(canvas, 19, 14, COLORS.white);
  return canvas;
}

function drawEyeStar() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 11.5, 11.5, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.2, 9.2, COLORS.white);
  fillStar(canvas, 16, 16, 6.7, 2.6, COLORS.irisSlot);
  fillEllipse(canvas, 16, 16, 1.3, 1.3, COLORS.outline);
  fillRect(canvas, 12, 12, 2, 2, COLORS.white);
  setPixel(canvas, 20, 11, COLORS.white);
  return canvas;
}

function drawEyeLash() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 17, 16, 11.2, 9.5, COLORS.outline);
  fillEllipse(canvas, 17, 16, 8.8, 7.2, COLORS.white);
  fillEllipse(canvas, 17, 16, 3.7, 5.4, COLORS.irisSlot);
  fillEllipse(canvas, 17, 17, 1.25, 3.4, COLORS.outline);
  strokeLine(canvas, 8, 9, 3, 5, 0.9, COLORS.outline);
  strokeLine(canvas, 6, 13, 1, 11, 0.9, COLORS.outline);
  strokeLine(canvas, 6, 18, 1, 20, 0.9, COLORS.outline);
  strokeLine(canvas, 8, 22, 3, 26, 0.9, COLORS.outline);
  fillRect(canvas, 14, 11, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeRoundBig() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 13.4, 13.4, COLORS.outline);
  fillEllipse(canvas, 16, 16, 11.1, 11.1, COLORS.white);
  fillEllipse(canvas, 16, 16, 7.2, 7.2, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 2.1, 4.9, COLORS.outline);
  fillRect(canvas, 10, 8, 3, 3, COLORS.white);
  fillRect(canvas, 13, 7, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeAlmond() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[4, 15], [11, 8], [27, 14], [24, 21], [10, 23]], COLORS.outline);
  fillPolygon(canvas, [[8, 15], [13, 11], [24, 15], [21, 19], [11, 20]], COLORS.white);
  fillEllipse(canvas, 16, 16.4, 3.8, 4.7, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 1.2, 2.6, COLORS.outline);
  fillRect(canvas, 17, 13, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeHappyClosed() {
  const canvas = createCanvas(32, 32);
  strokeCurve(canvas, 6, 26, (x) => {
    const t = (x - 16) / 10;
    return 20 - (7.2 * (1 - (t * t)));
  }, 1.1, COLORS.outline);
  strokeCurve(canvas, 8, 24, (x) => {
    const t = (x - 16) / 8;
    return 19.2 - (5.4 * (1 - (t * t)));
  }, 0.55, COLORS.outlineSoft);
  return canvas;
}

function drawEyeSadClosed() {
  const canvas = createCanvas(32, 32);
  strokeCurve(canvas, 6, 26, (x) => {
    const t = (x - 16) / 10;
    return 12.5 + (7.2 * (1 - (t * t)));
  }, 1.1, COLORS.outline);
  strokeCurve(canvas, 8, 24, (x) => {
    const t = (x - 16) / 8;
    return 13.2 + (5.4 * (1 - (t * t)));
  }, 0.55, COLORS.outlineSoft);
  return canvas;
}

function drawEyeWink() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 19, 10.5, 7.4, COLORS.outline);
  fillEllipse(canvas, 16, 19, 8.2, 5.2, COLORS.white);
  fillEllipse(canvas, 16, 20.5, 3.7, 4.2, COLORS.irisSlot);
  fillEllipse(canvas, 16, 21, 1.1, 2.3, COLORS.outline);
  clearRect(canvas, 3, 4, 26, 10);
  strokeLine(canvas, 6, 13, 26, 13, 1.45, COLORS.outline);
  strokeLine(canvas, 9, 15, 23, 15, 0.7, COLORS.outlineSoft);
  return canvas;
}

function drawEyeSurprised() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 12.4, 12.4, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.8, 9.8, COLORS.white);
  fillEllipse(canvas, 16, 16, 2.2, 2.2, COLORS.irisSlot);
  setPixel(canvas, 15, 15, COLORS.outline);
  fillRect(canvas, 12, 10, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeSideGlance() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 12.2, 8.8, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.8, 6.6, COLORS.white);
  fillEllipse(canvas, 10.3, 16.4, 4.0, 4.9, COLORS.irisSlot);
  fillEllipse(canvas, 9.7, 17, 1.2, 2.7, COLORS.outline);
  fillRect(canvas, 11, 13, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeHeart() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 11.7, 11.1, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.2, 8.9, COLORS.white);
  fillHeart(canvas, 16, 15.8, 0.78, COLORS.outline);
  fillHeart(canvas, 16, 15.7, 0.56, COLORS.irisSlot);
  fillRect(canvas, 12, 10, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeRobot() {
  const canvas = createCanvas(32, 32);
  fillRect(canvas, 5, 6, 22, 20, COLORS.outline);
  fillRect(canvas, 8, 9, 16, 14, COLORS.white);
  fillRect(canvas, 12, 12, 8, 8, COLORS.irisSlot);
  fillRect(canvas, 15, 13, 3, 6, COLORS.outline);
  fillRect(canvas, 8, 17, 16, 1, COLORS.outlineSoft);
  fillRect(canvas, 10, 10, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeSleepyLid() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 18, 12, 7.5, COLORS.outline);
  fillEllipse(canvas, 16, 18, 9.4, 5.4, COLORS.white);
  fillEllipse(canvas, 16, 20, 4.8, 4.5, COLORS.irisSlot);
  fillEllipse(canvas, 16, 21, 1.4, 2.4, COLORS.outline);
  clearRect(canvas, 3, 4, 26, 10);
  strokeLine(canvas, 5, 14, 27, 14, 1.7, COLORS.outline);
  strokeLine(canvas, 7, 16, 25, 16, 0.8, COLORS.outlineSoft);
  fillRect(canvas, 12, 17, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeSharpHero() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[4, 17], [13, 8], [28, 13], [24, 22], [10, 24]], COLORS.outline);
  fillPolygon(canvas, [[8, 17], [14, 11], [24, 14], [21, 19], [11, 21]], COLORS.white);
  fillEllipse(canvas, 17, 16.5, 3.4, 4.5, COLORS.irisSlot);
  fillEllipse(canvas, 17, 17, 1.1, 2.4, COLORS.outline);
  strokeLine(canvas, 7, 12, 27, 15, 1.0, COLORS.outline);
  fillRect(canvas, 18, 13, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeDotTiny() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 5.4, 5.4, COLORS.outline);
  fillEllipse(canvas, 16, 16, 3.6, 3.6, COLORS.white);
  fillEllipse(canvas, 16, 16, 1.7, 1.7, COLORS.irisSlot);
  setPixel(canvas, 16, 16, COLORS.outline);
  setPixel(canvas, 15, 15, COLORS.white);
  return canvas;
}

function drawEyeBigSparkle() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 13.2, 13.2, COLORS.outline);
  fillEllipse(canvas, 16, 16, 10.7, 10.7, COLORS.white);
  fillEllipse(canvas, 16, 16, 7.0, 7.0, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 2.2, 4.7, COLORS.outline);
  fillRect(canvas, 9, 8, 4, 4, COLORS.white);
  fillRect(canvas, 14, 7, 2, 2, COLORS.white);
  fillRect(canvas, 21, 21, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeDowncast() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 11.5, 8.6, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.1, 6.2, COLORS.white);
  fillEllipse(canvas, 16, 20, 4.1, 4.3, COLORS.irisSlot);
  fillEllipse(canvas, 16, 21, 1.2, 2.2, COLORS.outline);
  fillPolygon(canvas, [[5, 9], [27, 9], [24, 14], [8, 14]], COLORS.outline);
  strokeLine(canvas, 7, 14, 25, 14, 0.65, COLORS.outlineSoft);
  fillRect(canvas, 13, 18, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeMaskedSlit() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[4, 14], [28, 13], [29, 18], [5, 20]], COLORS.outline);
  fillPolygon(canvas, [[8, 15], [24, 15], [24, 17], [8, 18]], COLORS.white);
  strokeLine(canvas, 13, 16, 19, 16, 1.0, COLORS.irisSlot);
  setPixel(canvas, 16, 16, COLORS.outline);
  return canvas;
}

function drawEyeButton() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 10.8, 10.8, COLORS.outline);
  fillEllipse(canvas, 16, 16, 8.4, 8.4, COLORS.white);
  fillEllipse(canvas, 16, 16, 5.9, 5.9, COLORS.irisSlot);
  strokeLine(canvas, 12, 12, 20, 20, 0.75, COLORS.outline);
  strokeLine(canvas, 20, 12, 12, 20, 0.75, COLORS.outline);
  fillRect(canvas, 11, 9, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeDiamond() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[16, 4], [29, 16], [16, 28], [3, 16]], COLORS.outline);
  fillPolygon(canvas, [[16, 8], [25, 16], [16, 24], [7, 16]], COLORS.white);
  fillPolygon(canvas, [[16, 11], [21, 16], [16, 21], [11, 16]], COLORS.irisSlot);
  fillPolygon(canvas, [[16, 14], [18, 16], [16, 18], [14, 16]], COLORS.outline);
  fillRect(canvas, 13, 10, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeOldWrinkle() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 17, 8.8, 6.8, COLORS.outline);
  fillEllipse(canvas, 16, 17, 6.5, 4.6, COLORS.white);
  fillEllipse(canvas, 16, 18, 2.8, 3.4, COLORS.irisSlot);
  fillEllipse(canvas, 16, 18.5, 0.9, 1.8, COLORS.outline);
  strokeLine(canvas, 3, 13, 8, 14, 0.75, COLORS.outline);
  strokeLine(canvas, 4, 18, 9, 17, 0.65, COLORS.outline);
  strokeLine(canvas, 24, 14, 29, 13, 0.65, COLORS.outline);
  fillRect(canvas, 14, 15, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeBlankGlow() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 11.5, 11.5, COLORS.outline);
  fillEllipse(canvas, 16, 16, 9.1, 9.1, COLORS.white);
  fillRect(canvas, 11, 10, 3, 3, COLORS.white);
  fillRect(canvas, 21, 21, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeLeafElf() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[3, 16], [11, 9], [25, 11], [30, 16], [24, 21], [10, 22]], COLORS.outline);
  fillPolygon(canvas, [[7, 16], [12, 12], [24, 13], [27, 16], [22, 19], [11, 19]], COLORS.white);
  fillEllipse(canvas, 17.5, 16.2, 3.0, 4.1, COLORS.irisSlot);
  fillEllipse(canvas, 17.5, 17, 0.9, 2.2, COLORS.outline);
  fillRect(canvas, 18, 13, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeHoodedN64() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[5, 15], [11, 10], [25, 11], [28, 15], [24, 21], [9, 21]], COLORS.outline);
  fillPolygon(canvas, [[9, 16], [13, 14], [23, 14], [25, 16], [22, 18], [11, 18]], COLORS.white);
  fillEllipse(canvas, 16.5, 17, 3.2, 3.9, COLORS.irisSlot);
  fillEllipse(canvas, 16.5, 17.5, 1.0, 2.0, COLORS.outline);
  fillPolygon(canvas, [[5, 10], [28, 11], [26, 15], [8, 15]], COLORS.outline);
  strokeLine(canvas, 7, 16, 25, 16, 0.55, COLORS.outlineSoft);
  return canvas;
}

function drawEyeWideWonder() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 13.6, 13.6, COLORS.outline);
  fillEllipse(canvas, 16, 16, 11.3, 11.3, COLORS.white);
  fillEllipse(canvas, 16, 16, 7.3, 7.3, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 2.0, 4.8, COLORS.outline);
  fillRect(canvas, 9, 8, 5, 5, COLORS.white);
  fillRect(canvas, 20, 20, 3, 3, COLORS.white);
  return canvas;
}

function drawEyeSlySide() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 17, 12.4, 8.3, COLORS.outline);
  fillEllipse(canvas, 16, 17, 9.8, 5.9, COLORS.white);
  fillEllipse(canvas, 22, 17.4, 3.6, 4.3, COLORS.irisSlot);
  fillEllipse(canvas, 22.4, 18, 1.0, 2.2, COLORS.outline);
  clearRect(canvas, 4, 5, 25, 8);
  strokeLine(canvas, 6, 13, 28, 15, 1.25, COLORS.outline);
  strokeLine(canvas, 7, 20, 24, 21, 0.8, COLORS.outlineSoft);
  fillRect(canvas, 21, 14, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeCrossSleep() {
  const canvas = createCanvas(32, 32);
  strokeLine(canvas, 9, 9, 23, 23, 1.6, COLORS.outline);
  strokeLine(canvas, 23, 9, 9, 23, 1.6, COLORS.outline);
  strokeLine(canvas, 11, 10, 22, 21, 0.65, COLORS.outlineSoft);
  strokeLine(canvas, 22, 10, 10, 22, 0.65, COLORS.outlineSoft);
  return canvas;
}

function drawEyeTinyButtonGlint() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 7.8, 7.8, COLORS.outline);
  fillEllipse(canvas, 16, 16, 5.8, 5.8, COLORS.irisSlot);
  fillEllipse(canvas, 16, 16, 2.4, 2.4, COLORS.outline);
  fillRect(canvas, 12, 11, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeGoggleRound() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 16, 13, 13, COLORS.outline);
  fillEllipse(canvas, 16, 16, 10, 10, COLORS.outlineSoft);
  fillEllipse(canvas, 16, 16, 8.1, 8.1, COLORS.white);
  fillEllipse(canvas, 16, 16.5, 4.0, 4.8, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 1.2, 2.5, COLORS.outline);
  strokeLine(canvas, 3, 16, 7, 16, 1.1, COLORS.outline);
  fillRect(canvas, 11, 10, 3, 3, COLORS.white);
  return canvas;
}

function drawEyeCatSlit() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[4, 16], [12, 9], [25, 11], [29, 16], [24, 21], [11, 22]], COLORS.outline);
  fillPolygon(canvas, [[8, 16], [13, 12], [23, 13], [26, 16], [22, 19], [12, 19]], COLORS.white);
  fillEllipse(canvas, 17, 16.2, 4.4, 5.5, COLORS.irisSlot);
  strokeLine(canvas, 17, 11, 17, 21, 0.9, COLORS.outline);
  fillRect(canvas, 19, 13, 2, 2, COLORS.white);
  return canvas;
}

function drawEyeSquareGuard() {
  const canvas = createCanvas(32, 32);
  fillRect(canvas, 5, 10, 23, 13, COLORS.outline);
  fillRect(canvas, 8, 13, 17, 7, COLORS.white);
  fillRect(canvas, 15, 14, 3, 5, COLORS.irisSlot);
  fillRect(canvas, 16, 15, 1, 3, COLORS.outline);
  fillPolygon(canvas, [[5, 8], [28, 9], [25, 13], [7, 13]], COLORS.outline);
  return canvas;
}

function drawEyeTeary() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16, 15, 11.5, 11.7, COLORS.outline);
  fillEllipse(canvas, 16, 15, 9.2, 9.5, COLORS.white);
  fillEllipse(canvas, 16, 16, 4.7, 5.8, COLORS.irisSlot);
  fillEllipse(canvas, 16, 17, 1.3, 3.2, COLORS.outline);
  fillEllipse(canvas, 14, 20, 4.0, 3.0, COLORS.white);
  fillRect(canvas, 12, 9, 3, 3, COLORS.white);
  return canvas;
}

function drawEyeHollowMask() {
  const canvas = createCanvas(32, 32);
  fillPolygon(canvas, [[5, 14], [12, 8], [25, 10], [29, 15], [24, 22], [10, 22]], COLORS.outlineSoft);
  fillPolygon(canvas, [[8, 15], [13, 11], [23, 12], [26, 15], [22, 19], [12, 19]], COLORS.shadow);
  fillRect(canvas, 11, 13, 2, 1, COLORS.white);
  return canvas;
}

function drawEyeUpperLashSoft() {
  const canvas = createCanvas(32, 32);
  fillEllipse(canvas, 16.5, 16, 11.5, 9.2, COLORS.outline);
  fillEllipse(canvas, 16.5, 16, 9.0, 6.7, COLORS.white);
  fillEllipse(canvas, 16.5, 16.3, 3.8, 5.0, COLORS.irisSlot);
  fillEllipse(canvas, 16.5, 17, 1.1, 2.8, COLORS.outline);
  strokeLine(canvas, 6, 10, 2, 7, 0.8, COLORS.outline);
  strokeLine(canvas, 8, 8, 5, 4, 0.8, COLORS.outline);
  strokeLine(canvas, 11, 7, 10, 3, 0.7, COLORS.outline);
  fillRect(canvas, 14, 11, 2, 2, COLORS.white);
  return canvas;
}

function drawMouthSmile() {
  const canvas = createCanvas(48, 24);
  strokeCurve(canvas, 7, 41, (x) => {
    const t = (x - 24) / 15;
    return 7 + (9 * (1 - (t * t)));
  }, 2.05, COLORS.outline);
  strokeCurve(canvas, 9, 39, (x) => {
    const t = (x - 24) / 14;
    return 8.4 + (7.2 * (1 - (t * t)));
  }, 1.15, COLORS.lipSlot);
  fillRect(canvas, 7, 7, 3, 3, COLORS.outline);
  fillRect(canvas, 38, 7, 3, 3, COLORS.outline);
  return canvas;
}

function drawMouthFlat() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[9, 9], [39, 9], [39, 15], [9, 15]], COLORS.outline);
  fillPolygon(canvas, [[11, 11], [37, 11], [36, 13], [12, 13]], COLORS.lipSlot);
  return canvas;
}

function drawMouthOpen() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 24, 12, 13.5, 8.3, COLORS.outline);
  fillEllipse(canvas, 24, 12, 10.8, 6.3, COLORS.lipSlot);
  fillEllipse(canvas, 24, 13, 8.1, 4.8, COLORS.shadow);
  fillPolygon(canvas, [[17, 8], [31, 8], [29, 10], [19, 10]], COLORS.tooth);
  fillPolygon(canvas, [[18, 17], [30, 17], [27, 19], [21, 19]], COLORS.lipSlot);
  return canvas;
}

function drawMouthFrown() {
  const canvas = createCanvas(48, 24);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 15;
    return 17 - (7.5 * (1 - (t * t)));
  }, 2.05, COLORS.outline);
  strokeCurve(canvas, 10, 38, (x) => {
    const t = (x - 24) / 14;
    return 15.7 - (5.8 * (1 - (t * t)));
  }, 1.15, COLORS.lipSlot);
  fillRect(canvas, 8, 15, 3, 3, COLORS.outline);
  fillRect(canvas, 37, 15, 3, 3, COLORS.outline);
  return canvas;
}

function drawMouthGrin() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[8, 7], [12, 5], [36, 5], [40, 7], [38, 18], [10, 18]], COLORS.outline);
  fillRect(canvas, 11, 8, 26, 9, COLORS.lipSlot);
  fillRect(canvas, 13, 9, 22, 5, COLORS.tooth);
  fillRect(canvas, 18, 9, 1, 5, COLORS.outline);
  fillRect(canvas, 24, 9, 1, 5, COLORS.outline);
  fillRect(canvas, 30, 9, 1, 5, COLORS.outline);
  fillRect(canvas, 13, 14, 22, 1, COLORS.outline);
  fillRect(canvas, 10, 16, 28, 2, COLORS.outline);
  return canvas;
}

function drawMouthGrinTeeth() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[7, 7], [12, 4], [36, 4], [41, 7], [38, 19], [10, 19]], COLORS.outline);
  fillPolygon(canvas, [[11, 8], [37, 8], [35, 17], [13, 17]], COLORS.lipSlot);
  fillRect(canvas, 13, 8, 22, 6, COLORS.tooth);
  fillRect(canvas, 18, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 24, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 30, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 13, 14, 22, 1, COLORS.outline);
  fillPolygon(canvas, [[14, 15], [34, 15], [31, 18], [17, 18]], COLORS.lipSlot);
  return canvas;
}

function drawMouthOoh() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 24, 12, 8.5, 8.3, COLORS.outline);
  fillEllipse(canvas, 24, 12, 6.2, 6.1, COLORS.lipSlot);
  fillEllipse(canvas, 24, 12, 3.4, 3.6, COLORS.shadow);
  fillRect(canvas, 21, 7, 2, 2, COLORS.tooth);
  return canvas;
}

function drawMouthCat() {
  const canvas = createCanvas(48, 24);
  strokeLine(canvas, 24, 7, 24, 11, 1.15, COLORS.outline);
  strokeCurve(canvas, 12, 24, (x) => {
    const t = (x - 18) / 6;
    return 10 + (6.5 * (1 - (t * t)));
  }, 1.75, COLORS.outline);
  strokeCurve(canvas, 24, 36, (x) => {
    const t = (x - 30) / 6;
    return 10 + (6.5 * (1 - (t * t)));
  }, 1.75, COLORS.outline);
  strokeCurve(canvas, 14, 23, (x) => {
    const t = (x - 18.5) / 4.5;
    return 11 + (4.4 * (1 - (t * t)));
  }, 0.8, COLORS.lipSlot);
  strokeCurve(canvas, 25, 34, (x) => {
    const t = (x - 29.5) / 4.5;
    return 11 + (4.4 * (1 - (t * t)));
  }, 0.8, COLORS.lipSlot);
  return canvas;
}

function drawMouthTongue() {
  const canvas = createCanvas(48, 24);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 15;
    return 7.5 + (8.4 * (1 - (t * t)));
  }, 2.0, COLORS.outline);
  strokeCurve(canvas, 10, 38, (x) => {
    const t = (x - 24) / 14;
    return 8.5 + (6.3 * (1 - (t * t)));
  }, 1.05, COLORS.lipSlot);
  fillEllipse(canvas, 24, 16, 6.0, 4.5, COLORS.outline);
  fillEllipse(canvas, 24, 16, 4.2, 3.2, COLORS.lipSlot);
  strokeLine(canvas, 24, 14, 24, 18, 0.45, COLORS.outlineSoft);
  return canvas;
}

function drawMouthSadOpen() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[12, 8], [18, 5], [30, 5], [36, 8], [39, 13], [34, 21], [24, 23], [14, 21], [9, 13]], COLORS.outline);
  fillPolygon(canvas, [[14, 10], [19, 8], [29, 8], [34, 10], [36, 13], [32, 18], [24, 20], [16, 18], [12, 13]], COLORS.lipSlot);
  fillEllipse(canvas, 24, 14, 7.8, 5.5, COLORS.shadow);
  fillPolygon(canvas, [[18, 8], [30, 8], [28, 10], [20, 10]], COLORS.tooth);
  return canvas;
}

function drawMouthSmirk() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[8, 15], [16, 9], [36, 7], [42, 10], [35, 16], [12, 18]], COLORS.outline);
  fillPolygon(canvas, [[13, 14], [18, 11], [34, 9], [38, 11], [32, 14], [15, 16]], COLORS.lipSlot);
  strokeLine(canvas, 18, 13, 35, 11, 0.55, COLORS.outlineSoft);
  return canvas;
}

function drawMouthNeutralSmall() {
  const canvas = createCanvas(48, 24);
  strokeLine(canvas, 16, 12, 32, 12, 1.2, COLORS.outline);
  strokeLine(canvas, 18, 12, 30, 12, 0.55, COLORS.lipSlot);
  return canvas;
}

function drawMouthSoftSmile() {
  const canvas = createCanvas(48, 24);
  strokeCurve(canvas, 13, 35, (x) => {
    const t = (x - 24) / 10;
    return 9 + (5.6 * (1 - (t * t)));
  }, 1.45, COLORS.outline);
  strokeCurve(canvas, 15, 33, (x) => {
    const t = (x - 24) / 8.5;
    return 9.8 + (4.2 * (1 - (t * t)));
  }, 0.65, COLORS.lipSlot);
  return canvas;
}

function drawMouthWideHeroGrin() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[6, 7], [13, 4], [36, 4], [42, 8], [38, 18], [10, 18]], COLORS.outline);
  fillPolygon(canvas, [[10, 8], [38, 8], [35, 16], [13, 16]], COLORS.lipSlot);
  fillRect(canvas, 12, 8, 24, 6, COLORS.tooth);
  fillRect(canvas, 18, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 24, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 30, 8, 1, 6, COLORS.outline);
  fillRect(canvas, 12, 14, 24, 1, COLORS.outline);
  return canvas;
}

function drawMouthPursed() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[24, 6], [34, 12], [24, 18], [14, 12]], COLORS.outline);
  fillPolygon(canvas, [[24, 8], [31, 12], [24, 16], [17, 12]], COLORS.lipSlot);
  strokeLine(canvas, 20, 12, 28, 12, 0.75, COLORS.outline);
  return canvas;
}

function drawMouthTalkSide() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[11, 9], [19, 6], [36, 8], [40, 12], [34, 19], [16, 17]], COLORS.outline);
  fillPolygon(canvas, [[15, 10], [20, 8], [34, 10], [36, 12], [32, 16], [17, 15]], COLORS.lipSlot);
  fillEllipse(canvas, 25, 13, 6.4, 3.6, COLORS.shadow);
  fillRect(canvas, 18, 8, 12, 2, COLORS.tooth);
  return canvas;
}

function drawMouthLaughOpen() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 24, 12, 15.5, 8.7, COLORS.outline);
  fillEllipse(canvas, 24, 12, 12.6, 6.4, COLORS.lipSlot);
  fillEllipse(canvas, 24, 13, 9.4, 4.7, COLORS.shadow);
  fillPolygon(canvas, [[13, 7], [35, 7], [32, 11], [16, 11]], COLORS.tooth);
  fillPolygon(canvas, [[16, 17], [32, 17], [29, 20], [19, 20]], COLORS.lipSlot);
  return canvas;
}

function drawMouthBigFrown() {
  const canvas = createCanvas(48, 24);
  strokeCurve(canvas, 7, 41, (x) => {
    const t = (x - 24) / 15;
    return 19 - (9.2 * (1 - (t * t)));
  }, 2.3, COLORS.outline);
  strokeCurve(canvas, 10, 38, (x) => {
    const t = (x - 24) / 13;
    return 17.5 - (6.8 * (1 - (t * t)));
  }, 1.2, COLORS.lipSlot);
  fillRect(canvas, 8, 16, 3, 3, COLORS.outline);
  fillRect(canvas, 37, 16, 3, 3, COLORS.outline);
  return canvas;
}

function drawMouthBeardGap() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[16, 10], [32, 10], [34, 14], [30, 17], [18, 17], [14, 14]], COLORS.outline);
  fillPolygon(canvas, [[18, 12], [30, 12], [30, 14], [18, 14]], COLORS.lipSlot);
  fillRect(canvas, 20, 15, 8, 1, COLORS.outlineSoft);
  return canvas;
}

function drawMouthSeriousCut() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[11, 10], [36, 10], [39, 13], [34, 16], [12, 15], [9, 12]], COLORS.outline);
  fillPolygon(canvas, [[14, 12], [35, 12], [34, 13], [14, 13]], COLORS.lipSlot);
  fillRect(canvas, 34, 13, 3, 2, COLORS.lipSlot);
  return canvas;
}

function drawMouthSurprisedSquare() {
  const canvas = createCanvas(48, 24);
  fillRect(canvas, 18, 6, 12, 15, COLORS.outline);
  fillRect(canvas, 20, 8, 8, 11, COLORS.lipSlot);
  fillRect(canvas, 22, 10, 4, 6, COLORS.shadow);
  fillRect(canvas, 20, 8, 8, 2, COLORS.tooth);
  return canvas;
}

function drawMouthMischiefTooth() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[8, 14], [18, 8], [36, 7], [42, 10], [35, 17], [13, 18]], COLORS.outline);
  fillPolygon(canvas, [[13, 14], [19, 10], [34, 9], [38, 11], [32, 15], [15, 16]], COLORS.lipSlot);
  fillPolygon(canvas, [[30, 10], [35, 10], [32, 15]], COLORS.tooth);
  strokeLine(canvas, 18, 13, 34, 11, 0.55, COLORS.outlineSoft);
  return canvas;
}

function drawMouthSmallSmirk() {
  const canvas = createCanvas(48, 24);
  strokeLine(canvas, 17, 13, 32, 10, 1.6, COLORS.outline);
  strokeLine(canvas, 19, 13, 30, 11, 0.75, COLORS.lipSlot);
  fillRect(canvas, 31, 9, 3, 3, COLORS.outline);
  return canvas;
}

function drawMouthNervousWiggle() {
  const canvas = createCanvas(48, 24);
  strokePolyline(canvas, [[14, 12], [18, 10], [22, 13], [26, 10], [30, 13], [34, 11]], 1.5, COLORS.outline);
  strokePolyline(canvas, [[16, 12], [19, 11], [22, 12.5], [26, 11], [30, 12.5], [32, 12]], 0.6, COLORS.lipSlot);
  return canvas;
}

function drawMouthHeroTeethShort() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[13, 8], [17, 6], [32, 6], [36, 8], [34, 17], [15, 17]], COLORS.outline);
  fillPolygon(canvas, [[16, 9], [33, 9], [31, 15], [17, 15]], COLORS.lipSlot);
  fillRect(canvas, 18, 9, 12, 5, COLORS.tooth);
  fillRect(canvas, 23, 9, 1, 5, COLORS.outline);
  fillRect(canvas, 18, 14, 12, 1, COLORS.outline);
  return canvas;
}

function drawMouthElderMoustacheGap() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[18, 14], [30, 14], [32, 17], [29, 20], [19, 20], [16, 17]], COLORS.outline);
  fillRect(canvas, 20, 16, 8, 2, COLORS.lipSlot);
  fillRect(canvas, 22, 18, 4, 1, COLORS.outlineSoft);
  return canvas;
}

function drawMouthOpenTriangle() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[24, 5], [37, 19], [11, 19]], COLORS.outline);
  fillPolygon(canvas, [[24, 8], [32, 17], [16, 17]], COLORS.lipSlot);
  fillPolygon(canvas, [[24, 11], [28, 16], [20, 16]], COLORS.shadow);
  fillRect(canvas, 21, 9, 6, 2, COLORS.tooth);
  return canvas;
}

function drawMouthDuckPout() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 20, 12, 8.2, 5.6, COLORS.outline);
  fillEllipse(canvas, 28, 12, 8.2, 5.6, COLORS.outline);
  fillEllipse(canvas, 20, 12, 5.6, 3.1, COLORS.lipSlot);
  fillEllipse(canvas, 28, 12, 5.6, 3.1, COLORS.lipSlot);
  strokeLine(canvas, 18, 12, 30, 12, 0.75, COLORS.outline);
  return canvas;
}

function drawMouthSideFang() {
  const canvas = createCanvas(48, 24);
  fillPolygon(canvas, [[9, 14], [18, 9], [36, 8], [41, 11], [34, 17], [13, 18]], COLORS.outline);
  fillPolygon(canvas, [[14, 14], [19, 11], [34, 10], [37, 12], [32, 15], [16, 16]], COLORS.lipSlot);
  fillPolygon(canvas, [[32, 10], [37, 10], [34, 17]], COLORS.tooth);
  strokeLine(canvas, 18, 13, 34, 11, 0.5, COLORS.outlineSoft);
  return canvas;
}

function drawMouthFlatTired() {
  const canvas = createCanvas(48, 24);
  strokePolyline(canvas, [[12, 11], [18, 13], [30, 13], [36, 11]], 1.7, COLORS.outline);
  strokePolyline(canvas, [[15, 12], [20, 13], [28, 13], [33, 12]], 0.7, COLORS.lipSlot);
  return canvas;
}

function drawMouthSoftO() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 24, 12, 7.0, 7.2, COLORS.outline);
  fillEllipse(canvas, 24, 12, 4.6, 4.8, COLORS.lipSlot);
  fillEllipse(canvas, 24, 12, 2.3, 2.5, COLORS.shadow);
  fillRect(canvas, 22, 7, 2, 2, COLORS.tooth);
  return canvas;
}

function drawMouthBigCheer() {
  const canvas = createCanvas(48, 24);
  fillEllipse(canvas, 24, 12, 16.0, 9.4, COLORS.outline);
  fillEllipse(canvas, 24, 12, 13.0, 6.9, COLORS.lipSlot);
  fillEllipse(canvas, 24, 14, 9.8, 4.8, COLORS.shadow);
  fillPolygon(canvas, [[12, 7], [36, 7], [33, 12], [15, 12]], COLORS.tooth);
  fillRect(canvas, 20, 7, 1, 5, COLORS.outline);
  fillRect(canvas, 27, 7, 1, 5, COLORS.outline);
  return canvas;
}

function drawMouthMaskLine() {
  const canvas = createCanvas(48, 24);
  strokeLine(canvas, 18, 12, 30, 12, 1.1, COLORS.outline);
  fillRect(canvas, 20, 12, 8, 1, COLORS.lipSlot);
  return canvas;
}

function drawMouthGritSquare() {
  const canvas = createCanvas(48, 24);
  fillRect(canvas, 14, 8, 20, 10, COLORS.outline);
  fillRect(canvas, 15, 9, 18, 8, COLORS.lipSlot);
  fillRect(canvas, 17, 10, 14, 6, COLORS.tooth);
  fillRect(canvas, 17, 13, 14, 1, COLORS.outline);
  fillRect(canvas, 21, 10, 1, 6, COLORS.outline);
  fillRect(canvas, 26, 10, 1, 6, COLORS.outline);
  return canvas;
}

function drawBrowFlat() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 4], [42, 4], [44, 8], [42, 12], [6, 12], [4, 9]], COLORS.outline);
  fillPolygon(canvas, [[8, 6], [39, 6], [40, 8], [39, 10], [9, 10], [8, 9]], COLORS.browSlot);
  return canvas;
}

function drawBrowAngled() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 11], [39, 3], [43, 6], [41, 10], [8, 14]], COLORS.outline);
  fillPolygon(canvas, [[9, 10], [37, 5], [39, 7], [37, 8], [10, 12]], COLORS.browSlot);
  return canvas;
}

function drawBrowThick() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 5, 43, (x) => {
    const t = (x - 24) / 19;
    return 10 - (4.8 * (1 - (t * t)));
  }, 3.9, COLORS.outline);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 16;
    return 9.5 - (3.4 * (1 - (t * t)));
  }, 2.1, COLORS.browSlot);
  clearRect(canvas, 5, 12, 38, 4);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 16;
    return 9.5 - (3.4 * (1 - (t * t)));
  }, 1.6, COLORS.browSlot);
  return canvas;
}

function drawBrowWorried() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 6, 12, 42, 5, 3.1, COLORS.outline);
  strokeLine(canvas, 9, 11, 39, 6, 1.55, COLORS.browSlot);
  return canvas;
}

function drawBrowArch() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 6, 42, (x) => {
    const t = (x - 24) / 18;
    return 12 - (6.2 * (1 - (t * t)));
  }, 2.1, COLORS.outline);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 16;
    return 11.4 - (4.9 * (1 - (t * t)));
  }, 0.95, COLORS.browSlot);
  return canvas;
}

function drawBrowZigzag() {
  const canvas = createCanvas(48, 16);
  const points = [[5, 10], [15, 4], [25, 11], [35, 4], [43, 10]];
  strokePolyline(canvas, points, 2.8, COLORS.outline);
  strokePolyline(canvas, points.map(([x, y]) => [x, y + 0.2]), 1.25, COLORS.browSlot);
  return canvas;
}

function drawBrowThin() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 7, 8, 41, 7, 1.25, COLORS.outline);
  strokeLine(canvas, 10, 8, 38, 7.2, 0.55, COLORS.browSlot);
  return canvas;
}

function drawBrowSoftCurve() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 6, 42, (x) => {
    const t = (x - 24) / 18;
    return 10 - (3.6 * (1 - (t * t)));
  }, 2.7, COLORS.outline);
  strokeCurve(canvas, 9, 39, (x) => {
    const t = (x - 24) / 15;
    return 9.6 - (2.5 * (1 - (t * t)));
  }, 1.35, COLORS.browSlot);
  return canvas;
}

function drawBrowHeroicSlope() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 12], [39, 4], [44, 7], [41, 11], [8, 15]], COLORS.outline);
  fillPolygon(canvas, [[9, 11], [37, 6], [40, 8], [37, 9], [11, 13]], COLORS.browSlot);
  return canvas;
}

function drawBrowSadInnerUp() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 6, 5, 42, 12, 3.0, COLORS.outline);
  strokeLine(canvas, 9, 6, 39, 11, 1.45, COLORS.browSlot);
  return canvas;
}

function drawBrowDoubleDash() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 7, 9, 19, 6, 2.25, COLORS.outline);
  strokeLine(canvas, 27, 6, 41, 9, 2.25, COLORS.outline);
  strokeLine(canvas, 9, 9, 18, 7, 0.95, COLORS.browSlot);
  strokeLine(canvas, 29, 7, 39, 9, 0.95, COLORS.browSlot);
  return canvas;
}

function drawBrowBushyRound() {
  const canvas = createCanvas(48, 16);
  fillEllipse(canvas, 14, 9, 9, 4.8, COLORS.outline);
  fillEllipse(canvas, 24, 7.5, 11, 5.2, COLORS.outline);
  fillEllipse(canvas, 34, 9, 9, 4.8, COLORS.outline);
  fillEllipse(canvas, 15, 9, 6, 2.6, COLORS.browSlot);
  fillEllipse(canvas, 24, 8, 8.5, 3.0, COLORS.browSlot);
  fillEllipse(canvas, 33, 9, 6, 2.6, COLORS.browSlot);
  return canvas;
}

function drawBrowElder() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 5, 43, (x) => {
    const t = (x - 5) / 38;
    return 6 + (6.2 * t) + (1.8 * Math.sin(t * Math.PI));
  }, 2.4, COLORS.outline);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 8) / 32;
    return 6.8 + (4.6 * t) + (1.0 * Math.sin(t * Math.PI));
  }, 1.1, COLORS.browSlot);
  return canvas;
}

function drawBrowVillainHook() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 6, 37, (x) => {
    const t = (x - 6) / 31;
    return 12 - (7.6 * Math.sin(t * Math.PI * 0.85));
  }, 2.5, COLORS.outline);
  strokeLine(canvas, 36, 7, 43, 13, 2.5, COLORS.outline);
  strokeCurve(canvas, 9, 35, (x) => {
    const t = (x - 9) / 26;
    return 11 - (5.2 * Math.sin(t * Math.PI * 0.86));
  }, 1.05, COLORS.browSlot);
  strokeLine(canvas, 35, 8, 40, 12, 1.05, COLORS.browSlot);
  return canvas;
}

function drawBrowTinyDot() {
  const canvas = createCanvas(48, 16);
  fillEllipse(canvas, 19, 8, 3.2, 2.5, COLORS.outline);
  fillEllipse(canvas, 29, 8, 3.2, 2.5, COLORS.outline);
  fillEllipse(canvas, 19, 8, 1.6, 1.1, COLORS.browSlot);
  fillEllipse(canvas, 29, 8, 1.6, 1.1, COLORS.browSlot);
  return canvas;
}

function drawBrowKnitCenter() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 5], [30, 7], [43, 13], [40, 16], [26, 12], [7, 10]], COLORS.outline);
  fillPolygon(canvas, [[8, 6], [29, 8], [38, 12], [36, 14], [26, 11], [9, 9]], COLORS.browSlot);
  fillRect(canvas, 36, 12, 5, 3, COLORS.outline);
  return canvas;
}

function drawBrowHighArch() {
  const canvas = createCanvas(48, 16);
  strokeCurve(canvas, 5, 43, (x) => {
    const t = (x - 24) / 19;
    return 14 - (9.0 * (1 - (t * t)));
  }, 2.1, COLORS.outline);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 16;
    return 13.2 - (6.8 * (1 - (t * t)));
  }, 0.9, COLORS.browSlot);
  return canvas;
}

function drawBrowLowHeavy() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[4, 8], [43, 7], [45, 12], [41, 16], [7, 15], [3, 12]], COLORS.outline);
  fillPolygon(canvas, [[8, 10], [40, 9], [41, 12], [38, 14], [9, 13]], COLORS.browSlot);
  return canvas;
}

function drawBrowShortWorry() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 12, 12, 34, 5, 2.7, COLORS.outline);
  strokeLine(canvas, 15, 11, 32, 6, 1.1, COLORS.browSlot);
  return canvas;
}

function drawBrowSplitScar() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 10], [40, 5], [43, 8], [39, 12], [6, 15]], COLORS.outline);
  fillPolygon(canvas, [[9, 10], [37, 7], [39, 8], [36, 10], [10, 13]], COLORS.browSlot);
  clearRect(canvas, 25, 5, 4, 10);
  strokeLine(canvas, 27, 4, 23, 15, 0.75, COLORS.outlineSoft);
  return canvas;
}

function drawBrowRoundThickSoft() {
  const canvas = createCanvas(48, 16);
  fillEllipse(canvas, 24, 9, 19, 6, COLORS.outline);
  fillEllipse(canvas, 24, 9, 15, 3.8, COLORS.browSlot);
  clearRect(canvas, 5, 12, 38, 5);
  strokeCurve(canvas, 8, 40, (x) => {
    const t = (x - 24) / 16;
    return 9.5 - (2.5 * (1 - (t * t)));
  }, 1.7, COLORS.browSlot);
  return canvas;
}

function drawBrowElfSweep() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[4, 12], [25, 5], [45, 3], [41, 8], [25, 10], [7, 15]], COLORS.outline);
  fillPolygon(canvas, [[8, 12], [26, 7], [40, 5], [38, 7], [25, 9], [10, 13]], COLORS.browSlot);
  return canvas;
}

function drawBrowFlatMicro() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 16, 8, 32, 8, 1.2, COLORS.outline);
  fillRect(canvas, 18, 8, 12, 1, COLORS.browSlot);
  return canvas;
}

function drawBrowAngryBlock() {
  const canvas = createCanvas(48, 16);
  fillPolygon(canvas, [[5, 13], [36, 4], [44, 7], [40, 13], [9, 16]], COLORS.outline);
  fillPolygon(canvas, [[9, 12], [35, 6], [39, 8], [36, 11], [11, 14]], COLORS.browSlot);
  fillRect(canvas, 35, 6, 6, 5, COLORS.outline);
  return canvas;
}

function drawBrowQuestionTilt() {
  const canvas = createCanvas(48, 16);
  strokeLine(canvas, 8, 10, 23, 6, 2.2, COLORS.outline);
  strokeLine(canvas, 27, 5, 41, 11, 2.2, COLORS.outline);
  strokeLine(canvas, 10, 10, 22, 7, 0.9, COLORS.browSlot);
  strokeLine(canvas, 29, 6, 39, 10, 0.9, COLORS.browSlot);
  fillEllipse(canvas, 42, 13, 1.6, 1.2, COLORS.outline);
  fillEllipse(canvas, 42, 13, 0.6, 0.5, COLORS.browSlot);
  return canvas;
}

const SPRITES = Object.freeze([
  { id: 'eye_oval', kind: 'eye', file: 'eye_oval.png', draw: drawEyeOval },
  { id: 'eye_dot', kind: 'eye', file: 'eye_dot.png', draw: drawEyeDot },
  { id: 'eye_halfmoon', kind: 'eye', file: 'eye_halfmoon.png', draw: drawEyeHalfmoon },
  { id: 'eye_angry', kind: 'eye', file: 'eye_angry.png', draw: drawEyeAngry },
  { id: 'eye_star', kind: 'eye', file: 'eye_star.png', draw: drawEyeStar },
  { id: 'eye_lash', kind: 'eye', file: 'eye_lash.png', draw: drawEyeLash },
  { id: 'eye_round_big', kind: 'eye', file: 'eye_round_big.png', draw: drawEyeRoundBig },
  { id: 'eye_almond', kind: 'eye', file: 'eye_almond.png', draw: drawEyeAlmond },
  { id: 'eye_happy_closed', kind: 'eye', file: 'eye_happy_closed.png', draw: drawEyeHappyClosed, tintSlots: {} },
  { id: 'eye_sad_closed', kind: 'eye', file: 'eye_sad_closed.png', draw: drawEyeSadClosed, tintSlots: {} },
  { id: 'eye_wink', kind: 'eye', file: 'eye_wink.png', draw: drawEyeWink },
  { id: 'eye_surprised', kind: 'eye', file: 'eye_surprised.png', draw: drawEyeSurprised },
  { id: 'eye_side_glance', kind: 'eye', file: 'eye_side_glance.png', draw: drawEyeSideGlance },
  { id: 'eye_heart', kind: 'eye', file: 'eye_heart.png', draw: drawEyeHeart },
  { id: 'eye_robot', kind: 'eye', file: 'eye_robot.png', draw: drawEyeRobot },
  { id: 'eye_sleepy_lid', kind: 'eye', file: 'eye_sleepy_lid.png', draw: drawEyeSleepyLid },
  { id: 'eye_sharp_hero', kind: 'eye', file: 'eye_sharp_hero.png', draw: drawEyeSharpHero },
  { id: 'eye_dot_tiny', kind: 'eye', file: 'eye_dot_tiny.png', draw: drawEyeDotTiny },
  { id: 'eye_big_sparkle', kind: 'eye', file: 'eye_big_sparkle.png', draw: drawEyeBigSparkle },
  { id: 'eye_downcast', kind: 'eye', file: 'eye_downcast.png', draw: drawEyeDowncast },
  { id: 'eye_masked_slit', kind: 'eye', file: 'eye_masked_slit.png', draw: drawEyeMaskedSlit },
  { id: 'eye_button', kind: 'eye', file: 'eye_button.png', draw: drawEyeButton },
  { id: 'eye_diamond', kind: 'eye', file: 'eye_diamond.png', draw: drawEyeDiamond },
  { id: 'eye_old_wrinkle', kind: 'eye', file: 'eye_old_wrinkle.png', draw: drawEyeOldWrinkle },
  { id: 'eye_blank_glow', kind: 'eye', file: 'eye_blank_glow.png', draw: drawEyeBlankGlow, tintSlots: {} },
  { id: 'eye_leaf_elf', kind: 'eye', file: 'eye_leaf_elf.png', draw: drawEyeLeafElf },
  { id: 'eye_hooded_n64', kind: 'eye', file: 'eye_hooded_n64.png', draw: drawEyeHoodedN64 },
  { id: 'eye_wide_wonder', kind: 'eye', file: 'eye_wide_wonder.png', draw: drawEyeWideWonder },
  { id: 'eye_sly_side', kind: 'eye', file: 'eye_sly_side.png', draw: drawEyeSlySide },
  { id: 'eye_cross_sleep', kind: 'eye', file: 'eye_cross_sleep.png', draw: drawEyeCrossSleep, tintSlots: {} },
  { id: 'eye_tiny_button_glint', kind: 'eye', file: 'eye_tiny_button_glint.png', draw: drawEyeTinyButtonGlint },
  { id: 'eye_goggle_round', kind: 'eye', file: 'eye_goggle_round.png', draw: drawEyeGoggleRound },
  { id: 'eye_cat_slit', kind: 'eye', file: 'eye_cat_slit.png', draw: drawEyeCatSlit },
  { id: 'eye_square_guard', kind: 'eye', file: 'eye_square_guard.png', draw: drawEyeSquareGuard },
  { id: 'eye_teary', kind: 'eye', file: 'eye_teary.png', draw: drawEyeTeary },
  { id: 'eye_hollow_mask', kind: 'eye', file: 'eye_hollow_mask.png', draw: drawEyeHollowMask, tintSlots: {} },
  { id: 'eye_upper_lash_soft', kind: 'eye', file: 'eye_upper_lash_soft.png', draw: drawEyeUpperLashSoft },
  { id: 'mouth_smile', kind: 'mouth', file: 'mouth_smile.png', draw: drawMouthSmile },
  { id: 'mouth_flat', kind: 'mouth', file: 'mouth_flat.png', draw: drawMouthFlat },
  { id: 'mouth_open', kind: 'mouth', file: 'mouth_open.png', draw: drawMouthOpen },
  { id: 'mouth_frown', kind: 'mouth', file: 'mouth_frown.png', draw: drawMouthFrown },
  { id: 'mouth_grin', kind: 'mouth', file: 'mouth_grin.png', draw: drawMouthGrin },
  { id: 'mouth_grin_teeth', kind: 'mouth', file: 'mouth_grin_teeth.png', draw: drawMouthGrinTeeth },
  { id: 'mouth_ooh', kind: 'mouth', file: 'mouth_ooh.png', draw: drawMouthOoh },
  { id: 'mouth_cat', kind: 'mouth', file: 'mouth_cat.png', draw: drawMouthCat },
  { id: 'mouth_tongue', kind: 'mouth', file: 'mouth_tongue.png', draw: drawMouthTongue },
  { id: 'mouth_sad_open', kind: 'mouth', file: 'mouth_sad_open.png', draw: drawMouthSadOpen },
  { id: 'mouth_smirk', kind: 'mouth', file: 'mouth_smirk.png', draw: drawMouthSmirk },
  { id: 'mouth_neutral_small', kind: 'mouth', file: 'mouth_neutral_small.png', draw: drawMouthNeutralSmall },
  { id: 'mouth_soft_smile', kind: 'mouth', file: 'mouth_soft_smile.png', draw: drawMouthSoftSmile },
  { id: 'mouth_wide_hero_grin', kind: 'mouth', file: 'mouth_wide_hero_grin.png', draw: drawMouthWideHeroGrin },
  { id: 'mouth_pursed', kind: 'mouth', file: 'mouth_pursed.png', draw: drawMouthPursed },
  { id: 'mouth_talk_side', kind: 'mouth', file: 'mouth_talk_side.png', draw: drawMouthTalkSide },
  { id: 'mouth_laugh_open', kind: 'mouth', file: 'mouth_laugh_open.png', draw: drawMouthLaughOpen },
  { id: 'mouth_big_frown', kind: 'mouth', file: 'mouth_big_frown.png', draw: drawMouthBigFrown },
  { id: 'mouth_beard_gap', kind: 'mouth', file: 'mouth_beard_gap.png', draw: drawMouthBeardGap },
  { id: 'mouth_serious_cut', kind: 'mouth', file: 'mouth_serious_cut.png', draw: drawMouthSeriousCut },
  { id: 'mouth_surprised_square', kind: 'mouth', file: 'mouth_surprised_square.png', draw: drawMouthSurprisedSquare },
  { id: 'mouth_mischief_tooth', kind: 'mouth', file: 'mouth_mischief_tooth.png', draw: drawMouthMischiefTooth },
  { id: 'mouth_small_smirk', kind: 'mouth', file: 'mouth_small_smirk.png', draw: drawMouthSmallSmirk },
  { id: 'mouth_nervous_wiggle', kind: 'mouth', file: 'mouth_nervous_wiggle.png', draw: drawMouthNervousWiggle },
  { id: 'mouth_hero_teeth_short', kind: 'mouth', file: 'mouth_hero_teeth_short.png', draw: drawMouthHeroTeethShort },
  { id: 'mouth_elder_moustache_gap', kind: 'mouth', file: 'mouth_elder_moustache_gap.png', draw: drawMouthElderMoustacheGap },
  { id: 'mouth_open_triangle', kind: 'mouth', file: 'mouth_open_triangle.png', draw: drawMouthOpenTriangle },
  { id: 'mouth_duck_pout', kind: 'mouth', file: 'mouth_duck_pout.png', draw: drawMouthDuckPout },
  { id: 'mouth_side_fang', kind: 'mouth', file: 'mouth_side_fang.png', draw: drawMouthSideFang },
  { id: 'mouth_flat_tired', kind: 'mouth', file: 'mouth_flat_tired.png', draw: drawMouthFlatTired },
  { id: 'mouth_soft_o', kind: 'mouth', file: 'mouth_soft_o.png', draw: drawMouthSoftO },
  { id: 'mouth_big_cheer', kind: 'mouth', file: 'mouth_big_cheer.png', draw: drawMouthBigCheer },
  { id: 'mouth_mask_line', kind: 'mouth', file: 'mouth_mask_line.png', draw: drawMouthMaskLine },
  { id: 'mouth_grit_square', kind: 'mouth', file: 'mouth_grit_square.png', draw: drawMouthGritSquare },
  { id: 'brow_flat', kind: 'brow', file: 'brow_flat.png', draw: drawBrowFlat },
  { id: 'brow_angled', kind: 'brow', file: 'brow_angled.png', draw: drawBrowAngled },
  { id: 'brow_thick', kind: 'brow', file: 'brow_thick.png', draw: drawBrowThick },
  { id: 'brow_worried', kind: 'brow', file: 'brow_worried.png', draw: drawBrowWorried },
  { id: 'brow_arch', kind: 'brow', file: 'brow_arch.png', draw: drawBrowArch },
  { id: 'brow_zigzag', kind: 'brow', file: 'brow_zigzag.png', draw: drawBrowZigzag },
  { id: 'brow_thin', kind: 'brow', file: 'brow_thin.png', draw: drawBrowThin },
  { id: 'brow_soft_curve', kind: 'brow', file: 'brow_soft_curve.png', draw: drawBrowSoftCurve },
  { id: 'brow_heroic_slope', kind: 'brow', file: 'brow_heroic_slope.png', draw: drawBrowHeroicSlope },
  { id: 'brow_sad_inner_up', kind: 'brow', file: 'brow_sad_inner_up.png', draw: drawBrowSadInnerUp },
  { id: 'brow_double_dash', kind: 'brow', file: 'brow_double_dash.png', draw: drawBrowDoubleDash },
  { id: 'brow_bushy_round', kind: 'brow', file: 'brow_bushy_round.png', draw: drawBrowBushyRound },
  { id: 'brow_elder', kind: 'brow', file: 'brow_elder.png', draw: drawBrowElder },
  { id: 'brow_villain_hook', kind: 'brow', file: 'brow_villain_hook.png', draw: drawBrowVillainHook },
  { id: 'brow_tiny_dot', kind: 'brow', file: 'brow_tiny_dot.png', draw: drawBrowTinyDot },
  { id: 'brow_knit_center', kind: 'brow', file: 'brow_knit_center.png', draw: drawBrowKnitCenter },
  { id: 'brow_high_arch', kind: 'brow', file: 'brow_high_arch.png', draw: drawBrowHighArch },
  { id: 'brow_low_heavy', kind: 'brow', file: 'brow_low_heavy.png', draw: drawBrowLowHeavy },
  { id: 'brow_short_worry', kind: 'brow', file: 'brow_short_worry.png', draw: drawBrowShortWorry },
  { id: 'brow_split_scar', kind: 'brow', file: 'brow_split_scar.png', draw: drawBrowSplitScar },
  { id: 'brow_round_thick_soft', kind: 'brow', file: 'brow_round_thick_soft.png', draw: drawBrowRoundThickSoft },
  { id: 'brow_elf_sweep', kind: 'brow', file: 'brow_elf_sweep.png', draw: drawBrowElfSweep },
  { id: 'brow_flat_micro', kind: 'brow', file: 'brow_flat_micro.png', draw: drawBrowFlatMicro },
  { id: 'brow_angry_block', kind: 'brow', file: 'brow_angry_block.png', draw: drawBrowAngryBlock },
  { id: 'brow_question_tilt', kind: 'brow', file: 'brow_question_tilt.png', draw: drawBrowQuestionTilt },
]);

function writeSprite(file, canvas) {
  fs.writeFileSync(path.join(SPRITE_DIR, file), encodePng(canvas.width, canvas.height, canvas.pixels));
}

function writeManifest() {
  const manifest = SPRITES.map(({ id, kind, file, tintSlots }) => ({
    id,
    kind,
    file,
    tintSlots: tintSlots || TINT_SLOTS[kind],
  }));
  fs.writeFileSync(`${MANIFEST_PATH}`, `${JSON.stringify(manifest, null, 2)}\n`);
}

function blitScaled(source, target, x, y, scale = 1) {
  for (let sy = 0; sy < source.height; sy += 1) {
    for (let sx = 0; sx < source.width; sx += 1) {
      const color = getPixel(source, sx, sy);
      if (color[3] === 0) continue;
      fillRect(target, x + (sx * scale), y + (sy * scale), scale, scale, color);
    }
  }
}

function drawCellBackground(canvas, x, y, width, height, index) {
  fillRect(canvas, x, y, width, height, index % 2 === 0 ? COLORS.sheetCell : COLORS.sheetCellAlt);
  for (let py = y; py < y + height; py += 8) {
    for (let px = x; px < x + width; px += 8) {
      if (((px + py) / 8) % 2 === 0) fillRect(canvas, px, py, 8, 8, [47, 47, 52, 255]);
    }
  }
  strokeLine(canvas, x, y, x + width - 1, y, 0.5, COLORS.sheetGrid);
  strokeLine(canvas, x, y + height - 1, x + width - 1, y + height - 1, 0.5, COLORS.sheetGrid);
  strokeLine(canvas, x, y, x, y + height - 1, 0.5, COLORS.sheetGrid);
  strokeLine(canvas, x + width - 1, y, x + width - 1, y + height - 1, 0.5, COLORS.sheetGrid);
}

function writeContactSheet(spriteCanvases) {
  const columns = 6;
  const cellWidth = 112;
  const cellHeight = 80;
  const margin = 8;
  const rows = ['eye', 'mouth', 'brow'].flatMap((kind) => {
    const sprites = SPRITES.filter((sprite) => sprite.kind === kind);
    const chunks = [];
    for (let index = 0; index < sprites.length; index += columns) {
      chunks.push(sprites.slice(index, index + columns));
    }
    return chunks;
  });
  const sheet = createCanvas((margin * 2) + (columns * cellWidth), (margin * 2) + (rows.length * cellHeight), COLORS.sheetBg);

  rows.forEach((row, rowIndex) => {
    for (let column = 0; column < columns; column += 1) {
      const cellX = margin + (column * cellWidth);
      const cellY = margin + (rowIndex * cellHeight);
      drawCellBackground(sheet, cellX, cellY, cellWidth - 4, cellHeight - 4, rowIndex + column);
      const sprite = row[column];
      if (!sprite) continue;
      const canvas = spriteCanvases.get(sprite.id);
      const scale = 2;
      const x = cellX + Math.floor(((cellWidth - 4) - (canvas.width * scale)) / 2);
      const y = cellY + Math.floor(((cellHeight - 4) - (canvas.height * scale)) / 2);
      blitScaled(canvas, sheet, x, y, scale);
    }
  });

  fs.mkdirSync(DOC_DIR, { recursive: true });
  fs.writeFileSync(CONTACT_SHEET_PATH, encodePng(sheet.width, sheet.height, sheet.pixels));
}

fs.mkdirSync(SPRITE_DIR, { recursive: true });
fs.mkdirSync(DOC_DIR, { recursive: true });

const spriteCanvases = new Map();
SPRITES.forEach((sprite) => {
  const canvas = sprite.draw();
  spriteCanvases.set(sprite.id, canvas);
  writeSprite(sprite.file, canvas);
});
writeManifest();
writeContactSheet(spriteCanvases);

console.log(`Wrote ${SPRITES.length} avatar sprites and ${CONTACT_SHEET_PATH}.`);
