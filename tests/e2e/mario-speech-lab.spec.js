import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';
test.describe.configure({ timeout: 180000 });

const pageDiagnostics = new WeakMap();
const isModuleRequest = (url) => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.includes('/src/') || pathname.includes('/node_modules/');
  } catch {
    return false;
  }
};

test.beforeEach(async ({ page }) => {
  const events = [];
  const pending = new Map();
  const started = Date.now();
  const record = (entry) => {
    events.push({ elapsedMs: Date.now() - started, ...entry });
    if (events.length > 2000) events.shift();
  };
  page.on('request', (request) => {
    if (!isModuleRequest(request.url())) return;
    pending.set(request.url(), { url: request.url(), resourceType: request.resourceType() });
    record({ kind: 'request', url: request.url(), resourceType: request.resourceType() });
  });
  page.on('requestfinished', (request) => {
    if (!isModuleRequest(request.url())) return;
    pending.delete(request.url());
    record({ kind: 'finished', url: request.url() });
  });
  page.on('requestfailed', (request) => {
    if (!isModuleRequest(request.url())) return;
    pending.delete(request.url());
    record({ kind: 'failed', url: request.url(), error: request.failure()?.errorText || null });
  });
  page.on('pageerror', (error) => record({ kind: 'pageerror', error: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') record({ kind: `console:${message.type()}`, text: message.text() });
  });
  pageDiagnostics.set(page, { events, pending, started });
});

test.afterEach(async ({ page }, testInfo) => {
  const diagnostics = pageDiagnostics.get(page);
  if (!diagnostics) return;
  let runtime = null;
  try {
    runtime = await page.evaluate(() => ({
      ready: window.__LOWPOLY64_READY__ === true,
      state: !!window.__LOWPOLY64_STATE__,
      canvas: !!document.querySelector('#canvas, #viewport-container canvas'),
      speechLab: !!window.__SPEECH_LAB__,
    }));
  } catch (error) {
    runtime = { error: error.message };
  }
  await fs.writeFile(testInfo.outputPath('mario-speech-lab-diagnostics.json'), JSON.stringify({
    runtime,
    pending: [...diagnostics.pending.values()],
    events: diagnostics.events,
  }, null, 2));
});
test('Mario creates from the catalog and survives JSON and GLB import with its rig', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const report = await page.evaluate(async () => {
    const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
    const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
    const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
    const state = window.__LOWPOLY64_STATE__; state.userObjects.clear(); state.selectedMesh = null; state.selectedMeshes.clear();
    const run = async (name, args) => { const r = await executeAgentCommand(name, args); if (!r.ok) throw new Error(JSON.stringify(r.error)); return r; };
    const draft = await run('build_character_draft', { catalog_id: 'studio:mario64', operation_id: 'mario-test-create' });
    const commit = await run('commit_character_draft', { draft_id: draft.data.draftId, expected_revision: 0, operation_id: 'mario-test-commit' });
    const id = commit.data.id, root = state.userObjects.children.at(-1);
    const exports = {};
    for (const format of ['json', 'glb', 'recipe']) exports[format] = (await run('export_character_asset', { id, format })).artifacts[0].data;
    const inspect = group => {
      const clips = group.userData.animationClips, hand = group.getObjectByName('ARM_R_UPPER');
      const wave = clips.findIndex(c => c.name === 'wave'); playAnimation(group, wave); state.animationMixer.setTime(0); const before = hand.quaternion.toArray(); state.animationMixer.setTime(.43); const after = hand.quaternion.toArray(); stopAnimation();
      const color = name => group.getObjectByName(name).children.find(c => c.isMesh).material.color.getHexString();
      return { body: group.userData.characterDesignRecipe.body.profile, head: group.userData.characterDesignRecipe.head.profile, clips: clips.length, moved: before.some((v, i) => Math.abs(v - after[i]) > 1e-5), faceParent: group.getObjectByName('NOSE').parent.name, glove: color('HAND_R'), bib: color('OUTFIT_BIB'), back: !!group.getObjectByName('OUTFIT_BIB_BACK') };
    };
    const original = inspect(root);
    state.userObjects.clear(); const jsonResult = await importObjectFromJSON(JSON.stringify(exports.json)); const json = inspect(state.userObjects.children.at(-1));
    state.userObjects.clear(); const bytes = Uint8Array.from(atob(exports.glb), c => c.charCodeAt(0)); await importGlbFromBuffer(bytes.buffer, 'mario.glb'); const glb = inspect(state.userObjects.children.at(-1));
    return { original, json, glb, jsonSuccess: jsonResult.success, recipe: exports.recipe };
  });
  expect(report.jsonSuccess).toBe(true);
  for (const shape of [report.original, report.json, report.glb]) {
    expect(shape).toMatchObject({ body: 'plumber', head: 'plumber', clips: 13, moved: true, faceParent: 'HEAD', glove: 'f1eddd', bib: '2464bf', back: true });
  }
  expect(report.recipe.hair.style).toBe('plumber_cap');
  await fs.writeFile('artifacts/mario64-speech-lab/mario-verification.json', JSON.stringify(report, null, 2));
  assertNoPageErrors(page);
});

