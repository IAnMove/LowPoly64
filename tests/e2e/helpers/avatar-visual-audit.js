import fs from 'node:fs';
import path from 'node:path';

export async function collectAvatarVisualAuditReport(page, options = {}) {
  return page.evaluate(async (auditOptions) => {
    const [
      { buildAvatarGroup },
      { createMoldAvatarRecipeFromBundle },
      { AVATAR_BODY_PRESETS, AVATAR_HEAD_MOLDS, AVATAR_MOLD_FEATURE_BUNDLES },
      { AVATAR_HEAD_MESH_MAP },
      { TEMPLATE_REGISTRY },
      { instantiateTemplateDefinition },
      { CHARACTER_MOLD_PROPORTIONS },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/data/avatar/catalog/head-meshes.js'),
      import('/src/modules/viewport/template-registry.js'),
      import('/src/modules/viewport/templates.js'),
      import('/src/data/templates/generated-character-molds.js'),
    ]);

    const includeAllBundles = auditOptions?.includeAllBundles !== false;
    const failures = [];
    const checked = [];

    const thresholds = Object.freeze({
      centerDistanceMax: 0.18,
      browEyeGapMin: -0.02,
      eyeNoseGapMin: 0,
      noseMouthGapMin: 0.015,
      mouthBottomMax: 0.9,
      earTopMin: 0.38,
      earTopMax: 0.46,
      eyeWidthMax: 0.8,
      browWidthMax: 1.08,
      noseWidthMax: 0.18,
      mouthWidthMax: 0.52,
      noseBackInsideMin: 0.005,
      crownPad: 0.1,
      bodyProportionTolerance: 0.1,
    });

    function pushFailure(caseId, metric, value, expected) {
      failures.push({
        caseId,
        metric,
        value: Number(value.toFixed(4)),
        ...expected,
      });
    }

    function expandBox(box, x, y, z) {
      const target = box || {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      };
      target.minX = Math.min(target.minX, x);
      target.maxX = Math.max(target.maxX, x);
      target.minY = Math.min(target.minY, y);
      target.maxY = Math.max(target.maxY, y);
      target.minZ = Math.min(target.minZ, z);
      target.maxZ = Math.max(target.maxZ, z);
      return target;
    }

    function summarizeBox(box) {
      if (!box || !Number.isFinite(box.minX)) return null;
      return {
        minX: box.minX,
        maxX: box.maxX,
        minY: box.minY,
        maxY: box.maxY,
        minZ: box.minZ,
        maxZ: box.maxZ,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY,
        depth: box.maxZ - box.minZ,
        centerX: (box.minX + box.maxX) * 0.5,
        centerY: (box.minY + box.maxY) * 0.5,
        centerZ: (box.minZ + box.maxZ) * 0.5,
      };
    }

    function expandMeshWorldBox(box, node) {
      if (!node.isMesh || !node.geometry?.getAttribute) return box;
      const positions = node.geometry.getAttribute('position');
      const matrix = node.matrixWorld.elements;
      for (let i = 0; i < positions.count; i += 1) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const wx = (matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z) + matrix[12];
        const wy = (matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z) + matrix[13];
        const wz = (matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z) + matrix[14];
        box = expandBox(box, wx, wy, wz);
      }
      return box;
    }

    function classifyMesh(node) {
      const name = String(node.parent?.name || node.name || '').toUpperCase();
      if (/(^|_)HEAD_BASE($|_)/.test(name)) return 'head';
      if (/(^|_)BROW(_|$)|(^|_)EYEBROW(_|$)/.test(name)) return 'brows';
      if (/(^|_)EYE(_|$)|(^|_)IRIS(_|$)|(^|_)PUPIL(_|$)/.test(name)) return 'eyes';
      if (/(^|_)NOSE(_|$)/.test(name)) return 'nose';
      if (/(^|_)MOUTH(_|$)|(^|_)TEETH(_|$)|(^|_)LIP(_|$)/.test(name)) return 'mouth';
      if (/(^|_)EAR(_|$)/.test(name)) return 'ears';
      return null;
    }

    function sideForMesh(node) {
      const name = String(node.parent?.name || node.name || '').toUpperCase();
      if (/(^|_)L($|_)/.test(name)) return 'Left';
      if (/(^|_)R($|_)/.test(name)) return 'Right';
      return null;
    }

    function measureGroup(group) {
      group.updateWorldMatrix(true, true);
      const boxes = {
        head: null,
        eyes: null,
        brows: null,
        nose: null,
        mouth: null,
        ears: null,
        eyeLeft: null,
        eyeRight: null,
        browLeft: null,
        browRight: null,
        earLeft: null,
        earRight: null,
      };

      group.traverse((node) => {
        const slot = classifyMesh(node);
        if (!slot) return;
        boxes[slot] = expandMeshWorldBox(boxes[slot], node);

        if (slot === 'eyes' || slot === 'brows' || slot === 'ears') {
          const side = sideForMesh(node);
          if (side) {
            boxes[`${slot.slice(0, -1)}${side}`] = expandMeshWorldBox(boxes[`${slot.slice(0, -1)}${side}`], node);
          }
        }
      });

      return Object.fromEntries(
        Object.entries(boxes).map(([key, box]) => [key, summarizeBox(box)])
      );
    }

    function canonicalBounds(vertices) {
      return vertices.reduce((acc, vertex) => {
        acc.minX = Math.min(acc.minX, vertex[0]);
        acc.maxX = Math.max(acc.maxX, vertex[0]);
        acc.minY = Math.min(acc.minY, vertex[1]);
        acc.maxY = Math.max(acc.maxY, vertex[1]);
        acc.minZ = Math.min(acc.minZ, vertex[2]);
        acc.maxZ = Math.max(acc.maxZ, vertex[2]);
        return acc;
      }, {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      });
    }

    function mapLandmarksToWorld(meshEntry, headBox) {
      const source = canonicalBounds(meshEntry.customGeometry.vertices || []);
      const sourceWidth = Math.max(source.maxX - source.minX, 0.0001);
      const sourceHeight = Math.max(source.maxY - source.minY, 0.0001);
      const sourceDepth = Math.max(source.maxZ - source.minZ, 0.0001);
      const result = {};
      Object.entries(meshEntry.landmarks || {}).forEach(([key, point]) => {
        const xRatio = (point[0] - source.minX) / sourceWidth;
        const yRatio = (point[1] - source.minY) / sourceHeight;
        const zRatio = (point[2] - source.minZ) / sourceDepth;
        result[key] = {
          x: headBox.minX + (xRatio * headBox.width),
          y: headBox.minY + (yRatio * headBox.height),
          z: headBox.minZ + (zRatio * headBox.depth),
        };
      });
      return result;
    }

    function distanceToLandmark(box, landmark, headHeight) {
      if (!box || !landmark) return Infinity;
      const distance = Math.hypot(
        box.centerX - landmark.x,
        box.centerY - landmark.y,
      );
      return (distance / Math.max(headHeight, 0.0001)) * 1.2;
    }

    function xDistanceToLandmark(box, landmark, headHeight) {
      if (!box || !landmark) return Infinity;
      return (Math.abs(box.centerX - landmark.x) / Math.max(headHeight, 0.0001)) * 1.2;
    }

    function checkFeatureBounds(caseId, featureKey, box, landmarks, headHeight) {
      if (!box) {
        pushFailure(caseId, `${featureKey}.present`, 0, { min: 1 });
        return;
      }
      const chin = landmarks.chin;
      const crown = landmarks.crown;
      if (chin && box.minY < chin.y - 0.000001) {
        pushFailure(caseId, `${featureKey}.belowChin`, ((chin.y - box.minY) / headHeight) * 1.2, { max: 0 });
      }
      if (crown && box.maxY > crown.y + (headHeight * (thresholds.crownPad / 1.2))) {
        pushFailure(caseId, `${featureKey}.aboveCrown`, ((box.maxY - crown.y) / headHeight) * 1.2, { max: thresholds.crownPad });
      }
    }

    function checkDistance(caseId, metric, box, landmark, headHeight, distanceFn = distanceToLandmark) {
      const distance = distanceFn(box, landmark, headHeight);
      if (distance > thresholds.centerDistanceMax) {
        pushFailure(caseId, metric, distance, { max: thresholds.centerDistanceMax });
      }
    }

    function findNodeBox(group, names) {
      const wanted = new Set(Array.isArray(names) ? names : [names]);
      let box = null;
      group.traverse((node) => {
        const parentName = node.parent?.userData?.name || node.parent?.name || '';
        const nodeName = node.userData?.name || node.name || '';
        if (!node.isMesh || !node.geometry || (!wanted.has(parentName) && !wanted.has(nodeName))) return;
        box = expandMeshWorldBox(box, node);
      });
      return summarizeBox(box);
    }

    function findAllMeshBox(group) {
      let box = null;
      group.traverse((node) => {
        box = expandMeshWorldBox(box, node);
      });
      return summarizeBox(box);
    }

    function unionBox(boxes) {
      const valid = boxes.filter(Boolean);
      if (!valid.length) return null;
      return summarizeBox(valid.reduce((acc, box) => {
        acc = expandBox(acc, box.minX, box.minY, box.minZ);
        acc = expandBox(acc, box.maxX, box.maxY, box.maxZ);
        return acc;
      }, null));
    }

    function average(values) {
      const finite = values.filter((value) => Number.isFinite(value));
      return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : NaN;
    }

    function measureMoldProportions(group) {
      group.updateWorldMatrix(true, true);
      const total = findAllMeshBox(group);
      const head = findNodeBox(group, 'HEAD');
      const torso = findNodeBox(group, 'TORSO');
      const armL = unionBox([findNodeBox(group, 'ARM_L'), findNodeBox(group, 'ARM_L_FOREARM')]);
      const armR = unionBox([findNodeBox(group, 'ARM_R'), findNodeBox(group, 'ARM_R_FOREARM')]);
      const legL = unionBox([findNodeBox(group, 'LEG_L'), findNodeBox(group, 'LEG_L_SHIN')]);
      const legR = unionBox([findNodeBox(group, 'LEG_R'), findNodeBox(group, 'LEG_R_SHIN')]);
      const handL = findNodeBox(group, 'HAND_L');
      const handR = findNodeBox(group, 'HAND_R');
      const footL = findNodeBox(group, 'FOOT_L');
      const footR = findNodeBox(group, 'FOOT_R');

      if (!total || !head || !torso || !armL || !armR || !legL || !legR || !handL || !handR || !footL || !footR) {
        return null;
      }

      return {
        totalHeight: total.height,
        headsHigh: total.height / Math.max(head.height, 0.0001),
        shoulderWidthInHeads: torso.width / Math.max(head.width, 0.0001),
        armLengthFraction: average([armL.height, armR.height]) / Math.max(total.height, 0.0001),
        legLengthFraction: average([legL.height, legR.height]) / Math.max(total.height, 0.0001),
        handHeightInHeads: average([handL.height, handR.height]) / Math.max(head.height, 0.0001),
        footLengthInHeads: average([footL.depth, footR.depth]) / Math.max(head.height, 0.0001),
      };
    }

    function checkBodyMetric(caseId, metric, actual, expected) {
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
        pushFailure(caseId, metric, Number.isFinite(actual) ? actual : -1, { expected });
        return;
      }
      const denominator = Math.max(Math.abs(expected), 0.0001);
      const drift = Math.abs(actual - expected) / denominator;
      if (drift > thresholds.bodyProportionTolerance) {
        pushFailure(caseId, metric, drift, {
          max: thresholds.bodyProportionTolerance,
          actual: Number(actual.toFixed(4)),
          expected: Number(expected.toFixed(4)),
        });
      }
    }

    function midpoint(left, right) {
      if (!left || !right) return null;
      return {
        x: (left.x + right.x) * 0.5,
        y: (left.y + right.y) * 0.5,
        z: (left.z + right.z) * 0.5,
      };
    }

    const bundlesForMold = (mold) => {
      if (includeAllBundles) return AVATAR_MOLD_FEATURE_BUNDLES;
      const defaultBundle = AVATAR_MOLD_FEATURE_BUNDLES.find((entry) => entry.id === mold.defaultFeatureBundleId)
        || AVATAR_MOLD_FEATURE_BUNDLES[0];
      return defaultBundle ? [defaultBundle] : [];
    };

    for (const mold of AVATAR_HEAD_MOLDS) {
      const meshEntry = AVATAR_HEAD_MESH_MAP[mold.headMeshId || mold.id];
      if (!meshEntry?.customGeometry || !meshEntry?.landmarks) {
        pushFailure(mold.id, 'head.landmarks', 0, { min: 1 });
        continue;
      }

      for (const bundle of bundlesForMold(mold)) {
        const recipe = createMoldAvatarRecipeFromBundle(bundle.id, {
          label: `Audit ${mold.id} ${bundle.id}`,
          bodyPresetId: 'psx_chibi',
          headMoldId: mold.id,
          accessoryIds: ['none'],
        });
        const group = await buildAvatarGroup(recipe);
        const boxes = measureGroup(group);
        const caseId = `${mold.id}/${bundle.id}`;
        const head = boxes.head;
        if (!head) {
          pushFailure(caseId, 'head.present', 0, { min: 1 });
          continue;
        }

        const headHeight = Math.max(head.height, 0.0001);
        const landmarks = mapLandmarksToWorld(meshEntry, head);

        const eyeMidpoint = midpoint(landmarks.eyeL, landmarks.eyeR);
        const earMidpoint = midpoint(landmarks.earL, landmarks.earR);
        const browTarget = eyeMidpoint
          ? { ...eyeMidpoint, y: boxes.brows?.centerY ?? eyeMidpoint.y }
          : null;

        checkDistance(caseId, 'eyes.landmarkDistance', boxes.eyes, eyeMidpoint, headHeight);
        checkDistance(caseId, 'brows.landmarkDistance', boxes.brows, browTarget, headHeight);
        checkDistance(caseId, 'nose.landmarkDistance', boxes.nose, landmarks.noseTip, headHeight);
        checkDistance(caseId, 'mouth.landmarkDistance', boxes.mouth, landmarks.mouth, headHeight);
        checkDistance(caseId, 'ears.landmarkDistance', boxes.ears, earMidpoint, headHeight, xDistanceToLandmark);

        ['eyes', 'brows', 'nose', 'mouth', 'ears'].forEach((featureKey) => {
          checkFeatureBounds(caseId, featureKey, boxes[featureKey], landmarks, headHeight);
        });

        const browEyeGap = (boxes.brows.minY - boxes.eyes.maxY) / headHeight;
        const eyeNoseGap = (boxes.eyes.minY - boxes.nose.maxY) / headHeight;
        const noseMouthGap = (boxes.nose.minY - boxes.mouth.maxY) / headHeight;
        const mouthBottom = (head.maxY - boxes.mouth.minY) / headHeight;
        const earTop = (head.maxY - boxes.ears.maxY) / headHeight;
        const eyeWidth = boxes.eyes.width / head.width;
        const browWidth = boxes.brows.width / head.width;
        const noseWidth = boxes.nose.width / head.width;
        const mouthWidth = boxes.mouth.width / head.width;
        const noseBackInside = head.maxZ - boxes.nose.minZ;

        if (browEyeGap < thresholds.browEyeGapMin) {
          pushFailure(caseId, 'browEyeGap', browEyeGap, { min: thresholds.browEyeGapMin });
        }
        if (eyeNoseGap < thresholds.eyeNoseGapMin) {
          pushFailure(caseId, 'eyeNoseGap', eyeNoseGap, { min: thresholds.eyeNoseGapMin });
        }
        if (noseMouthGap < thresholds.noseMouthGapMin) {
          pushFailure(caseId, 'noseMouthGap', noseMouthGap, { min: thresholds.noseMouthGapMin });
        }
        if (mouthBottom > thresholds.mouthBottomMax) {
          pushFailure(caseId, 'mouthBottom', mouthBottom, { max: thresholds.mouthBottomMax });
        }
        if (earTop < thresholds.earTopMin || earTop > thresholds.earTopMax) {
          pushFailure(caseId, 'earTop', earTop, { min: thresholds.earTopMin, max: thresholds.earTopMax });
        }
        if (eyeWidth > thresholds.eyeWidthMax) {
          pushFailure(caseId, 'eyeWidth', eyeWidth, { max: thresholds.eyeWidthMax });
        }
        if (browWidth > thresholds.browWidthMax) {
          pushFailure(caseId, 'browWidth', browWidth, { max: thresholds.browWidthMax });
        }
        if (noseWidth > thresholds.noseWidthMax) {
          pushFailure(caseId, 'noseWidth', noseWidth, { max: thresholds.noseWidthMax });
        }
        if (mouthWidth > thresholds.mouthWidthMax) {
          pushFailure(caseId, 'mouthWidth', mouthWidth, { max: thresholds.mouthWidthMax });
        }
        if (noseBackInside < thresholds.noseBackInsideMin) {
          pushFailure(caseId, 'noseBackInside', noseBackInside, { min: thresholds.noseBackInsideMin });
        }

        checked.push({
          caseId,
          browEyeGap: Number(browEyeGap.toFixed(4)),
          eyeNoseGap: Number(eyeNoseGap.toFixed(4)),
          noseMouthGap: Number(noseMouthGap.toFixed(4)),
          mouthBottom: Number(mouthBottom.toFixed(4)),
          earTop: Number(earTop.toFixed(4)),
          eyeWidth: Number(eyeWidth.toFixed(4)),
          browWidth: Number(browWidth.toFixed(4)),
          noseWidth: Number(noseWidth.toFixed(4)),
          mouthWidth: Number(mouthWidth.toFixed(4)),
          noseBackInside: Number(noseBackInside.toFixed(4)),
        });
      }
    }

    const bodyChecked = [];
    const bodyMetrics = [
      'totalHeight',
      'headsHigh',
      'shoulderWidthInHeads',
      'armLengthFraction',
      'legLengthFraction',
      'handHeightInHeads',
      'footLengthInHeads',
    ];

    for (const bodyPreset of AVATAR_BODY_PRESETS) {
      const moldId = bodyPreset.moldId;
      const caseId = `body/${moldId}`;
      const expected = CHARACTER_MOLD_PROPORTIONS[moldId];
      const template = TEMPLATE_REGISTRY.find((entry) => entry.id === moldId);
      if (!expected || !template) {
        pushFailure(caseId, 'body.template', 0, { min: 1 });
        continue;
      }

      const group = instantiateTemplateDefinition(template);
      const measured = measureMoldProportions(group);
      if (!measured) {
        pushFailure(caseId, 'body.measurement', 0, { min: 1 });
        continue;
      }

      for (const metric of bodyMetrics) {
        checkBodyMetric(caseId, metric, measured[metric], expected[metric]);
      }

      bodyChecked.push({
        caseId,
        ...Object.fromEntries(
          bodyMetrics.map((metric) => [metric, Number(measured[metric].toFixed(4))])
        ),
      });
    }

    return {
      thresholds,
      checkedCount: checked.length,
      bodyCheckedCount: bodyChecked.length,
      checked,
      bodyChecked,
      failureCount: failures.length,
      failures: failures.slice(0, 50),
    };
  }, options);
}

