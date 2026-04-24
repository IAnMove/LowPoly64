import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

const REDUNDANT_FACE_PATTERN = /(^|_)(OJO|EYE|PUPIL|PUPILA|IRIS|BOCA|MOUTH|CEJA|BROW|TEETH|TOOTH|JAW|LIP|SOCKET)(_|$)/i;

function readCharacterTemplates() {
  const root = path.join(process.cwd(), 'src', 'data', 'templates', 'characters');
  return fs.readdirSync(root)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const filePath = path.join(root, file);
      return {
        file,
        template: JSON.parse(fs.readFileSync(filePath, 'utf8')),
      };
    });
}

test('humanoid character-model heads use FACE_DECAL textures without redundant facial cubes', async () => {
  const humanoidHeads = readCharacterTemplates()
    .filter(({ template }) => template.archetype === 'HUMANOID' && Array.isArray(template.slots))
    .map(({ file, template }) => {
      const headSlot = template.slots.find((slot) => slot.slotId === 'HEAD') || null;
      const pieces = Array.isArray(headSlot?.pieces) ? headSlot.pieces : [];
      const decals = pieces.filter((piece) => piece.name === 'FACE_DECAL');
      const redundantFacePieces = pieces
        .filter((piece) => piece.name !== 'FACE_DECAL' && REDUNDANT_FACE_PATTERN.test(piece.name || ''))
        .map((piece) => piece.name);

      return {
        file,
        id: template.id,
        assetRole: template.assetRole,
        hasHeadSlot: !!headSlot,
        faceDecalCount: decals.length,
        hasFaceTexture: !!decals[0]?.texture?.dataURL,
        redundantFacePieces,
      };
    })
    .filter((entry) => entry.hasHeadSlot)
    .sort((a, b) => a.id.localeCompare(b.id));

  const failures = humanoidHeads.filter((entry) => (
    entry.faceDecalCount !== 1 ||
    !entry.hasFaceTexture ||
    entry.redundantFacePieces.length > 0
  ));

  expect(humanoidHeads.map((entry) => entry.id)).toEqual(expect.arrayContaining([
    'archer_cm',
    'swordsman_cm',
    'psx_hero_v2_cm',
    'psx_humanoid_mold_cm',
    'n64_humanoid_mold_cm',
  ]));
  expect(humanoidHeads.length).toBeGreaterThanOrEqual(30);
  expect(failures).toEqual([]);
});
