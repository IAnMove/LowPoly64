import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { AVATAR_HAIR_PRESETS, AVATAR_HEAD_MOLDS } from '../src/data/avatar/catalog.js';
import { AVATAR_HEAD_MESH_MAP } from '../src/data/avatar/catalog/head-meshes.js';
import { buildHairHelmetGeometry, resolveHairHelmetStyle } from '../src/modules/avatar/hair-helmet.js';
import { captureAvatarVisualAuditScreenshots } from '../tests/e2e/helpers/avatar-visual-audit.js';

const HOST = '127.0.0.1';
const PORT = 41737;
const BASE_URL = `http://${HOST}:${PORT}/`;
const REPORT_PATH = path.join('.tmp-head-views', 'audit', 'hair-helmet-report.json');
const CAPTURE_ROOT = path.join('.tmp-head-views', 'audit', 'hair-helmet-captures');

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

function boundsForVertices(vertices) {
  return vertices.reduce((acc, vertex) => {
    acc.minX = Math.min(acc.minX, vertex[0]);
    acc.maxX = Math.max(acc.maxX, vertex[0]);
    acc.minY = Math.min(acc.minY, vertex[1]);
    acc.maxY = Math.max(acc.maxY, vertex[1]);
    acc.minZ = Math.min(acc.minZ, vertex[2]);
    acc.maxZ = Math.max(acc.maxZ, vertex[2]);
    return acc;
  }, {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
    minZ: Infinity,
    maxZ: -Infinity,
  });
}

function edgeKey(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function checkClosedTriangleMesh(label, geometry, failures) {
  const vertices = geometry?.vertices || [];
  const faces = geometry?.faces || [];
  if (!vertices.length || !faces.length) {
    failures.push({ caseId: label, metric: 'geometry.present', value: 0, min: 1 });
    return;
  }

  vertices.forEach((vertex, index) => {
    if (!Array.isArray(vertex) || vertex.length !== 3 || vertex.some((value) => !Number.isFinite(value))) {
      failures.push({ caseId: label, metric: 'vertex.finite', value: index, expected: 'finite xyz' });
    }
  });

  const edgeCounts = new Map();
  faces.forEach((face, index) => {
    if (!Array.isArray(face) || face.length !== 3) {
      failures.push({ caseId: label, metric: 'face.triangle', value: index, expected: 3 });
      return;
    }
    const unique = new Set(face);
    if (unique.size !== 3) {
      failures.push({ caseId: label, metric: 'face.degenerate', value: index, expected: '3 unique vertices' });
    }
    face.forEach((vertexIndex) => {
      if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= vertices.length) {
        failures.push({ caseId: label, metric: 'face.vertexIndex', value: vertexIndex, min: 0, max: vertices.length - 1 });
      }
    });
    for (let side = 0; side < 3; side += 1) {
      const key = edgeKey(face[side], face[(side + 1) % 3]);
      edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
    }
  });

  const badEdgeCounts = [...edgeCounts.values()].filter((count) => count !== 2);
  if (badEdgeCounts.length > 0) {
    failures.push({ caseId: label, metric: 'mesh.closedEdges', value: badEdgeCounts.length, max: 0 });
  }
}

