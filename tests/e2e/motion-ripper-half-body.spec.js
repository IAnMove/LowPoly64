import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp } from './helpers/app.js';

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
  for (const jointName of CAPTURE_JOINTS) {
    const isLowerBody = LOWER_BODY_CAPTURE_JOINTS.includes(jointName);
    pose[jointName] = {
      position: jointName === 'PELVIS' ? [time * 2, 0, 0] : [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      confidence: isLowerBody ? lowerBodyConfidence : upperBodyConfidence,
    };
  }

  return {
    time,
    pose,
    capturedRig: null,
    landmarks: null,
  };
}

function buildSyntheticCapturedRig(rootX = 0) {
  const rig = {
    PELVIS: [0, 2.55, 0],
    CHEST: [0, 3.95, 0],
    NECK: [0, 4.72, 0],
    HEAD: [0, 5.18, 0],
    CLAVICLE_L: [-0.34, 4.45, 0],
    ARM_L_UPPER: [-0.92, 4.18, 0],
    ARM_L_LOWER: [-1.42, 3.42, 0],
    HAND_L: [-1.64, 2.82, 0],
    CLAVICLE_R: [0.34, 4.45, 0],
    ARM_R_UPPER: [0.92, 4.18, 0],
    ARM_R_LOWER: [1.42, 3.42, 0],
    HAND_R: [1.64, 2.82, 0],
    LEG_L_UPPER: [-0.34, 1.76, 0],
    LEG_L_LOWER: [-0.36, 0.86, 0],
    FOOT_L: [-0.34, 0.12, 0.24],
    LEG_R_UPPER: [0.34, 1.76, 0],
    LEG_R_LOWER: [0.36, 0.86, 0],
    FOOT_R: [0.34, 0.12, 0.24],
  };

  return Object.fromEntries(
    Object.entries(rig).map(([jointName, value]) => [jointName, [value[0] + rootX, value[1], value[2]]])
  );
}

function buildSideCollapsedCapturedRig(rootX = 0) {
  const rig = buildSyntheticCapturedRig(rootX);
  const sidePairs = [
    ['CLAVICLE_L', 'CLAVICLE_R'],
    ['ARM_L_UPPER', 'ARM_R_UPPER'],
    ['ARM_L_LOWER', 'ARM_R_LOWER'],
    ['HAND_L', 'HAND_R'],
    ['LEG_L_UPPER', 'LEG_R_UPPER'],
    ['LEG_L_LOWER', 'LEG_R_LOWER'],
    ['FOOT_L', 'FOOT_R'],
  ];

  sidePairs.forEach(([leftName, rightName], index) => {
    const left = rig[leftName];
    const right = rig[rightName];
    const centerX = ((left?.[0] || 0) + (right?.[0] || 0)) * 0.5;
    const centerZ = ((left?.[2] || 0) + (right?.[2] || 0)) * 0.5;
    left[0] = centerX - 0.025;
    right[0] = centerX + 0.025;
    left[2] = centerZ - 0.05 - index * 0.006;
    right[2] = centerZ + 0.05 + index * 0.006;
  });

  return rig;
}

function buildSkinnedCaptureFrames() {
  return [0, 0.1, 0.2].map((time, index) => {
    const frame = buildRecordedFrame(time, {
      lowerBodyConfidence: 0.9,
      upperBodyConfidence: 0.95,
    });
    frame.pose.PELVIS.position = [index * 0.5, 0, 0];
    frame.pose.HAND_R.quaternion = quaternionFromX(index * 0.25);
    frame.capturedRig = buildSyntheticCapturedRig(index * 0.05);
    return frame;
  });
}

function buildSideCollapsedSkinnedCaptureFrames() {
  return [0, 0.1, 0.2].map((time, index) => {
    const frame = buildRecordedFrame(time, {
      lowerBodyConfidence: 0.9,
      upperBodyConfidence: 0.95,
    });
    frame.pose.PELVIS.position = [index * 0.45, 0, 0];
    frame.pose.ARM_R_UPPER.quaternion = quaternionFromX(index * 0.18);
    frame.pose.LEG_R_UPPER.quaternion = quaternionFromX(-index * 0.22);
    frame.capturedRig = buildSideCollapsedCapturedRig(index * 0.08);
    return frame;
  });
}

