import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
const server = await preview({ logLevel: 'warn', preview: { host: '127.0.0.1', port: 41740, strictPort: true } });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:41740/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  const silent = await page.locator('#audio').evaluate(audio => audio.paused && !audio.currentSrc);
  await page.evaluate(() => window.__SPEECH_LAB__.loadDemo('phrase'));
  await page.locator('#analysis-phonetic').click();
  const phonetic = await page.evaluate(() => ({ driver: window.__SPEECH_LAB__.driver, cues: window.__SPEECH_LAB__.track.cues.length }));
  if (phonetic.driver !== 'phonetic' || phonetic.cues !== 54) throw new Error('Compiled lip sync demonstration failed');
  await page.goto('http://127.0.0.1:41740/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__LOWPOLY64_READY__, null, { timeout: 60000 });
  await page.getByRole('button', { name: 'CHARACTER STUDIO', exact: true }).click();
  await page.locator('[data-retro-preset="mario64"]').click();
  await page.locator('#heroic-character-studio h2').waitFor({ timeout: 30000 });
  const title = await page.locator('#heroic-character-studio h2').innerText();
  await page.screenshot({ path: 'artifacts/mario64-speech-lab/mario-editor.png' });
  await page.locator('[data-hero-action="create"]').click();
  const recipe = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.at(-1).userData.characterDesignRecipe);
  if (!silent || title !== 'MARIO · N64' || recipe.body.profile !== 'plumber' || errors.length) throw new Error(JSON.stringify({ silent, title, recipe, errors }));
  await fs.writeFile('artifacts/mario64-speech-lab/production-verification.json', JSON.stringify({ silent, title, created: true, phonetic, errors }, null, 2));
  console.log(JSON.stringify({ silent, title, created: true, phonetic, errors }));
} finally { await browser?.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
