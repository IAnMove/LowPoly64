import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

for (const style of ['n64', 'psx']) {
  test(`${style} character keeps its geometry and moving rig through JSON, GLB and save/load`, async ({ page }) => {
    await bootstrapApp(page, '/', { requireEditorModals: false });
    const recipe = JSON.parse(await fs.readFile(path.join(process.cwd(), 'docs', 'examples', 'retro-characters', `${style}-character.recipe.json`), 'utf8'));
    const report = await page.evaluate(async (recipe) => {
      const style = recipe.style;
      const { buildRetroCharacterGroup } = await import('/src/modules/character-studio/character-studio.js');
      const { measureStyleMetrics } = await import('/src/modules/viewport/style-budget.js');
      const { serializeGroupAsImportJSON, serializeScene, deserializeScene } = await import('/src/modules/viewport/persistence.js');
      const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
      const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
      const { validateCharacterModel } = await import('/src/modules/viewport/character-model.js');
      const { playAnimation, stopAnimation } = await import('/src/modules/animation/animation.js');
      const s = window.__LOWPOLY64_STATE__;
      const group = await buildRetroCharacterGroup(recipe);
      s.userObjects.clear(); s.selectedMesh = null; s.selectedMeshes.clear(); s.userObjects.add(group);
      group.position.set(1, 0, -2);
      function signature(root) {
        const entries = [];
        root.traverse((node) => { if (node.isMesh) entries.push({ count: node.geometry.attributes.position.count, color: node.material.color.getHexString() }); });
        return { triangles: measureStyleMetrics(root).triangles, meshes: entries.length, colors: entries.map(e=>e.color).sort(), position: root.position.toArray(), recipe: root.userData.retroCharacterRecipe };
      }
      function moves(root) {
        const clips = root.userData.animationClips || [];
        const index = clips.findIndex(clip => /walk/i.test(clip.name));
        if (index < 0) return false;
        const transforms = () => { const list=[];root.traverse(n=>list.push([...n.position.toArray(),...n.quaternion.toArray()]));return JSON.stringify(list); };
        playAnimation(root, index); s.animationMixer.setTime(0); const before = transforms();
        s.animationMixer.setTime(0.23); const after = transforms(); stopAnimation();
        return before !== after;
      }
      const before = signature(group);
      const beforeMoves = moves(group);
      const cm = serializeGroupAsImportJSON(group, { format: 'character-model' });
      const cmError = validateCharacterModel(cm);
      const json = JSON.stringify(cm, null, 2);
      s.userObjects.clear();
      const jsonResult = await importObjectFromJSON(json);
      const fromJson = s.userObjects.children.at(-1);
      if (!fromJson) return { cmError, jsonResult };
      const afterJson = signature(fromJson);
      const jsonMoves = moves(fromJson);
      s.selectedMesh = fromJson; s.selectedMeshes.clear();
      const { buffer } = await exportGLBToBuffer();
      const document = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,new DataView(buffer).getUint32(12,true))).trim());
      s.userObjects.clear(); s.selectedMesh = null;
      const glbResult = await importGlbFromBuffer(buffer, `${style}.glb`);
      const fromGlb = s.userObjects.children.at(-1);
      if (!fromGlb) return { cmError, jsonResult, glbResult };
      const afterGlb = signature(fromGlb);
      const glbMoves = moves(fromGlb);
      await deserializeScene(serializeScene());
      const restored = s.userObjects.children[0];
      const afterSave = signature(restored);
      const savedMoves = moves(restored);
      const glbJson = serializeGroupAsImportJSON(restored);
      s.userObjects.clear(); s.selectedMesh = null;
      const glbJsonResult = await importObjectFromJSON(JSON.stringify(glbJson));
      const jsonRestored = s.userObjects.children.at(-1);
      const afterGlbJson = signature(jsonRestored);
      const glbJsonMoves = moves(jsonRestored);
      s.selectedMesh = jsonRestored; s.selectedMeshes.clear();
      const second = await exportGLBToBuffer();
      return { before, afterJson, afterGlb, afterSave, afterGlbJson, beforeMoves, jsonMoves, glbMoves, savedMoves, glbJsonMoves, cmError, jsonResult, glbResult, glbJsonResult, clipCount: document.animations?.length || 0, json, buffer: Array.from(new Uint8Array(buffer)), secondGlbBytes: second.buffer.byteLength };
    }, recipe);
    expect(report.cmError).toBeNull();
    expect(report.jsonResult.success, report.jsonResult.error).toBe(true);
    expect(report.glbResult.success, report.glbResult.error).toBe(true);
    expect(report.glbJsonResult.success, report.glbJsonResult.error).toBe(true);
    expect(report.before.triangles).toBeLessThanOrEqual(1200);
    for (const key of ['afterJson', 'afterGlb', 'afterSave', 'afterGlbJson']) expect(report[key], key).toEqual(report.before);
    for (const key of ['beforeMoves', 'jsonMoves', 'glbMoves', 'savedMoves', 'glbJsonMoves']) expect(report[key], key).toBe(true);
    expect(report.clipCount).toBeGreaterThan(0);
    expect(report.secondGlbBytes).toBeGreaterThan(100);
    const output = path.join(process.cwd(), 'artifacts', 'retro-character-examples');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, `${style}-character.json`), report.json);
    await fs.writeFile(path.join(output, `${style}-character.glb`), Buffer.from(report.buffer));
  });
}

test('manual avatar child transforms and additions survive scene save/load', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const result = await page.evaluate(async () => {
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
    const { serializeScene, deserializeScene } = await import('/src/modules/viewport/persistence.js');
    const { addPrimitive } = await import('/src/modules/viewport/primitives.js');
    const s = window.__LOWPOLY64_STATE__;
    s.userObjects.clear();
    const group = await buildAvatarGroup({ label: 'Edited avatar' });
    s.userObjects.add(group);
    const head = group.getObjectByName('HEAD'); head.scale.x = 1.3;
    addPrimitive('cube'); const extra=s.userObjects.children.at(-1);
    extra.name='MANUAL_ADDITION';extra.userData.name=extra.name;group.add(extra);
    const snapshot=serializeScene();
    await deserializeScene(snapshot);
    const restored=s.userObjects.children[0];
    return {headScale:restored.getObjectByName('HEAD').scale.x,hasAddition:!!restored.getObjectByName('MANUAL_ADDITION'),hasRecipe:!!restored.userData.avatarRecipe};
  });
  expect(result).toEqual({headScale:1.3,hasAddition:true,hasRecipe:true});
});
