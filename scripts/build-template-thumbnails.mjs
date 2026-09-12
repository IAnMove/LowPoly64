// Build deterministic 144x112 thumbnails for every registered template.
//
// The page uses the app's own TEMPLATE_REGISTRY and
// instantiateTemplateDefinition() so the images represent the same geometry
// users get from the catalogue. The capture page is intentionally separate
// from the editor's viewport; no scene state or UI is changed.
//
// Usage:
//   node scripts/build-template-thumbnails.mjs
//   node scripts/build-template-thumbnails.mjs --port 41736 --format png
//   node scripts/build-template-thumbnails.mjs --template-id chair --out .tmp-template-thumbnails

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 41736;
const DEFAULT_WIDTH = 144;
const DEFAULT_HEIGHT = 112;
const DEFAULT_OUTPUT = path.resolve('public/template-thumbnails');
const MANIFEST_NAME = 'manifest.json';
const GENERATOR_VERSION = 3;

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error('Usage: node scripts/build-template-thumbnails.mjs [options]');
  console.error('  --out DIR              Output directory (default: public/template-thumbnails)');
  console.error('  --port PORT            Vite port (default: 41736)');
  console.error('  --width N              Thumbnail width (default: 144)');
  console.error('  --height N             Thumbnail height (default: 112)');
  console.error('  --format auto|webp|png Preferred output format (default: auto)');
  console.error('  --template-id ID       Capture only one registered template');
  console.error('  --headed               Show Chromium while capturing');
  console.error('  --allow-failures       Write the manifest and exit zero despite failures');
  process.exit(2);
}

function parsePositiveInteger(value, name, maximum = 4096) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > maximum) usage(`${name} must be an integer from 1 to ${maximum}.`);
  return number;
}

function parseArgs(argv) {
  const options = {
    out: DEFAULT_OUTPUT,
    port: Number(process.env.TEMPLATE_THUMBNAIL_PORT) || DEFAULT_PORT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    format: 'auto',
    templateId: null,
    headed: false,
    allowFailures: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') options.out = path.resolve(argv[++index] || usage('--out needs a directory.'));
    else if (arg === '--port') options.port = parsePositiveInteger(argv[++index], '--port', 65535);
    else if (arg === '--width') options.width = parsePositiveInteger(argv[++index], '--width');
    else if (arg === '--height') options.height = parsePositiveInteger(argv[++index], '--height');
    else if (arg === '--format') {
      options.format = argv[++index] || usage('--format needs auto, webp, or png.');
      if (!['auto', 'webp', 'png'].includes(options.format)) usage('--format must be auto, webp, or png.');
    } else if (arg === '--template-id') options.templateId = argv[++index] || usage('--template-id needs an id.');
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--allow-failures') options.allowFailures = true;
    else if (arg.startsWith('--')) usage(`Unknown option: ${arg}`);
    else usage(`Unexpected argument: ${arg}`);
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) usage('--port must be a valid TCP port.');
  return options;
}

function imageExtension(mimeType) {
  return mimeType === 'image/webp' ? 'webp' : 'png';
}

function stableFileName(templateId, usedNames) {
  // Keep the on-disk key identical to the UI URL contract. Current IDs are
  // URL-safe; encodeURIComponent also keeps future punctuation from becoming
  // a path separator.
  const base = encodeURIComponent(String(templateId || 'template'));
  let name = `${base}.webp`;
  let serial = 2;
  while (usedNames.has(name)) name = `${base}-${serial++}.webp`;
  usedNames.add(name);
  return name;
}

