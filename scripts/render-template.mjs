// Render a scene/character JSON (ask.md / ask-character.md contracts) or a
// registry template into front/profile/three-quarter PNGs plus a JSON report.
//
// This closes the LLM self-correction loop: generate JSON -> npm run render --
// file.json -> look at the captures and the style-budget report -> fix -> repeat.
//
// Usage:
//   npm run render -- path/to/model.json [--out DIR] [--views front,profile,three-quarter,back]
//   npm run render -- --template n64_elf_hero_cm [--size 960x720] [--json]
//
// Output: one PNG per view and report.json in the output directory
// (default .tmp-render/<slug>/). The report is also printed to stdout;
// with --json, stdout carries only the report (logs go to stderr).

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const HOST = '127.0.0.1';
const PORT = Number(process.env.RENDER_PORT) || 41735;
const BASE_URL = `http://${HOST}:${PORT}/`;
const KNOWN_VIEWS = ['front', 'profile', 'three-quarter', 'back'];
const DEFAULT_VIEWS = ['front', 'profile', 'three-quarter'];

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error('Usage:');
  console.error('  npm run render -- <model.json> [--out DIR] [--views v1,v2] [--size WxH] [--json]');
  console.error('  npm run render -- --template <template-id> [--out DIR] [--views v1,v2] [--size WxH] [--json]');
  console.error(`Views: ${KNOWN_VIEWS.join(', ')} (default: ${DEFAULT_VIEWS.join(', ')})`);
  process.exit(2);
}

function parseArgs(argv) {
  const options = {
    inputPath: null,
    templateId: null,
    out: null,
    views: [...DEFAULT_VIEWS],
    width: 960,
    height: 720,
    jsonOnly: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--template') {
      options.templateId = argv[++i] || usage('--template needs an id.');
    } else if (arg === '--out') {
      options.out = argv[++i] || usage('--out needs a directory.');
    } else if (arg === '--views') {
      const raw = argv[++i] || usage('--views needs a comma-separated list.');
      options.views = raw.split(',').map((view) => view.trim()).filter(Boolean);
      const unknown = options.views.filter((view) => !KNOWN_VIEWS.includes(view));
      if (unknown.length) usage(`Unknown views: ${unknown.join(', ')}`);
      if (!options.views.length) usage('--views needs at least one view.');
    } else if (arg === '--size') {
      const match = /^(\d{2,4})x(\d{2,4})$/.exec(argv[++i] || '');
      if (!match) usage('--size must look like 960x720.');
      options.width = Number(match[1]);
      options.height = Number(match[2]);
    } else if (arg === '--json') {
      options.jsonOnly = true;
    } else if (arg.startsWith('--')) {
      usage(`Unknown option: ${arg}`);
    } else if (!options.inputPath) {
      options.inputPath = arg;
    } else {
      usage(`Unexpected argument: ${arg}`);
    }
  }
  if (!options.inputPath && !options.templateId) usage('Pass a JSON file or --template <id>.');
  if (options.inputPath && options.templateId) usage('Pass either a JSON file or --template, not both.');
  return options;
}

