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
  const eyeIndex = page.locator('#avatar-eye-sprite-index');
  const initialIndex = await eyeIndex.textContent();
  await expect(eyeIndex).toHaveAttribute('title', await eyeSelect.locator('option:checked').textContent());
  const initialPreview = await page.locator('#avatar-eye-sprite-preview').evaluate((canvas) => canvas.toDataURL());

  await page.locator('[data-face-cycle="eyes"][data-cycle-delta="1"]').click();
  await expect(eyeSelect).not.toHaveValue('image2_hero_oval_01');
  await expect(eyeIndex).not.toHaveText(initialIndex);
  await expect.poll(() => page.locator('#avatar-eye-sprite-preview').evaluate((canvas) => canvas.toDataURL()))
    .not.toBe(initialPreview);

  await page.locator('[data-face-cycle="eyes"][data-cycle-delta="-1"]').click();
  await expect(eyeSelect).toHaveValue('image2_hero_oval_01');
  await expect(eyeIndex).toHaveText(initialIndex);

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

test('does not redraw face thumbnails for geometry-only adjustments', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  const canvases = page.locator('#avatar-face-sprite-previews canvas');
  await expect.poll(() => canvases.evaluateAll((entries) => (
    entries.map((canvas) => Number(canvas.dataset.previewRenderCount) || 0)
  ))).toEqual([1, 1, 1, 1]);

  const before = await canvases.evaluateAll((entries) => (
    entries.map((canvas) => Number(canvas.dataset.previewRenderCount) || 0)
  ));
  await page.locator('#avatar-feature-depth-scale-input').evaluate((input) => {
    input.value = '1.2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  await expect.poll(() => canvases.evaluateAll((entries) => (
    entries.map((canvas) => Number(canvas.dataset.previewRenderCount) || 0)
  ))).toEqual(before);

  await page.locator('#avatar-color-iris').evaluate((input) => {
    input.value = '#55aa33';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect.poll(async () => Number(await page.locator('#avatar-eye-sprite-preview')
    .getAttribute('data-preview-render-count'))).toBeGreaterThan(before[0]);
});

test('resets face fit without replacing selected sprites', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  await page.locator('#avatar-eye-select').selectOption('image2_hero_oval_01');
  await page.locator('#avatar-brow-select').selectOption('image2_angry_slash_01');
  await page.locator('#avatar-mouth-select').selectOption('image2_tooth_grin_01');
  const selected = {
    eyes: await page.locator('#avatar-eye-select').inputValue(),
    brows: await page.locator('#avatar-brow-select').inputValue(),
    mouth: await page.locator('#avatar-mouth-select').inputValue(),
  };

  const setRange = async (id, value) => page.locator(`#${id}`).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await setRange('avatar-feature-eyes-size', 1.3);
  await setRange('avatar-feature-eyes-offsetX', 24);
  await setRange('avatar-feature-eyes-offsetY', -18);
  await setRange('avatar-feature-eyes-spacing', 20);
  await setRange('avatar-feature-brows-offsetY', -16);
  await setRange('avatar-feature-mouth-offsetY', 14);
  await page.locator('#avatar-feature-slab-preset-select').selectOption('toy_extruded');
  await setRange('avatar-feature-depth-scale-input', 1.4);

  await page.locator('#avatar-reset-face-fit').click();
  await expect(page.locator('#avatar-eye-select')).toHaveValue(selected.eyes);
  await expect(page.locator('#avatar-brow-select')).toHaveValue(selected.brows);
  await expect(page.locator('#avatar-mouth-select')).toHaveValue(selected.mouth);
  await expect(page.locator('#avatar-feature-eyes-size')).toHaveValue('1');
  await expect(page.locator('#avatar-feature-eyes-offsetX')).toHaveValue('0');
  await expect(page.locator('#avatar-feature-eyes-offsetY')).toHaveValue('0');
  await expect(page.locator('#avatar-feature-eyes-spacing')).toHaveValue('0');
  await expect(page.locator('#avatar-feature-brows-offsetY')).toHaveValue('0');
  await expect(page.locator('#avatar-feature-mouth-offsetY')).toHaveValue('0');
  await expect(page.locator('#avatar-feature-slab-preset-select')).toHaveValue('default_embedded');
  await expect(page.locator('#avatar-feature-depth-scale-input')).toHaveValue('1');
});

