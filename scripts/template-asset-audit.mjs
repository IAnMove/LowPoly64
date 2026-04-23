import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE_ROOT = path.join('src', 'data', 'templates');
const ROLE_REQUIRED_ROOTS = new Set(['characters', 'monsters']);
const VALID_ASSET_ROLES = new Set([
  'playable',
  'characterModel',
  'companion',
  'reference',
  'mold',
  'study',
]);
const ROLE_REQUIRED_PATTERN = /(_reference|_mold|_study|voxel_test|_cm$)/i;
const FACIAL_DETAIL_PATTERN = /OJO|EYE|PUPIL|PUPILA|BOCA|MOUTH|CEJA|BROW|NARIZ|NOSE|TEETH|TOOTH|JAW|LIP|SOCKET/i;

function walkJsonFiles(root) {
  const files = [];
  const stack = [root];

  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function readTemplate(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file}: invalid JSON (${error.message})`);
  }
}

function getTemplateFolder(file) {
  const relative = path.relative(TEMPLATE_ROOT, file);
  return relative.split(path.sep)[0] || '';
}

function auditTemplate(file, template) {
  const failures = [];
  const id = String(template.id || path.basename(file, '.json'));
  const pieces = Array.isArray(template.pieces) ? template.pieces : [];
  const pieceNames = new Set(pieces.map((piece) => piece.name).filter(Boolean));
  const hasFaceDecal = pieces.some((piece) => piece.name === 'FACE_DECAL');
  const role = template.assetRole;

  if (role && !VALID_ASSET_ROLES.has(role)) {
    failures.push(`unsupported assetRole "${role}"`);
  }

  if (ROLE_REQUIRED_ROOTS.has(getTemplateFolder(file)) && ROLE_REQUIRED_PATTERN.test(id) && !role) {
    failures.push('missing assetRole for reference/model/mold asset');
  }

  if (hasFaceDecal) {
    const redundantFacePieces = pieces
      .filter((piece) => piece.name !== 'FACE_DECAL' && FACIAL_DETAIL_PATTERN.test(piece.name || ''))
      .map((piece) => piece.name);
    if (redundantFacePieces.length) {
      failures.push(`FACE_DECAL mixed with redundant facial pieces: ${redundantFacePieces.join(', ')}`);
    }
  }

  const slotMap = template?._archetypeMeta?.slotMap;
  if (slotMap && typeof slotMap === 'object') {
    for (const [slot, names] of Object.entries(slotMap)) {
      for (const name of Array.isArray(names) ? names : []) {
        if (!pieceNames.has(name)) {
          failures.push(`slotMap.${slot} references missing piece "${name}"`);
        }
      }
    }
  }

  return failures;
}

const failures = [];
const files = walkJsonFiles(TEMPLATE_ROOT);

for (const file of files) {
  const template = readTemplate(file);
  const templateFailures = auditTemplate(file, template);
  for (const failure of templateFailures) {
    failures.push(`${file}: ${failure}`);
  }
}

if (failures.length) {
  console.error('Template asset audit failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Template asset audit passed (${files.length} templates).`);
