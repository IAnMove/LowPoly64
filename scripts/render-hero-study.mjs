import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const stage = Math.max(1, Math.min(5, Number(process.argv[2] || 1)));
const labels = ['body', 'head', 'hair', 'equipment', 'pose'];
const output = 'artifacts/psx-hero-art-direction';
const reopenGlb = process.argv.includes('--glb');
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto('http://127.0.0.1:41740', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60000 });
  const result = await page.evaluate(async ({ stage, reopenGlb }) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { createCharacterDesignModel } = await import('/src/modules/character-studio/character-design.js');
    const shapes = await import('/src/modules/character-studio/heroic-character-shapes.js');
    const { characterModelToPieces } = await import('/src/modules/viewport/character-model.js');
    const { buildGroupFromDefinition } = await import('/src/modules/viewport/templates.js');
    const { createAvatarPreviewRuntime } = await import('/src/modules/avatar/avatar-preview-runtime.js');
    const { rebuildRigAnimationsForGroup } = await import('/src/modules/animation/rigging-utils.js');
    const { serializeGroupAsImportJSON } = await import('/src/modules/viewport/persistence.js');
    const { HERO_PSX_RECIPE } = await import('/src/modules/character-studio/heroic-presets.js');
    const recipe = structuredClone(stage >= 4 ? HERO_PSX_RECIPE : shapes.HERO_STUDY_RECIPE);
    if (stage >= 4) {
      recipe.outfit.style = 'soldier';
      recipe.equipment.sword = { enabled: true, profile: 'buster', width: .72, length: 2.55, color: '#b2bdc7' };
      recipe.equipment.pauldron = { enabled: true, profile: 'shell', side: 'left', size: .84, color: '#737d91' };
    }
    const model = createCharacterDesignModel(recipe);
    if (stage < 4) {
      shapes.applyHeroicBody(model, recipe);
      if (stage >= 2) shapes.applyHeroicHead(model, recipe);
      if (stage >= 3) shapes.applyHeroicHair(model, recipe);
    }
    const converted = characterModelToPieces(model);
    let group = buildGroupFromDefinition({ name: model.name, pieces: converted.pieces }, { compileAnimations: false });
    Object.assign(group.userData, { name: model.name, isRetroCharacter: true, retroCharacterRoot: true, characterDesignRecipe: model.characterDesignRecipe, retroCharacterRecipe: model.retroCharacterRecipe, skeletonId: model.skeletonId, animationProfile: model.animationProfile, slotMap: converted.slotMap, slotBindings: model.slotBindings, humanoidRigMode: 'canonical' });
    rebuildRigAnimationsForGroup(group, { skeletonId: model.skeletonId, animationProfile: model.animationProfile });
    if (reopenGlb) {
      const { parseGlbGroup } = await import('/src/modules/viewport/native-gltf.js');
      group = await parseGlbGroup(await (await fetch('/artifacts/psx-hero-art-direction/cloud-hero.glb')).arrayBuffer());
    }
    // Export a reusable neutral character, then pose only the preview.
    const definition = serializeGroupAsImportJSON(group);
    if (stage >= 5) shapes.applyHeroicPresentation?.(group);
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 768;
    const runtime = createAvatarPreviewRuntime(canvas);
    runtime.scene.background = new THREE.Color('#202631');
    runtime.scene.add(group); runtime.renderer.setSize(768, 768, false);
    runtime.camera.aspect = 1; runtime.camera.updateProjectionMatrix();
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    const center = bounds.getCenter(new THREE.Vector3());
    const height = bounds.max.y - bounds.min.y;
    const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius;
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(runtime.camera.fov / 2)) * 1.03;
    const views = [];
    for (const [name, direction] of [['front', [0, .03, 1]], ['profile', [1, .05, 0]], ['three-quarter', [.7, .08, 1]], ['portrait', [.34, .02, 1]]]) {
      const target = name === 'portrait' ? new THREE.Vector3(0, bounds.max.y - height * .24, 0) : center;
      runtime.camera.position.copy(target).add(new THREE.Vector3(...direction).normalize().multiplyScalar(name === 'portrait' ? distance * .52 : distance));
      runtime.camera.lookAt(target); runtime.camera.near = .01; runtime.camera.far = 100; runtime.camera.updateProjectionMatrix();
      runtime.renderer.render(runtime.scene, runtime.camera);
      views.push({ name, data: canvas.toDataURL('image/png').split(',')[1] });
    }
    let triangles = 0; group.traverse(node => { if (node.isMesh) triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3; });
    runtime.controls.dispose(); runtime.renderer.dispose();
    return { definition, model, views, triangles };
  }, { stage, reopenGlb });
  await fs.mkdir(output, { recursive: true });
  const prefix = `${String(stage).padStart(2, '0')}-${labels[stage - 1]}`;
  if (reopenGlb) { for (const view of result.views) await fs.writeFile(`${output}/reopened-glb-${view.name}.png`, Buffer.from(view.data, 'base64')); console.log(JSON.stringify({ reopenGlb, triangles: result.triangles })); } else {
  for (const view of result.views) await fs.writeFile(`${output}/${prefix}-${view.name}.png`, Buffer.from(view.data, 'base64'));
  await fs.writeFile(`${output}/${prefix}.json`, JSON.stringify(result.definition, null, 2));
  await fs.writeFile(`${output}/${prefix}.cm.json`, JSON.stringify(result.model, null, 2));
  console.log(JSON.stringify({ stage, prefix, triangles: result.triangles, views: result.views.map(view => `${output}/${prefix}-${view.name}.png`) }));
  }
} finally { await browser?.close(); await server.close(); }
