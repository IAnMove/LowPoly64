import { test, expect } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  openAvatarForge,
  waitForUi,
} from './helpers/avatar-forge.js';

test('switches Avatar Forge between front, three-quarter, and side views', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await openAvatarForge(page);
  await waitForUi(page, 500);

  const controls = page.locator('#avatar-preview-view-controls');
  await expect(controls).toBeVisible();
  const front = controls.locator('[data-preview-view="front"]');
  const threeQuarter = controls.locator('[data-preview-view="threeQuarter"]');
  const profile = controls.locator('[data-preview-view="profile"]');

  await expect(front).toHaveAttribute('aria-pressed', 'true');
  await threeQuarter.click();
  await expect(threeQuarter).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => page.evaluate(async () => {
    const { getAvatarForgePreviewDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgePreviewDiagnostics().previewView;
  })).toBe('threeQuarter');

  await profile.click();
  await expect(profile).toHaveAttribute('aria-pressed', 'true');
  await expect(front).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => page.evaluate(async () => {
    const { getAvatarForgePreviewDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    return getAvatarForgePreviewDiagnostics().previewView;
  })).toBe('profile');

  await page.locator('#avatar-head-mold-select').selectOption('gen_head_chibi');
  await expect.poll(async () => page.evaluate(async () => {
    const { getAvatarForgePreviewDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
    const diagnostics = getAvatarForgePreviewDiagnostics();
    return {
      view: diagnostics.previewView,
      pinned: diagnostics.previewViewPinned,
      sideDominant: Math.abs(diagnostics.cameraOffset?.[0] || 0) > Math.abs(diagnostics.cameraOffset?.[2] || 0) * 3,
    };
  })).toEqual({ view: 'profile', pinned: true, sideDominant: true });

  await front.click();
  await expect(front).toHaveAttribute('aria-pressed', 'true');
  await expect(profile).toHaveAttribute('aria-pressed', 'false');
});

test('explains slab depth presets in the active language', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  const select = page.locator('#avatar-feature-slab-preset-select');
  const note = page.locator('#avatar-feature-slab-preset-note');
  await expect(select.locator('option:checked')).toContainText('Integrated');
  await expect(note).toContainText('mostly embedded');

  await select.selectOption('toy_extruded');
  await expect(select.locator('option:checked')).toContainText('Toy relief');
  await expect(note).toContainText('stronger visible bulge');

  await page.evaluate(() => window.toggleLang());
  await expect(select.locator('option:checked')).toContainText('Relieve juguete');
  await expect(note).toContainText('abombado mas visible');
});

test('recommends transparent full faces before baked skin plates', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  const select = page.locator('#avatar-full-face-select');
  const note = page.locator('#avatar-full-face-mode-note');
  await expect(select.locator('option').nth(1)).toContainText('[TRANSPARENT]');
  await expect(select.locator('option').last()).toContainText('[SKIN PLATE]');

  await select.selectOption('image2_transparent_brave_neutral_01');
  await expect(note).toContainText('inherit the selected skin color');
  await expect(note).toHaveClass(/text-\[#9dffcb\]/);

  await select.selectOption('image2_elf_hero_01');
  await expect(note).toContainText('baked skin color');
  await expect(note).toHaveClass(/text-\[#ffcc00\]/);

  await page.evaluate(() => window.toggleLang());
  await expect(note).toContainText('color horneado');
});

test('previews selected face sprites with live palette tinting', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);
  await page.locator('#avatar-eye-select').selectOption('image2_hero_oval_01');

  await page.locator('#avatar-color-iris').evaluate((input) => {
    input.value = '#20b060';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const spriteMetrics = async (canvasId) => page.locator(`#${canvasId}`).evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    let greenTint = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const checker = (red === 0x11 && green === 0x11 && blue === 0x14)
        || (red === 0x1c && green === 0x1c && blue === 0x21);
      if (!checker) colored += 1;
      if (green > red + 20 && green > blue + 20) greenTint += 1;
    }
    return { colored, greenTint };
  });

  await expect.poll(() => spriteMetrics('avatar-eye-sprite-preview')).toMatchObject({
    colored: expect.any(Number),
    greenTint: expect.any(Number),
  });
  await expect.poll(async () => (await spriteMetrics('avatar-eye-sprite-preview')).greenTint).toBeGreaterThan(0);

  await page.locator('#avatar-full-face-select').selectOption('image2_transparent_brave_neutral_01');
  await expect.poll(async () => (await spriteMetrics('avatar-eye-sprite-preview')).colored).toBeGreaterThan(0);
  await expect(page.locator('[data-face-preview-feature="eyes"]')).toHaveClass(/opacity-35/);
  await expect.poll(async () => (await spriteMetrics('avatar-full-face-sprite-preview')).colored).toBeGreaterThan(0);
});

test('cycles face sprites from preview controls and respects full-face locking', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  const eyeSelect = page.locator('#avatar-eye-select');
  await eyeSelect.selectOption('image2_hero_oval_01');
  const initialPreview = await page.locator('#avatar-eye-sprite-preview').evaluate((canvas) => canvas.toDataURL());

  await page.locator('[data-face-cycle="eyes"][data-cycle-delta="1"]').click();
  await expect(eyeSelect).not.toHaveValue('image2_hero_oval_01');
  await expect.poll(() => page.locator('#avatar-eye-sprite-preview').evaluate((canvas) => canvas.toDataURL()))
    .not.toBe(initialPreview);

  await page.locator('[data-face-cycle="eyes"][data-cycle-delta="-1"]').click();
  await expect(eyeSelect).toHaveValue('image2_hero_oval_01');

  const fullFaceSelect = page.locator('#avatar-full-face-select');
  const preservedEyes = await eyeSelect.inputValue();
  const preservedBrows = await page.locator('#avatar-brow-select').inputValue();
  const preservedMouth = await page.locator('#avatar-mouth-select').inputValue();
  await expect(fullFaceSelect).toHaveValue('none_01');
  await page.locator('[data-face-cycle="fullFace"][data-cycle-delta="1"]').click();
  await expect(fullFaceSelect).toHaveValue('image2_transparent_brave_neutral_01');
  await expect.poll(() => page.locator('[data-face-cycle="eyes"], [data-face-cycle="brows"], [data-face-cycle="mouth"]')
    .evaluateAll((buttons) => buttons.every((button) => button.disabled))).toBe(true);

  await page.locator('[data-face-cycle="fullFace"][data-cycle-delta="-1"]').click();
  await expect(fullFaceSelect).toHaveValue('none_01');
  await expect(eyeSelect).toHaveValue(preservedEyes);
  await expect(page.locator('#avatar-brow-select')).toHaveValue(preservedBrows);
  await expect(page.locator('#avatar-mouth-select')).toHaveValue(preservedMouth);
  await expect.poll(() => page.locator('[data-face-cycle="eyes"]')
    .evaluateAll((buttons) => buttons.every((button) => !button.disabled))).toBe(true);
});
