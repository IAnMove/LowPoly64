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