function buildLateralRunnerConstraintFrames() {
  return [0, 0.1, 0.2].map((time, index) => {
    const frame = buildRecordedFrame(time, {
      lowerBodyConfidence: 0.94,
      upperBodyConfidence: 0.96,
    });
    frame.pose.PELVIS.position = [index * 0.9, 0, 0];
    if (index === 1) {
      frame.pose.PELVIS.position[1] = 1.1;
      frame.pose.PELVIS.position[2] = 0.4;
    } else if (index === 2) {
      frame.pose.PELVIS.position[1] = -0.8;
      frame.pose.PELVIS.position[2] = -0.35;
    }
    frame.pose.ARM_R_UPPER.quaternion = quaternionFromEuler(0, index === 0 ? 0 : 1.8, 0);
    frame.pose.LEG_R_UPPER.quaternion = quaternionFromEuler(0, index === 0 ? 0 : 2.2, 0);
    frame.pose.FOOT_R.quaternion = quaternionFromEuler(0, index === 0 ? 0 : 1.4, 0);
    frame.capturedRig = buildSideCollapsedCapturedRig(index * 0.08);
    return frame;
  });
}

function spanBetween(result, leftName, rightName, axisIndex = 0) {
  return spanBetweenPositions(result.boneWorldPositions, leftName, rightName, axisIndex);
}

function spanBetweenPositions(positions, leftName, rightName, axisIndex = 0) {
  const left = positions?.[leftName];
  const right = positions?.[rightName];
  if (!Array.isArray(left) || !Array.isArray(right)) return 0;
  return Math.abs((right[axisIndex] || 0) - (left[axisIndex] || 0));
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

function quaternionFromX(angle) {
  return [Math.sin(angle / 2), 0, 0, Math.cos(angle / 2)];
}

function quaternionFromEuler(x = 0, y = 0, z = 0) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return [
    (s1 * c2 * c3) + (c1 * s2 * s3),
    (c1 * s2 * c3) - (s1 * c2 * s3),
    (c1 * c2 * s3) + (s1 * s2 * c3),
    (c1 * c2 * c3) - (s1 * s2 * s3),
  ];
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
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

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
  expect(autoDetected.canonicalTrackTargets).toContain('PELVIS');

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
    'PELVIS',
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
  expect(manualOn.canonicalTrackTargets).toContain('PELVIS');

  await assertNoPageErrors(page);
});

test('uses an explicit neutral pose instead of forcing the first recorded frame to identity', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

  const frames = [0, 0.1, 0.2].map((time) => buildRecordedFrame(time, {
    lowerBodyConfidence: 0.82,
    upperBodyConfidence: 0.94,
  }));
  frames[0].pose.CHEST.quaternion = quaternionFromX(0.6);
  frames[1].pose.CHEST.quaternion = quaternionFromX(0.8);
  frames[2].pose.CHEST.quaternion = quaternionFromX(0.6);

  const defaultFirstFrameRest = await inspectSyntheticCapture(page, { frames }, { rotationTarget: 'CHEST' });
  expect(defaultFirstFrameRest.canonicalRotationValues[0][0]).toBeCloseTo(0, 5);
  expect(defaultFirstFrameRest.canonicalRotationValues[1][0]).toBeCloseTo(0.2, 5);

  const neutralPose = JSON.parse(JSON.stringify(frames[0].pose));
  neutralPose.CHEST.quaternion = [0, 0, 0, 1];

  const explicitNeutral = await inspectSyntheticCapture(page, {
    frames,
    restPose: neutralPose,
  }, { rotationTarget: 'CHEST' });
  expect(explicitNeutral.canonicalRotationValues[0][0]).toBeCloseTo(0.6, 5);
  expect(explicitNeutral.canonicalRotationValues[1][0]).toBeCloseTo(0.8, 5);

  await assertNoPageErrors(page);
});