function slugify(value) {
  return String(value || 'render')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'render';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until Vite is ready.
    }
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startVite() {
  return spawn(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', '--host', HOST, '--port', String(PORT), '--strictPort'],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
}

async function importIntoScene(page, { payloadText, templateId }) {
  return page.evaluate(async ({ payloadText: text, templateId: id }) => {
    const [{ state }, selection, { evaluateStyleBudget }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/viewport/selection.js'),
      import('/src/modules/viewport/style-budget.js'),
    ]);

    selection.deselect();
    for (const child of [...state.userObjects.children]) {
      state.userObjects.remove(child);
    }

    let group = null;
    let format = null;
    let name = null;

    if (id) {
      const [{ TEMPLATE_REGISTRY }, { instantiateTemplateDefinition }] = await Promise.all([
        import('/src/modules/viewport/template-registry.js'),
        import('/src/modules/viewport/templates.js'),
      ]);
      const def = TEMPLATE_REGISTRY.find((entry) => entry.id === id);
      if (!def) {
        const near = TEMPLATE_REGISTRY
          .filter((entry) => entry.id.includes(id.slice(0, 6)))
          .slice(0, 5)
          .map((entry) => entry.id);
        return { success: false, error: `Template not found: ${id}${near.length ? ` (similar: ${near.join(', ')})` : ''}` };
      }
      group = instantiateTemplateDefinition(def);
      group.userData.name = def.name;
      group.name = def.name;
      state.userObjects.add(group);
      format = 'template';
      name = def.name;
    } else {
      // Drive the app's own import modal path so the render sees exactly
      // what a user pasting this JSON would see (validation included).
      const importer = await import('/src/modules/viewport/json-import.js');
      const { detectFormat } = await import('/src/modules/viewport/character-model.js');
      const textarea = document.getElementById('import-json-textarea');
      textarea.value = text;
      const result = await importer.handleImportSubmit();
      if (!result?.success) {
        return { success: false, error: result?.error || 'Import failed.' };
      }
      group = state.selectedMesh;
      try {
        format = detectFormat(JSON.parse(text));
      } catch {
        format = 'unknown';
      }
      name = group?.userData?.name || group?.name || 'IMPORTED';
    }

    if (!group) return { success: false, error: 'Import produced no selectable group.' };
    selection.deselect();
    group.updateWorldMatrix(true, true);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    const headBox = { min: Infinity, max: -Infinity, found: false };
    const faceBox = { min: Infinity, max: -Infinity, found: false };
    let meshCount = 0;

    group.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      meshCount += 1;
      node.geometry.computeBoundingBox();
      const bb = node.geometry.boundingBox;
      if (!bb) return;
      const parentName = String(node.parent?.userData?.name || node.parent?.name || '');
      const nodeName = String(node.userData?.name || node.name || '');
      const isHead = parentName === 'HEAD' || nodeName === 'HEAD';
      const isFace = /FACE|EYE|BROW|MOUTH/.test(parentName) || /FACE|EYE|BROW|MOUTH/.test(nodeName);
      const e = node.matrixWorld.elements;
      for (let i = 0; i < 8; i += 1) {
        const x = i & 1 ? bb.max.x : bb.min.x;
        const y = i & 2 ? bb.max.y : bb.min.y;
        const z = i & 4 ? bb.max.z : bb.min.z;
        const wx = (e[0] * x) + (e[4] * y) + (e[8] * z) + e[12];
        const wy = (e[1] * x) + (e[5] * y) + (e[9] * z) + e[13];
        const wz = (e[2] * x) + (e[6] * y) + (e[10] * z) + e[14];
        min[0] = Math.min(min[0], wx); max[0] = Math.max(max[0], wx);
        min[1] = Math.min(min[1], wy); max[1] = Math.max(max[1], wy);
        min[2] = Math.min(min[2], wz); max[2] = Math.max(max[2], wz);
        if (isHead) { headBox.found = true; headBox.min = Math.min(headBox.min, wz); headBox.max = Math.max(headBox.max, wz); }
        if (isFace) { faceBox.found = true; faceBox.min = Math.min(faceBox.min, wz); faceBox.max = Math.max(faceBox.max, wz); }
      }
    });

    if (!meshCount || !Number.isFinite(min[0])) {
      return { success: false, error: 'Imported group has no mesh geometry to render.' };
    }

    const center = {
      x: (min[0] + max[0]) * 0.5,
      y: (min[1] + max[1]) * 0.5,
      z: (min[2] + max[2]) * 0.5,
    };
    const size = {
      width: max[0] - min[0],
      height: max[1] - min[1],
      depth: max[2] - min[2],
    };
    // Characters store their face toward one Z side; use it to decide which
    // side "front" is. Plain objects default to +Z.
    let frontSign = 1;
    if (headBox.found && faceBox.found) {
      const headCenter = (headBox.min + headBox.max) * 0.5;
      const faceCenter = (faceBox.min + faceBox.max) * 0.5;
      frontSign = faceCenter < headCenter ? -1 : 1;
    }

    // The editor key light sits at +X/+Z, so characters facing -Z would
    // capture with their face in shadow. Clone the key light and aim a soft
    // fill from the face side so captures read clearly.
    const keyLight = state.scene.getObjectByProperty('isDirectionalLight', true);
    if (keyLight) {
      const fill = keyLight.clone();
      fill.intensity = keyLight.intensity * 0.85;
      fill.position.set(-5, 14, frontSign * 20);
      state.scene.add(fill);
    }

    const style = evaluateStyleBudget(group);
    window.__RENDER_CLI__ = { center, size, frontSign };

    // Keep editor chrome out of the canvas captures: only the canvas
    // itself should be visible inside #viewport.
    if (!document.getElementById('__render-cli-style__')) {
      const styleEl = document.createElement('style');
      styleEl.id = '__render-cli-style__';
      styleEl.textContent = `
        #toast-container { display: none !important; }
        #viewport > *:not(#canvas) { display: none !important; }
      `;
      document.head.appendChild(styleEl);
    }

    return {
      success: true,
      format,
      name,
      meshCount,
      pieceCount: group.children.length,
      bounds: { min, max, center, size },
      frontSign,
      style,
    };
  }, { payloadText, templateId });
}

