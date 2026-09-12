import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

const OUTPUT = path.join(process.cwd(), 'artifacts', 'llm-character-control');

async function initialize(page) {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.evaluate(async () => {
    const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
    const { characterDrafts } = await import('/src/modules/agent/character-commands.js');
    const { clearHistory } = await import('/src/modules/shared/undo.js');
    const s = window.__LOWPOLY64_STATE__;
    s.userObjects.clear(); s.selectedMesh = null; s.selectedMeshes.clear();
    characterDrafts.clear(); clearHistory();
    window.characterCommand = async (name, args = {}) => {
      const result = await executeAgentCommand(name, args);
      if (!result.ok) throw new Error(`${name}: ${JSON.stringify(result.error)}`);
      return result;
    };
  });
}

test('PSX draft creates sword, resizes head, renders complete views and reopens actual JSON and GLB', async ({ page }) => {
  test.setTimeout(180000);
  await initialize(page);
  const results = await page.evaluate(async () => {
    const run = window.characterCommand;
    const s = window.__LOWPOLY64_STATE__;
    const caps = await run('get_character_capabilities');
    const created = await run('build_character_draft', { catalog_id: 'studio:psx-swordsman', operation_id: 'demo-build-001' });
    const repeated = await run('build_character_draft', { catalog_id: 'studio:psx-swordsman', operation_id: 'demo-build-001' });
    const draftId = created.data.draftId;
    const sceneBefore = s.userObjects.children.length;
    await run('patch_character_draft', { draft_id: draftId, expected_revision: 0, operation_id: 'demo-sword-001', patch: { equipment: { sword: { enabled: true, width: 0.58, length: 2.35 }, pauldron: { enabled: true, side: 'left', size: 0.73 } } } });
    await run('patch_character_draft', { draft_id: draftId, expected_revision: 1, operation_id: 'demo-head-001', patch: { head: { scale: 0.75 } } });
    const views = await run('render_character_views', { draft_id: draftId, size: 512 });
    const structural = await run('evaluate_character', { draft_id: draftId });
    const committed = await run('commit_character_draft', { draft_id: draftId, expected_revision: 2, operation_id: 'demo-commit-001' });
    const id = committed.data.id;
    const group = s.userObjects.children[0];
    const sword = group.getObjectByName('EQUIP_SWORD_BLADE');
    const swordParent = sword.parent.userData.name;
    const headScale = group.getObjectByName('HEAD').scale.toArray();
    await run('undo'); const afterUndo = s.userObjects.children.length;
    await run('redo'); const afterRedo = s.userObjects.children.length;
    const exported = await run('export_character_asset', { id, format: 'json' });
    const glb = await run('export_character_asset', { id, format: 'glb' });
    const recipe = await run('export_character_asset', { id, format: 'recipe' });
    const json = exported.artifacts[0].data;
    const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
    s.userObjects.clear(); s.selectedMesh = null;
    const jsonResult = await importObjectFromJSON(JSON.stringify(json));
    const reopened = s.userObjects.children[0];
    const jsonRecipe = reopened.userData.characterDesignRecipe;
    const jsonHeadScale = reopened.getObjectByName('HEAD').scale.toArray();
    const { ensureAgentId } = await import('/src/modules/agent/agent-object-ids.js');
    const jsonEdit = await run('build_character_draft', { source_id: ensureAgentId(reopened), operation_id: 'reopen-json-build' });
    await run('patch_character_draft', { draft_id: jsonEdit.data.draftId, expected_revision: 0, operation_id: 'reopen-json-patch', patch: { equipment: { sword: { width: 0.64 } } } });
    const editedJson = await run('get_character_recipe', { draft_id: jsonEdit.data.draftId });
    const editedJsonValid = await run('evaluate_character', { draft_id: jsonEdit.data.draftId });
    const binary = Uint8Array.from(atob(glb.artifacts[0].data), char => char.charCodeAt(0));
    s.userObjects.clear(); s.selectedMesh = null;
    const glbResult = await importGlbFromBuffer(binary.buffer, 'espadachin.glb');
    const fromGlb = s.userObjects.children[0];
    const glbSword = fromGlb.getObjectByName('EQUIP_SWORD_BLADE');
    const glbRecipe = fromGlb.userData.characterDesignRecipe;
    const glbClips = fromGlb.userData.animationClips?.map(clip => clip.name);
    const glbEdit = await run('build_character_draft', { source_id: ensureAgentId(fromGlb), operation_id: 'reopen-glb-build' });
    await run('patch_character_draft', { draft_id: glbEdit.data.draftId, expected_revision: 0, operation_id: 'reopen-glb-patch', patch: { head: { scale: 0.7 } } });
    const editedGlb = await run('get_character_recipe', { draft_id: glbEdit.data.draftId });
    const editedGlbValid = await run('evaluate_character', { draft_id: glbEdit.data.draftId });
    return { editedJson: editedJson.data.recipe, editedJsonValid: editedJsonValid.data.valid, editedGlb: editedGlb.data.recipe, editedGlbValid: editedGlbValid.data.valid, caps: caps.ok, draftId, repeatId: repeated.data.draftId, sceneBefore, structural: structural.data, views: views.artifacts, swordParent, headScale, afterUndo, afterRedo, json, glb: glb.artifacts[0], recipe: recipe.artifacts[0].data, jsonResult, glbResult, jsonRecipe, jsonHeadScale, glbRecipe, glbSwordParent: glbSword?.parent.userData.name, glbClips };
  });
  expect(results.editedJson.head.scale).toBe(0.75);
  expect(results.editedJson.equipment.sword.width).toBe(0.64);
  expect(results.editedGlb.head.scale).toBe(0.7);
  expect(results.editedGlb.equipment.sword.width).toBe(0.58);
  expect(results.editedJsonValid && results.editedGlbValid).toBe(true);
  expect(results.caps).toBe(true);
  expect(results.repeatId).toBe(results.draftId);
  expect(results.sceneBefore).toBe(0);
  expect(results.structural.valid, JSON.stringify(results.structural.issues)).toBe(true);
  expect(results.swordParent).toBe('HAND_R');
  expect(results.headScale[0]).toBeCloseTo(0.75 / 0.95);
  expect(results.afterUndo).toBe(0); expect(results.afterRedo).toBe(1);
  expect(results.jsonResult.success, results.jsonResult.error).toBe(true);
  expect(results.glbResult.success, results.glbResult.error).toBe(true);
  expect(results.jsonRecipe.head.scale).toBe(0.75);
  results.jsonHeadScale.forEach((value, index) => expect(value).toBeCloseTo(results.headScale[index], 3));
  expect(results.glbSwordParent).toBe('HAND_R');
  expect(results.glbRecipe.head.scale).toBe(0.75);
  expect(results.glbClips.length).toBeGreaterThan(0);
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const view of results.views) {
    const png = Buffer.from(view.data, 'base64');
    expect(png.readUInt32BE(16)).toBe(512);
    expect(png.readUInt32BE(20)).toBe(512);
    expect(view.data.length).toBeGreaterThan(2000);
    await fs.writeFile(path.join(OUTPUT, `espadachin-${view.view}.png`), png);
  }
  await fs.writeFile(path.join(OUTPUT, 'espadachin.json'), JSON.stringify(results.json, null, 2));
  await fs.writeFile(path.join(OUTPUT, 'espadachin.recipe.json'), JSON.stringify(results.recipe, null, 2));
  await fs.writeFile(path.join(OUTPUT, 'espadachin.glb'), Buffer.from(results.glb.data, 'base64'));
  await assertNoPageErrors(page);
});

