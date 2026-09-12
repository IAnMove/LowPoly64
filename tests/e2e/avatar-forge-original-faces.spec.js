import fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';
import { openAvatarForge, confirmAvatarForge, suppressKnownAvatarForgeWarnings } from './helpers/avatar-forge.js';

test.describe.configure({ timeout: 300000 });
const out = path.join(process.cwd(), 'artifacts', 'avatar-forge-refresh');

test('glasses, a clip and an earring keep independent anchors when combined', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const report = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
    const { FORGE_ORIGINAL_FACES } = await import('/src/data/avatar/catalog/forge-original-faces.js');
    const ids = ['round_glasses', 'star_clip', 'bridge_mono_earring_01'];
    async function sample(accessoryIds) {
      const group = await buildAvatarGroup({ ...FORGE_ORIGINAL_FACES[0].recipe, accessoryIds });
      group.updateMatrixWorld(true); const parts = {};
      group.traverse(n => {
        if (n.isMesh && /ACC_/.test(n.name || n.parent?.name)) {
          const box = new THREE.Box3().setFromObject(n);
          parts[n.name || n.parent.name] = [...box.min.toArray(), ...box.max.toArray()];
        }
      });
      return parts;
    }
    return { separate: Object.assign({}, ...await Promise.all(ids.map(id => sample([id])))), combined: await sample(ids) };
  });
  expect(Object.keys(report.separate).length).toBeGreaterThan(5);
  expect(Object.keys(report.combined).sort()).toEqual(Object.keys(report.separate).sort());
  for (const [name, bounds] of Object.entries(report.separate)) for (let i = 0; i < bounds.length; i++)
    expect(report.combined[name][i], name).toBeCloseTo(bounds[i], 5);
  await assertNoPageErrors(page);
});


test('original face choices remain editable and focus the head', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  await openAvatarForge(page);
  for (const [id, eye, mouth] of [
    ['nora', 'lively', 'smile'], ['ivo', 'resolute', 'confident'],
    ['mara', 'kind', 'gentle'], ['bruno', 'wry', 'wry'],
  ]) {
    await page.locator(`[data-hero-preset="forge_${id}"]`).click();
    await expect(page.locator('#avatar-eye-select')).toHaveValue(`forge_eye_${eye}`);
    await expect(page.locator('[data-preview-focus-mode]')).toHaveAttribute('data-preview-focus-mode', 'head');
    await expect(page.locator('#avatar-mouth-select')).toHaveValue(`forge_mouth_${mouth}`);
  }
  await page.locator('#avatar-mouth-select').selectOption('forge_mouth_smile');
  await expect(page.locator('#avatar-eye-select')).toHaveValue('forge_eye_wry');
  await confirmAvatarForge(page);
  const recipe = await page.evaluate(() => window.__LOWPOLY64_STATE__.userObjects.children.at(-1).userData.avatarRecipe);
  expect(recipe.label).toBe('Bruno');
  expect(recipe.features.eyes.presetId).toBe('forge_eye_wry');
  expect(recipe.features.mouth.presetId).toBe('forge_mouth_smile');
  await assertNoPageErrors(page);
});