function writeImage(outputDir, fileName, dataUrl) {
  const match = /^data:image\/(?:png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error(`Capture for ${fileName} did not return a PNG or WebP data URL.`);
  const target = path.join(outputDir, fileName);
  fs.writeFileSync(target, Buffer.from(match[1], 'base64'));
  return fs.statSync(target).size;
}

async function installCaptureRuntime(page, options) {
  await page.evaluate(async ({ width, height, format }) => {
    const [{ TEMPLATE_REGISTRY }, { instantiateTemplateDefinition }, THREE] = await Promise.all([
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
      import('/node_modules/three/build/three.module.js'),
    ]);

    const canvas = document.createElement('canvas');
    canvas.id = '__template-thumbnail-canvas__';
    canvas.width = width;
    canvas.height = height;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;pointer-events:none;';
    document.body.append(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.setClearColor(0x182231, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.01, 10000);
    const key = new THREE.DirectionalLight(0xffffff, 2.3);
    key.position.set(-4, 7, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc7ff, 1.2);
    fill.position.set(5, 4, 2);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xf3f6ff, 0x233044, 1.2));

    const usedIds = new Set();
    for (const template of TEMPLATE_REGISTRY) {
      if (!template?.id || usedIds.has(template.id)) {
        throw new Error(`Template registry contains a missing or duplicate id: ${template?.id || '(empty)'}`);
      }
      usedIds.add(template.id);
    }

    function disposeObject(object) {
      object?.traverse((node) => {
        node.geometry?.dispose?.();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          if (!material) continue;
          material.map?.dispose?.();
          material.normalMap?.dispose?.();
          material.dispose?.();
        }
      });
    }

    function boundsFor(object) {
      object.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(object);
      if (box.isEmpty()) return null;
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      return { box, size, center };
    }

    function frontSignFor(object) {
      let headMin = Infinity;
      let headMax = -Infinity;
      let faceMin = Infinity;
      let faceMax = -Infinity;
      let headFound = false;
      let faceFound = false;
      object.traverse((node) => {
        if (!node.isMesh || !node.geometry) return;
        node.geometry.computeBoundingBox();
        const box = node.geometry.boundingBox;
        if (!box) return;
        const parentName = String(node.parent?.userData?.name || node.parent?.name || '').toUpperCase();
        const nodeName = String(node.userData?.name || node.name || '').toUpperCase();
        const isHead = parentName === 'HEAD' || nodeName === 'HEAD';
        const isFace = /FACE|EYE|BROW|MOUTH/.test(parentName) || /FACE|EYE|BROW|MOUTH/.test(nodeName);
        const corners = [
          new THREE.Vector3(box.min.x, box.min.y, box.min.z), new THREE.Vector3(box.min.x, box.min.y, box.max.z),
          new THREE.Vector3(box.min.x, box.max.y, box.min.z), new THREE.Vector3(box.min.x, box.max.y, box.max.z),
          new THREE.Vector3(box.max.x, box.min.y, box.min.z), new THREE.Vector3(box.max.x, box.min.y, box.max.z),
          new THREE.Vector3(box.max.x, box.max.y, box.min.z), new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        ];
        for (const corner of corners) {
          const z = node.localToWorld(corner).z;
          if (isHead) { headFound = true; headMin = Math.min(headMin, z); headMax = Math.max(headMax, z); }
          if (isFace) { faceFound = true; faceMin = Math.min(faceMin, z); faceMax = Math.max(faceMax, z); }
        }
      });
      if (!faceFound) {
        const forward = new THREE.Vector3(0, 0, 1).transformDirection(object.matrixWorld);
        return forward.z < 0 ? -1 : 1;
      }
      // Mascots can have a single body and a face decal without a HEAD mesh.
      const referenceZ = headFound ? (headMin + headMax) * 0.5 : boundsFor(object).center.z;
      return ((faceMin + faceMax) * 0.5) < referenceZ ? -1 : 1;
    }

    function frame(object) {
      const bounds = boundsFor(object);
      if (!bounds) return null;
      const { size, center } = bounds;
      const span = Math.max(size.x, size.y, size.z, 0.001);
      let hasHead = false;
      object.traverse(node => { if (/(^|[_\s])head($|[_\s])/i.test(node.name)) hasHead = true; });
      const frontSign = frontSignFor(object);
      const distance = span * 2.05;
      camera.position.set(
        center.x - frontSign * distance * 0.72,
        center.y + distance * (hasHead ? 0.09 : 0.48),
        center.z + frontSign * distance * 0.92,
      );
      camera.near = Math.max(0.00001, span / 1000);
      camera.far = Math.max(100, distance * 8);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      return { center: center.toArray(), size: size.toArray(), frontSign, distance };
    }

    function inspectPixels() {
      const gl = renderer.getContext();
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let nonTransparent = 0;
      let maxAlpha = 0;
      let luminanceMin = 255;
      let luminanceMax = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        maxAlpha = Math.max(maxAlpha, alpha);
        if (alpha < 8) continue;
        nonTransparent += 1;
        const luminance = (pixels[index] * 0.2126) + (pixels[index + 1] * 0.7152) + (pixels[index + 2] * 0.0722);
        luminanceMin = Math.min(luminanceMin, luminance);
        luminanceMax = Math.max(luminanceMax, luminance);
      }
      return {
        nonTransparentPixels: nonTransparent,
        coverage: nonTransparent / (width * height),
        maxAlpha,
        luminanceRange: luminanceMax - luminanceMin,
      };
    }

    function canvasDataUrl() {
      const requested = format === 'png' ? 'image/png' : 'image/webp';
      const quality = requested === 'image/webp' ? 0.86 : undefined;
      const candidate = canvas.toDataURL(requested, quality);
      if (format === 'webp' && !candidate.startsWith('data:image/webp')) {
        throw new Error('This browser does not support WebP canvas encoding.');
      }
      if (candidate.startsWith('data:image/webp')) return { dataUrl: candidate, mimeType: 'image/webp' };
      return { dataUrl: canvas.toDataURL('image/png'), mimeType: 'image/png' };
    }

    window.__TEMPLATE_THUMBNAILS__ = {
      registry: TEMPLATE_REGISTRY.map((template) => ({ id: template.id, name: template.name, category: template.category })),
      async capture(templateId) {
        const definition = TEMPLATE_REGISTRY.find((template) => template.id === templateId);
        if (!definition) throw new Error(`Template not found: ${templateId}`);
        const group = instantiateTemplateDefinition(definition);
        group.userData.name = definition.name;
        group.name = definition.name;
        scene.add(group);
        try {
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const frameInfo = frame(group);
          if (!frameInfo) throw new Error('Template has no renderable bounds.');
          // Validate against transparency so an empty model cannot pass on the
          // neutral output background, then render the final neutral thumbnail.
          renderer.setClearColor(0x000000, 0);
          renderer.render(scene, camera);
          renderer.render(scene, camera);
          const pixels = inspectPixels();
          if (pixels.nonTransparentPixels < 12 || pixels.coverage < 0.0005 || pixels.maxAlpha < 8) {
            throw new Error(`Rendered image is empty (${pixels.nonTransparentPixels} visible pixels).`);
          }
          renderer.setClearColor(0x182231, 1);
          renderer.render(scene, camera);
          renderer.render(scene, camera);
          const encoded = canvasDataUrl();
          return {
            id: definition.id,
            name: definition.name,
            category: definition.category,
            pieceCount: group.children.length,
            meshCount: (() => { let count = 0; group.traverse((node) => { if (node.isMesh) count += 1; }); return count; })(),
            frame: frameInfo,
            pixels,
            ...encoded,
          };
        } finally {
          scene.remove(group);
          disposeObject(group);
        }
      },
      dispose() {
        renderer.dispose();
        canvas.remove();
        delete window.__TEMPLATE_THUMBNAILS__;
      },
    };
  }, options);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputDir = options.out;
  fs.mkdirSync(outputDir, { recursive: true });
  const baseUrl = `http://${HOST}:${options.port}/`;
  const vite = await createServer({
    root: process.cwd(),
    logLevel: 'warn',
    server: { host: HOST, port: options.port, strictPort: true },
  });
  let browser = null;
  const startedAt = Date.now();
  try {
    console.log(`[template-thumbnails] Starting Vite on ${baseUrl}`);
    await vite.listen();
    const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH
      || (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);
    browser = await chromium.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: !options.headed,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(baseUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__LOWPOLY64_READY__ === true, null, { timeout: 60000 });
    await installCaptureRuntime(page, {
      width: options.width,
      height: options.height,
      format: options.format,
    });

    const registry = await page.evaluate(() => window.__TEMPLATE_THUMBNAILS__.registry);
    const selected = options.templateId
      ? registry.filter((template) => template.id === options.templateId)
      : registry;
    if (options.templateId && selected.length === 0) throw new Error(`Template not found: ${options.templateId}`);

    const usedNames = new Set();
    const entries = [];
    const failures = [];
    console.log(`[template-thumbnails] Capturing ${selected.length}/${registry.length} registered templates...`);
    for (const template of selected) {
      const stableName = stableFileName(template.id, usedNames);
      try {
        const capture = await page.evaluate((templateId) => window.__TEMPLATE_THUMBNAILS__.capture(templateId), template.id);
        const bytes = writeImage(outputDir, stableName, capture.dataUrl);
        const extension = imageExtension(capture.mimeType);
        const fileName = stableName.replace(/\.webp$/i, `.${extension}`);
        if (fileName !== stableName) {
          fs.renameSync(path.join(outputDir, stableName), path.join(outputDir, fileName));
        }
        entries.push({
          id: capture.id,
          name: capture.name,
          category: capture.category,
          file: fileName.replace(/\\/g, '/'),
          mimeType: capture.mimeType,
          width: options.width,
          height: options.height,
          bytes,
          pieceCount: capture.pieceCount,
          meshCount: capture.meshCount,
          frame: capture.frame,
          pixels: capture.pixels,
          status: 'ok',
        });
        console.log(`  [ok] ${capture.id} -> ${fileName}`);
      } catch (error) {
        const failure = { id: template.id, name: template.name, category: template.category, status: 'failed', error: error?.message || String(error) };
        entries.push(failure);
        failures.push(failure);
        console.error(`  [failed] ${template.id}: ${failure.error}`);
      }
    }

    const manifest = {
      schemaVersion: 1,
      generator: 'scripts/build-template-thumbnails.mjs',
      generatorVersion: GENERATOR_VERSION,
      dimensions: { width: options.width, height: options.height },
      requestedFormat: options.format,
      registryCount: registry.length,
      selectedCount: selected.length,
      capturedCount: entries.filter((entry) => entry.status === 'ok').length,
      failedCount: failures.length,
      complete: !options.templateId && entries.length === registry.length && failures.length === 0,
      templates: entries,
    };
    fs.writeFileSync(path.join(outputDir, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[template-thumbnails] Wrote ${manifest.capturedCount} images and ${MANIFEST_NAME} in ${Date.now() - startedAt} ms.`);
    if (failures.length && !options.allowFailures) process.exitCode = 1;
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await vite.close().catch(() => {});
  }
}

await main();