test('does not flag full-body takes as half-body by default', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

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
    'PELVIS',
  ]));

  await assertNoPageErrors(page);
});

test('reorients root motion when the source clip starts front, back or side-on', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });
  await page.evaluate(async () => {
    const { state } = await import('/src/modules/shared/state.js');
    const { TEMPLATE_REGISTRY } = await import('/src/modules/viewport/template-registry.js');
    const { instantiateTemplateDefinition } = await import('/src/modules/viewport/templates.js');
    const skeletonDef = TEMPLATE_REGISTRY.find((template) => template.id === 'skeleton');
    if (!skeletonDef) throw new Error('Skeleton template definition not found');
    const group = instantiateTemplateDefinition(skeletonDef);
    state.userObjects = state.userObjects || { children: [] };
    state.userObjects.children = [group];
  });

  const frames = [0, 0.1, 0.2].map((time) => buildRecordedFrame(time, {
    lowerBodyConfidence: 0.82,
    upperBodyConfidence: 0.94,
  }));
  frames[1].pose.PELVIS.position = [1, 0, 0];
  frames[2].pose.PELVIS.position = [2, 0, 0];

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

  const frontMagnitude = Math.abs(front.translatedRootValues[1][0]);
  expect(frontMagnitude).toBeGreaterThan(0.1);
  expect(front.translatedRootValues[1][0]).toBeLessThan(0);
  expect(front.translatedRootValues[1][2]).toBeCloseTo(0, 5);

  expect(back.translatedRootValues[1][0]).toBeCloseTo(frontMagnitude, 5);
  expect(back.translatedRootValues[1][2]).toBeCloseTo(0, 5);

  expect(left.translatedRootValues[1][0]).toBeCloseTo(0, 5);
  expect(left.translatedRootValues[1][2]).toBeGreaterThan(0.05);
  expect(left.translatedRootValues[1][2]).toBeLessThanOrEqual(frontMagnitude);

  expect(right.translatedRootValues[1][0]).toBeCloseTo(0, 5);
  expect(right.translatedRootValues[1][2]).toBeLessThan(-0.05);
  expect(Math.abs(right.translatedRootValues[1][2])).toBeLessThanOrEqual(frontMagnitude);

  await assertNoPageErrors(page);
});

test('builds video-created capture models as real skinned skeletons', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

  const result = await page.evaluate(async (frames) => {
    const motionRipper = await import('/src/modules/animation/motion-ripper-ui.js');
    return motionRipper.__motionRipperBuildSkinnedCaptureCharacterForTests({
      frames,
      captureFacing: 'front',
      freezeLowerBody: false,
      markFreezeAsManual: true,
    });
  }, buildSkinnedCaptureFrames());

  expect(result.skeletonId).toBe('HUMANOID_CAPTURE');
  expect(result.humanoidRigMode).toBe('capture-skinned');
  expect(result.generatedFrom).toBe('motion-ripper-video-skinned');
  expect(result.hasSkinnedMesh).toBe(true);
  expect(result.boneNames).toEqual(expect.arrayContaining([
    'PELVIS',
    'CHEST',
    'HAND_R',
    'FOOT_L',
    'FOOT_R',
  ]));
  expect(result.skinIndexItemSize).toBe(4);
  expect(result.skinWeightItemSize).toBe(4);
  expect(result.vertexCount).toBeGreaterThan(0);
  expect(result.trackTargets).toEqual(expect.arrayContaining(['PELVIS', 'CHEST', 'HAND_R']));
  expect(result.trackTargets).not.toContain('STAFF');
  expect(result.rootValues.length).toBe(3);
  expect(result.rootValues[1][0]).not.toBeCloseTo(result.rootValues[0][0], 5);
  expect(result.clipCount).toBe(1);
  expect(result.serializedType).toBe('skinned-capture');

  await assertNoPageErrors(page);
});

