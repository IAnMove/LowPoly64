import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SPRITE_DIR = path.join(ROOT, 'src', 'data', 'avatar', 'sprites');
const DOC_DIR = path.join(ROOT, 'docs', 'avatar-sprites');
const SOURCE = path.join(DOC_DIR, 'h10-image2-transparent-fullfaces-alpha-source.png');
const CONTACT = path.join(DOC_DIR, 'h10-image2-transparent-fullfaces-contact.png');

const SHEET = Object.freeze({
  cols: 4,
  rows: 3,
  size: 96,
  entries: Object.freeze([
    'fullface_image2_transparent_brave_neutral',
    'fullface_image2_transparent_young_happy',
    'fullface_image2_transparent_angry_knight',
    'fullface_image2_transparent_rogue_smirk',
    'fullface_image2_transparent_sleepy_veteran',
    'fullface_image2_transparent_worried_child',
    'fullface_image2_transparent_noble_arch',
    'fullface_image2_transparent_warrior_shout',
    'fullface_image2_transparent_sad_frown',
    'fullface_image2_transparent_spirit_diamond',
    'fullface_image2_transparent_robot_led',
    'fullface_image2_transparent_rival_glare',
  ]),
});

function magick(args) {
  execFileSync('magick', args, { stdio: 'inherit' });
}

function identifySize(file) {
  const output = execFileSync('magick', ['identify', '-format', '%w %h', file], { encoding: 'utf8' });
  const [width, height] = output.trim().split(/\s+/).map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error(`Could not identify dimensions for ${file}`);
  }
  return { width, height };
}

function normalizeIrisPlaceholder(file) {
  magick([
    file,
    '-alpha', 'set',
    '-fuzz', '30%',
    '-fill', '#ff00ff',
    '-opaque', '#ff00ff',
    '-define', 'png:color-type=6',
    file,
  ]);
}

function cellBounds(sourceWidth, sourceHeight, index) {
  const col = index % SHEET.cols;
  const row = Math.floor(index / SHEET.cols);
  const x0 = Math.round((col / SHEET.cols) * sourceWidth);
  const x1 = Math.round(((col + 1) / SHEET.cols) * sourceWidth);
  const y0 = Math.round((row / SHEET.rows) * sourceHeight);
  const y1 = Math.round(((row + 1) / SHEET.rows) * sourceHeight);
  const cellW = x1 - x0;
  const cellH = y1 - y0;
  const side = Math.min(cellW, cellH);
  const x = x0 + Math.round((cellW - side) / 2);
  const y = y0 + Math.round((cellH - side) / 2);
  return { x, y, side };
}

function cropEntry(id, index, sourceSize) {
  const { x, y, side } = cellBounds(sourceSize.width, sourceSize.height, index);
  const out = path.join(SPRITE_DIR, `${id}.png`);
  magick([
    SOURCE,
    '-crop', `${side}x${side}+${x}+${y}`,
    '+repage',
    '-filter', 'Point',
    '-resize', `${SHEET.size}x${SHEET.size}!`,
    '-alpha', 'set',
    '-background', 'none',
    '-define', 'png:color-type=6',
    out,
  ]);
  normalizeIrisPlaceholder(out);
  return out;
}

function buildContactSheet(files) {
  magick([
    'montage',
    ...files,
    '-tile', `${SHEET.cols}x${SHEET.rows}`,
    '-geometry', `${SHEET.size}x${SHEET.size}+12+12`,
    '-background', '#111827',
    CONTACT,
  ]);
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing source sheet: ${path.relative(ROOT, SOURCE)}`);
  }
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  fs.mkdirSync(DOC_DIR, { recursive: true });

  const sourceSize = identifySize(SOURCE);
  const files = SHEET.entries.map((id, index) => cropEntry(id, index, sourceSize));
  buildContactSheet(files);
  console.log(`Extracted ${files.length} transparent Image2 fullface sprites.`);
}

main();
