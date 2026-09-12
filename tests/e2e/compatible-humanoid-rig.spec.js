import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

// Set this to a locally supplied donor file; no third-party character is bundled.
const sourcePath = process.env.MESHY_TEST_GLB;
test.describe.configure({ timeout: 240000 });
test.skip(!sourcePath, 'Set MESHY_TEST_GLB to the analyzed Meshy donor GLB.');

for (const style of ['n64', 'psx']) {
  test(`${style} uses Meshy motion with real skinning and survives JSON, GLB and scene persistence`, async ({ page }) => {
    const bytes = await fs.readFile(sourcePath);
    await page.route('**/__meshy_source.glb', route => route.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
    await bootstrapApp(page, '/', { requireEditorModals: false });
    const result = await page.evaluate(async (style) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { buildRetroCharacterGroup } = await import('/src/modules/character-studio/character-studio.js');
      const { createCompatibleHumanoidCopy } = await import('/src/modules/animation/compatible-humanoid-rig.js');
      const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
      const { serializeGroupAsImportJSON, serializeScene, deserializeScene } = await import('/src/modules/viewport/persistence.js');
      const { importObjectFromJSON, importGlbFromBuffer } = await import('/src/modules/viewport/json-import.js');
      const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
      const s = window.__LOWPOLY64_STATE__;
      const original = buildRetroCharacterGroup({ style, colors: { shirt: style === 'psx' ? '#275d9b' : '#cb3d45' } });
      original.getObjectByName('ARM_L_UPPER').scale.x = 1.15;
      const originalJSON = JSON.stringify(serializeGroupAsImportJSON(original));
      const donor = await parseGlbGroup(await (await fetch('/__meshy_source.glb')).arrayBuffer());
      const copy = createCompatibleHumanoidCopy(original, donor);
      const unchanged = originalJSON === JSON.stringify(serializeGroupAsImportJSON(original));
      function inspect(group) {
        const meshes = []; group.traverse(n => { if (n.isSkinnedMesh) meshes.push(n); });
        group.updateMatrixWorld(true);
        let triangles = 0, weightError = 0, invalidJoints = 0;
        for (const mesh of meshes) {
          triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
          const weights = mesh.geometry.attributes.skinWeight, joints = mesh.geometry.attributes.skinIndex;
          for (let i = 0; i < weights.count; i++) {
            weightError = Math.max(weightError, Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i) - 1));
            for (const getter of ['getX', 'getY', 'getZ', 'getW']) if (joints[getter](i) >= mesh.skeleton.bones.length) invalidJoints++;
          }
        }
        const boneLengths = () => meshes[0].skeleton.bones.filter(b => b.name !== 'Hips').map(b => b.position.length());
        const samples = () => { group.updateMatrixWorld(true); const out=[]; for (const m of meshes) {
          for (let i=0;i<m.geometry.attributes.position.count;i+=13) {
            const p = m.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(m.matrixWorld); out.push(...p.toArray());
          }
        } return out; };
        const rest = boneLengths();
        const moving = [];
        for (const clip of group.userData.animationClips) {
          const mixer = new THREE.AnimationMixer(group); mixer.clipAction(clip).play();
          mixer.setTime(0); const a = samples(); mixer.setTime(clip.duration * 0.37); const b = samples();
          moving.push({ name: clip.name, moves: b.some((n,i) => Math.abs(n-a[i]) > 0.001), finite: b.every(n => Number.isFinite(n) && Math.abs(n) < 100), lengthError: Math.max(...boneLengths().map((n,i) => Math.abs(n-rest[i]))) });
          mixer.stopAllAction(); mixer.uncacheRoot(group);
        }
        return { meshes: meshes.length, bones: meshes[0]?.skeleton.bones.length, triangles, weightError, invalidJoints, moving };
      }
      const before = inspect(copy);
      s.userObjects.clear(); s.selectedMeshes.clear(); s.selectedMesh = copy; s.userObjects.add(copy);
      const json = JSON.stringify(serializeGroupAsImportJSON(copy), null, 2);
      const { buffer } = await exportGLBToBuffer();
      const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, new DataView(buffer).getUint32(12, true))).trim());
      s.userObjects.clear(); s.selectedMesh = null;
      const imported = await importGlbFromBuffer(buffer, `${style}-compatible.glb`);
      const loadedCopy = s.userObjects.children.at(-1);
      const afterGlb = inspect(loadedCopy);
      const secondBody = buildRetroCharacterGroup({ style: style === 'n64' ? 'psx' : 'n64', bodyHeight: 3.25, includeHead: false });
      const neutralDonation = createCompatibleHumanoidCopy(secondBody, loadedCopy);
      loadedCopy.position.set(7, 2, -3); loadedCopy.rotation.set(0.15, 0.7, 0); loadedCopy.scale.set(0.9, 1.1, 0.9); loadedCopy.updateMatrixWorld(true);
      const placedDonation = createCompatibleHumanoidCopy(secondBody, loadedCopy);
      const placementIndependent = JSON.stringify(neutralDonation.userData.gltfAnimations.map(c => c.tracks)) === JSON.stringify(placedDonation.userData.gltfAnimations.map(c => c.tracks));
      const redonated = inspect(placedDonation);
      await deserializeScene(serializeScene());
      const afterScene = inspect(s.userObjects.children.at(-1));
      s.userObjects.clear(); s.selectedMesh = null;
      const importedJSON = await importObjectFromJSON(json);
      const afterJSON = inspect(s.userObjects.children.at(-1));
      s.userObjects.add(copy); s.selectedMesh = null; s.selectedMeshes.clear();
      const multi = await exportGLBToBuffer();
      const multiDoc = JSON.parse(new TextDecoder().decode(new Uint8Array(multi.buffer, 20, new DataView(multi.buffer).getUint32(12, true))).trim());
      const hipTargets = new Set(multiDoc.animations.flatMap(c => c.channels.map(channel => channel.target.node)).filter(index => multiDoc.nodes[index].name === 'Hips')).size;
      return { unchanged, hipTargets, placementIndependent, before, afterGlb, afterScene, afterJSON, redonated, imported, importedJSON, skins: doc.skins?.length, json, buffer: Array.from(new Uint8Array(buffer)) };
    }, style);
    expect(result.unchanged).toBe(true);
    expect(result.placementIndependent, 'Donor scene placement must not change its motion').toBe(true);
    expect(result.hipTargets, 'Each exported character keeps its own animation targets').toBe(2);
    expect(result.imported.success, result.imported.error).toBe(true);
    expect(result.importedJSON.success, result.importedJSON.error).toBe(true);
    expect(result.skins).toBeGreaterThan(0);
    for (const key of ['before', 'afterGlb', 'afterScene', 'afterJSON', 'redonated']) {
      const report = result[key];
      expect(report.meshes, key).toBeGreaterThan(0); expect(report.bones, key).toBe(24);
      expect(report.triangles, key).toBeLessThanOrEqual(1200);
      expect(report.weightError, key).toBeLessThan(0.00001); expect(report.invalidJoints, key).toBe(0);
      expect(report.moving.map(c => c.name).sort()).toEqual(['Hip_Hop_Dance_3', 'Running', 'Walking']);
      for (const motion of report.moving) { expect(motion.moves, `${key}/${motion.name}`).toBe(true); expect(motion.finite).toBe(true); expect(motion.lengthError).toBeLessThan(0.0001); }
    }
    const out = path.join(process.cwd(), 'artifacts', 'meshy-rig-analysis');
    await fs.mkdir(out, { recursive: true });
    const { json, buffer, ...validation } = result;
    await fs.writeFile(path.join(out, `${style}-validation.json`), JSON.stringify(validation, null, 2));
    await fs.writeFile(path.join(out, `${style}-compatible.json`), json);
    await fs.writeFile(path.join(out, `${style}-compatible.glb`), Buffer.from(result.buffer));
    await assertNoPageErrors(page);
  });
}

