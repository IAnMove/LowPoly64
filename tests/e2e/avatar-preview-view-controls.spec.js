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
