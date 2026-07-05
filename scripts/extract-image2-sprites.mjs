import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SPRITE_DIR = path.join(ROOT, 'src', 'data', 'avatar', 'sprites');
const DOC_DIR = path.join(ROOT, 'docs', 'avatar-sprites');

const SOURCES = Object.freeze({
  eye: Object.freeze({
    source: path.join(DOC_DIR, 'h9-image2-eyes-source.png'),
    cols: 4,
    rows: 3,
    width: 32,
    height: 32,
    mode: 'chroma',
    entries: Object.freeze([
      'eye_image2_hero_oval',
      'eye_image2_sleepy_lid',
      'eye_image2_fierce_slash',
      'eye_image2_side_suspicious',
      'eye_image2_panic_wide',
      'eye_image2_noble_narrow',
      'eye_image2_child_round',
      'eye_image2_hooded_shadow',
      'eye_image2_tear_sad',
      'eye_image2_mask_diamond',
      'eye_image2_robot_led',
      'eye_image2_ko_x',
    ]),
  }),
  brow: Object.freeze({
    source: path.join(DOC_DIR, 'h9-image2-brows-source.png'),
    cols: 4,
    rows: 3,
    width: 48,
    height: 16,
    mode: 'chroma',
    entries: Object.freeze([
      'brow_image2_hero_flat',
      'brow_image2_raised_curve',
      'brow_image2_angry_slash',
      'brow_image2_sad_inner',
      'brow_image2_noble_arch',
      'brow_image2_elder_bushy',
      'brow_image2_villain_hook',
      'brow_image2_panic_high',
      'brow_image2_child_soft',
      'brow_image2_robot_bar',
      'brow_image2_broken_scar',
      'brow_image2_mask_chevron',
    ]),
  }),
  mouth: Object.freeze({
    source: path.join(DOC_DIR, 'h9-image2-mouths-source.png'),
    cols: 4,
    rows: 3,
    width: 48,
    height: 24,
    mode: 'chroma',
    entries: Object.freeze([
      'mouth_image2_hero_smile',
      'mouth_image2_neutral_flat',
      'mouth_image2_open_shout',
      'mouth_image2_frown_down',
      'mouth_image2_tooth_grin',
      'mouth_image2_wide_laugh',
      'mouth_image2_clenched_teeth',
      'mouth_image2_angry_zigzag',
      'mouth_image2_side_smirk',
      'mouth_image2_sad_quiver',
      'mouth_image2_whisper_side',
      'mouth_image2_robot_grille',
    ]),
  }),
  fullface: Object.freeze({
    source: path.join(DOC_DIR, 'h9-image2-hero-fullfaces-source.png'),
    cols: 4,
    rows: 3,
    width: 96,
    height: 96,
    mode: 'fullface',
    entries: Object.freeze([
      'fullface_image2_elf_hero',
      'fullface_image2_young_hero',
      'fullface_image2_knight_hero',
      'fullface_image2_rogue_hero',
      'fullface_image2_mage_hero',
      'fullface_image2_warrior_hero',
      'fullface_image2_ranger_hero',
      'fullface_image2_prince_hero',
      'fullface_image2_veteran_hero',
      'fullface_image2_child_hero',
      'fullface_image2_rival_hero',
      'fullface_image2_spirit_hero',
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

function cropEntry(config, id, index) {
  const { width: sourceWidth, height: sourceHeight } = identifySize(config.source);
  const cellW = Math.floor(sourceWidth / config.cols);
  const cellH = Math.floor(sourceHeight / config.rows);
  const col = index % config.cols;
  const row = Math.floor(index / config.cols);
  const inset = config.mode === 'fullface' ? 10 : 12;
  const cropW = Math.max(1, cellW - (inset * 2));
  const cropH = Math.max(1, cellH - (inset * 2));
  const x = (col * cellW) + inset;
  const y = (row * cellH) + inset;
  const out = path.join(SPRITE_DIR, `${id}.png`);
  const geometry = `${cropW}x${cropH}+${x}+${y}`;

  if (config.mode === 'fullface') {
    magick([
      config.source,
      '-crop', geometry,
      '+repage',
      '-fuzz', '8%',
      '-trim',
      '+repage',
      '-shave', '8x8',
      '-filter', 'Point',
      '-resize', `${config.width}x${config.height}!`,
      '-alpha', 'off',
      '-define', 'png:color-type=6',
      out,
    ]);
    normalizeIrisPlaceholder(out);
    return out;
  }

  magick([
    config.source,
    '-crop', geometry,
    '+repage',
    '-alpha', 'set',
    '-fuzz', '28%',
    '-transparent', '#00ff00',
    '-trim',
    '+repage',
    '-filter', 'Point',
    '-resize', `${config.width}x${config.height}`,
    '-gravity', 'center',
    '-background', 'none',
    '-extent', `${config.width}x${config.height}`,
    '-channel', 'A',
    '-fx', 'g > 0.08 && g > r * 1.25 && g > b * 1.25 ? 0 : a',
    '+channel',
    '-define', 'png:color-type=6',
    out,
  ]);
  return out;
}

function buildContactSheet(files) {
  const out = path.join(DOC_DIR, 'h9-image2-contact.png');
  magick([
    'montage',
    ...files,
    '-tile', '12x4',
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
  console.log(`Extracted ${extracted.length} Image2 sprites.`);
}

main();