test('widens side-view generated capture rigs instead of preserving a flat silhouette', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

  const result = await page.evaluate(async (frames) => {
    const motionRipper = await import('/src/modules/animation/motion-ripper-ui.js');
    return motionRipper.__motionRipperBuildSkinnedCaptureCharacterForTests({
      frames,
      captureFacing: 'right',
      freezeLowerBody: false,
      markFreezeAsManual: true,
    });
  }, buildSideCollapsedSkinnedCaptureFrames());

  expect(result.hasSkinnedMesh).toBe(true);
  expect(spanBetweenPositions(result.sourceSkeletonWorldPositions, 'ARM_L_UPPER', 'ARM_R_UPPER')).toBeGreaterThan(0.07);
  expect(spanBetweenPositions(result.sourceSkeletonWorldPositions, 'LEG_L_UPPER', 'LEG_R_UPPER')).toBeGreaterThan(0.04);
  expect(spanBetween(result, 'ARM_L_UPPER', 'ARM_R_UPPER')).toBeGreaterThan(1.0);
  expect(spanBetween(result, 'CLAVICLE_L', 'CLAVICLE_R')).toBeGreaterThan(0.7);
  expect(spanBetween(result, 'LEG_L_UPPER', 'LEG_R_UPPER')).toBeGreaterThan(0.55);
  expect(spanBetween(result, 'HAND_L', 'HAND_R')).toBeGreaterThan(0.8);

  await assertNoPageErrors(page);
});

test('applies lateral-runner rotation limits and foot locking to side captures', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false, requireBindings: false, requireRuntime: false });

  const result = await page.evaluate(async (frames) => {
    const motionRipper = await import('/src/modules/animation/motion-ripper-ui.js');
    return motionRipper.__motionRipperBuildSkinnedCaptureCharacterForTests({
      frames,
      captureFacing: 'right',
      freezeLowerBody: false,
      markFreezeAsManual: true,
    });
  }, buildLateralRunnerConstraintFrames());

  expect(result.constraints?.profile).toBe('lateral-runner');
  expect(result.constraints?.footLock).toBe(true);
  expect(result.constraints?.rotationLimits).toBe(true);
  expect(result.constraints?.rootMotionLimits).toBe(true);

  const maxLegTwist = Math.max(...result.legUpperRotationValues.map((value) => Math.abs(value?.[1] || 0)));
  const maxArmTwist = Math.max(...result.armUpperRotationValues.map((value) => Math.abs(value?.[1] || 0)));
  const maxFootTwist = Math.max(...result.footRotationValues.map((value) => Math.abs(value?.[1] || 0)));
  expect(maxLegTwist).toBeLessThanOrEqual(0.58 + 0.001);
  expect(maxArmTwist).toBeLessThanOrEqual(0.95 + 0.001);
  expect(maxFootTwist).toBeLessThanOrEqual(0.5 + 0.001);

  const rawFirstStep = Math.abs(result.canonicalRootValues[1][0] - result.canonicalRootValues[0][0]);
  const rawSecondStep = Math.abs(result.canonicalRootValues[2][0] - result.canonicalRootValues[0][0]);
  expect(rawFirstStep).toBeLessThan(0.45);
  expect(rawSecondStep).toBeLessThan(0.55);
  const rootYValues = result.canonicalRootValues.map((value) => value[1] || 0);
  const rootZValues = result.canonicalRootValues.map((value) => value[2] || 0);
  expect(Math.max(...rootYValues) - Math.min(...rootYValues)).toBeLessThan(0.12);
  expect(Math.max(...rootZValues) - Math.min(...rootZValues)).toBeLessThan(0.12);

  const translatedFirstStep = Math.hypot(
    result.rootValues[1][0] - result.rootValues[0][0],
    result.rootValues[1][2] - result.rootValues[0][2]
  );
  expect(translatedFirstStep).toBeLessThan(0.45);

  await assertNoPageErrors(page);
});
