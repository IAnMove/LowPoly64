import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('creates a reusable body and swaps a head without losing body edits, with undo and redo', async ({ page }) => {
  await bootstrapApp(page);
  await page.locator('#btn-character-studio').click();
  const modal = page.locator('#retro-character-studio-modal');
  await expect(modal).toBeVisible();
  await modal.locator('[data-retro-field="style"]').selectOption('n64');
  await modal.getByRole('button', { name: /CREATE REUSABLE BODY|CREAR CUERPO REUTILIZABLE/ }).click();
  await expect(modal).toHaveCount(0);
  await page.evaluate(() => {
    const group = window.__LOWPOLY64_STATE__.userObjects.children[0];
    group.getObjectByName('ARM_L_UPPER').scale.x = 1.25;
    group.getObjectByName('TORSO').children.find(child=>child.isMesh).material.color.set('#123456');
  });
  await page.locator('#btn-edit-character').click();
  await expect(modal.locator('[data-retro-field="style"]')).toHaveValue('n64');
  await modal.locator('[data-retro-field="headStyle"]').selectOption('psx');
  await modal.locator('[data-retro-field="hair"]').selectOption('spiky');
  // These preview-only body changes must not leak into a head-only application.
  await modal.locator('[data-retro-field="style"]').selectOption('psx');
  await modal.getByRole('button', { name: /APPLY HEAD TO SELECTED|APLICAR CABEZA AL SELECCIONADO/ }).click();
  const readBody = () => page.evaluate(() => {
    const g=window.__LOWPOLY64_STATE__.userObjects.children[0];
    return {arm:g.getObjectByName('ARM_L_UPPER').scale.x,shirt:g.getObjectByName('TORSO').children.find(c=>c.isMesh).material.color.getHexString(),headChildren:g.getObjectByName('HEAD').children.length,recipe:g.userData.retroCharacterRecipe};
  });
  const changed=await readBody();
  expect(changed.arm).toBe(1.25);
  expect(changed.shirt).toBe('123456');
  expect(changed.headChildren).toBeGreaterThan(0);
  expect(changed.recipe.style).toBe('n64');
  expect(changed.recipe.headStyle).toBe('psx');
  expect(changed.recipe.includeHead).toBe(true);
  await page.evaluate(async()=>{const {undo}=await import('/src/modules/shared/undo.js');undo();});
  expect((await readBody()).headChildren).toBe(0);
  await page.evaluate(async()=>{const {redo}=await import('/src/modules/shared/undo.js');redo();});
  expect(await readBody()).toEqual(changed);
  await assertNoPageErrors(page);
});

test('rejects unsupported recipes and accepts an actual GLB file through the import dialog', async ({ page }) => {
  await bootstrapApp(page);
  await page.evaluate(()=>window.openImportModal());
  await page.locator('#import-json-textarea').fill(JSON.stringify({format:'retrovisor-character',version:99,style:'n64'}));
  await page.evaluate(()=>window.handleImportSubmit());
  await expect(page.locator('#import-error')).toContainText(/version/i);
  expect(await page.evaluate(()=>window.__LOWPOLY64_STATE__.userObjects.children.length)).toBe(0);
  const bytes = await page.evaluate(async()=>{
    const {buildRetroCharacterGroup}=await import('/src/modules/character-studio/character-studio.js');
    const {exportGLBToBuffer}=await import('/src/modules/viewport/export.js');
    const s=window.__LOWPOLY64_STATE__;s.userObjects.add(buildRetroCharacterGroup({style:'psx'}));
    const {buffer}=await exportGLBToBuffer();s.userObjects.clear();return Array.from(new Uint8Array(buffer));
  });
  await page.locator('#import-model-file').setInputFiles({name:'psx-test.glb',mimeType:'model/gltf-binary',buffer:Buffer.from(bytes)});
  await expect(page.locator('#import-modal')).toBeHidden();
  const report=await page.evaluate(()=>{const g=window.__LOWPOLY64_STATE__.userObjects.children[0];return {native:g.userData.nativeGltf,style:g.userData.retroCharacterRecipe?.style,clips:g.userData.animationClips.length};});
  expect(report.native).toBe(true);expect(report.style).toBe('psx');expect(report.clips).toBeGreaterThan(0);
  await assertNoPageErrors(page);
});