function auditHairGeometry() {
  const generatedHeads = AVATAR_HEAD_MOLDS.filter((entry) => entry.generatedPresetId);
  const hairPresets = AVATAR_HAIR_PRESETS.filter((entry) => entry.id !== 'none_01');
  const failures = [];
  const checked = [];
  const styles = new Set();

  for (const mold of generatedHeads) {
    const mesh = AVATAR_HEAD_MESH_MAP[mold.headMeshId || mold.id];
    if (!mesh?.customGeometry?.vertices || !mesh?.customGeometry?.faces || !mesh?.landmarks) {
      failures.push({ caseId: mold.id, metric: 'head.geometry', value: 0, min: 1 });
      continue;
    }

    const headBounds = boundsForVertices(mesh.customGeometry.vertices);
    const headHeight = Math.max(headBounds.maxY - headBounds.minY, 0.0001);
    const chinY = mesh.landmarks.chin?.[1] ?? headBounds.minY;
    const hairlineY = mesh.landmarks.hairline?.[1] ?? (headBounds.minY + headHeight * 0.72);

    for (const hair of hairPresets) {
      const style = resolveHairHelmetStyle(hair.id);
      const caseId = `${mold.id}/${hair.id}`;
      if (!style?.id) {
        failures.push({ caseId, metric: 'style.resolved', value: 0, min: 1 });
        continue;
      }
      styles.add(style.id);

      const geometry = buildHairHelmetGeometry(mesh.customGeometry, mesh.landmarks, style);
      checkClosedTriangleMesh(caseId, geometry, failures);
      if (!geometry?.vertices?.length) continue;

      const hairBounds = boundsForVertices(geometry.vertices);
      const widthRatio = (hairBounds.maxX - hairBounds.minX) / Math.max(headBounds.maxX - headBounds.minX, 0.0001);
      const depthRatio = (hairBounds.maxZ - hairBounds.minZ) / Math.max(headBounds.maxZ - headBounds.minZ, 0.0001);
      const topPad = (hairBounds.maxY - headBounds.maxY) / headHeight;
      const bottomPastChin = (chinY - hairBounds.minY) / headHeight;
      const frontDrop = (hairlineY - hairBounds.minY) / headHeight;

      if (widthRatio < 0.72 || widthRatio > 1.5) {
        failures.push({ caseId, metric: 'widthRatio', value: Number(widthRatio.toFixed(4)), min: 0.72, max: 1.5 });
      }
      if (depthRatio < 0.55 || depthRatio > 1.8) {
        failures.push({ caseId, metric: 'depthRatio', value: Number(depthRatio.toFixed(4)), min: 0.55, max: 1.8 });
      }
      if (topPad < 0.005 || topPad > 0.35) {
        failures.push({ caseId, metric: 'topPad', value: Number(topPad.toFixed(4)), min: 0.005, max: 0.35 });
      }
      if (bottomPastChin > 0.24) {
        failures.push({ caseId, metric: 'bottomPastChin', value: Number(bottomPastChin.toFixed(4)), max: 0.24 });
      }
      const frontDropMin = style.backDrop === 'jaw' ? 0.2 : 0.06;
      if (frontDrop < frontDropMin || frontDrop > 1.1) {
        failures.push({ caseId, metric: 'frontDrop', value: Number(frontDrop.toFixed(4)), min: frontDropMin, max: 1.1 });
      }

      checked.push({
        caseId,
        styleId: style.id,
        vertices: geometry.vertices.length,
        faces: geometry.faces.length,
        widthRatio: Number(widthRatio.toFixed(4)),
        depthRatio: Number(depthRatio.toFixed(4)),
        topPad: Number(topPad.toFixed(4)),
        bottomPastChin: Number(bottomPastChin.toFixed(4)),
        frontDrop: Number(frontDrop.toFixed(4)),
      });
    }
  }

  return {
    headCount: generatedHeads.length,
    hairPresetCount: hairPresets.length,
    styleCount: styles.size,
    styles: [...styles].sort(),
    checkedCount: checked.length,
    checked,
    failureCount: failures.length,
    failures: failures.slice(0, 80),
  };
}

async function captureHairStyleSweep() {
  const vite = startVite();
  let viteOutput = '';
  vite.stdout.on('data', (chunk) => {
    viteOutput += chunk.toString();
  });
  vite.stderr.on('data', (chunk) => {
    viteOutput += chunk.toString();
  });

  let browser = null;
  try {
    await waitForServer(BASE_URL);
    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    fs.rmSync(CAPTURE_ROOT, { recursive: true, force: true });
    return await captureAvatarVisualAuditScreenshots(page, {
      root: CAPTURE_ROOT,
      includeAllBundles: false,
      includeHeadBundleCases: false,
      includeBodyCases: false,
      includeHairStyleSweep: true,
    });
  } catch (error) {
    if (viteOutput.trim()) {
      error.message += `\n\nVite output:\n${viteOutput.trim()}`;
    }
    throw error;
  } finally {
    await browser?.close().catch(() => {});
    if (!vite.killed) vite.kill();
  }
}

async function main() {
  const report = auditHairGeometry();
  let captureSummary = null;
  try {
    captureSummary = await captureHairStyleSweep();
  } catch (error) {
    report.failures.push({
      caseId: 'hair-captures',
      metric: 'capture.generated',
      value: 0,
      min: 1,
      message: error?.message || String(error),
    });
    report.failureCount += 1;
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify({
    ...report,
    captureRoot: captureSummary?.root || CAPTURE_ROOT,
    captureCount: captureSummary?.hairCount || 0,
  }, null, 2));

  if (report.failureCount > 0) {
    console.error('Avatar hair helmet audit failed:');
    console.error(JSON.stringify({
      headCount: report.headCount,
      hairPresetCount: report.hairPresetCount,
      styleCount: report.styleCount,
      checkedCount: report.checkedCount,
      captureCount: captureSummary?.hairCount || 0,
      failures: report.failures,
      reportPath: REPORT_PATH,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Avatar hair helmet audit passed (${report.checkedCount} generated head x hair preset cases, `
    + `${report.styleCount} styles; ${captureSummary?.hairCount || 0} style captures in ${captureSummary?.root || CAPTURE_ROOT}; `
    + `report in ${REPORT_PATH}).`
  );
}

await main();
