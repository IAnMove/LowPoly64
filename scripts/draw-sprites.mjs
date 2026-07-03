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

const SPRITES = Object.freeze([
  { id: 'eye_oval', kind: 'eye', file: 'eye_oval.png', draw: drawEyeOval },
  { id: 'eye_dot', kind: 'eye', file: 'eye_dot.png', draw: drawEyeDot },
  { id: 'eye_halfmoon', kind: 'eye', file: 'eye_halfmoon.png', draw: drawEyeHalfmoon },
  { id: 'eye_angry', kind: 'eye', file: 'eye_angry.png', draw: drawEyeAngry },
  { id: 'eye_star', kind: 'eye', file: 'eye_star.png', draw: drawEyeStar },
  { id: 'eye_lash', kind: 'eye', file: 'eye_lash.png', draw: drawEyeLash },
  { id: 'mouth_smile', kind: 'mouth', file: 'mouth_smile.png', draw: drawMouthSmile },
  { id: 'mouth_flat', kind: 'mouth', file: 'mouth_flat.png', draw: drawMouthFlat },
  { id: 'mouth_open', kind: 'mouth', file: 'mouth_open.png', draw: drawMouthOpen },
  { id: 'mouth_frown', kind: 'mouth', file: 'mouth_frown.png', draw: drawMouthFrown },
  { id: 'mouth_grin', kind: 'mouth', file: 'mouth_grin.png', draw: drawMouthGrin },
  { id: 'brow_flat', kind: 'brow', file: 'brow_flat.png', draw: drawBrowFlat },
  { id: 'brow_angled', kind: 'brow', file: 'brow_angled.png', draw: drawBrowAngled },
  { id: 'brow_thick', kind: 'brow', file: 'brow_thick.png', draw: drawBrowThick },
]);

function writeSprite(file, canvas) {
  fs.writeFileSync(path.join(SPRITE_DIR, file), encodePng(canvas.width, canvas.height, canvas.pixels));
}

function writeManifest() {
  const manifest = SPRITES.map(({ id, kind, file }) => ({
    id,
    kind,
    file,
    tintSlots: TINT_SLOTS[kind],
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
  const rows = [
    SPRITES.filter((sprite) => sprite.kind === 'eye'),
    SPRITES.filter((sprite) => sprite.kind === 'mouth'),
    SPRITES.filter((sprite) => sprite.kind === 'brow'),
  ];
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
