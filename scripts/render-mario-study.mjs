import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const output = 'artifacts/mario64-speech-lab';
const server = await createServer({ logLevel: 'warn', server: { host: '127.0.0.1', port: 41740, strictPort: true, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await page.goto('http://127.0.0.1:41740', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__LOWPOLY64_READY__, null, { timeout: 60000 });
  const result = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { MARIO64_RECIPE } = await import('/src/modules/character-studio/plumber-presets.js');
    const { buildCharacterDesignGroup } = await import('/src/modules/agent/character-commands.js');
    const { executeAgentCommand } = await import('/src/modules/agent/agent-command-api.js');
    const { createAvatarPreviewRuntime } = await import('/src/modules/avatar/avatar-preview-runtime.js');
    const group = buildCharacterDesignGroup(MARIO64_RECIPE);
    window.__LOWPOLY64_STATE__.userObjects.add(group);
    const exports = {};
    for (const format of ['json', 'glb', 'recipe']) {
      const response = await executeAgentCommand('export_character_asset', { id: group.userData.agentId, format });
      if (!response.ok) throw new Error(JSON.stringify(response.error)); exports[format] = response.artifacts[0];
    }
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
    const runtime = createAvatarPreviewRuntime(canvas); runtime.renderer.setSize(768, 768, false); runtime.scene.background = new THREE.Color('#223044'); runtime.scene.add(group);
    const bounds = new THREE.Box3().setFromObject(group), center = bounds.getCenter(new THREE.Vector3());
    const distance = bounds.getBoundingSphere(new THREE.Sphere()).radius / Math.sin(THREE.MathUtils.degToRad(runtime.camera.fov / 2));
    const head = group.getObjectByName('HEAD'); const headPosition = head.getWorldPosition(new THREE.Vector3());
    const views = [];
    for (const [view, direction] of [['front', [0, .025, 1]], ['profile', [1, .02, 0]], ['three-quarter', [.65, .065, 1]], ['portrait', [.24, .03, 1]]]) {
      const target = view === 'portrait' ? headPosition.clone().add(new THREE.Vector3(0, .96, .12)) : center;
      runtime.camera.position.copy(target).add(new THREE.Vector3(...direction).normalize().multiplyScalar(view === 'portrait' ? distance * .57 : distance));
      runtime.camera.lookAt(target); runtime.camera.aspect = 1; runtime.camera.updateProjectionMatrix(); runtime.renderer.render(runtime.scene, runtime.camera);
      views.push({ view, data: canvas.toDataURL('image/png').split(',')[1] });
    }
    let triangles = 0; group.traverse(node => { if (node.isMesh) triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3; });
    runtime.controls.dispose(); runtime.renderer.dispose();
    return { views, exports, triangles, clips: group.userData.animationClips.map(c => c.name) };
  });
  await fs.mkdir(output, { recursive: true });
  for (const { view, data } of result.views) await fs.writeFile(`${output}/mario-${view}.png`, Buffer.from(data, 'base64'));
  await fs.writeFile(`${output}/mario.json`, JSON.stringify(result.exports.json.data, null, 2));
  await fs.writeFile(`${output}/mario.glb`, Buffer.from(result.exports.glb.data, 'base64'));
  await fs.writeFile(`${output}/mario.recipe.json`, JSON.stringify(result.exports.recipe.data, null, 2));
  await fs.writeFile('docs/examples/character-design/mario64.recipe.json', JSON.stringify(result.exports.recipe.data, null, 2));
  console.log(JSON.stringify({ triangles: result.triangles, clips: result.clips, output }));
} finally { await browser?.close(); await server.close(); }
