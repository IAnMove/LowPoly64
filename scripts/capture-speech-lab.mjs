import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  page.on('pageerror', error => console.error(error.message));
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.goto('http://127.0.0.1:41740/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try { await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 }); }
  catch (error) { console.log(await page.locator('#status').innerText()); throw error; }
  await page.evaluate(() => window.__SPEECH_LAB__.setPose('A'));
  await page.screenshot({ path: 'artifacts/mario64-speech-lab/laboratory.png', fullPage: true });
  for (const mode of ['svg', 'cutout', 'jaw']) await page.locator(`[data-mode="${mode}"] canvas`).screenshot({ path: `artifacts/mario64-speech-lab/mario-speaking-${mode}.png` });
  await page.evaluate(() => window.__SPEECH_LAB__.setView('mouth'));
  await page.locator('.cards').screenshot({ path: 'artifacts/mario64-speech-lab/mouth-comparison.png' });
  const result = await page.evaluate(async () => {
    const lab = window.__SPEECH_LAB__;
    await lab.loadDemo('vowels');
    const exports = {};
    for (const mode of ['svg', 'cutout', 'jaw']) {
      const data = new Uint8Array(await lab.exportPrototype(mode)); let binary = '';
      for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
      exports[mode] = btoa(binary);
    }
    const sources = [];
    lab.cards[0].mouth.object.traverse(node => { if (node.material?.map?.userData?.speechSvgMarkup) sources.push({ viseme: node.material.userData.speechViseme, svg: node.material.map.userData.speechSvgMarkup }); });
    const vowelsTrack = structuredClone(lab.track);
    await lab.loadDemo('phrase'); if (!(await lab.setDriver('phonetic'))) throw new Error('Phonetic demonstration is unavailable');
    const phoneticExports = {};
    for (const mode of ['svg', 'cutout', 'jaw']) {
      const data = new Uint8Array(await lab.exportPrototype(mode)); let binary = '';
      for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
      phoneticExports[mode] = btoa(binary);
    }
    return { exports, track: vowelsTrack, sources, phonetic: { exports: phoneticExports, track: lab.track } };
  });
  for (const [mode, base64] of Object.entries(result.exports)) await fs.writeFile(`artifacts/mario64-speech-lab/mario-speaking-${mode}.glb`, Buffer.from(base64, 'base64'));
  for (const [mode, base64] of Object.entries(result.phonetic.exports)) await fs.writeFile(`artifacts/mario64-speech-lab/mario-phonetic-${mode}.glb`, Buffer.from(base64, 'base64'));
  await fs.writeFile('artifacts/mario64-speech-lab/phonetic.track.json', JSON.stringify(result.phonetic.track, null, 2));
  await fs.writeFile('artifacts/mario64-speech-lab/vowels.track.json', JSON.stringify(result.track, null, 2));
  await fs.mkdir('artifacts/mario64-speech-lab/svg-mouths', { recursive: true });
  for (const { viseme, svg } of result.sources) await fs.writeFile(`artifacts/mario64-speech-lab/svg-mouths/${viseme}.svg`, svg);
  console.log(JSON.stringify({ exports: Object.keys(result.exports), svgSources: result.sources.length, frames: result.track.frames.length }));
} finally { await browser?.close(); await server.close(); }
