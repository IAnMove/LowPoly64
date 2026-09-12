import fs from 'node:fs/promises';
import JSZip from 'jszip';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 420000 });
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] } });

test('native studio reuses the selected character, preserves the scene and exports a recorded performance', async ({ page, context }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { state } = await import('/src/modules/shared/state.js');
    const { buildCharacterDesignGroup } = await import('/src/modules/agent/character-commands.js');
    const { HERO_PSX_RECIPE } = await import('/src/modules/character-studio/heroic-presets.js');
    const group = buildCharacterDesignGroup(HERO_PSX_RECIPE); group.position.x = 3; group.name = 'Mi protagonista';
    state.userObjects.add(group); state.selectedMesh = group;
    const prop = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshLambertMaterial({ color: '#dd9922' }));
    prop.name = 'Decorado de prueba'; prop.position.set(0, -.5, 0); state.userObjects.add(prop);
    window.__speechOriginal = { group, prop, count: state.userObjects.children.length, geometry: prop.geometry, material: prop.material, disposed: 0 };
    prop.geometry.addEventListener('dispose', () => window.__speechOriginal.disposed++);
  });
  const tabs = context.pages().length;
  await page.locator('#btn-speech-lab').click();
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready, null, { timeout: 90000 });
  expect(context.pages()).toHaveLength(tabs); expect(new URL(page.url()).pathname).toBe('/');
  expect(await page.evaluate(() => window.__SPEECH_STUDIO__.character.id)).toMatch(/^scene:/);
  const identity = await page.evaluate(() => ({ same: window.__SPEECH_STUDIO__.group === window.__speechOriginal.group, x: window.__SPEECH_STUDIO__.group.position.x }));
  expect(identity).toEqual({ same: false, x: 3 });
  await page.locator('#speech-view').selectOption('scene');
  expect(await page.evaluate(() => Boolean(window.__SPEECH_STUDIO__.world.getObjectByName('Decorado de prueba')))).toBe(true);
  await page.locator('#speech-view').selectOption('face');
  await page.locator('#speech-character').selectOption('mario64');
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready && window.__SPEECH_STUDIO__.character.id === 'mario64');
  await page.locator('#speech-audio').evaluate(audio => { audio.muted = true; });
  await page.evaluate(() => window.__SPEECH_STUDIO__.loadDemo(false));
  expect(await page.evaluate(() => window.__SPEECH_STUDIO__.track.source)).toBe('rhubarb');
  await page.locator('#speech-time').evaluate(input => { input.value = '2.3'; });
  await page.locator('#speech-time').dispatchEvent('input');
  const exported = await page.evaluate(async () => {
    const api = window.__SPEECH_STUDIO__;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
    const group = await parseGlbGroup(await api.exportModel(), 'speech.glb');
    const clips = group.userData.animationClips;
    const clip = clips.find(clip => clip.name === 'speech');
    const nodes = []; group.traverse(node => { if (node.name.startsWith('SPEECH_MOUTH')) nodes.push(node); });
    const snapshot = () => nodes.flatMap(node => [...node.position.toArray(), ...node.scale.toArray()]);
    const mixer = new THREE.AnimationMixer(group); mixer.clipAction(clip).play(); mixer.setTime(0); const rest = snapshot();
    mixer.setTime(api.track.frames.reduce((best, item) => item.open > best.open ? item : best).time); const peak = snapshot(); mixer.stopAllAction();
    return { clips: clips.map(clip => clip.name), moved: rest.some((value, index) => Math.abs(value - peak[index]) > .0001), finite: peak.every(Number.isFinite) };
  });
  expect(exported.clips).toContain('speech'); expect(exported.moved).toBe(true); expect(exported.finite).toBe(true);
  await page.locator('#speech-green').click();
  await expect.poll(() => page.locator('#speech-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data])).toEqual([0, 255, 0, 255]);
  const imageData = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#123456'; ctx.fillRect(0, 0, 2, 2); return canvas.toDataURL('image/png').split(',')[1]; });
  await page.locator('#speech-background').setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: Buffer.from(imageData, 'base64') });
  await expect.poll(() => page.locator('#speech-canvas').evaluate(canvas => [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data])).toEqual([18, 52, 86, 255]);
  await page.locator('#speech-clear-background').click();
  // A synthetic microphone exercises actual MediaRecorder without accessing a device.
  await page.evaluate(() => {
    const context = new AudioContext(); const oscillator = context.createOscillator(); oscillator.frequency.value = 180;
    const gain = context.createGain(); gain.gain.value = .18; const destination = context.createMediaStreamDestination();
    oscillator.connect(gain); gain.connect(destination); oscillator.start();
    window.__fakeSpeechMic = { context, oscillator, stream: destination.stream, requests: 0 };
    navigator.mediaDevices.getUserMedia = async () => { window.__fakeSpeechMic.requests++; await context.resume(); return destination.stream; };
  });
  expect(await page.evaluate(() => window.__fakeSpeechMic.requests)).toBe(0);
  await page.locator('#speech-mic').click();
  await expect(page.locator('#speech-mic')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#speech-record').click();
  await expect(page.locator('#speech-live')).toHaveAttribute('data-recording', 'true');
  await expect(page.locator('#speech-character')).toBeDisabled();
  await expect.poll(() => page.locator('#speech-live').textContent(), { timeout: 15000 }).toContain('0:02');
  await page.locator('#speech-record').click();
  await expect(page.locator('#speech-take')).toBeVisible({ timeout: 90000 });
  const take = await page.evaluate(() => {
    const take = window.__SPEECH_STUDIO__.lastTake;
    return { duration: take.duration, video: take.video.size, audio: take.audio?.size, track: take.track,
      sourceStopped: window.__fakeSpeechMic.stream.getTracks().every(track => track.readyState === 'ended') };
  });
  expect(take.duration).toBeGreaterThan(1); expect(take.video).toBeGreaterThan(1000); expect(take.audio).toBeGreaterThan(1000);
  expect(take.track.frames.some(frame => frame.open > .1)).toBe(true); expect(take.track.frames.at(-1).open).toBe(0); expect(take.sourceStopped).toBe(true);
  await fs.mkdir('artifacts/integrated-speech', { recursive: true });
  const downloadEvent = page.waitForEvent('download'); await page.locator('#speech-take-zip').click();
  const file = await downloadEvent; await file.saveAs('artifacts/integrated-speech/recorded-character.zip');
  const zip = await JSZip.loadAsync(await fs.readFile('artifacts/integrated-speech/recorded-character.zip'));
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  expect(manifest.animationClip).toBe('speech'); expect(manifest.audio).toBeTruthy(); expect(manifest.video).toBeTruthy();
  expect(JSON.parse(await zip.file('speech.track.json').async('string'))).toEqual(take.track);
  await fs.writeFile('artifacts/integrated-speech/performance.webm', await zip.file(manifest.video).async('nodebuffer'));
  await fs.writeFile('artifacts/integrated-speech/voice.webm', await zip.file(manifest.audio).async('nodebuffer'));
  await page.locator('#speech-bg').evaluate(input => { input.value = '#263c55'; input.dispatchEvent(new Event('input')); });
  await page.locator('#speech-time').evaluate(input => { input.value = '2.3'; }); await page.locator('#speech-time').dispatchEvent('input');
  await page.screenshot({ path: 'artifacts/integrated-speech/native-studio.png' });
  await page.locator('#speech-add').click();
  await expect(page.locator('#speech-status')).toContainText('Copia añadida', { timeout: 60000 });
  await page.locator('#workspace-scene-tab').click(); await expect(page.locator('#speech-workspace')).toBeHidden();
  const original = await page.evaluate(async () => {
    const { state } = await import('/src/modules/shared/state.js'); const original = window.__speechOriginal;
    const { undo } = await import('/src/modules/shared/undo.js');
    const added = state.userObjects.children.length === original.count + 1; undo();
    await window.__fakeSpeechMic.context.close();
    return { added, undone: state.userObjects.children.length === original.count, x: original.group.position.x, geometry: original.prop.geometry === original.geometry, material: original.prop.material === original.material, disposed: original.disposed };
  });
  expect(original).toEqual({ added: true, undone: true, x: 3, geometry: true, material: true, disposed: 0 });
  await page.locator('#btn-speech-lab').click(); await expect(page.locator('#speech-take')).toBeVisible();
  await page.locator('#workspace-scene-tab').click(); await expect(page.locator('#speech-workspace')).toBeHidden();
  await assertNoPageErrors(page);
});

