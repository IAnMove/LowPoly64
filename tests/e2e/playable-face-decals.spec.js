import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

const REDUNDANT_FACE_PATTERN = /OJO|EYE|PUPIL|PUPILA|BOCA|MOUTH|CEJA|BROW|NARIZ|NOSE|TEETH|TOOTH|JAW|LIP|SOCKET/i;

function walkTemplateFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

test('all playable templates declare FACE_DECAL data without redundant face geometry', async () => {
  const playable = walkTemplateFiles(path.join(process.cwd(), 'src', 'data', 'templates'))
    .map((file) => JSON.parse(fs.readFileSync(file, 'utf8')))
    .filter((template) => template.assetRole === 'playable')
    .map((template) => {
      const pieces = Array.isArray(template.pieces) ? template.pieces : [];
      const faceDecal = pieces.find((piece) => piece.name === 'FACE_DECAL') || null;
      const redundantFacePieces = pieces
        .filter((piece) => piece.name !== 'FACE_DECAL' && REDUNDANT_FACE_PATTERN.test(piece.name || ''))
        .map((piece) => piece.name);
      return {
        id: template.id,
        hasFaceDecal: !!faceDecal,
        hasTexture: !!faceDecal?.texture?.dataURL,
        redundantFacePieces,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  const audit = {
    ids: playable.map((template) => template.id),
    failures: playable.filter((template) => (
      !template.hasFaceDecal ||
      !template.hasTexture ||
      template.redundantFacePieces.length > 0
    )),
  };

  expect(audit.ids).toEqual(expect.arrayContaining([
    'hero',
    'archer',
    'skeleton',
    'star_ranger',
    'starlight_princess',
  ]));
  expect(audit.ids.length).toBeGreaterThanOrEqual(10);
  expect(audit.failures).toEqual([]);
});

test('FACE_DECAL default texture transform keeps the authored vertical orientation', async () => {
  const templatesSource = fs.readFileSync(path.join(process.cwd(), 'src', 'modules', 'viewport', 'templates.js'), 'utf8');
  const transformSource = templatesSource.match(/const FACE_DECAL_TEXTURE_TRANSFORM = Object\.freeze\(\{[\s\S]*?\n\}\);/)?.[0] || '';

  expect(transformSource).toContain('offset: [0, 0]');
  expect(transformSource).toContain('repeat: [1, 1]');
  expect(transformSource).not.toContain('repeat: [1, -1]');
  expect(transformSource).not.toContain('offset: [0, 1]');
});