test('original faces retain texture pixels through JSON, scene and GLB export; their vector sources remain editable', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const results = await page.evaluate(async () => {
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
    const { FORGE_ORIGINAL_FACES } = await import('/src/data/avatar/catalog/forge-original-faces.js');
    const { FORGE_FACE_ART } = await import('/src/data/avatar/forge-face-art.js');
    const { exportAvatarFeaturePresetSvg, parseAvatarFeatureSvg } = await import('/src/modules/avatar/avatar-feature-svg.js');
    const { serializeGroupAsImportJSON, serializeScene, deserializeScene } = await import('/src/modules/viewport/persistence.js');
    const { importObjectFromJSON } = await import('/src/modules/viewport/json-import.js');
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
    const s = window.__LOWPOLY64_STATE__;
    function pixels(group) {
      const hashes = [];
      group.traverse(node => {
        for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
          const img = material?.map?.image; if (!img) continue;
          const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
          let hash = 2166136261, visible = 0;
          for (const value of ctx.getImageData(0, 0, c.width, c.height).data) { hash = Math.imul(hash ^ value, 16777619) >>> 0; if (value) visible++; }
          hashes.push(`${c.width}x${c.height}:${hash}:${visible}`);
        }
      });
      return hashes.sort();
    }
    const output = [];
    for (const preset of FORGE_ORIGINAL_FACES) {
      const group = await buildAvatarGroup(preset.recipe);
      const before = pixels(group);
      s.transformControls?.detach(); s.userObjects.clear(); s.selectedMeshes.clear(); s.selectedMesh = group; s.userObjects.add(group);
      const json = JSON.stringify(serializeGroupAsImportJSON(group), null, 2);
      const { buffer } = await exportGLBToBuffer();
      const glb = await parseGlbGroup(buffer);
      await deserializeScene(serializeScene());
      if (!s.userObjects.children.length) throw new Error(`${preset.id}: scene reload produced no objects`);
      const afterScene = pixels(s.userObjects.children.at(-1));
      s.transformControls?.detach(); s.userObjects.clear(); s.selectedMesh = null;
      const imported = await importObjectFromJSON(json);
      if (!imported.success) throw new Error(`${preset.id} JSON: ${JSON.stringify(imported)}`);
      const afterJSON = pixels(s.userObjects.children.at(-1));
      const changed = await buildAvatarGroup({ ...preset.recipe, colorOverrides: { ...preset.recipe.colorOverrides, iris: '#ff8822' } });
      output.push({ id: preset.id, recipe: group.userData.avatarRecipe, before, afterScene, afterJSON, afterGlb: pixels(glb), changed: pixels(changed), imported, json, glb: Array.from(new Uint8Array(buffer)) });
    }
    return { faces: output, vectors: FORGE_FACE_ART.map(art => {
      const role = { eye: 'eyes', brow: 'brows', mouth: 'mouth' }[art.kind];
      const markup = exportAvatarFeaturePresetSvg(role, art.id);
      return { id: art.id, unresolved: markup.includes('{{'), metadata: parseAvatarFeatureSvg(markup, { expectedRole: role, expectedSourceId: art.id }).metadata };
    }) };
  });
  await fs.mkdir(out, { recursive: true });
  for (const face of results.faces) {
    expect(face.before.length, face.id).toBeGreaterThanOrEqual(5);
    const ears=JSON.parse(face.json).pieces.filter(piece=>/^HEAD_EAR_[LR]$/.test(piece.name));
    expect(ears.length).toBe(2);
    for(const ear of ears) expect((ear.geometry.params||ear.geometry).faces.length,`${face.id}/${ear.name} triangle budget`).toBeLessThan(600);
    expect(face.imported.success, face.imported.error).toBe(true);
    for (const key of ['afterScene', 'afterJSON', 'afterGlb']) expect(face[key], `${face.id}/${key}`).toEqual(face.before);
    expect(face.changed, `${face.id} iris tint`).not.toEqual(face.before);
    const name = face.id.replace('forge_', '');
    await fs.writeFile(path.join(out, `${name}.json`), face.json);
    await fs.writeFile(path.join(out, `${name}.recipe.json`), JSON.stringify(face.recipe, null, 2));
    await fs.writeFile(path.join(out, `${name}.glb`), Buffer.from(face.glb));
  }
  for (const vector of results.vectors) { expect(vector.unresolved, vector.id).toBe(false); expect(vector.metadata.sourceId).toBe(vector.id); }
  await assertNoPageErrors(page);
});