test('part patches preserve manual body edits, attachments, IDs and reject stale sources', async ({ page }) => {
  test.setTimeout(180000);
  await initialize(page);
  const result = await page.evaluate(async () => {
    const run = window.characterCommand;
    const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
    const { characterDrafts } = await import('/src/modules/agent/character-commands.js');
    const s = window.__LOWPOLY64_STATE__;
    const built = await run('build_character_draft', { catalog_id: 'studio:psx-swordsman', operation_id: 'manual-build-001' });
    const committed = await run('commit_character_draft', { draft_id: built.data.draftId, expected_revision: 0, operation_id: 'manual-commit-001' });
    const id = committed.data.id;
    const original = s.userObjects.children[0];
    const torso = original.getObjectByName('TORSO');
    torso.scale.x = 1.17; torso.rotation.z = 0.13;
    const badge = torso.children.find(node => node.isMesh).clone();
    badge.name = 'MANUAL_BADGE'; badge.userData = { ...badge.userData, name: 'MANUAL_BADGE' };
    badge.scale.set(0.1, 0.1, 0.1); badge.position.z += 0.8;
    torso.add(badge);
    const ribbon = badge.clone(); ribbon.name = 'MANUAL_HAIR_RIBBON'; ribbon.userData = { ...badge.userData, name: 'MANUAL_HAIR_RIBBON' };
    const hairCap = original.getObjectByName('HAIR_CAP');
    hairCap.add(ribbon);
    const pin = badge.clone(); pin.name = 'MANUAL_HAIR_PIN'; pin.userData = { ...badge.userData, name: pin.name };
    hairCap.children.find(node => node.isMesh).add(pin);
    original.updateWorldMatrix(true, true);
    const torsoBefore = JSON.stringify(torso.toJSON());
    const hairDraft = await run('build_character_draft', { source_id: id, operation_id: 'manual-draft-001' });
    const draftId = hairDraft.data.draftId;
    await run('patch_character_draft', { draft_id: draftId, expected_revision: 0, operation_id: 'manual-head-001', patch: { head: { scale: 0.7 } } });
    await run('patch_character_draft', { draft_id: draftId, expected_revision: 1, operation_id: 'manual-hair-001', patch: { hair: { style: 'short', color: '#74452b' } } });
    await run('patch_character_draft', { draft_id: draftId, expected_revision: 2, operation_id: 'manual-hair-remove', patch: { hair: { style: 'none' } } });
    const copy = characterDrafts.version(characterDrafts.get(draftId)).group;
    const copiedTorso = copy.getObjectByName('TORSO');
    const body = { pin: !!copy.getObjectByName('MANUAL_HAIR_PIN'), ribbon: !!copy.getObjectByName('MANUAL_HAIR_RIBBON'), scale: copiedTorso.scale.toArray(), rotation: copiedTorso.rotation.toArray(), id: copiedTorso.userData.agentId, badge: !!copy.getObjectByName('MANUAL_BADGE'), originalUnchanged: JSON.stringify(torso.toJSON()) === torsoBefore, torsoId: torso.userData.agentId };
    const commit = await run('commit_character_draft', { draft_id: draftId, expected_revision: 3, operation_id: 'manual-commit-002' });
    await run('undo'); const restoredOriginal = s.userObjects.children[0] === original;
    await run('redo');
    const live = s.userObjects.children[0];
    const stale = await run('build_character_draft', { source_id: commit.data.id, operation_id: 'stale-draft-001' });
    live.getObjectByName('HAND_R').rotation.x = 0.43;
    const conflict = await executeAgentCommand('commit_character_draft', { draft_id: stale.data.draftId, expected_revision: 0, operation_id: 'stale-commit-001' });
    const keptManual = live.getObjectByName('HAND_R').rotation.x;
    const newest = await run('get_character_recipe', { id: commit.data.id });
    return { body, restoredOriginal, conflict, keptManual, newest: newest.data.recipe, sameRootId: commit.data.id === id };
  });
  expect(result.body.originalUnchanged).toBe(true);
  expect(result.body.scale[0]).toBe(1.17);
  expect(result.body.rotation[2]).toBe(0.13);
  expect(result.body.badge).toBe(true);
  expect(result.body.ribbon).toBe(true);
  expect(result.body.pin).toBe(true);
  expect(result.body.id).toBe(result.body.torsoId);
  expect(result.restoredOriginal).toBe(true);
  expect(result.sameRootId).toBe(true);
  expect(result.conflict.ok).toBe(false);
  expect(result.conflict.error.code).toBe('SOURCE_CONFLICT');
  expect(result.keptManual).toBe(0.43);
  expect(result.newest.head.scale).toBe(0.7);
  expect(result.newest.hair.style).toBe('none');
  await assertNoPageErrors(page);
});

