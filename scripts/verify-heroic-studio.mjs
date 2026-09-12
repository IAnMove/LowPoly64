import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1050 } });
  const errors = []; page.on('pageerror', error => { errors.push(error.message); console.log('PAGE_ERROR', error.message); }); page.on('console', msg => { if (msg.type() === 'error') console.log('BROWSER', msg.text()); });
  await page.goto('http://127.0.0.1:41740');
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60000 });
  await page.evaluate(async () => (await import('/src/modules/shared/i18n.js')).setLang('es'));
  async function open() {
    await page.evaluate(async () => (await import('/src/modules/character-studio/character-studio.js')).openCharacterStudio());
    console.log('studio open'); await page.locator('[data-retro-preset="hero-psx"]').click({ timeout: 60000 }); console.log('hero clicked');
    await page.locator('#heroic-character-studio').waitFor();
  }
  await open();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await fs.mkdir('artifacts/psx-hero-art-direction', { recursive: true });
  await page.screenshot({ path: 'artifacts/psx-hero-art-direction/06-editor.png' });
  const shoulders = page.locator('[data-hero-field="body.shoulders"]');
  await shoulders.focus(); for (let i = 0; i < 6; i++) await shoulders.press('ArrowRight');
  await page.locator('[data-hero-action="create"]').click();
  await page.locator('#heroic-character-studio').waitFor({ state: 'detached' });
  const first = await page.evaluate(() => {
    const group = window.__LOWPOLY64_STATE__.selectedMesh;
    return { profile: group.userData.characterDesignRecipe.body.profile, shoulders: group.userData.characterDesignRecipe.body.shoulders, sword: !!group.getObjectByName('EQUIP_SWORD_BLADE'), clips: group.userData.animationClips.length };
  });
  assert.equal(first.profile, 'heroic'); assert.equal(first.shoulders, 1.15); assert.equal(first.sword, true); assert.ok(first.clips > 0);
  await open();
  await page.locator('[data-hero-action="body"]').click();
  await page.locator('#heroic-character-studio').waitFor({ state: 'detached' });
  const body = await page.evaluate(() => {
    const group = window.__LOWPOLY64_STATE__.selectedMesh;
    const head = group.getObjectByName('HEAD');
    return { hasHeadMesh: head.children.some(child => child.isMesh), hasSword: !!group.getObjectByName('EQUIP_SWORD_BLADE'), torsoId: group.getObjectByName('TORSO').uuid };
  });
  assert.equal(body.hasHeadMesh, false); assert.equal(body.hasSword, false);
  await open();
  const jaw = page.locator('[data-hero-field="head.jaw"]'); await jaw.focus(); await jaw.press('Home'); for (let i = 0; i < 4; i++) await jaw.press('ArrowRight');
  await page.locator('[data-hero-action="head"]').click();
  await page.locator('#heroic-character-studio').waitFor({ state: 'detached', timeout: 20000 });
  const applied = await page.evaluate(async () => {
    const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
    const state = window.__LOWPOLY64_STATE__;
    const group = state.selectedMesh;
    const result = { hasHeadMesh: group.getObjectByName('HEAD').children.some(child => child.isMesh), jaw: group.userData.characterDesignRecipe.head.jaw, shoulders: group.userData.characterDesignRecipe.body.shoulders };
    await executeAgentCommand('undo');
    result.undoHeadless = state.userObjects.children.at(-1).getObjectByName('HEAD').children.every(child => !child.isMesh);
    return result;
  });
  assert.equal(applied.hasHeadMesh, true); assert.equal(applied.jaw, .85); assert.equal(applied.shoulders, 1.15); assert.equal(applied.undoHeadless, true);
  assert.deepEqual(errors, []);
  const report = { first, body, applied, errors };
  await fs.writeFile('artifacts/psx-hero-art-direction/editor-verification.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await server.close(); }
