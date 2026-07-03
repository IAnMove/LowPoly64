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
    headMoldId: 'gen_head_chibi',
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
  expect(beforeAvatar?.avatarRecipe?.headMoldId).toBe('gen_head_chibi');
  expect(beforeAvatar?.avatarRecipe?.colorOverrides).toEqual({
    hair: '#3a2254',
    accent: '#ff8a5b',
    bodyPrimary: '#138d90',
  });
  expect(afterAvatar).toEqual(beforeAvatar);

  await assertNoPageErrors(page);
});

test('migrates legacy and unknown head ids when loading saved avatar scenes', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page);

  await page.evaluate(() => {
    const baseRecipe = {
      bodyPresetId: 'psx_chibi',
      accessoryIds: ['none'],
      paletteId: 'warm_rose',
      features: {
        hair: { presetId: 'bob_01' },
        eyes: { presetId: 'wide_01' },
        brows: { presetId: 'soft_01' },
        nose: { presetId: 'nose_soft_01' },
        mouth: { presetId: 'neutral_01' },
        ears: { presetId: 'ear_soft_01' },
      },
    };
    localStorage.setItem('lowpoly64-scene', JSON.stringify({
      version: 1,
      objects: [
        {
          type: 'avatar-group',
          name: 'Legacy Cabezon Scene',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          avatarRecipe: {
            ...baseRecipe,
            label: 'Legacy Cabezon Scene',
            headMoldId: 'psx_mesh_portrait_cabezon_175',
          },
        },
        {
          type: 'avatar-group',
          name: 'Missing Head Scene',
          position: [1, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          avatarRecipe: {
            ...baseRecipe,
            label: 'Missing Head Scene',
            headMoldId: 'unknown_saved_head_01',
          },
        },
      ],
    }));
  });

  await page.evaluate(async () => {
    await window.loadScene();
  });
  await expect(page.getByText(/Head migrated to the new system|cabeza migrada al nuevo sistema/i)).toBeVisible();
  await waitForSceneObjectCount(page, 2);

  const afterLoad = await sceneSummary(page);
  const legacyAvatar = afterLoad.find((entry) => entry.name === 'Legacy Cabezon Scene');
  const unknownAvatar = afterLoad.find((entry) => entry.name === 'Missing Head Scene');

  expect(legacyAvatar?.avatarRecipe?.headMoldId).toBe('gen_head_chibi');
  expect(unknownAvatar?.avatarRecipe?.headMoldId).toBe('gen_head_heroic');
  expect(legacyAvatar?.avatarRecipe?.features?.eyes?.presetId).toBe('wide_01');
  expect(unknownAvatar?.avatarRecipe?.paletteId).toBe('warm_rose');

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
  expect(beforeAvatar?.avatarRecipe?.headMoldId).toBe('gen_head_heroic');
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
  await expect(page.locator('#avatar-head-mold-select')).toHaveValue('gen_head_heroic');
  await expect(page.locator('#avatar-head-scale-input')).toHaveValue('1.18');
  await expect(page.locator('#avatar-eye-select')).toHaveValue('psx_almond_sharp_01');
  await expect(page.locator('#avatar-nose-select')).toHaveValue('nose_bridge_01');
  await expect(page.locator('#avatar-ear-select')).toHaveValue('ear_point_01');
  await expect(page.locator('#avatar-feature-eyes-spacing')).toHaveValue('14');
  await expect(page.locator('#avatar-feature-hair-length')).toHaveValue('18');
  await expect(page.locator('#avatar-feature-mouth-offsetY')).toHaveValue('-6');

  await assertNoPageErrors(page);
});
