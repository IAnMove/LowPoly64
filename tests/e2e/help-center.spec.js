import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 120000 });

test('documents the workflows and shares language with the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#lang-toggle')).toHaveText('EN 🇺🇸');
  await expect(page.locator('a[href="./help.html"]')).toBeVisible();

  await page.goto('/help.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#help-lang-toggle')).toHaveText('EN 🇺🇸');
  await expect(page.locator('#object-json')).toContainText('Object JSON');
  await expect(page.locator('#animation-json')).toContainText('Animation JSON');
  await expect(page.locator('#prompts')).toContainText('Full object prompt');
  await expect(page.locator('#object-json-example')).toContainText('"pieces"');
  await expect(page.locator('#animation-json-example')).toContainText('"tracks"');
  await page.screenshot({ path: 'artifacts/help-center/help-en.png', fullPage: true });

  await page.locator('#help-lang-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#help-lang-toggle')).toHaveText('ES 🇪🇸');
  await expect(page.locator('#object-json')).toContainText('JSON de objetos');
  await expect(page.locator('#animation-json')).toContainText('JSON de animaciones');
  await expect(page.locator('#prompts')).toContainText('Prompt completo de objeto');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lowpoly64-lang'))).toBe('es');
  await page.screenshot({ path: 'artifacts/help-center/help-es.png', fullPage: true });

  await page.goto('/');
  await expect(page.locator('#lang-toggle')).toHaveText('ES 🇪🇸');
  await expect(page.locator('a[href="./help.html"]')).toHaveText('AYUDA');

  await page.locator('#lang-toggle').click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lowpoly64-lang'))).toBe('en');
  await page.goto('/help.html');
  await expect(page.locator('#help-lang-toggle')).toHaveText('EN 🇺🇸');
});
