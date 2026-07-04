import { expect, test } from '@playwright/test';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  waitForUi,
} from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('applies a standard library clip in animation mode and exports it in GLB', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await addTemplate(page, 'psx_humanoid_chibi_mold_cm');

  await page.evaluate(async () => {
    await window.enterAnimationMode();
  });
  await expect(page.locator('#anim-mode-panel')).toBeVisible();
  await expect(page.locator('#anim-mode-library-clip-select')).toHaveValue('walk');
  await expect(page.locator('#anim-mode-library-status')).toContainText(/library clips ready|clips de libreria/i);

  await page.locator('#anim-mode-library-clip-select').selectOption('walk');
  await page.locator('#anim-mode-library-apply').click();
  await expect(page.locator('#anim-mode-library-status')).toContainText(/walk/i);
  await expect(page.locator('#anim-mode-list')).toContainText(/walk/i);

  const result = await page.evaluate(async () => {
    function parseGlbJson(buffer) {
      const view = new DataView(buffer);
      const magic = view.getUint32(0, true);
      if (magic !== 0x46546c67) throw new Error('Invalid GLB magic');
      let offset = 12;
      while (offset < buffer.byteLength) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        offset += 8;
        if (chunkType === 0x4e4f534a) {
          const jsonText = new TextDecoder()
            .decode(new Uint8Array(buffer, offset, chunkLength))
            .trim();
          return JSON.parse(jsonText);
        }
        offset += chunkLength;
      }
      throw new Error('GLB JSON chunk not found');
    }

    const group = window.__LOWPOLY64_STATE__.animationModeObject;
    const applied = (group.userData.animations || []).find((anim) => anim.name === 'walk');
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { buffer, filename } = await exportGLBToBuffer('standard-library-walk.glb');
    const gltfJson = parseGlbJson(buffer);

    return {
      filename,
      size: buffer instanceof ArrayBuffer ? buffer.byteLength : 0,
      bytes: Array.from(new Uint8Array(buffer)),
      appliedSource: applied?.source || null,
      appliedGeneratedByRig: !!applied?.generatedByRig,
      appliedTracks: applied?.tracks?.length || 0,
      exportedAnimations: (gltfJson.animations || []).map((clip) => ({
        name: clip.name,
        tracks: clip.channels?.length || 0,
      })),
    };
  });

  const parsed = await new Promise((resolve, reject) => {
    const buffer = Uint8Array.from(result.bytes).buffer;
    new GLTFLoader().parse(buffer, '', resolve, reject);
  });
  const parsedAnimations = (parsed.animations || []).map((clip) => ({
    name: clip.name,
    tracks: clip.tracks?.length || 0,
    duration: clip.duration || 0,
  }));

  expect(result.filename).toBe('standard-library-walk.glb');
  expect(result.size).toBeGreaterThan(0);
  expect(result.bytes.length).toBe(result.size);
  expect(result.appliedSource).toBe('standard-clip-library');
  expect(result.appliedGeneratedByRig).toBe(false);
  expect(result.appliedTracks).toBeGreaterThan(0);
  expect(result.exportedAnimations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'walk', tracks: expect.any(Number) }),
    ])
  );
  expect(result.exportedAnimations.find((clip) => clip.name === 'walk')?.tracks).toBeGreaterThan(0);
  expect(parsedAnimations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'walk', tracks: expect.any(Number), duration: expect.any(Number) }),
    ])
  );
  expect(parsedAnimations.find((clip) => clip.name === 'walk')?.tracks).toBeGreaterThan(0);
  expect(parsedAnimations.find((clip) => clip.name === 'walk')?.duration).toBeGreaterThan(0);

  await assertNoPageErrors(page);
});

test('shows a clear standard-rig gate message for nonconforming models', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await addTemplate(page, 'crate');

  await page.evaluate(async () => {
    await window.enterAnimationMode();
  });
  await expect(page.locator('#anim-mode-panel')).toBeVisible();
  await expect(page.locator('#anim-mode-library-status')).toContainText(/HUMANOID_STANDARD|La importacion/i);

  await page.locator('#anim-mode-library-apply').click();
  await expect(page.locator('#anim-mode-library-status')).toContainText(/HUMANOID_STANDARD|La importacion/i);

  await assertNoPageErrors(page);
});