test('N64 and Avatar Forge catalog drafts render and the best earlier revision can be committed', async ({ page }) => {
  test.setTimeout(180000);
  await initialize(page);
  const results = await page.evaluate(async () => {
    const run = window.characterCommand;
    const items = (await run('search_character_catalog', { engine: 'avatar-forge', query: 'nora' })).data.items;
    const results = [];
    for (const [label, catalog_id] of [['exploradora', 'studio:n64-explorer'], ['nora', items[0].id]]) {
      const created = await run('build_character_draft', { catalog_id, operation_id: `${label}-build-001` });
      const draft_id = created.data.draftId;
      const views = await run('render_character_views', { draft_id, size: 384 });
      const evaluation = await run('evaluate_character', { draft_id });
      await run('patch_character_draft', { draft_id, expected_revision: 0, operation_id: `${label}-head-001`, patch: { head: { scale: 0.8 } } });
      const committed = await run('commit_character_draft', { draft_id, expected_revision: 1, chosen_revision: 0, operation_id: `${label}-commit-001` });
      const exported = await run('export_character_asset', { id: committed.data.id, format: 'json' });
      results.push({ label, views: views.artifacts, evaluation: evaluation.data, chosenRevision: committed.data.chosenRevision, artifact: exported.artifacts[0] });
    }
    return results;
  });
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const result of results) {
    expect(result.evaluation.valid, JSON.stringify(result.evaluation.issues)).toBe(true);
    expect(result.chosenRevision).toBe(0);
    for (const view of result.views) await fs.writeFile(path.join(OUTPUT, `${result.label}-${view.view}.png`), Buffer.from(view.data, 'base64'));
    await fs.writeFile(path.join(OUTPUT, `${result.label}.json`), JSON.stringify(result.artifact.data, null, 2));
  }
  await assertNoPageErrors(page);
});
