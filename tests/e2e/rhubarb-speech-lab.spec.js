import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180000 });

async function openLab(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  await page.locator('#audio').evaluate(audio => { audio.muted = true; });
  return errors;
}

test('automatic gestures keep the same audio/time, analyze an uploaded recording and survive JSON/GLB', async ({ page }) => {
  const errors = await openLab(page);
  await page.evaluate(() => window.__SPEECH_LAB__.loadDemo('phrase'));
  await expect(page.locator('#analysis-phonetic')).toBeEnabled();
  await page.locator('#audio').evaluate(async audio => {
    audio.preload = 'metadata'; audio.load();
    if (audio.readyState < 1) await new Promise(resolve => audio.addEventListener('loadedmetadata', resolve, { once: true }));
  });
  await page.locator('#scrub').evaluate(input => { input.value = '2.3'; input.dispatchEvent(new Event('input')); });
  const before = await page.locator('#audio').evaluate(audio => ({ src: audio.currentSrc, time: audio.currentTime }));
  await page.locator('#analysis-phonetic').click();
  const after = await page.locator('#audio').evaluate(audio => ({ src: audio.currentSrc, time: audio.currentTime }));
  expect(after.src).toBe(before.src); expect(after.time).toBeCloseTo(before.time, 2);
  const comparison = await page.evaluate(() => {
    const lab = window.__SPEECH_LAB__, phonetic = lab.track;
    const m = phonetic.cues.find(c => c.viseme === 'M');
    const closure = lab.setTime((m.start + m.end) / 2);
    lab.setDriver('intensity'); const intensity = lab.track;
    return { cueCount: phonetic.cues.length, closure, different: JSON.stringify(phonetic.frames) !== JSON.stringify(intensity.frames) };
  });
  expect(comparison.cueCount).toBe(54); expect(comparison.closure.viseme).toBe('M'); expect(comparison.closure.open).toBeLessThan(.05); expect(comparison.different).toBe(true);

  await page.locator('#file').setInputFiles('public/speech-demo/phrase.wav');
  await expect(page.locator('#status')).toContainText('Preparado: phrase.wav');
  await expect(page.locator('#analysis-phonetic')).toBeDisabled();
  const available = await page.request.get('/api/speech/rhubarb/status');
  const installed = (await available.json()).installed;
  if (installed) {
    await page.locator('#analyze-audio').click();
    await expect(page.locator('#status')).toContainText('Gestos automáticos listos', { timeout: 90000 });
  } else {
    // Portable sample still verifies the complete UI/export flow without the optional executable.
    await page.evaluate(async () => { await window.__SPEECH_LAB__.loadDemo('phrase'); window.__SPEECH_LAB__.setDriver('phonetic'); });
  }
  expect(await page.evaluate(() => window.__SPEECH_LAB__.driver)).toBe('phonetic');
  const report = await page.evaluate(async () => {
    const lab = window.__SPEECH_LAB__;
    const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
    const { state } = await import('/src/modules/shared/state.js');
    const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
    const buffer = await lab.exportPrototype('jaw');
    const group = await parseGlbGroup(buffer, 'phonetic.glb');
    const clips = group.userData.animationClips;
    playAnimation(group, clips.findIndex(c => c.name === 'speech'));
    const nodes = []; group.traverse(node => { if (node.name.startsWith('SPEECH_MOUTH')) nodes.push(node); });
    const snapshot = () => nodes.flatMap(node => [...node.position.toArray(), ...node.quaternion.toArray(), ...node.scale.toArray()]);
    state.animationMixer.setTime(0); const resting = snapshot();
    const peak = lab.track.frames.reduce((best, frame) => frame.open > best.open ? frame : best);
    state.animationMixer.setTime(peak.time); const speaking = snapshot(); stopAnimation();
    return { track: lab.track, clips: clips.length, moved: resting.some((v, i) => Math.abs(v - speaking[i]) > 1e-5), finite: speaking.every(Number.isFinite), bytes: buffer.byteLength };
  });
  expect(report.clips).toBe(14); expect(report.moved).toBe(true); expect(report.finite).toBe(true);
  expect(report.track.frames.at(-1).open).toBe(0);
  await page.locator('#track-file').setInputFiles({ name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(report.track)) });
  await expect(page.locator('#status')).toContainText('Movimientos importados');
  expect(await page.evaluate(() => window.__SPEECH_LAB__.track)).toEqual(report.track);
  expect(await page.evaluate(() => window.__SPEECH_LAB__.driver)).toBe('phonetic');
  await expect(page.locator('#analysis-phonetic')).toHaveClass(/active/);
  await expect(page.locator('#analysis-intensity')).toBeDisabled();
  expect(await page.locator('#audio').getAttribute('src')).toBeNull();
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new Error('Permission denied for test'); }; });
  await page.locator('#mic').click();
  await expect(page.locator('#status')).toContainText('Permission denied');
  expect(await page.evaluate(() => window.__SPEECH_LAB__.driver)).toBe('phonetic');
  expect(errors).toEqual([]);
  await fs.writeFile('artifacts/mario64-speech-lab/phonetic-verification.json', JSON.stringify({ comparison, installed, ...report, errors }, null, 2));
});

test('a late cancelled result cannot replace a newer audio or unlock a newer analysis; errors preserve intensity', async ({ page }) => {
  await page.route('**/api/speech/rhubarb/status', route => route.fulfill({ json: { ok: true, installed: true } }));
  const errors = await openLab(page);
  await expect(page.locator('#engine-status')).toHaveAttribute('data-state', 'ready');
  await page.evaluate(async () => {
    const originalFetch = window.fetch.bind(window);
    window.analysisRequests = [];
    window.fetch = (url, options) => String(url) === '/api/speech/rhubarb'
      ? new Promise(resolve => window.analysisRequests.push({ options, resolve: (body, status = 200) => resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) }))
      : originalFetch(url, options);
    await window.__SPEECH_LAB__.loadDemo('phrase');
  });
  await page.locator('#analyze-audio').click();
  await expect(page.locator('#analyze-audio')).toBeDisabled();
  await page.evaluate(() => window.__SPEECH_LAB__.loadDemo('vowels'));
  const vowels = await page.evaluate(() => window.__SPEECH_LAB__.track);
  await page.locator('#analyze-audio').click();
  await page.evaluate(() => window.analysisRequests[0].resolve({ ok: true, result: { mouthCues: [{ start: 0, end: 8, value: 'D' }] } }));
  expect(await page.evaluate(() => window.analysisRequests[0].options.signal.aborted)).toBe(true);
  await expect(page.locator('#analyze-audio')).toBeDisabled();
  expect(await page.evaluate(() => window.__SPEECH_LAB__.track)).toEqual(vowels);
  await page.evaluate(() => window.analysisRequests[1].resolve({ ok: false, error: { message: 'Motor local no disponible para esta prueba.' } }, 503));
  await expect(page.locator('#status')).toContainText('Motor local no disponible');
  await expect(page.locator('#analyze-audio')).toBeEnabled();
  expect(await page.evaluate(() => window.__SPEECH_LAB__.driver)).toBe('intensity');
  expect(await page.evaluate(() => window.__SPEECH_LAB__.track)).toEqual(vowels);
  await page.locator('#scrub').evaluate(input => { input.value = '.52'; input.dispatchEvent(new Event('input')); });
  await expect(page.locator('#viseme')).toHaveText('A');
  expect(errors).toEqual([]);
});
