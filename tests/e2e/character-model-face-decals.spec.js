import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

const REDUNDANT_FACE_PATTERN = /(^|_)(OJO|EYE|PUPIL|PUPILA|IRIS|BOCA|MOUTH|CEJA|BROW|TEETH|TOOTH|JAW|LIP|SOCKET)(_|$)/i;
const FEATURE_SLAB_BENCHMARK_IDS = new Set(['n64_elf_hero_cm']);
const FEATURE_SLAB_NAMES = new Set(['EYE_SLAB_L', 'EYE_SLAB_R', 'BROW_SLAB_L', 'BROW_SLAB_R', 'MOUTH_SLAB']);

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

test('humanoid character-model heads use FACE_DECAL or benchmark feature slabs without redundant facial cubes', async () => {
  const humanoidHeads = readCharacterTemplates()
    .filter(({ template }) => template.archetype === 'HUMANOID' && Array.isArray(template.slots))
    .map(({ file, template }) => {
      const headSlot = template.slots.find((slot) => slot.slotId === 'HEAD') || null;
      const pieces = Array.isArray(headSlot?.pieces) ? headSlot.pieces : [];
      const decals = pieces.filter((piece) => piece.name === 'FACE_DECAL');
      const isFeatureSlabBenchmark = FEATURE_SLAB_BENCHMARK_IDS.has(template.id);
      const featureSlabs = pieces.filter((piece) => FEATURE_SLAB_NAMES.has(piece.name));
      const redundantFacePieces = pieces
        .filter((piece) => (
          piece.name !== 'FACE_DECAL'
          && !(isFeatureSlabBenchmark && FEATURE_SLAB_NAMES.has(piece.name))
          && REDUNDANT_FACE_PATTERN.test(piece.name || '')
        ))
        .map((piece) => piece.name);

      return {
        file,
        id: template.id,
        assetRole: template.assetRole,
        hasHeadSlot: !!headSlot,
        isFeatureSlabBenchmark,
        faceDecalCount: decals.length,
        hasFaceTexture: !!(decals[0]?.texture?.dataURL || decals[0]?.decal),
        featureSlabCount: featureSlabs.length,
        featureSlabsWithDecal: featureSlabs.filter((piece) => !!piece.decal).length,
        redundantFacePieces,
      };
    })
    .filter((entry) => entry.hasHeadSlot)
    .sort((a, b) => a.id.localeCompare(b.id));

  const failures = humanoidHeads.filter((entry) => {
    if (entry.redundantFacePieces.length > 0) return true;
    if (entry.isFeatureSlabBenchmark) {
      return entry.faceDecalCount !== 0
        || entry.featureSlabCount !== FEATURE_SLAB_NAMES.size
        || entry.featureSlabsWithDecal !== FEATURE_SLAB_NAMES.size;
    }
    return entry.faceDecalCount !== 1 || !entry.hasFaceTexture;
  });

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

test('N64 mascot variants keep face detail in a single decal layer', async () => {
  const mascotFiles = new Set([
    'n64_cover_mascot_head_study_cm.json',
    'n64_cover_mascot_v1_cm.json',
    'n64_cover_mascot_v2_cm.json',
    'n64_mascot_mold_cm.json',
  ]);
  const duplicateFacePieces = new Set([
    'FACE_CARD',
    'FACE_MUZZLE',
    'MUSTACHE_L',
    'MUSTACHE_R',
    'NOSE',
    'SNOUT',
  ]);

  const reports = readCharacterTemplates()
    .filter(({ file }) => mascotFiles.has(file))
    .map(({ file, template }) => {
      const pieces = template.slots.find((slot) => slot.slotId === 'HEAD')?.pieces || [];
      return {
        file,
        faceDecalCount: pieces.filter((piece) => piece.name === 'FACE_DECAL').length,
        duplicatePieces: pieces
          .filter((piece) => duplicateFacePieces.has(piece.name))
          .map((piece) => piece.name),
      };
    });

  expect(reports).toHaveLength(mascotFiles.size);
  expect(reports).toEqual(reports.map((report) => ({
    ...report,
    faceDecalCount: 1,
    duplicatePieces: [],
  })));
});
