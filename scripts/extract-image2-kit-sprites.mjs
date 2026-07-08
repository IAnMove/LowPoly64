#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SPRITE_DIR = path.join(ROOT, 'src', 'data', 'avatar', 'sprites');
const DOC_DIR = path.join(ROOT, 'docs', 'avatar-sprites');

const SOURCES = Object.freeze({
  eye: Object.freeze({
    source: path.join(DOC_DIR, 'h11-image2-kit-eyes-source.png'),
    cols: 4,
    rows: 2,
    width: 32,
    height: 32,
    entries: Object.freeze([
      'eye_image2_determined_almond',
      'eye_image2_round_surprise',
      'eye_image2_crescent_focus',
      'eye_image2_sly_side_lid',
      'eye_image2_razor_fierce',
      'eye_image2_soft_round',
      'eye_image2_diamond_focus',
      'eye_image2_tired_downcast',
    ]),
  }),
  brow: Object.freeze({
    source: path.join(DOC_DIR, 'h11-image2-kit-brows-source.png'),
    cols: 4,
    rows: 2,
    width: 48,
    height: 16,
    entries: Object.freeze([
      'brow_image2_thick_wedge',
      'brow_image2_noble_curve',
      'brow_image2_sharp_sweep',
      'brow_image2_peak_chevron',
      'brow_image2_bushy_wild',
      'brow_image2_soft_arc',
      'brow_image2_split_scar',
      'brow_image2_mask_v',
    ]),
  }),
  mouth: Object.freeze({
    source: path.join(DOC_DIR, 'h11-image2-kit-mouths-source.png'),
    cols: 4,
    rows: 2,
    width: 48,
    height: 24,
    entries: Object.freeze([
      'mouth_image2_small_hero_smile',
      'mouth_image2_serious_line',
      'mouth_image2_round_shout',
      'mouth_image2_soft_frown',
      'mouth_image2_big_tooth_grin',
      'mouth_image2_open_laugh',
      'mouth_image2_sly_smirk',
      'mouth_image2_clenched_grid',
    ]),
  }),
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

function normalizeEyeSprite(file) {
  magick([
    file,
    '-alpha', 'set',
    '-fuzz', '28%',
    '-fill', '#ff00ff',
    '-opaque', '#ff00ff',
    '-fuzz', '10%',
    '-fill', '#ffffff',
    '-opaque', '#ffffff',
    '-define', 'png:color-type=6',
    file,
  ]);
}

function cropEntry(config, id, index) {
  const { width: sourceWidth, height: sourceHeight } = identifySize(config.source);
  const col = index % config.cols;
  const row = Math.floor(index / config.cols);
  const left = Math.round((sourceWidth * col) / config.cols);
  const top = Math.round((sourceHeight * row) / config.rows);
  const right = Math.round((sourceWidth * (col + 1)) / config.cols);
  const bottom = Math.round((sourceHeight * (row + 1)) / config.rows);
  const inset = 8;
  const cropW = Math.max(1, (right - left) - (inset * 2));
  const cropH = Math.max(1, (bottom - top) - (inset * 2));
  const geometry = `${cropW}x${cropH}+${left + inset}+${top + inset}`;
  const out = path.join(SPRITE_DIR, `${id}.png`);

  magick([
    config.source,
    '-crop', geometry,
    '+repage',
    '-alpha', 'set',
    '-fuzz', '24%',
    '-transparent', '#00ff00',
    '-channel', 'A',
    '-fx', 'g > 0.08 && g > r * 1.2 && g > b * 1.2 ? 0 : a',
    '+channel',
    '-trim',
    '+repage',
    '-filter', 'Point',
    '-resize', `${config.width}x${config.height}`,
    '-gravity', 'center',
    '-background', 'none',
    '-extent', `${config.width}x${config.height}`,
    '-define', 'png:color-type=6',
    out,
  ]);

  if (id.startsWith('eye_')) normalizeEyeSprite(out);
  return out;
}

function buildContactSheet(files) {
  const out = path.join(DOC_DIR, 'h11-image2-kit-contact.png');
  magick([
    'montage',
    ...files,
    '-tile', '8x3',
    '-geometry', '96x96+10+10',
    '-background', '#111827',
    out,
  ]);
}

function main() {
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  const extracted = [];
  Object.values(SOURCES).forEach((config) => {
    if (!fs.existsSync(config.source)) {
      throw new Error(`Missing source sheet: ${path.relative(ROOT, config.source)}`);
    }
    config.entries.forEach((id, index) => {
      extracted.push(cropEntry(config, id, index));
    });
  });
  buildContactSheet(extracted);
  console.log(`Extracted ${extracted.length} H11 Image2 kit sprites.`);
}

main();
