import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

// Run after npm run build. Check the actual dist/ both with and without Node APIs.
const output = path.resolve('artifacts/release-review');
const captures = path.resolve('docs/releases/v0.9.0');
const root = path.resolve('dist');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(captures, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const staticServer = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
});
let local, browser;
try {
  await new Promise((resolve, reject) => { staticServer.once('error', reject); staticServer.listen(41741, '127.0.0.1', resolve); });
  local = await preview({ logLevel: 'warn', preview: { host: '127.0.0.1', port: 41740, strictPort: true } });
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'],
  });
  const report = { modes: [], errors: [] };
  for (const [mode, port] of [['local-preview', 41740], ['static', 41741]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    page.on('pageerror', error => report.errors.push({ mode, error: error.message }));
    const origin = `http://127.0.0.1:${port}`;
    await page.goto(origin + '/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__SPEECH_LAB__?.ready && window.__SPEECH_LAB__.engineState !== 'checking', null, { timeout: 60000 });
    assert.equal(await page.locator('#audio').evaluate(audio => audio.paused && !audio.currentSrc), true);
    const engine = await page.evaluate(() => window.__SPEECH_LAB__.engineState);
    if (mode === 'static') assert.equal(engine, 'unavailable');
    else assert.ok(['ready', 'missing'].includes(engine));
    await page.evaluate(() => window.__SPEECH_LAB__.loadDemo('phrase'));
    await page.locator('#analysis-phonetic').click();
    assert.equal(await page.evaluate(() => window.__SPEECH_LAB__.track.cues.length), 54);
    assert.equal(await page.locator('#analyze-audio').isDisabled(), engine !== 'ready');
    const characters = [];
    for (const id of ['mario64', 'cloud', 'explorer']) {
      await page.locator('#character').selectOption(id);
      await page.waitForFunction(id => window.__SPEECH_LAB__.characterId === id, id);
      characters.push(await page.evaluate(() => window.__SPEECH_LAB__.characterId));
    }
    await page.evaluate(() => { const lab = window.__SPEECH_LAB__; lab.setTime(lab.track.frames.reduce((a, b) => b.open > a.open ? b : a).time); });
    await page.locator('.lab').screenshot({ path: path.join(captures, `speech-${mode}.png`) });
    // A static build must export the prepared gestures, not merely show them.
    const exported = await page.evaluate(async () => {
      const buffer = await window.__SPEECH_LAB__.exportPrototype('jaw');
      const length = new DataView(buffer).getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)).trim());
      return { bytes: buffer.byteLength, clips: gltf.animations.map(clip => clip.name) };
    });
    assert.equal(exported.clips.length, 14);
    assert.ok(exported.clips.includes('speech'));
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOWPOLY64_READY__, null, { timeout: 60000 });
    assert.equal(await page.locator('#btn-speech-lab').isVisible(), true);
    if (mode === 'local-preview') await page.screenshot({ path: path.join(captures, 'editor-speech-entry.png') });
    await page.goto(origin + '/help.html', { waitUntil: 'domcontentloaded' });
    await page.locator('#speech-lab-steps li').first().waitFor();
    assert.equal(await page.locator('#speech-lab-steps li').count(), 4);
    const firstLanguage = await page.locator('#speech-lab h2').innerText();
    await page.locator('#help-lang-toggle').click();
    assert.notEqual(await page.locator('#speech-lab h2').innerText(), firstLanguage);
    report.modes.push({ mode, engine, silentStart: true, preparedCues: 54, characters, exported, sidebar: true, bilingualHelp: true });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  await fs.writeFile(path.join(output, 'production-static-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (local) await new Promise(resolve => local.httpServer.close(resolve));
  if (staticServer.listening) await new Promise(resolve => staticServer.close(resolve));
}
