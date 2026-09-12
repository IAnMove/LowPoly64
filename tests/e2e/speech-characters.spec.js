import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
test.describe.configure({ timeout: 180000 });

test('three characters share the voice track and export the selected animated model', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/speech-lab.html?comparison=1', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__SPEECH_LAB__?.ready, null, { timeout: 60000 });
  await page.locator('#audio').evaluate(audio => { audio.muted = true; });
  await page.locator('#phrase').click();
  await expect.poll(() => page.locator('#audio').evaluate(audio => audio.currentTime)).toBeGreaterThan(.1);
  await page.locator('#stop').click();
  await page.locator('#analysis-phonetic').click();
  await page.locator('#scrub').evaluate(input => { input.value = '2.3'; input.dispatchEvent(new Event('input')); });
  const original = await page.evaluate(() => ({ track: window.__SPEECH_LAB__.track, src: document.getElementById('audio').currentSrc, time: document.getElementById('audio').currentTime }));
  const models = [];
  for (const [id, mode] of [['mario64', 'svg'], ['cloud', 'cutout'], ['explorer', 'jaw']]) {
    await page.locator('#character').selectOption(id);
    await expect.poll(() => page.evaluate(() => window.__SPEECH_LAB__.characterId)).toBe(id);
    const report = await page.evaluate(async mode => {
      const lab = window.__SPEECH_LAB__;
      const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
      const { state } = await import('/src/modules/shared/state.js');
      const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
      const buffer = await lab.exportPrototype(mode);
      const group = await parseGlbGroup(buffer, 'speaking.glb');
      const clips = group.userData.animationClips;
      playAnimation(group, clips.findIndex(clip => clip.name === 'speech'));
      const nodes = []; group.traverse(node => { if (node.name.startsWith('SPEECH_MOUTH')) nodes.push(node); });
      const snapshot = () => nodes.flatMap(node => [...node.position.toArray(), ...node.scale.toArray(), ...node.quaternion.toArray()]);
      state.animationMixer.setTime(0); const initial = snapshot();
      const peak = lab.track.frames.reduce((best, frame) => best.open > frame.open ? best : frame);
      state.animationMixer.setTime(peak.time); const final = snapshot(); stopAnimation();
      const audio = document.getElementById('audio');
      return { id: lab.characterId, mode, recipe: group.userData.characterDesignRecipe, clips: clips.map(clip => clip.name), moved: initial.some((v, i) => Math.abs(v - final[i]) > 1e-5), finite: final.every(Number.isFinite), parents: lab.cards.map(card => card.mouth.object.parent.name), track: lab.track, time: audio.currentTime, src: audio.currentSrc };
    }, mode);
    expect(report.id).toBe(id); expect(report.parents).toEqual(['HEAD', 'HEAD', 'HEAD']);
    expect(report.clips).toContain('speech'); expect(report.moved).toBe(true); expect(report.finite).toBe(true);
    expect(report.track).toEqual(original.track); expect(report.src).toBe(original.src); expect(report.time).toBeCloseTo(original.time, 2);
    expect(report.recipe.name).toContain(id === 'mario64' ? 'Mario' : id === 'cloud' ? 'Cloud' : 'Explor');
    models.push({ id, mode, name: report.recipe.name, moved: report.moved, clips: report.clips.length });
  }
  await page.locator('#view').selectOption('mouth');
  await page.evaluate(() => Promise.all([window.__SPEECH_LAB__.setCharacter('cloud'), window.__SPEECH_LAB__.setCharacter('mario64')]));
  expect(await page.evaluate(() => window.__SPEECH_LAB__.characterId)).toBe('mario64');
  await page.locator('#view').selectOption('face');
  expect(await page.evaluate(() => window.__SPEECH_LAB__.cards.every(card => card.mouth.object.parent === card.group.getObjectByName('HEAD')))).toBe(true);
  expect(errors).toEqual([]);
  await fs.mkdir('artifacts/speech-cast', { recursive: true });
  await fs.writeFile('artifacts/speech-cast/app-verification.json', JSON.stringify({ models, sameAudioAndTime: true, rapidSwitch: true, errors }, null, 2));
});
