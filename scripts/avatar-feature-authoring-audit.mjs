import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const args = new Set(process.argv.slice(2));
const featureArg = process.argv.find((arg) => arg.startsWith('--feature='));
const requestedFeature = featureArg?.slice('--feature='.length) || 'eyes';
const port = Number.parseInt(process.env.AVATAR_AUTHORING_AUDIT_PORT || '41911', 10);
const baseUrl = `http://127.0.0.1:${port}`;
const artifactRoot = path.resolve('artifacts', 'avatar-authoring');

const EYES_BASELINE_PROBE = Object.freeze({
  id: 'eyes-wide-canonical-mold-baseline',
  featureFamily: 'eyes',
  baselinePresetId: 'wide_01',
  recipe: Object.freeze({
    label: 'Eyes Wide Baseline Probe',
    headBuildMode: 'mold',
    bodyPresetId: 'psx_chibi',
    headMoldId: 'gen_head_heroic',
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

const MOUTH_BASELINE_PROBE = Object.freeze({
  id: 'mouth-image2-small-hero-canonical-mold-baseline',
  featureFamily: 'mouth',
  baselinePresetId: 'image2_small_hero_smile_01',
  recipe: Object.freeze({
    label: 'Image2 Mouth Baseline Probe',
    headBuildMode: 'mold',
    bodyPresetId: 'psx_chibi',
    headMoldId: 'gen_head_heroic',
    features: Object.freeze({
      hair: Object.freeze({ presetId: 'none_01' }),
      eyes: Object.freeze({ presetId: 'image2_hero_oval_01' }),
      brows: Object.freeze({ presetId: 'image2_hero_flat_01' }),
      nose: Object.freeze({ presetId: 'nose_soft_01' }),
      mouth: Object.freeze({ presetId: 'image2_small_hero_smile_01' }),
      ears: Object.freeze({ presetId: 'ear_soft_01' }),
    }),
    accessoryIds: Object.freeze(['none']),
    paletteId: 'warm_rose',
  }),
});

const MOUTH_BASELINE_THRESHOLDS = Object.freeze({
  centerXAbsMax: 0.045,
  widthMin: 0.06,
  widthMax: 0.42,
  heightMin: 0.015,
  heightMax: 0.2,
  verticalCenterMin: 0.08,
  verticalCenterMax: 0.45,
  frontOffsetMin: 0.01,
  eyeMouthGapMin: 0.05,
});

const PROBE_BY_FEATURE = Object.freeze({
  eyes: Object.freeze({ probe: EYES_BASELINE_PROBE, thresholds: EYES_BASELINE_THRESHOLDS }),
  mouth: Object.freeze({ probe: MOUTH_BASELINE_PROBE, thresholds: MOUTH_BASELINE_THRESHOLDS }),
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

function buildFailures(featureFamily, metrics, thresholds) {
  if (!metrics) {
    return [{ metric: 'metrics', value: null, required: 'available' }];
  }
  const failures = [];
  checkRange(failures, 'centerXAbs', metrics.centerXAbs, 0, thresholds.centerXAbsMax);
  checkRange(failures, 'widthRatio', metrics.widthRatio, thresholds.widthMin, thresholds.widthMax);
  checkRange(failures, 'heightRatio', metrics.heightRatio, thresholds.heightMin, thresholds.heightMax);
  checkRange(failures, 'verticalCenterRatio', metrics.verticalCenterRatio, thresholds.verticalCenterMin, thresholds.verticalCenterMax);
  if (featureFamily === 'eyes') {
    checkRange(failures, 'spacingRatio', metrics.spacingRatio, thresholds.spacingMin, thresholds.spacingMax);
  }
  checkMinimum(failures, 'frontOffsetRatio', metrics.frontOffsetRatio, thresholds.frontOffsetMin);
  if (featureFamily === 'mouth') {
    checkMinimum(failures, 'eyeMouthGapRatio', metrics.eyeMouthGapRatio, thresholds.eyeMouthGapMin);
  }
  return failures;
}

async function applyProbeRecipe(page, probe) {
  const { recipe, featureFamily } = probe;
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

  await page.waitForFunction(async (activeFeatureFamily) => {
    const {
      getAvatarForgeFeatureAuthoringDiagnostics,
      getAvatarForgePreviewDiagnostics,
    } = await import('/src/modules/avatar/avatar-ui.js');
    const diagnostics = getAvatarForgePreviewDiagnostics();
    const featureDiagnostics = getAvatarForgeFeatureAuthoringDiagnostics(activeFeatureFamily);
    return diagnostics.hasPreviewGroup
      && diagnostics.previewFocusMode === 'head'
      && featureDiagnostics.hasPreviewGroup
      && featureDiagnostics.metrics;
  }, featureFamily, { timeout: 30000 });
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

async function auditMouthVariants(page, thresholds) {
  const presetIds = await page.evaluate(async () => {
    const { AVATAR_MOUTH_PRESETS } = await import('/src/data/avatar/catalog/mouth-presets.js');
    return AVATAR_MOUTH_PRESETS
      .map((preset) => preset.id)
      .filter((id) => id.startsWith('image2_'));
  });
  const variantRoot = path.join(artifactRoot, 'mouth-image2-variants');
  await fs.mkdir(variantRoot, { recursive: true });

  const reports = [];
  for (const presetId of presetIds) {
    await page.locator('#avatar-mouth-select').selectOption(presetId);
    await page.waitForFunction(async (expectedPresetId) => {
      const { getAvatarForgeFeatureAuthoringDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
      const diagnostics = getAvatarForgeFeatureAuthoringDiagnostics('mouth');
      return diagnostics.featurePresetId === expectedPresetId && diagnostics.metrics;
    }, presetId, { timeout: 30000 });

    const featureDiagnostics = await page.evaluate(async () => {
      const { getAvatarForgeFeatureAuthoringDiagnostics } = await import('/src/modules/avatar/avatar-ui.js');
      return getAvatarForgeFeatureAuthoringDiagnostics('mouth');
    });
    const screenshotPath = path.join(variantRoot, `${presetId}.png`);
    await page.locator('#avatar-preview-stage').screenshot({ path: screenshotPath });
    reports.push({
      presetId,
      metrics: featureDiagnostics.metrics,
      screenshotPath,
      failures: buildFailures('mouth', featureDiagnostics.metrics, thresholds),
    });
  }

  return reports;
}

async function main() {
  const selected = PROBE_BY_FEATURE[requestedFeature];
  if (!selected) {
    throw new Error(`Unsupported feature ${requestedFeature}. Expected one of: ${Object.keys(PROBE_BY_FEATURE).join(', ')}`);
  }
  const { probe, thresholds } = selected;
  const screenshotPath = path.join(artifactRoot, `${probe.id}.png`);
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

    await applyProbeRecipe(page, probe);
    await fs.mkdir(artifactRoot, { recursive: true });
    await page.locator('#avatar-preview-stage').screenshot({ path: screenshotPath });

    const measurement = await measureProbe(page, probe);
    const failures = buildFailures(probe.featureFamily, measurement.metrics, thresholds);
    const variantReports = probe.featureFamily === 'mouth'
      ? await auditMouthVariants(page, thresholds)
      : [];
    const variantFailures = variantReports.flatMap((variant) => variant.failures.map((failure) => ({
      presetId: variant.presetId,
      ...failure,
    })));
    const report = {
      probe,
      thresholds,
      ...measurement,
      screenshotPath,
      variantCount: variantReports.length,
      variants: variantReports,
      failureCount: failures.length + variantFailures.length,
      failures: [...failures, ...variantFailures],
    };

    if (args.has('--json')) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`Avatar feature authoring audit: ${probe.id}`);
      console.log(`Screenshot: ${screenshotPath}`);
      console.log(`Metrics: ${JSON.stringify(report.metrics)}`);
      console.log(`Variants: ${variantReports.length}`);
      console.log(`Failures: ${report.failures.length ? JSON.stringify(report.failures) : 'none'}`);
    }

    if (args.has('--strict') && report.failureCount > 0) {
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
