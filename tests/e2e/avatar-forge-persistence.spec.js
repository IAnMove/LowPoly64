import { test, expect } from '@playwright/test';
import {
  addTemplate,
  assertNoPageErrors,
  bootstrapApp,
  closeRigPanelIfOpen,
  collectAccessoryAndPaletteAuditReport,
  collectAvatarCatalogSweepReport,
  confirmAvatarForge,
  insertAvatarGroup,
  openAvatarForge,
  sceneSummary,
  selectAvatarGroup,
  suppressKnownAvatarForgeWarnings,
  updateAvatarForgeRecipe,
  waitForSceneObjectCount,
  waitForUi,
} from './helpers/avatar-forge.js';

test.describe.configure({ timeout: 300000 });

test('saves and loads avatar groups without breaking non-avatar groups', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Save Avatar',
  });

  await waitForSceneObjectCount(page, 1);
  await addTemplate(page, 'crate');
  await waitForSceneObjectCount(page, 2);

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);
  const beforeNonAvatar = beforeSave.find((entry) => !entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.label).toBe('Save Avatar');
  expect(beforeNonAvatar?.name).toBeTruthy();

  await page.evaluate(() => {
    return window.saveScene();
  });
  await page.evaluate(() => {
    window.resetScene();
  });
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 2);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);
  const afterNonAvatar = afterLoad.find((entry) => !entry.hasAvatarRecipe);

  expect(afterAvatar).toEqual(beforeAvatar);
  expect(afterNonAvatar).toEqual(beforeNonAvatar);
  await assertNoPageErrors(page);
});

test('preserves accessory and palette overrides across save and load', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await insertAvatarGroup(page, {
    label: 'Style Audit Avatar',
    bodyPresetId: 'n64_classic',
    headMoldId: 'psx_mesh_portrait_cabezon_175',
    features: {
      hair: { presetId: 'bridge_bowl_01' },
      eyes: { presetId: 'bridge_confident_half_01' },
      brows: { presetId: 'bridge_arched_soft_01' },
      mouth: { presetId: 'bridge_toothy_grin_01' },
    },
    accessoryIds: ['bridge_jewel_circlet_01'],
    paletteId: 'arcade_teal',
    colorOverrides: {
      hair: '#3a2254',
      accent: '#ff8a5b',
      bodyPrimary: '#138d90',
    },
  });

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);

  await page.evaluate(() => {
    return window.saveScene();
  });
  await page.evaluate(() => {
    window.resetScene();
  });
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 1);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.accessoryIds).toEqual(['bridge_jewel_circlet_01']);
  expect(beforeAvatar?.avatarRecipe?.paletteId).toBe('arcade_teal');
  expect(beforeAvatar?.avatarRecipe?.headBuildMode).toBe('mold');
  expect(beforeAvatar?.avatarRecipe?.headMoldId).toBe('psx_mesh_portrait_cabezon_175');
  expect(beforeAvatar?.avatarRecipe?.colorOverrides).toEqual({
    hair: '#3a2254',
    accent: '#ff8a5b',
    bodyPrimary: '#138d90',
  });
  expect(afterAvatar).toEqual(beforeAvatar);

  await assertNoPageErrors(page);
});

test('persists canonical mold feature placements across save, load, and builder reopen', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);
  await openAvatarForge(page);

  await updateAvatarForgeRecipe(page, {
    label: 'Mold Roundtrip Avatar',
    bodyPresetId: 'psx_heavy',
    headScale: 1.18,
    accessoryId: 'none',
    paletteId: 'arcade_teal',
    features: {
      hair: { presetId: 'psx_layered_hero_01', placement: { size: 1.08, offsetY: -4, length: 18 } },
      eyes: { presetId: 'psx_almond_sharp_01', placement: { size: 1.06, offsetX: 3, offsetY: -2, spacing: 14 } },
      brows: { presetId: 'psx_serious_01', placement: { size: 1.02, offsetX: 1, offsetY: -3 } },
      nose: { presetId: 'nose_bridge_01', placement: { size: 1.05, offsetX: 2, offsetY: -4 } },
      mouth: { presetId: 'psx_line_01', placement: { size: 0.96, offsetX: 0, offsetY: -6 } },
      ears: { presetId: 'ear_point_01', placement: { size: 1.02, offsetX: 0, offsetY: -2 } },
    },
  });
  await confirmAvatarForge(page);

  const beforeSave = await sceneSummary(page);
  const beforeAvatar = beforeSave.find((entry) => entry.hasAvatarRecipe);

  expect(beforeAvatar?.avatarRecipe?.headBuildMode).toBe('mold');
  expect(beforeAvatar?.avatarRecipe?.headMoldId).toBe('psx_mesh_portrait_01');
  expect(beforeAvatar?.avatarRecipe?.headScale).toBe(1.18);
  expect(beforeAvatar?.avatarRecipe?.features?.eyes?.placement?.spacing).toBe(14);
  expect(beforeAvatar?.avatarRecipe?.features?.hair?.placement?.length).toBe(18);
  expect(beforeAvatar?.avatarRecipe?.features?.nose?.presetId).toBe('nose_bridge_01');
  expect(beforeAvatar?.avatarRecipe?.features?.ears?.presetId).toBe('ear_point_01');

  await page.evaluate(() => window.saveScene());
  await page.evaluate(() => window.resetScene());
  await waitForUi(page, 350);
  await waitForSceneObjectCount(page, 0);

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await waitForUi(page, 550);
  await waitForSceneObjectCount(page, 1);

  const afterLoad = await sceneSummary(page);
  const afterAvatar = afterLoad.find((entry) => entry.hasAvatarRecipe);
  expect(afterAvatar).toEqual(beforeAvatar);

  await selectAvatarGroup(page, 'Mold Roundtrip Avatar');
  await openAvatarForge(page);
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('psx_mesh_portrait_01');
  await expect(page.locator('#avatar-head-scale-input')).toHaveValue('1.18');
  await expect(page.locator('#avatar-eye-select')).toHaveValue('psx_almond_sharp_01');
  await expect(page.locator('#avatar-nose-select')).toHaveValue('nose_bridge_01');
  await expect(page.locator('#avatar-ear-select')).toHaveValue('ear_point_01');
  await expect(page.locator('#avatar-feature-eyes-spacing')).toHaveValue('14');
  await expect(page.locator('#avatar-feature-hair-length')).toHaveValue('18');
  await expect(page.locator('#avatar-feature-mouth-offsetY')).toHaveValue('-6');

  await assertNoPageErrors(page);
});