test('GLB animation file action creates a reversible copy and reports a corrupt file', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await page.evaluate(async () => {
    const { insertRetroCharacter } = await import('/src/modules/character-studio/character-studio.js');
    insertRetroCharacter({ style: 'n64' });
  });
  await page.locator('#btn-compatible-animation').click();
  await page.locator('#compatible-animation-file').setInputFiles(sourcePath);
  await expect(page.locator('#compatible-animation-modal')).toHaveCount(0, { timeout: 120000 });
  const count = () => page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.length);
  expect(await count()).toBe(2);
  await expect(page.locator('#anim-select')).toHaveValue('1');
  await page.locator('#anim-select').selectOption('2');
  await expect.poll(() => page.evaluate(() => window.__LOWPOLY64_STATE__.animationAction.getClip().name)).toBe('Hip_Hop_Dance_3');
  expect(await page.evaluate(() => window.__LOWPOLY64_STATE__.selectedMesh.userData.animationClips.length)).toBe(3);
  await page.evaluate(async () => (await import('/src/modules/shared/undo.js')).undo());
  expect(await count()).toBe(1);
  await page.evaluate(async () => (await import('/src/modules/shared/undo.js')).redo());
  expect(await count()).toBe(2);
  await page.evaluate(async () => (await import('/src/modules/shared/undo.js')).undo());
  await page.locator('#btn-compatible-animation').click();
  await page.locator('#compatible-animation-file').setInputFiles({ name: 'broken.glb', mimeType: 'model/gltf-binary', buffer: Buffer.alloc(24) });
  await expect(page.locator('#compatible-animation-status')).toContainText(/Invalid GLB/i);
  expect(await count()).toBe(1);
  await assertNoPageErrors(page);
});