test('speech lab stays silent on load, accepts local audio/cues and exports three moving characters', async ({ page }) => {
  const pageErrors = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  expect(await page.locator('#audio').evaluate(audio => audio.paused && !audio.currentSrc)).toBe(true);
  const report = await page.evaluate(async () => {
    const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
    const { state } = await import('/src/modules/shared/state.js');
    const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
    const lab = window.__SPEECH_LAB__; await lab.loadDemo('vowels');
    const u = lab.track.cues.find(c => c.viseme === 'U'), m = lab.track.cues.find(c => c.viseme === 'M');
    const U = lab.setTime((u.start + u.end) / 2).viseme, M = lab.setTime((m.start + m.end) / 2).viseme, silence = lab.setTime(.1).open;
    const exports = [];
    for (const mode of ['svg', 'cutout', 'jaw']) {
      document.getElementById('status').textContent = 'Exportando ' + mode;
      const buffer = await lab.exportPrototype(mode);
      document.getElementById('status').textContent = 'Reabriendo ' + mode;
      const group = await Promise.race([parseGlbGroup(buffer, mode + '.glb'), new Promise((_, reject) => setTimeout(() => reject(new Error('GLB import timeout: ' + mode)), 20000))]);
      const clips = group.userData.animationClips || [], clipIndex = clips.findIndex(c => c.name === 'speech');
      playAnimation(group, clipIndex);
      const nodes = []; group.traverse(n => { if (n.name.startsWith('SPEECH_MOUTH')) nodes.push(n); });
      const snapshot = () => nodes.flatMap(n => [...n.position.toArray(), ...n.quaternion.toArray(), ...n.scale.toArray()]);
      state.animationMixer.setTime(.1); const rest = snapshot(); state.animationMixer.setTime(.52); const opened = snapshot();
      const changed = rest.some((n, i) => Math.abs(n - opened[i]) > 1e-5), finite = opened.every(Number.isFinite);
      const textured = nodes.filter(n => n.material?.map).length;
      stopAnimation();
      exports.push({ mode, clips: clips.length, changed, finite, textured, bytes: buffer.byteLength });
    }
    return { U, M, silence, exports };
  });
  expect(report).toMatchObject({ U: 'U', M: 'M', silence: 0 });
  for (const entry of report.exports) { expect(entry.clips).toBe(14); expect(entry.changed).toBe(true); expect(entry.finite).toBe(true); expect(entry.bytes).toBeGreaterThan(10000); }
  expect(report.exports[0].textured).toBe(8);
  await page.locator('#file').setInputFiles('public/speech-demo/phrase.wav');
  await expect(page.locator('#status')).toContainText('Preparado: phrase.wav', { timeout: 20000 });
  const audioTrack = await page.evaluate(() => window.__SPEECH_LAB__.track);
  expect(Math.max(...audioTrack.frames.map(f => f.open))).toBeGreaterThan(.15);
  expect(audioTrack.frames.at(-1).open).toBe(0);
  await page.locator('#track-file').setInputFiles('public/speech-demo/vowels.cues.json');
  await expect(page.locator('#status')).toContainText('Movimientos importados');
  expect(await page.locator('#audio').evaluate(audio => audio.paused)).toBe(true);
  await page.locator('[data-viseme="O"]').click();
  await expect(page.locator('#viseme')).toHaveText('O');
  await page.locator('#stop').click(); await expect(page.locator('#viseme')).toHaveText('REPOSO');
  const download = page.waitForEvent('download'); await page.locator('#save-track').click(); expect((await download).suggestedFilename()).toBe('speech.track.json');
  expect(pageErrors).toEqual([]);
  await fs.writeFile('artifacts/mario64-speech-lab/lab-verification.json', JSON.stringify({ ...report, audioPeak: Math.max(...audioTrack.frames.map(f => f.open)), pageErrors }, null, 2));
});

test('Character Studio exposes Mario, recipe proportions and the speech laboratory', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.evaluate(() => {
    const state = window.__LOWPOLY64_STATE__; state.userObjects.clear(); state.selectedMesh = null; state.selectedMeshes.clear();
  });
  await page.locator('#btn-character-studio').click();
  await expect(page.locator('#retro-character-studio-modal [data-open-speech]')).toBeVisible({ timeout: 30000 });
  await page.locator('[data-retro-preset="mario64"]').click();
  await expect(page.locator('#heroic-character-studio h2')).toHaveText('MARIO · N64', { timeout: 20000 });
  await page.locator('[data-hero-field="head.scale"]').fill('0.85');
  await page.locator('[data-hero-action="create"]').click();
  const recipe = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.at(-1).userData.characterDesignRecipe);
  expect(recipe.body.profile).toBe('plumber'); expect(recipe.head.scale).toBe(.85);
  assertNoPageErrors(page);
});
test('stopping a pending microphone request prevents late activation, and demo audio returns to rest', async ({ page }) => {
  await page.goto('/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    window.cancelledMicTracks = 0;
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.resolvePendingMic = () => resolve({ getTracks: () => [{ stop: () => window.cancelledMicTracks++ }] }); });
    document.getElementById('audio').muted = true;
  });
  await page.locator('#mic').click(); await expect(page.locator('#mic')).toBeDisabled();
  await page.locator('#stop').click();
  await page.evaluate(() => window.resolvePendingMic());
  await expect.poll(() => page.evaluate(() => window.cancelledMicTracks)).toBe(1);
  await expect(page.locator('#mic')).toHaveText('Usar micrófono'); await expect(page.locator('#mic')).toBeEnabled();
  await page.locator('#phrase').click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(.2);
  await page.locator('#stop').click(); await expect(page.locator('#viseme')).toHaveText('REPOSO');
  expect(await page.locator('#audio').evaluate(audio => audio.paused)).toBe(true);
});