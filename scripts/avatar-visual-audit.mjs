import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import {
  captureAvatarVisualAuditScreenshots,
  collectAvatarVisualAuditReport,
} from '../tests/e2e/helpers/avatar-visual-audit.js';

const HOST = '127.0.0.1';
const PORT = 41734;
const BASE_URL = `http://${HOST}:${PORT}/`;
const FACE_DECAL_TIMEOUT_MS = 1000;
const AUDIT_ROOT = path.join('.tmp-head-views', 'audit');
const SPRITE_CONTACT_SOURCE = path.join('docs', 'avatar-sprites', 'h2.2-contact-sheet.png');
const SPRITE_CONTACT_TARGET = path.join(AUDIT_ROOT, 'sprites', 'h2.2-contact-sheet.png');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPhase(label, operation, timeoutMs) {
  const startedAt = Date.now();
  console.log(`[avatar-visual-audit] ${label}...`);
  let timeoutId = null;
  try {
    const result = await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
    console.log(`[avatar-visual-audit] ${label} done in ${Date.now() - startedAt}ms.`);
    return result;
  } catch (error) {
    console.error(`[avatar-visual-audit] ${label} failed after ${Date.now() - startedAt}ms.`);
    throw error;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
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

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${filePath} is not a PNG file.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function copySpriteContactSheet() {
  if (!fs.existsSync(SPRITE_CONTACT_SOURCE)) {
    throw new Error(`Missing avatar sprite contact sheet: ${SPRITE_CONTACT_SOURCE}`);
  }
  const dimensions = readPngDimensions(SPRITE_CONTACT_SOURCE);
  if (dimensions.width < 1 || dimensions.height < 1) {
    throw new Error(`Invalid avatar sprite contact sheet dimensions: ${dimensions.width}x${dimensions.height}`);
  }
  fs.mkdirSync(path.dirname(SPRITE_CONTACT_TARGET), { recursive: true });
  fs.copyFileSync(SPRITE_CONTACT_SOURCE, SPRITE_CONTACT_TARGET);
  return {
    source: SPRITE_CONTACT_SOURCE,
    target: SPRITE_CONTACT_TARGET,
    ...dimensions,
  };
}

async function main() {
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
    await runPhase('Vite startup', () => waitForServer(BASE_URL), 120000);
    browser = await runPhase('Chromium launch', () => chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    }), 30000);
    const page = await runPhase(
      'Audit page creation',
      () => browser.newPage({ viewport: { width: 1440, height: 960 } }),
      30000,
    );
    await runPhase(
      'Application load',
      () => page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 }),
      45000,
    );
    fs.rmSync(AUDIT_ROOT, { recursive: true, force: true });
    const auditOptions = {
      includeAllBundles: false,
      faceDecalTimeoutMs: FACE_DECAL_TIMEOUT_MS,
    };
    const report = await runPhase(
      'Geometry audit',
      () => collectAvatarVisualAuditReport(page, auditOptions),
      120000,
    );
    const captures = await runPhase(
      'Screenshot capture',
      () => captureAvatarVisualAuditScreenshots(page, auditOptions),
      180000,
    );
    const spriteContact = copySpriteContactSheet();
    const expectedHeadCaptures = report.checkedCount * 2;

    if (report.failureCount > 0) {
      console.error('Avatar visual audit failed:');
      console.error(JSON.stringify({
        checkedCount: report.checkedCount,
        thresholds: report.thresholds,
        failures: report.failures,
      }, null, 2));
      process.exitCode = 1;
      return;
    }
    if (captures.headCount !== expectedHeadCaptures) {
      console.error('Avatar visual audit failed:');
      console.error(JSON.stringify({
        checkedCount: report.checkedCount,
        expectedHeadCaptures,
        actualHeadCaptures: captures.headCount,
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(
      `Avatar visual audit passed (${report.checkedCount} head/bundle cases, `
      + `${report.bodyCheckedCount} body molds; ${captures.count} screenshots in ${captures.root}; `
      + `sprite contact ${spriteContact.width}x${spriteContact.height} in ${spriteContact.target}).`
    );
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
