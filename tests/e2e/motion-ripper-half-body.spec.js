import { test, expect } from '@playwright/test';
import { addTemplate, assertNoPageErrors, bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

const CAPTURE_JOINTS = [
  'PELVIS',
  'CHEST',
  'NECK',
  'HEAD',
  'CLAVICLE_L',
  'ARM_L_UPPER',
  'ARM_L_LOWER',
  'HAND_L',
  'CLAVICLE_R',
  'ARM_R_UPPER',
  'ARM_R_LOWER',
  'HAND_R',
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
];

const LOWER_BODY_CAPTURE_JOINTS = [
  'LEG_L_UPPER',
  'LEG_L_LOWER',
  'FOOT_L',
  'LEG_R_UPPER',
  'LEG_R_LOWER',
  'FOOT_R',
];

function buildRecordedFrame(time, { lowerBodyConfidence = 0.82, upperBodyConfidence = 0.92 } = {}) {
  const pose = {};
  for (const jointName of ['ROOT', ...CAPTURE_JOINTS]) {
    const isLowerBody = LOWER_BODY_CAPTURE_JOINTS.includes(jointName);
    pose[jointName] = {
      position: jointName === 'ROOT' ? [time * 2, 0, 0] : [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      confidence: jointName === 'ROOT'
        ? upperBodyConfidence
        : (isLowerBody ? lowerBodyConfidence : upperBodyConfidence),
    };
  }

  return {
    time,
    pose,
    capturedRig: null,
    landmarks: null,
  };
}

function buildHalfBodyFrames() {
  return [0, 0.1, 0.2, 0.3, 0.4].map((time, index) => buildRecordedFrame(time, {
    lowerBodyConfidence: index === 0 ? 0.72 : 0.16,
  }));
}

function buildFullBodyFrames() {
  return [0, 0.1, 0.2, 0.3, 0.4].map((time, index) => buildRecordedFrame(time, {
    lowerBodyConfidence: 0.78 - (index * 0.02),
  }));
}

async function inspectSyntheticCapture(page, payload, options = {}) {
  return page.evaluate(async (input) => {
    const motionRipper = await import('/src/modules/animation/motion-ripper-ui.js');
    motionRipper.__motionRipperHydrateCaptureForTests(input);
    return motionRipper.__motionRipperInspectCaptureForTests(input.inspectOptions || {});
  }, {
    ...payload,
    inspectOptions: options,
  });
}

test('detects half-body takes and lets the user freeze lower-body tracks into idle', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  const autoDetected = await inspectSyntheticCapture(page, {
    frames: buildHalfBodyFrames(),
  });
  expect(autoDetected.analysis.isHalfBodyDetected).toBe(true);
  expect(autoDetected.badgeVisible).toBe(true);
  expect(autoDetected.badgeText).toMatch(/HALF BODY|MEDIO CUERPO/);
  expect(autoDetected.freezeLowerBodyChecked).toBe(true);
  expect(autoDetected.canonicalTrackTargets).not.toEqual(expect.arrayContaining([
    'LEG_L_UPPER',
    'LEG_R_UPPER',
    'FOOT_L',
    'FOOT_R',
  ]));
  expect(autoDetected.canonicalTrackTargets).toContain('ROOT');

  const manualOff = await inspectSyntheticCapture(page, {
    frames: buildHalfBodyFrames(),
    freezeLowerBody: false,
    markFreezeAsManual: true,
  });
  expect(manualOff.analysis.isHalfBodyDetected).toBe(true);
  expect(manualOff.freezeLowerBodyChecked).toBe(false);
  expect(manualOff.suppressedCaptureJoints).toEqual([]);
  expect(manualOff.canonicalTrackTargets).toEqual(expect.arrayContaining([
    'LEG_L_UPPER',
    'LEG_R_UPPER',
    'FOOT_L',
    'FOOT_R',
    'ROOT',
  ]));

  const manualOn = await inspectSyntheticCapture(page, {
    frames: buildHalfBodyFrames(),
    freezeLowerBody: true,
    markFreezeAsManual: true,
  });
  expect(manualOn.analysis.isHalfBodyDetected).toBe(true);
  expect(manualOn.freezeLowerBodyChecked).toBe(true);
  expect(manualOn.suppressedCaptureJoints).toEqual(expect.arrayContaining(LOWER_BODY_CAPTURE_JOINTS));
  expect(manualOn.canonicalTrackTargets).not.toEqual(expect.arrayContaining([
    'LEG_L_UPPER',
    'LEG_R_UPPER',
    'FOOT_L',
    'FOOT_R',
  ]));
  expect(manualOn.canonicalTrackTargets).toContain('ROOT');

  await assertNoPageErrors(page);
});

test('does not flag full-body takes as half-body by default', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });

  const fullBody = await inspectSyntheticCapture(page, {
    frames: buildFullBodyFrames(),
  });
  expect(fullBody.analysis.isHalfBodyDetected).toBe(false);
  expect(fullBody.badgeVisible).toBe(false);
  expect(fullBody.freezeLowerBodyChecked).toBe(false);
  expect(fullBody.canonicalTrackTargets).toEqual(expect.arrayContaining([
    'LEG_L_UPPER',
    'LEG_R_UPPER',
    'FOOT_L',
    'FOOT_R',
    'ROOT',
  ]));

  await assertNoPageErrors(page);
});

test('reorients root motion when the source clip starts front, back or side-on', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false });
  await addTemplate(page, 'skeleton');

  const frames = [0, 0.1, 0.2].map((time) => buildRecordedFrame(time, {
    lowerBodyConfidence: 0.82,
    upperBodyConfidence: 0.94,
  }));
  frames[1].pose.ROOT.position = [1, 0, 0];
  frames[2].pose.ROOT.position = [2, 0, 0];

  const front = await inspectSyntheticCapture(page, {
    frames,
    captureFacing: 'front',
  }, {
    targetTemplateId: 'skeleton',
  });
  const back = await inspectSyntheticCapture(page, {
    frames,
    captureFacing: 'back',
  }, {
    targetTemplateId: 'skeleton',
  });
  const left = await inspectSyntheticCapture(page, {
    frames,
    captureFacing: 'left',
  }, {
    targetTemplateId: 'skeleton',
  });
  const right = await inspectSyntheticCapture(page, {
    frames,
    captureFacing: 'right',
  }, {
    targetTemplateId: 'skeleton',
  });

  expect(front.captureFacing).toBe('front');
  expect(back.captureFacing).toBe('back');
  expect(left.captureFacing).toBe('left');
  expect(right.captureFacing).toBe('right');

  expect(front.translatedRootValues[1][0]).toBeCloseTo(-1, 5);
  expect(front.translatedRootValues[1][2]).toBeCloseTo(0, 5);

  expect(back.translatedRootValues[1][0]).toBeCloseTo(1, 5);
  expect(back.translatedRootValues[1][2]).toBeCloseTo(0, 5);

  expect(left.translatedRootValues[1][0]).toBeCloseTo(0, 5);
  expect(left.translatedRootValues[1][2]).toBeCloseTo(1, 5);

  expect(right.translatedRootValues[1][0]).toBeCloseTo(0, 5);
  expect(right.translatedRootValues[1][2]).toBeCloseTo(-1, 5);

  await assertNoPageErrors(page);
});
