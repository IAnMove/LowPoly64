export async function collectAvatarVisualAuditReport(page, options = {}) {
  return page.evaluate(async (auditOptions) => {
    const [
      { buildAvatarGroup },
      { createMoldAvatarRecipeFromBundle },
      { AVATAR_HEAD_MOLDS, AVATAR_MOLD_FEATURE_BUNDLES },
      { AVATAR_HEAD_MESH_MAP },
    ] = await Promise.all([
      import('/src/modules/avatar/avatar-builder.js'),
      import('/src/modules/avatar/avatar-recipe.js'),
      import('/src/data/avatar/catalog.js'),
      import('/src/data/avatar/catalog/head-meshes.js'),
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

    return {
      thresholds,
      checkedCount: checked.length,
      checked,
      failureCount: failures.length,
      failures: failures.slice(0, 50),
    };
  }, options);
}
