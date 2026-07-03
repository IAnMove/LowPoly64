import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import {
  captureAvatarVisualAuditScreenshots,
  collectAvatarVisualAuditReport,
} from '../tests/e2e/helpers/avatar-visual-audit.js';

const HOST = '127.0.0.1';
const PORT = 41736;
const BASE_URL = `http://${HOST}:${PORT}/`;
const REPORT_PATH = path.join('.tmp-head-views', 'audit', 'nose-ear-report.json');
const CAPTURE_ROOT = path.join('.tmp-head-views', 'audit', 'nose-ear-captures');

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
    await waitForServer(BASE_URL);
    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    const report = await collectAvatarVisualAuditReport(page, {
      includeAllBundles: false,
      includeNoseEarSweep: true,
    });

    fs.rmSync(CAPTURE_ROOT, { recursive: true, force: true });
    const captureSummary = await captureAvatarVisualAuditScreenshots(page, {
      root: CAPTURE_ROOT,
      includeAllBundles: false,
      includeHeadBundleCases: false,
      includeBodyCases: false,
      includeNoseEarSweep: true,
    });

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify({
      thresholds: report.thresholds,
      noseEarCheckedCount: report.noseEarCheckedCount,
      noseEarChecked: report.noseEarChecked,
      failureCount: report.failureCount,
      failures: report.failures,
      captureRoot: captureSummary.root,
      captureCount: captureSummary.noseEarCount,
    }, null, 2));

    if (report.failureCount > 0) {
      console.error('Avatar nose/ear audit failed:');
      console.error(JSON.stringify({
        noseEarCheckedCount: report.noseEarCheckedCount,
        thresholds: report.thresholds,
        failures: report.failures,
        reportPath: REPORT_PATH,
        captureRoot: captureSummary.root,
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(
      `Avatar nose/ear audit passed (${report.noseEarCheckedCount} generated head x preset cases; `
      + `${captureSummary.noseEarCount} captures in ${captureSummary.root}; report in ${REPORT_PATH}).`
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
