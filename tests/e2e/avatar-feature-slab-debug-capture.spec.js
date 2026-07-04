import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  bootstrapApp,
  openAvatarForge,
  suppressKnownAvatarForgeWarnings,
  updateAvatarForgeRecipe,
} from './helpers/avatar-forge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const OUTPUT_DIR = join(REPO_ROOT, 'docs', 'baselines', '2026-07-05-feature-slab-debug-h7');
const OUTPUT_FILE = join(OUTPUT_DIR, 'feature-slab-debug-gallery.png');

const DEBUG_HEADS = Object.freeze([
  'gen_head_heroic',
  'gen_head_chibi',
  'gen_head_square',
  'gen_head_wide_jaw',
]);

const DEBUG_VIEWS = Object.freeze(['front', 'threeQuarter', 'profile']);

test.describe.configure({ timeout: 300000 });

async function waitForSlabDebug(page) {
  await expect.poll(async () => page.evaluate(async () => {
    const { getAvatarForgeFeatureSlabDebugDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    const diagnostics = getAvatarForgeFeatureSlabDebugDiagnostics();
    return {
      enabled: diagnostics.enabled,
      slabCount: diagnostics.slabs.length,
      overlayChildCount: diagnostics.overlayChildCount,
    };
  })).toEqual({
    enabled: true,
    slabCount: 5,
    overlayChildCount: 10,
  });
}

async function setDebugView(page, viewName) {
  const result = await page.evaluate(async (nextView) => {
    const { setAvatarForgePreviewView } = await import('/src/modules/avatar/avatar-ui.js');
    return setAvatarForgePreviewView(nextView);
  }, viewName);
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

async function composeContactSheet(page, captures) {
  return page.evaluate(async ({ shots, columns }) => {
    function loadImage(dataUrl) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load capture ${dataUrl.slice(0, 32)}`));
        image.src = dataUrl;
      });
    }

    const images = await Promise.all(shots.map((shot) => loadImage(shot.dataUrl)));
    const tileWidth = 360;
    const tileHeight = 320;
    const rows = Math.ceil(shots.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * tileWidth;
    canvas.height = rows * tileHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#09090d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';

    shots.forEach((shot, index) => {
      const image = images[index];
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * tileWidth;
      const y = row * tileHeight;
      ctx.fillStyle = '#161620';
      ctx.fillRect(x + 6, y + 6, tileWidth - 12, tileHeight - 12);
      ctx.strokeStyle = '#00d0ff';
      ctx.strokeRect(x + 6.5, y + 6.5, tileWidth - 13, tileHeight - 13);
      ctx.fillStyle = '#aeefff';
      ctx.fillText(`${shot.headId} / ${shot.view}`, x + 14, y + 14);

      const maxWidth = tileWidth - 28;
      const maxHeight = tileHeight - 48;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
      const drawWidth = Math.round(image.width * scale);
      const drawHeight = Math.round(image.height * scale);
      const drawX = x + Math.floor((tileWidth - drawWidth) / 2);
      const drawY = y + 38 + Math.floor((maxHeight - drawHeight) / 2);
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    });

    return canvas.toDataURL('image/png').split(',')[1];
  }, { shots: captures, columns: DEBUG_VIEWS.length });
}

test('captures feature slab debug gallery', async ({ page }) => {
  test.skip(!process.env.CAPTURE_AVATAR_SLAB_DEBUG, 'Set CAPTURE_AVATAR_SLAB_DEBUG=1 to capture the H7 slab debug gallery.');

  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);

  await updateAvatarForgeRecipe(page, {
    label: 'H7 Slab Debug Gallery',
    bodyPresetId: 'psx_chibi',
    featureSlabPresetId: 'default_embedded',
    accessoryId: 'none',
    features: {
      hair: { presetId: 'none_01' },
      eyes: { presetId: 'wide_01' },
      brows: { presetId: 'soft_01' },
      nose: { presetId: 'nose_soft_01' },
      mouth: { presetId: 'neutral_01' },
      ears: { presetId: 'ear_soft_01' },
    },
  });
  await page.locator('#avatar-feature-slab-debug-toggle').check();
  await waitForSlabDebug(page);

  const captures = [];
  for (const headId of DEBUG_HEADS) {
    await updateAvatarForgeRecipe(page, { headMoldId: headId });
    await waitForSlabDebug(page);
    for (const view of DEBUG_VIEWS) {
      await setDebugView(page, view);
      await page.waitForTimeout(120);
      const buffer = await page.locator('#avatar-preview-stage').screenshot();
      captures.push({
        headId,
        view,
        dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      });
    }
  }

  const contactSheetBase64 = await composeContactSheet(page, captures);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, Buffer.from(contactSheetBase64, 'base64'));
});