test('Avatar Forge uses the supported GLB rig with attached face textures and reusable exports', async ({ page }) => {
  const sourcePath = process.env.MESHY_TEST_GLB;
  test.skip(!sourcePath, 'Set MESHY_TEST_GLB to the locally supplied donor.');
  await page.route('**/__meshy_source.glb', async route => route.fulfill({ contentType: 'model/gltf-binary', body: await fs.readFile(sourcePath) }));
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const results = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { buildAvatarGroup } = await import('/src/modules/avatar/avatar-builder.js');
    const { FORGE_ORIGINAL_FACES } = await import('/src/data/avatar/catalog/forge-original-faces.js');
    const { createCompatibleHumanoidCopy } = await import('/src/modules/animation/compatible-humanoid-rig.js');
    const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
    const { serializeGroupAsImportJSON, serializeScene, deserializeScene } = await import('/src/modules/viewport/persistence.js');
    const { importObjectFromJSON } = await import('/src/modules/viewport/json-import.js');
    const { exportGLBToBuffer } = await import('/src/modules/viewport/export.js');
    const { selectMesh } = await import('/src/modules/viewport/selection.js');
    const donor = await parseGlbGroup(await (await fetch('/__meshy_source.glb')).arrayBuffer());
    const s = window.__LOWPOLY64_STATE__;
    function inspect(group) {
      const textures = [], skins = []; group.updateMatrixWorld(true);
      group.traverse(n => { if (n.isSkinnedMesh) skins.push(n); if (n.isMesh && n.material?.map) textures.push(n); });
      const head = group.getObjectByName('Head');
      const pixelHashes = textures.map(n => {
        const img = n.material.map.image, c = document.createElement('canvas'); c.width=img.width;c.height=img.height;
        const ctx=c.getContext('2d');ctx.drawImage(img,0,0);let hash=2166136261;
        for(const value of ctx.getImageData(0,0,c.width,c.height).data)hash=Math.imul(hash^value,16777619)>>>0;
        return hash;
      }).sort();
      const localMatrices = () => { group.updateMatrixWorld(true); return textures.map(n => head.matrixWorld.clone().invert().multiply(n.matrixWorld).toArray()); };
      const positions = () => { group.updateMatrixWorld(true); return textures.map(n => n.getWorldPosition(new THREE.Vector3()).toArray()).flat(); };
      const initial = localMatrices(), motions=[];
      const skin = skins[0];
      const bindPoint = name => new THREE.Vector3().setFromMatrixPosition(
        skin.skeleton.boneInverses[skin.skeleton.bones.findIndex(bone => bone.name === name)].clone().invert(),
      ).applyMatrix4(skin.matrixWorld);
      const rigFront = bindPoint('headfront').sub(bindPoint('Head')).normalize().z;
      const armExtensions = ['Left', 'Right'].map(side => Math.abs(bindPoint(side+'Hand').x) - Math.abs(bindPoint(side+'Arm').x));
      for(const clip of group.userData.animationClips){
        const mixer=new THREE.AnimationMixer(group);mixer.clipAction(clip).play();mixer.setTime(0);const a=positions();mixer.setTime(clip.duration*.37);const b=positions();
        const localError=Math.max(...localMatrices().flatMap((m,i)=>m.map((v,j)=>Math.abs(v-initial[i][j]))));
        motions.push({name:clip.name,moves:b.some((v,i)=>Math.abs(v-a[i])>.001),finite:b.every(Number.isFinite),localError});
        mixer.stopAllAction();mixer.uncacheRoot(group);
      }
      return { rigFront, armExtensions, textures: textures.length, pixelHashes, localMatrices: initial, bones: skins[0]?.skeleton.bones.length, motions };
    }
    const output=[];
    for(const preset of FORGE_ORIGINAL_FACES){
      const original=await buildAvatarGroup(preset.recipe), originalJSON=JSON.stringify(serializeGroupAsImportJSON(original));
      const copy=createCompatibleHumanoidCopy(original,donor), before=inspect(copy);
      const unchanged=JSON.stringify(serializeGroupAsImportJSON(original))===originalJSON;
      s.transformControls?.detach(); s.userObjects.clear();s.selectedMeshes.clear();s.userObjects.add(copy);s.selectedMesh=copy;
      const json=JSON.stringify(serializeGroupAsImportJSON(copy),null,2), {buffer}=await exportGLBToBuffer();
      const glb=await parseGlbGroup(buffer), afterGlb=inspect(glb);
      const redonated=inspect(createCompatibleHumanoidCopy(original,glb));
      await deserializeScene(serializeScene());const afterScene=inspect(s.userObjects.children.at(-1));
      s.transformControls?.detach(); s.userObjects.clear();s.selectedMesh=null;const imported=await importObjectFromJSON(json), afterJSON=inspect(s.userObjects.children.at(-1));
      output.push({id:preset.id,before,afterGlb,afterJSON,afterScene,redonated,unchanged,imported,json,glb:Array.from(new Uint8Array(buffer))});
    }
    s.transformControls?.detach(); s.userObjects.clear();const original=await buildAvatarGroup(FORGE_ORIGINAL_FACES[0].recipe);s.userObjects.add(original);selectMesh(original);
    return output;
  });
  for(const face of results){
    expect(face.unchanged,face.id).toBe(true);expect(face.imported.success,face.imported.error).toBe(true);
    for(const key of ['before','afterGlb','afterJSON','afterScene','redonated']){
      const r=face[key];for(const extension of r.armExtensions)expect(extension,`${face.id}/${key} arms point outward`).toBeGreaterThan(.2);expect(r.rigFront,`${face.id}/${key} forward axis`).toBeGreaterThan(.99);expect(r.textures,`${face.id}/${key}`).toBe(5);expect(r.bones).toBe(24);expect(r.pixelHashes).toEqual(face.before.pixelHashes);
      const placementError=Math.max(...r.localMatrices.flatMap((matrix,i)=>matrix.map((value,j)=>Math.abs(value-face.before.localMatrices[i][j]))));
      expect(placementError,`${face.id}/${key} facial transforms`).toBeLessThan(.0001);
      expect(r.motions.map(m=>m.name).sort()).toEqual(['Hip_Hop_Dance_3','Running','Walking']);
      for(const motion of r.motions){expect(motion.moves,`${face.id}/${key}/${motion.name}`).toBe(true);expect(motion.finite).toBe(true);expect(motion.localError).toBeLessThan(.0001);}
    }
    const name=face.id.replace('forge_','');await fs.mkdir(out,{recursive:true});
    await fs.writeFile(path.join(out,`${name}-animated.json`),face.json);
    await fs.writeFile(path.join(out,`${name}-animated.glb`),Buffer.from(face.glb));
  }
  await expect(page.locator('#btn-compatible-animation')).toBeVisible();
  await page.locator('#btn-compatible-animation').click();
  await page.locator('#compatible-animation-file').setInputFiles(sourcePath);
  await expect(page.locator('#compatible-animation-modal')).toHaveCount(0,{timeout:120000});
  expect(await page.evaluate(()=>window.__LOWPOLY64_STATE__.userObjects.children.length)).toBe(2);
  await assertNoPageErrors(page);
});
