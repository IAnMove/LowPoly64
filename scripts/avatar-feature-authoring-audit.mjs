import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const args = new Set(process.argv.slice(2));
const port = Number.parseInt(process.env.AVATAR_AUTHORING_AUDIT_PORT || '41911', 10);
const baseUrl = `http://127.0.0.1:${port}`;
const artifactRoot = path.resolve('artifacts', 'avatar-authoring');
const screenshotPath = path.join(artifactRoot, 'eyes-wide-baseline.png');

const EYES_BASELINE_PROBE = Object.freeze({
  id: 'eyes-wide-canonical-mold-baseline',
  featureFamily: 'eyes',
  baselinePresetId: 'wide_01',
  recipe: Object.freeze({
    label: 'Eyes Wide Baseline Probe',
    headBuildMode: 'mold',
    bodyPresetId: 'psx_chibi',
    headMoldId: 'psx_mesh_portrait_01',
    features: Object.freeze({
      hair: Object.freeze({ presetId: 'none_01' }),
      eyes: Object.freeze({ presetId: 'wide_01' }),
      brows: Object.freeze({ presetId: 'none_01' }),
      nose: Object.freeze({ presetId: 'nose_soft_01' }),
      mouth: Object.freeze({ presetId: 'neutral_01' }),
      ears: Object.freeze({ presetId: 'ear_soft_01' }),
    }),
    accessoryIds: Object.freeze(['none']),
    paletteId: 'warm_rose',
  }),
});

const EYES_BASELINE_THRESHOLDS = Object.freeze({
  centerXAbsMax: 0.045,
  widthMin: 0.32,
  widthMax: 0.82,
  heightMin: 0.045,
  heightMax: 0.2,
  verticalCenterMin: 0.4,
  verticalCenterMax: 0.7,
  spacingMin: 0.22,
  spacingMax: 0.62,
  frontOffsetMin: 0.02,
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const request = http.get(baseUrl, (response) => {
        response.resume();
        resolve();
      });
      request.on('error', () => {
        if (Date.now() - started > 120000) {
          reject(new Error(`Timed out waiting for Vite at ${baseUrl}`));
          return;
        }
        setTimeout(tick, 500);
      });
      request.setTimeout(1000, () => request.destroy());
    };
    tick();
  });
}

function startViteServer() {
  const server = spawn(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout?.on('data', (chunk) => {
    if (!args.has('--json')) process.stderr.write(chunk);
  });
  server.stderr?.on('data', (chunk) => {
    process.stderr.write(chunk);
  });
  return server;
}

function checkRange(failures, metric, value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    failures.push({
      metric,
      value,
      min,
      max,
    });
  }
}

function checkMinimum(failures, metric, value, min) {
  if (!Number.isFinite(value) || value < min) {
    failures.push({
      metric,
      value,
      min,
    });
  }
}

function buildFailures(metrics) {
  if (!metrics) {
    return [{ metric: 'metrics', value: null, required: 'available' }];
  }
  const failures = [];
  const thresholds = EYES_BASELINE_THRESHOLDS;
  checkRange(failures, 'centerXAbs', metrics.centerXAbs, 0, thresholds.centerXAbsMax);
  checkRange(failures, 'widthRatio', metrics.widthRatio, thresholds.widthMin, thresholds.widthMax);
  checkRange(failures, 'heightRatio', metrics.heightRatio, thresholds.heightMin, thresholds.heightMax);
  checkRange(failures, 'verticalCenterRatio', metrics.verticalCenterRatio, thresholds.verticalCenterMin, thresholds.verticalCenterMax);
  checkRange(failures, 'spacingRatio', metrics.spacingRatio, thresholds.spacingMin, thresholds.spacingMax);
  checkMinimum(failures, 'frontOffsetRatio', metrics.frontOffsetRatio, thresholds.frontOffsetMin);
  return failures;
}

async function applyProbeRecipe(page, recipe) {
  await page.evaluate(async () => {
    await window.openAvatarForge();
  });
  await page.waitForSelector('#avatar-forge-modal:not(.hidden)', { timeout: 30000 });
  await page.waitForTimeout(500);

  await page.locator('#avatar-body-select').selectOption(recipe.bodyPresetId);
  await page.locator('#avatar-head-mold-select').selectOption(recipe.headMoldId);
  await page.locator('#avatar-hair-select').selectOption(recipe.features.hair.presetId);
  await page.locator('#avatar-eye-select').selectOption(recipe.features.eyes.presetId);
  await page.locator('#avatar-brow-select').selectOption(recipe.features.brows.presetId);
  await page.locator('#avatar-nose-select').selectOption(recipe.features.nose.presetId);
  await page.locator('#avatar-mouth-select').selectOption(recipe.features.mouth.presetId);
  await page.locator('#avatar-ear-select').selectOption(recipe.features.ears.presetId);
  await page.locator('#avatar-accessory-select').selectOption(recipe.accessoryIds[0]);
  await page.locator('#avatar-palette-select').selectOption(recipe.paletteId);

  await page.waitForFunction(async () => {
    const {
      getAvatarForgeFeatureAuthoringDiagnostics,
      getAvatarForgePreviewDiagnostics,
    } = await import('/src/modules/avatar/avatar-ui.js');
    const diagnostics = getAvatarForgePreviewDiagnostics();
    const featureDiagnostics = getAvatarForgeFeatureAuthoringDiagnostics('eyes');
    return diagnostics.hasPreviewGroup
      && diagnostics.previewFocusMode === 'head'
      && featureDiagnostics.hasPreviewGroup
      && featureDiagnostics.metrics;
  }, null, { timeout: 30000 });
  await page.waitForTimeout(700);
}

async function measureProbe(page, probe) {
  return page.evaluate(async ({ featureFamily }) => {
    const {
      getAvatarForgeFeatureAuthoringDiagnostics,
      getAvatarForgePreviewDiagnostics,
    } = await import('/src/modules/avatar/avatar-ui.js');
    const featureDiagnostics = getAvatarForgeFeatureAuthoringDiagnostics(featureFamily);
    return {
      previewDiagnostics: getAvatarForgePreviewDiagnostics(),
      featureDiagnostics,
      slotNames: featureDiagnostics.slotNames,
      bounds: featureDiagnostics.bounds,
      metrics: featureDiagnostics.metrics,
    };
  }, probe);
}

async function main() {
  const server = startViteServer();
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch({
      args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      colorScheme: 'dark',
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOWPOLY64_READY__ && typeof window.openAvatarForge === 'function', null, {
      timeout: 45000,
    });

    await applyProbeRecipe(page, EYES_BASELINE_PROBE.recipe);
    await fs.mkdir(artifactRoot, { recursive: true });
    await page.locator('#avatar-preview-stage').screenshot({ path: screenshotPath });

    const measurement = await measureProbe(page, EYES_BASELINE_PROBE);
    const failures = buildFailures(measurement.metrics);
    const report = {
      probe: EYES_BASELINE_PROBE,
      thresholds: EYES_BASELINE_THRESHOLDS,
      ...measurement,
      screenshotPath,
      failureCount: failures.length,
      failures,
    };

    if (args.has('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Avatar feature authoring audit: ${EYES_BASELINE_PROBE.id}`);
      console.log(`Screenshot: ${screenshotPath}`);
      console.log(`Metrics: ${JSON.stringify(report.metrics)}`);
      console.log(`Failures: ${failures.length ? JSON.stringify(failures) : 'none'}`);
    }

    if (args.has('--strict') && failures.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