async function frameView(page, view) {
  await page.evaluate(async (viewName) => {
    const [{ state }] = await Promise.all([
      import('/src/modules/shared/state.js'),
    ]);
    const info = window.__RENDER_CLI__;
    if (!info) throw new Error('Render state missing; import step did not run.');
    const { center, size, frontSign } = info;
    const span = Math.max(size.width, size.height, size.depth, 1);
    const distance = span * 1.65;
    const offsets = {
      front: [0, frontSign * distance],
      profile: [-frontSign * distance, 0],
      'three-quarter': [-frontSign * distance * 0.7, frontSign * distance * 0.7],
      back: [0, -frontSign * distance],
    };
    const [dx, dz] = offsets[viewName] || offsets.front;
    state.camera.position.set(center.x + dx, center.y + (span * 0.08), center.z + dz);
    state.orbitControls.target.set(center.x, center.y, center.z);
    state.orbitControls.update();
    await new Promise((resolve) => {
      let remaining = 3;
      const step = () => {
        remaining -= 1;
        if (remaining <= 0) { resolve(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, view);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const log = options.jsonOnly
    ? (...parts) => console.error(...parts)
    : (...parts) => console.log(...parts);

  let payloadText = null;
  if (options.inputPath) {
    if (!fs.existsSync(options.inputPath)) usage(`File not found: ${options.inputPath}`);
    payloadText = fs.readFileSync(options.inputPath, 'utf8');
    try {
      JSON.parse(payloadText);
    } catch (error) {
      console.error(`Invalid JSON in ${options.inputPath}: ${error.message}`);
      process.exit(1);
    }
  }

  const startedAt = Date.now();
  const vite = startVite();
  let viteOutput = '';
  vite.stdout.on('data', (chunk) => { viteOutput += chunk.toString(); });
  vite.stderr.on('data', (chunk) => { viteOutput += chunk.toString(); });

  let browser = null;
  try {
    log('[render] Starting Vite...');
    await waitForServer(BASE_URL);
    log('[render] Launching Chromium...');
    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({ viewport: { width: options.width, height: options.height } });
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 });
    await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 45000 });

    log(`[render] Importing ${options.templateId ? `template ${options.templateId}` : options.inputPath}...`);
    const imported = await importIntoScene(page, {
      payloadText,
      templateId: options.templateId,
    });
    if (!imported.success) {
      console.error(`Import failed: ${imported.error}`);
      process.exitCode = 1;
      return;
    }

    const slug = slugify(options.templateId || path.basename(options.inputPath, path.extname(options.inputPath)));
    const outDir = options.out || path.join('.tmp-render', slug);
    fs.mkdirSync(outDir, { recursive: true });

    const canvas = page.locator('#canvas');
    const captures = [];
    for (const view of options.views) {
      await frameView(page, view);
      await page.waitForTimeout(120);
      const capturePath = path.join(outDir, `${slug}_${view}.png`);
      await canvas.screenshot({ path: capturePath, animations: 'disabled' });
      captures.push({ view, path: capturePath });
      log(`[render] Captured ${view} -> ${capturePath}`);
    }

    const report = {
      input: options.templateId ? { templateId: options.templateId } : { file: options.inputPath },
      name: imported.name,
      format: imported.format,
      pieceCount: imported.pieceCount,
      meshCount: imported.meshCount,
      bounds: imported.bounds,
      style: imported.style,
      captures,
      durationMs: Date.now() - startedAt,
    };
    const reportPath = path.join(outDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    if (options.jsonOnly) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      const { style } = report;
      log(`Rendered "${report.name}" (${report.format}): ${report.meshCount} meshes, `
        + `${style.metrics.triangles} triangles, ${style.metrics.materialColors.length} flat colors, `
        + `max texture ${style.metrics.maxTextureSize}px.`);
      for (const warning of style.warnings) {
        log(`  [budget] ${warning.id}: ${warning.value} > ${warning.limit}`);
      }
      log(`Report: ${reportPath}`);
    }
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    if (viteOutput.trim()) {
      console.error('\nVite output:\n' + viteOutput.trim());
    }
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    if (!vite.killed) {
      vite.kill();
    }
  }
}

await main();