test('keeps face authoring controls usable in a compact desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await bootstrapApp(page);
  await openAvatarForge(page);

  const faceControls = page.locator('#avatar-feature-controls').locator('section').first();
  await faceControls.scrollIntoViewIfNeeded();
  await expect(page.locator('#avatar-reset-face-fit')).toBeVisible();
  await expect(page.locator('#avatar-face-sprite-previews')).toBeVisible();
  await expect(page.locator('[data-face-cycle="fullFace"][data-cycle-delta="1"]')).toBeVisible();

  const layout = await page.evaluate(() => {
    const modal = document.getElementById('avatar-forge-modal')?.firstElementChild;
    const face = document.getElementById('avatar-face-sprite-previews');
    const reset = document.getElementById('avatar-reset-face-fit');
    const rect = (element) => element?.getBoundingClientRect?.() || null;
    return {
      modalOverflow: modal ? modal.scrollWidth - modal.clientWidth : 999,
      faceOverflow: face ? face.scrollWidth - face.clientWidth : 999,
      face: rect(face),
      reset: rect(reset),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(layout.modalOverflow).toBeLessThanOrEqual(1);
  expect(layout.faceOverflow).toBeLessThanOrEqual(1);
  expect(layout.face.left).toBeGreaterThanOrEqual(0);
  expect(layout.face.right).toBeLessThanOrEqual(layout.viewport.width);
  expect(layout.reset.right).toBeLessThanOrEqual(layout.viewport.width);
});

test('closes Avatar Forge with Escape even while editing a field', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  await page.locator('#avatar-label-input').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#avatar-forge-modal')).toBeHidden();

  await openAvatarForge(page);
  await expect(page.locator('#avatar-forge-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#avatar-forge-modal')).toBeHidden();
});

test('selects face sprites from a keyboard-accessible visual gallery', async ({ page }) => {
  await bootstrapApp(page);
  await openAvatarForge(page);

  const gallery = page.locator('#avatar-face-gallery-modal');
  const eyePreview = page.locator('#avatar-eye-sprite-preview');
  await eyePreview.click();
  await expect(gallery).toBeVisible();
  await expect(page.locator('#avatar-face-gallery-search')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#avatar-face-gallery-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#avatar-face-gallery-grid [data-face-gallery-preset]').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#avatar-face-gallery-close')).toBeFocused();
  await page.locator('#avatar-face-gallery-search').focus();
  await expect(page.locator('#avatar-face-gallery-title')).toHaveText('EYES');
  const eyeOptionCount = await page.locator('#avatar-eye-select option').count();
  expect(eyeOptionCount).toBeGreaterThanOrEqual(57);
  await expect(page.locator('#avatar-face-gallery-grid [data-face-gallery-preset]')).toHaveCount(eyeOptionCount);
  await expect(page.locator('#avatar-face-gallery-count')).toHaveText(`${eyeOptionCount}/${eyeOptionCount}`);
  await expect(page.locator('#avatar-face-gallery-grid [aria-pressed="true"]')).toHaveCount(1);
  await expect.poll(() => page.locator('[data-face-gallery-preset="wide_01"] canvas').evaluate((canvas) => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let nonChecker = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const checker = (red === 0x11 && green === 0x11 && blue === 0x14)
        || (red === 0x1c && green === 0x1c && blue === 0x21);
      if (!checker) nonChecker += 1;
    }
    return nonChecker;
  })).toBeGreaterThan(0);

  const search = page.locator('#avatar-face-gallery-search');
  await search.fill('determined almond');
  await expect(page.locator('#avatar-face-gallery-count')).toHaveText(`1/${eyeOptionCount}`);
  await expect(page.locator('#avatar-face-gallery-grid [data-face-gallery-preset]:not(.hidden)')).toHaveCount(1);
  await search.fill('does-not-exist-999');
  await expect(page.locator('#avatar-face-gallery-count')).toHaveText(`0/${eyeOptionCount}`);
  await expect(page.locator('#avatar-face-gallery-empty')).toBeVisible();
  await search.fill('determined almond');
  await page.locator('[data-face-gallery-preset="image2_determined_almond_01"]').click();
  await expect(gallery).toBeHidden();
  await expect(page.locator('#avatar-eye-select')).toHaveValue('image2_determined_almond_01');

  await eyePreview.focus();
  await page.keyboard.press('Enter');
  await expect(gallery).toBeVisible();
  await expect(page.locator('[data-face-gallery-preset="image2_determined_almond_01"]'))
    .toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(gallery).toBeHidden();
  await expect(page.locator('#avatar-forge-modal')).toBeVisible();
  await expect(eyePreview).toBeFocused();
});
