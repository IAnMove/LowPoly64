import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test('saved JSON and GLB bodies accept a new head and keep their body edits and animation', async ({ page }) => {
  test.setTimeout(180000);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const results = await page.evaluate(async () => {
    const { buildRetroBodyGroup, applyRetroHeadToGroup } = await import('/src/modules/character-studio/character-studio.js');
    const { serializeGroupAsImportJSON } = await import('/src/modules/viewport/persistence.js');
    const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
    const s = window.__LOWPOLY64_STATE__;
    const results = [];
    for (const style of ['n64', 'psx']) {
      s.userObjects.clear(); s.selectedMesh = null; s.selectedMeshes.clear();
      const body = buildRetroBodyGroup({ style });
      body.getObjectByName('ARM_L_UPPER').scale.x = 1.2;
      const torso = body.getObjectByName('TORSO');
      const badge = torso.children.find(c => c.isMesh).clone();
      badge.geometry = badge.geometry.clone(); badge.material = badge.material.clone();
      badge.name = 'BODY_BADGE'; badge.userData = { ...badge.userData, name: 'BODY_BADGE' };
      badge.scale.set(0.1, 0.1, 0.1); badge.position.set(0.1, 0.1, 0.7);
      torso.add(badge);
      s.userObjects.add(body);
      const json = JSON.stringify(serializeGroupAsImportJSON(body), null, 2);
      s.userObjects.clear();
      const jsonResult = await importObjectFromJSON(json);
      const restored = s.userObjects.children.at(-1);
      const emptyHeadAfterJson = restored.getObjectByName('HEAD').children.length;
      s.selectedMesh = restored; s.selectedMeshes.clear();
      const { buffer } = await exportGLBToBuffer();
      s.userObjects.clear(); s.selectedMesh = null;
      const glbResult = await importGlbFromBuffer(buffer, `${style}-body.glb`);
      const imported = s.userObjects.children.at(-1);
      const emptyHeadAfterGlb = imported.getObjectByName('HEAD').children.length;
      const applied = applyRetroHeadToGroup(imported, { headStyle: style === 'n64' ? 'psx' : 'n64' });
      const walk = imported.userData.animationClips.findIndex(c => /walk/i.test(c.name));
      const leg = imported.getObjectByName('LEG_L_UPPER');
      playAnimation(imported, walk); s.animationMixer.setTime(0);
      const before = leg.quaternion.toArray(); s.animationMixer.setTime(0.23);
      const moves = before.some((v, i) => Math.abs(v - leg.quaternion.toArray()[i]) > 0.0001);
      stopAnimation();
      results.push({ style, jsonResult, glbResult, emptyHeadAfterJson, emptyHeadAfterGlb, applied: applied.ok,
        headCount: imported.getObjectByName('HEAD').children.length, armScale: imported.getObjectByName('ARM_L_UPPER').scale.x,
        hasBadge: !!imported.getObjectByName('BODY_BADGE'), bodyStyle: imported.userData.retroCharacterRecipe.style, moves, json, buffer: Array.from(new Uint8Array(buffer)) });
    }
    return results;
  });
  for (const result of results) {
    expect(result.jsonResult.success, result.jsonResult.error).toBe(true);
    expect(result.glbResult.success, result.glbResult.error).toBe(true);
    expect(result.emptyHeadAfterJson).toBe(0); expect(result.emptyHeadAfterGlb).toBe(0);
    expect(result.applied).toBe(true); expect(result.headCount).toBeGreaterThan(0); expect(result.hasBadge).toBe(true);
    expect(result.armScale).toBeCloseTo(1.2); expect(result.bodyStyle).toBe(result.style); expect(result.moves).toBe(true);
    const output = path.join(process.cwd(), 'artifacts', 'retro-character-examples');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, `${result.style}-body.json`), result.json);
    await fs.writeFile(path.join(output, `${result.style}-body.glb`), Buffer.from(result.buffer));
  }
  await assertNoPageErrors(page);
});
