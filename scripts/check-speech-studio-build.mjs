import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

// Run after build, with no other headless WebGL suite running.
const root = path.resolve('dist'), output = path.resolve('artifacts/integrated-speech');
await fs.mkdir(output, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
const staticServer = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
    response.setHeader('content-type', types[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch { response.writeHead(404).end('Not found'); }
});
let local, browser;
try {
  await new Promise((resolve, reject) => { staticServer.once('error', reject); staticServer.listen(41741, '127.0.0.1', resolve); });
  local = await preview({ logLevel: 'warn', preview: { host: '127.0.0.1', port: 41740, strictPort: true } });
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] });
  const report = [];
  for (const [mode, port] of [['local', 41740], ['static', 41741]]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('lowpoly64-lang', 'es'));
    await page.goto(`http://127.0.0.1:${port}/speech-lab.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready, null, { timeout: 90000 });
    assert.equal(new URL(page.url()).pathname, '/');
    assert.equal(new URL(page.url()).search, '?studio=speech');
    assert.equal(await page.locator('#editor-topbar').isVisible(), true);
    assert.equal(await page.locator('#workspace-tabs').isVisible(), true);
    assert.equal(await page.locator('#speech-workspace').getAttribute('role'), 'tabpanel');
    assert.equal(await page.locator('dialog:visible, iframe:visible').count(), 0);
    assert.equal(await page.locator('#speech-audio').evaluate(audio => audio.paused && !audio.currentSrc), true);
    assert.equal(await page.locator('#speech-mic').getAttribute('aria-pressed'), 'false');
    await page.evaluate(() => window.__SPEECH_STUDIO__.loadDemo(false));
    const exported = await page.evaluate(async () => {
      const api = window.__SPEECH_STUDIO__, buffer = await api.exportModel();
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, new DataView(buffer).getUint32(12, true))).trim());
      return { bytes: buffer.byteLength, cues: api.track.cues.length, clips: gltf.animations.map(clip => clip.name), speechChannels: gltf.animations.find(clip => clip.name === 'speech').channels.length };
    });
    assert.equal(exported.cues, 54); assert.equal(exported.clips.length, 14); assert.ok(exported.speechChannels > 0);
    if (mode === 'static') assert.equal(await page.locator('#speech-analyze').isDisabled(), true);
    await page.locator('#speech-time').evaluate(input => { input.value = '2.3'; input.dispatchEvent(new Event('input')); });
    await page.screenshot({ path: path.join(output, `native-${mode}-build.png`) });
    let analysis = { attempted: false };
    if (mode === 'local' && !await page.locator('#speech-analyze').isDisabled()) {
      await page.locator('#speech-analyze').click();
      await page.waitForFunction(() => document.querySelector('#speech-status')?.textContent.includes('Gestos calculados.'), null, { timeout: 90000 });
      analysis = await page.evaluate(() => ({ attempted: true, source: window.__SPEECH_STUDIO__.track.source, cues: window.__SPEECH_STUDIO__.track.cues.length }));
      assert.equal(analysis.source, 'rhubarb'); assert.ok(analysis.cues > 0);
    }
    await page.locator('#workspace-scene-tab').click(); await page.waitForFunction(() => document.querySelector('#speech-workspace')?.hidden === true);
    await page.goto(`http://127.0.0.1:${port}/help.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#speech-lab-steps li').first().waitFor();
    assert.equal(await page.locator('[data-help=speechLabOpen]').getAttribute('href'), '/?studio=speech');
    assert.deepEqual(errors, []); report.push({ mode, silentStart: true, exported, analysis, errors }); await page.close();
  }
  await fs.writeFile(path.join(output, 'production-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser?.close();
  if (local) await new Promise(resolve => local.httpServer.close(resolve));
  if (staticServer.listening) await new Promise(resolve => staticServer.close(resolve));
}
