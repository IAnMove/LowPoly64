import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 180000 });
test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--mute-audio'] } });

async function addSceneCharacter(page, name, x) {
  return page.evaluate(async ({ name: groupName, x: positionX }) => {
    const { state } = await import('/src/modules/shared/state.js');
    const { selectMesh } = await import('/src/modules/viewport/selection.js');
    const { buildCharacterDesignGroup } = await import('/src/modules/agent/character-commands.js');
    const { HERO_PSX_RECIPE } = await import('/src/modules/character-studio/heroic-presets.js');
    const group = buildCharacterDesignGroup(HERO_PSX_RECIPE);
    group.name = groupName;
    group.position.x = positionX;
    const mesh = (() => {
      let first = null;
      group.traverse((node) => { if (!first && node.isMesh) first = node; });
      return first;
    })();
    state.userObjects.add(group);
    selectMesh(group);
    window.__speechWorkspaceScene ||= {};
    window.__speechWorkspaceScene[groupName] = {
      group,
      mesh,
      geometry: mesh?.geometry || null,
      material: mesh?.material || null,
      position: group.position.toArray(),
      count: state.userObjects.children.length,
    };
    return { id: group.uuid, position: group.position.toArray() };
  }, { name, x });
}

async function enterSpeechWorkspace(page) {
  await page.locator('#workspace-speech-tab').click();
  await page.waitForFunction(() => (
    document.body.dataset.workspace === 'speech' &&
    window.__SPEECH_STUDIO__?.ready
  ), null, { timeout: 90000 });
  await expect(page.locator('#speech-workspace')).toBeVisible();
  await waitForUi(page, 250);
}

async function assertIntegratedSurface(page) {
  await expect(page.locator('#editor-topbar')).toBeVisible();
  await expect(page.locator('#workspace-scene-tab')).toBeVisible();
  await expect(page.locator('#workspace-speech-tab')).toBeVisible();
  await expect(page.locator('dialog:visible, [class*="backdrop"]:visible, iframe:visible')).toHaveCount(0);
  const report = await page.evaluate(() => {
    const speech = document.getElementById('speech-workspace');
    const stage = document.getElementById('speech-stage');
    const main = document.getElementById('main-workspace');
    const speechRect = speech?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    const viewport = { width: innerWidth, height: innerHeight };
    return {
      stageInSpeech: Boolean(speech?.contains(stage)),
      speechRole: speech?.getAttribute('role'),
      stageRect: stageRect && { left: stageRect.left, top: stageRect.top, right: stageRect.right, bottom: stageRect.bottom, width: stageRect.width, height: stageRect.height },
      speechRect: speechRect && { left: speechRect.left, top: speechRect.top, right: speechRect.right, bottom: speechRect.bottom },
      mainRole: main?.getAttribute('role'),
      speechCanvasCount: document.querySelectorAll('#speech-canvas').length,
      viewport,
    };
  });
  expect(report.stageInSpeech).toBe(true);
  expect(report.speechRole).toBe('tabpanel');
  expect(report.mainRole).toBe('tabpanel');
  expect(report.speechCanvasCount).toBe(1);
  expect(report.stageRect.width).toBeGreaterThan(300);
  expect(report.stageRect.height).toBeGreaterThan(180);
  expect(report.stageRect.left).toBeGreaterThanOrEqual(report.speechRect.left - 1);
  expect(report.stageRect.top).toBeGreaterThanOrEqual(report.speechRect.top - 1);
  expect(report.stageRect.right).toBeLessThanOrEqual(report.speechRect.right + 1);
  expect(report.stageRect.bottom).toBeLessThanOrEqual(Math.min(report.speechRect.bottom, report.viewport.height) + 1);
}