test('closing a pending microphone request stops a late stream and leaves editor shortcuts isolated', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.locator('#btn-speech-lab').click(); await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready, null, { timeout: 90000 });
  await page.evaluate(() => {
    const ctx = new AudioContext(), stream = ctx.createMediaStreamDestination().stream;
    window.__lateSpeech = { ctx, stream };
    navigator.mediaDevices.getUserMedia = () => new Promise(resolve => { window.__lateSpeech.resolve = resolve; });
  });
  await page.locator('#speech-mic').click(); await expect(page.locator('#speech-mic')).toContainText('Cancelar');
  await page.locator('#speech-canvas').focus(); await page.keyboard.press('Delete');
  await expect(page.locator('#speech-workspace')).toBeVisible();
  await page.locator('#workspace-scene-tab').click(); await expect(page.locator('#speech-workspace')).toBeHidden();
  await page.evaluate(() => window.__lateSpeech.resolve(window.__lateSpeech.stream));
  await expect.poll(() => page.evaluate(() => window.__lateSpeech.stream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await page.evaluate(() => window.__lateSpeech.ctx.close());
  await assertNoPageErrors(page);
});

test('all mouth modes survive GLB reuse and file audio is captured without a microphone', async ({ page }) => {
  await bootstrapApp(page, '/?studio=speech', { requireEditorModals: false });
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.ready, null, { timeout: 90000 });
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = () => { throw new Error('No microphone should be requested'); }; });
  await page.evaluate(() => window.__SPEECH_STUDIO__.loadDemo(false));
  for (const [character, mode] of [['cloud', 'cutout'], ['explorer', 'jaw']]) {
    await page.locator('#speech-character').selectOption(character);
    await page.waitForFunction(id => window.__SPEECH_STUDIO__?.ready && window.__SPEECH_STUDIO__.character.id === id, character);
    await page.locator('#speech-mouth').selectOption(mode);
    await page.waitForFunction(mode => window.__SPEECH_STUDIO__?.ready && window.__SPEECH_STUDIO__.mouth.object.userData.speechMode === mode, mode);
    const result = await page.evaluate(async () => {
      const api = window.__SPEECH_STUDIO__;
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
      const { state } = await import('/src/modules/shared/state.js');
      const { listSceneSpeechCharacters, createSpeechCharacter, disposeSpeechClone } = await import('/src/modules/character-studio/speech/speech-scene-adapter.js');
      const imported = await parseGlbGroup(await api.exportModel(), 'talk.glb');
      const clips = imported.userData.animationClips, clip = clips.find(clip => clip.name === 'speech');
      const nodes = []; imported.traverse(node => { if (node.name.startsWith('SPEECH_MOUTH')) nodes.push(node); });
      const snapshot = () => nodes.flatMap(node => [...node.position.toArray(), ...node.scale.toArray(), ...node.quaternion.toArray()]);
      const mixer = new THREE.AnimationMixer(imported); mixer.clipAction(clip).play(); mixer.setTime(0); const rest = snapshot();
      mixer.setTime(api.track.frames.reduce((a,b) => b.open > a.open ? b : a).time); const peak = snapshot(); mixer.stopAllAction();
      state.userObjects.add(imported); state.selectedMesh = imported;
      const preset = listSceneSpeechCharacters().find(preset => preset.id === 'scene:' + imported.uuid);
      const reused = await createSpeechCharacter(preset); let previousMouth = false; reused.traverse(node => { if (node.userData.speechMouth) previousMouth = true; });
      const report = { moved: rest.some((value,index) => Math.abs(value - peak[index]) > 1e-5), clips: clips.length, anchor: preset.mouth, oldMouthRemoved: !previousMouth };
      disposeSpeechClone(reused); state.userObjects.remove(imported); state.selectedMesh = null;
      return report;
    });
    expect(result.moved).toBe(true); expect(result.clips).toBe(14); expect(result.anchor.parent).toBe('HEAD'); expect(result.oldMouthRemoved).toBe(true);
  }
  await page.locator('#speech-record').click();
  await expect(page.locator('#speech-live')).toHaveAttribute('data-recording', 'true');
  await expect(page.locator('#speech-take')).toBeVisible({ timeout: 60000 });
  const take = await page.evaluate(() => ({ duration: window.__SPEECH_STUDIO__.lastTake.duration, track: window.__SPEECH_STUDIO__.lastTake.track, sourcePeak: Math.max(...window.__SPEECH_STUDIO__.track.frames.map(frame => frame.open)) }));
  const capturedPeak = Math.max(...take.track.frames.map(frame => frame.open));
  await fs.writeFile('artifacts/integrated-speech/file-motion-verification.json', JSON.stringify({ duration: take.duration, sourcePeak: take.sourcePeak, capturedPeak, frames: take.track.frames.length }, null, 2));
  expect(take.duration).toBeGreaterThan(8); expect(take.duration).toBeLessThan(30);
  expect(take.sourcePeak).toBeGreaterThan(.03); expect(capturedPeak).toBeGreaterThan(take.sourcePeak * .6);
  const zipEvent = page.waitForEvent('download'); await page.locator('#speech-take-zip').click();
  await (await zipEvent).saveAs('artifacts/integrated-speech/file-audio-character.zip');
  const zip = await JSZip.loadAsync(await fs.readFile('artifacts/integrated-speech/file-audio-character.zip'));
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  await fs.writeFile('artifacts/integrated-speech/file-voice.webm', await zip.file(manifest.audio).async('nodebuffer'));
  await fs.writeFile('artifacts/integrated-speech/file-performance.webm', await zip.file(manifest.video).async('nodebuffer'));
  await page.locator('#speech-track-file').setInputFiles('public/speech-demo/vowels.cues.json');
  await expect(page.locator('#speech-play')).toContainText('movimientos');
  await page.locator('#speech-play').click();
  await expect.poll(() => page.locator('#speech-time').inputValue()).not.toBe('0');
  await page.locator('#speech-stop').click();
  await page.locator('#workspace-scene-tab').click(); await expect(page.locator('#speech-workspace')).toBeHidden();
  await assertNoPageErrors(page);
});