const AUDIT_CAPTURE_ROOT = path.join('.tmp-head-views', 'audit');

function sanitizePathPart(value) {
  return String(value || '')
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    || 'case';
}

export async function captureAvatarVisualAuditScreenshots(page, options = {}) {
  const root = options.root || AUDIT_CAPTURE_ROOT;
  const headDir = path.join(root, 'heads');
  const bodyDir = path.join(root, 'bodies');
  fs.mkdirSync(headDir, { recursive: true });
  fs.mkdirSync(bodyDir, { recursive: true });

  const cases = await page.evaluate(async (auditOptions) => {
    const [
      { buildAvatarGroup },
      { createMoldAvatarRecipe, createMoldAvatarRecipeFromBundle },
      { AVATAR_BODY_PRESETS, AVATAR_HEAD_MOLDS, AVATAR_MOLD_FEATURE_BUNDLES },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/data/avatar/catalog.js'),
    ]);

    const includeAllBundles = auditOptions?.includeAllBundles !== false;
    const headCases = [];
    for (const mold of AVATAR_HEAD_MOLDS) {
      const bundles = includeAllBundles
        ? AVATAR_MOLD_FEATURE_BUNDLES
        : [AVATAR_MOLD_FEATURE_BUNDLES.find((entry) => entry.id === mold.defaultFeatureBundleId) || AVATAR_MOLD_FEATURE_BUNDLES[0]].filter(Boolean);
      for (const bundle of bundles) {
        headCases.push({ type: 'head', moldId: mold.id, bundleId: bundle.id });
      }
    }

    const bodyCases = AVATAR_BODY_PRESETS.flatMap((preset) => ([
      { type: 'body', bodyPresetId: preset.id, view: 'front' },
      { type: 'body', bodyPresetId: preset.id, view: 'profile' },
    ]));

    async function buildCase(captureCase) {
      if (captureCase.type === 'head') {
        return buildAvatarGroup(createMoldAvatarRecipeFromBundle(captureCase.bundleId, {
          label: `Audit ${captureCase.moldId} ${captureCase.bundleId}`,
          bodyPresetId: 'psx_chibi',
          headMoldId: captureCase.moldId,
          accessoryIds: ['none'],
        }));
      }

      return buildAvatarGroup(createMoldAvatarRecipe({
        label: `Audit ${captureCase.bodyPresetId}`,
        bodyPresetId: captureCase.bodyPresetId,
        headMoldId: 'psx_mesh_portrait_normal_175',
        accessoryIds: ['none'],
        features: {
          hair: { presetId: 'bob_01' },
          eyes: { presetId: 'wide_01' },
          brows: { presetId: 'soft_01' },
          nose: { presetId: 'nose_soft_01' },
          mouth: { presetId: 'neutral_01' },
          ears: { presetId: 'ear_soft_01' },
        },
      }));
    }

    function expandBox(box, x, y, z) {
      const target = box || {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity,
      };
      target.minX = Math.min(target.minX, x);
      target.maxX = Math.max(target.maxX, x);
      target.minY = Math.min(target.minY, y);
      target.maxY = Math.max(target.maxY, y);
      target.minZ = Math.min(target.minZ, z);
      target.maxZ = Math.max(target.maxZ, z);
      return target;
    }

    function expandMeshWorldBox(box, node) {
      if (!node.isMesh || !node.geometry?.getAttribute) return box;
      const positions = node.geometry.getAttribute('position');
      const matrix = node.matrixWorld.elements;
      for (let i = 0; i < positions.count; i += 1) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        box = expandBox(
          box,
          (matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z) + matrix[12],
          (matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z) + matrix[13],
          (matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z) + matrix[14],
        );
      }
      return box;
    }

    function boxForGroup(group, captureCase) {
      group.updateWorldMatrix(true, true);
      const headNames = captureCase.type === 'head'
        ? new Set(group.userData?.slotMap?.HEAD || [])
        : null;
      let box = null;
      group.traverse((node) => {
        if (headNames) {
          const parentName = node.parent?.userData?.name || node.parent?.name || '';
          const nodeName = node.userData?.name || node.name || '';
          if (!headNames.has(parentName) && !headNames.has(nodeName)) return;
        }
        box = expandMeshWorldBox(box, node);
      });
      return box;
    }

    function frameGroup(group, captureCase) {
      const state = window.__LOWPOLY64_STATE__;
      for (const child of [...state.userObjects.children]) {
        state.userObjects.remove(child);
      }
      state.userObjects.add(group);
      const box = boxForGroup(group, captureCase);
      const center = {
        x: (box.minX + box.maxX) * 0.5,
        y: (box.minY + box.maxY) * 0.5,
        z: (box.minZ + box.maxZ) * 0.5,
      };
      const height = Math.max(box.maxY - box.minY, 1);
      const distance = height * (captureCase.type === 'head' ? 2.15 : 1.7);
      const view = captureCase.view || 'front';
      const offsets = {
        front: [0, -distance],
        profile: [-distance, 0],
      };
      const [dx, dz] = offsets[view] || offsets.front;
      state.orbitControls.minDistance = 0.5;
      state.camera.position.set(center.x + dx, center.y + (height * 0.08), center.z + dz);
      state.orbitControls.target.set(center.x, center.y, center.z);
      state.orbitControls.update();
    }

    window.__RETROVISOR_AUDIT_CAPTURE_CASES__ = [...headCases, ...bodyCases];
    window.__RETROVISOR_AUDIT_RENDER_CASE__ = async (index) => {
      const captureCase = window.__RETROVISOR_AUDIT_CAPTURE_CASES__[index];
      const group = await buildCase(captureCase);
      frameGroup(group, captureCase);
      return captureCase;
    };

    return window.__RETROVISOR_AUDIT_CAPTURE_CASES__;
  }, options);

  const viewport = page.locator('#viewport-container, canvas').first();
  const written = [];
  for (let index = 0; index < cases.length; index += 1) {
    const captureCase = await page.evaluate((caseIndex) => (
      window.__RETROVISOR_AUDIT_RENDER_CASE__(caseIndex)
    ), index);
    await page.waitForTimeout(150);
    const filename = captureCase.type === 'head'
      ? `${sanitizePathPart(captureCase.moldId)}_${sanitizePathPart(captureCase.bundleId)}.png`
      : `${sanitizePathPart(captureCase.bodyPresetId)}_${sanitizePathPart(captureCase.view)}.png`;
    const targetPath = path.join(captureCase.type === 'head' ? headDir : bodyDir, filename);
    await viewport.screenshot({ path: targetPath });
    written.push(targetPath);
  }

  return {
    root,
    count: written.length,
    headCount: cases.filter((entry) => entry.type === 'head').length,
    bodyCount: cases.filter((entry) => entry.type === 'body').length,
    files: written,
  };
}