async function assertSceneWorkspace(page) {
  await expect(page.locator('#main-workspace')).toBeVisible();
  await waitForUi(page, 150);
  const report = await page.evaluate(() => {
    const main = document.getElementById('main-workspace');
    const canvas = document.getElementById('canvas');
    const mainRect = main?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    return {
      role: main?.getAttribute('role'),
      hidden: Boolean(main?.hidden),
      canvasInMain: Boolean(main?.contains(canvas)),
      canvasRect: canvasRect && { left: canvasRect.left, top: canvasRect.top, right: canvasRect.right, bottom: canvasRect.bottom, width: canvasRect.width, height: canvasRect.height },
      mainRect: mainRect && { left: mainRect.left, top: mainRect.top, right: mainRect.right, bottom: mainRect.bottom },
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  expect(report.role).toBe('tabpanel');
  expect(report.hidden).toBe(false);
  expect(report.canvasInMain).toBe(true);
  expect(report.canvasRect.width).toBeGreaterThan(300);
  expect(report.canvasRect.height).toBeGreaterThan(180);
  expect(report.canvasRect.left).toBeGreaterThanOrEqual(report.mainRect.left - 1);
  expect(report.canvasRect.top).toBeGreaterThanOrEqual(report.mainRect.top - 1);
  expect(report.canvasRect.right).toBeLessThanOrEqual(Math.min(report.mainRect.right, report.viewport.width) + 1);
  expect(report.canvasRect.bottom).toBeLessThanOrEqual(Math.min(report.mainRect.bottom, report.viewport.height) + 1);
}

async function speechSnapshot(page) {
  return page.evaluate(() => {
    const api = window.__SPEECH_STUDIO__;
    const camera = api.runtime?.camera;
    const controls = api.runtime?.controls;
    return {
      ready: api.ready,
      character: api.character?.id,
      mouth: api.mouth?.object?.userData?.speechMode,
      gain: document.getElementById('speech-gain')?.value,
      size: document.getElementById('speech-size')?.value,
      background: document.getElementById('speech-bg')?.value,
      camera: camera && [...camera.position.toArray(), ...controls.target.toArray(), camera.fov],
      track: api.track,
      speechCanvasCount: document.querySelectorAll('#speech-canvas').length,
    };
  });
}

async function assertOriginalSceneUnmodified(page, name, expectedCount) {
  const report = await page.evaluate(({ groupName, count }) => {
    const state = window.__LOWPOLY64_STATE__;
    const original = window.__speechWorkspaceScene[groupName];
    const live = state?.userObjects?.children || [];
    return {
      present: live.includes(original.group),
      count: live.length,
      position: original.group.position.toArray(),
      positionUnchanged: JSON.stringify(original.group.position.toArray()) === JSON.stringify(original.position),
      geometryUnchanged: !original.mesh || original.mesh.geometry === original.geometry,
      materialUnchanged: !original.mesh || original.mesh.material === original.material,
      expectedCount: count,
    };
  }, { groupName: name, count: expectedCount });
  expect(report.present).toBe(true);
  expect(report.count).toBe(report.expectedCount);
  expect(report.positionUnchanged).toBe(true);
  expect(report.geometryUnchanged).toBe(true);
  expect(report.materialUnchanged).toBe(true);
}

test('speech workspace is an in-page tab and preserves its take, controls, camera, and scene selection', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const original = await addSceneCharacter(page, 'Workspace original', 2.5);
  await waitForUi(page, 250);
  await expect(page.locator('#workspace-scene-tab')).toHaveAttribute('aria-selected', 'true');

  await enterSpeechWorkspace(page);
  await assertIntegratedSurface(page);
  const initialCharacter = await page.evaluate(() => window.__SPEECH_STUDIO__.character.id);
  expect(initialCharacter).toBe(`scene:${original.id}`);

  await page.locator('#speech-mouth').selectOption('jaw');
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.mouth?.object?.userData?.speechMode === 'jaw');
  await page.locator('#speech-gain').fill('3.4');
  await page.locator('#speech-size').evaluate((input) => {
    input.value = '1.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#speech-size')).toHaveValue('1.5');
  await page.locator('#speech-bg').evaluate((input) => {
    input.value = '#385a7d';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.evaluate(() => {
    const api = window.__SPEECH_STUDIO__;
    api.runtime.camera.position.set(3.4, 1.8, 5.2);
    api.runtime.controls.target.set(.2, .7, -.1);
    api.runtime.camera.updateProjectionMatrix();
    api.runtime.controls.update();
    api.setTrack({ version: 1, duration: .8, fps: 10, frames: [
      { time: 0, open: 0, wide: 0, round: 0, viseme: 'rest' },
      { time: .4, open: .8, wide: .5, round: .1, viseme: 'A' },
      { time: .8, open: 0, wide: 0, round: 0, viseme: 'rest' },
    ] });
  });
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.track?.duration === .8);
  const beforeToggle = await speechSnapshot(page);

  await page.locator('#workspace-scene-tab').click();
  await page.waitForFunction(() => document.body.dataset.workspace === 'scene' && window.__SPEECH_STUDIO__?.ready === false);
  await assertSceneWorkspace(page);
  await assertOriginalSceneUnmodified(page, 'Workspace original', 1);
  expect(await page.locator('#speech-canvas').count()).toBe(1);

  // A visit back to the same selected character keeps the edited controls, track, and camera.
  await page.locator('#workspace-speech-tab').click();
  await page.waitForFunction((id) => window.__SPEECH_STUDIO__?.ready && window.__SPEECH_STUDIO__.character?.id === `scene:${id}`, original.id, { timeout: 90000 });
  await assertIntegratedSurface(page);
  const sameCharacterToggle = await speechSnapshot(page);
  expect(sameCharacterToggle.ready).toBe(true);
  expect(sameCharacterToggle.character).toBe(beforeToggle.character);
  expect(sameCharacterToggle.mouth).toBe(beforeToggle.mouth);
  expect(sameCharacterToggle.gain).toBe(beforeToggle.gain);
  expect(sameCharacterToggle.size).toBe('1.5');
  expect(sameCharacterToggle.size).toBe(beforeToggle.size);
  expect(sameCharacterToggle.background).toBe(beforeToggle.background);
  expect(sameCharacterToggle.camera).toHaveLength(beforeToggle.camera.length);
  for (const [index, expected] of beforeToggle.camera.entries()) expect(sameCharacterToggle.camera[index]).toBeCloseTo(expected, 10);
  expect(sameCharacterToggle.track).toEqual(beforeToggle.track);
  expect(sameCharacterToggle.speechCanvasCount).toBe(1);

  // Selecting a different scene character on the way back chooses that character and reframes it.
  await page.locator('#workspace-scene-tab').click();
  await page.waitForFunction(() => document.body.dataset.workspace === 'scene' && window.__SPEECH_STUDIO__?.ready === false);
  await assertSceneWorkspace(page);
  await assertOriginalSceneUnmodified(page, 'Workspace original', 1);
  const replacement = await addSceneCharacter(page, 'Workspace replacement', -2.25);
  await page.locator('#workspace-speech-tab').click();
  await page.waitForFunction((id) => window.__SPEECH_STUDIO__?.ready && window.__SPEECH_STUDIO__.character?.id === `scene:${id}`, replacement.id, { timeout: 90000 });
  await assertIntegratedSurface(page);
  const afterCharacterSwitch = await speechSnapshot(page);
  expect(afterCharacterSwitch.ready).toBe(true);
  expect(afterCharacterSwitch.character).toBe(`scene:${replacement.id}`);
  expect(afterCharacterSwitch.mouth).toBe(beforeToggle.mouth);
  expect(afterCharacterSwitch.gain).toBe(beforeToggle.gain);
  expect(afterCharacterSwitch.background).toBe(beforeToggle.background);
  expect(afterCharacterSwitch.track).toEqual(beforeToggle.track);
  expect(afterCharacterSwitch.speechCanvasCount).toBe(1);

  await page.locator('#workspace-scene-tab').click();
  await page.waitForFunction(() => document.body.dataset.workspace === 'scene');
  await assertSceneWorkspace(page);
  await assertOriginalSceneUnmodified(page, 'Workspace original', 2);
  await assertOriginalSceneUnmodified(page, 'Workspace replacement', 2);
  await assertNoPageErrors(page);
});

test('switching away from a synthetic microphone suspends it and voice-mode Delete cannot remove the scene object', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const original = await addSceneCharacter(page, 'Voice delete guard', 1.25);
  await waitForUi(page, 200);
  await enterSpeechWorkspace(page);

  await page.evaluate(() => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const destination = context.createMediaStreamDestination();
    oscillator.frequency.value = 180;
    gain.gain.value = .12;
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    window.__speechWorkspaceMic = { context, oscillator, stream: destination.stream, requests: 0 };
    navigator.mediaDevices.getUserMedia = async () => {
      window.__speechWorkspaceMic.requests += 1;
      await context.resume();
      return destination.stream;
    };
  });
  await page.locator('#speech-mic').click();
  await page.waitForFunction(() => window.__SPEECH_STUDIO__?.media?.micActive === true);
  await expect(page.locator('#speech-mic')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#speech-canvas').focus();
  await page.keyboard.press('Delete');
  await waitForUi(page, 100);
  await assertOriginalSceneUnmodified(page, 'Voice delete guard', 1);

  await page.locator('#workspace-scene-tab').click();
  await page.waitForFunction(() => document.body.dataset.workspace === 'scene' && window.__SPEECH_STUDIO__?.ready === false);
  await expect.poll(() => page.evaluate(() => window.__speechWorkspaceMic.stream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  const state = await page.evaluate(() => ({
    micActive: window.__SPEECH_STUDIO__?.media?.micActive,
    micPending: window.__SPEECH_STUDIO__?.media?.micPending,
    requests: window.__speechWorkspaceMic.requests,
  }));
  expect(state).toEqual({ micActive: false, micPending: false, requests: 1 });
  await assertSceneWorkspace(page);
  await assertOriginalSceneUnmodified(page, 'Voice delete guard', 1);
  await page.evaluate(async () => {
    await window.__speechWorkspaceMic.context.close();
  });
  await assertNoPageErrors(page);
});

