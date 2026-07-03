import { test } from '@playwright/test';
import {
  bootstrapApp,
  suppressKnownAvatarForgeWarnings,
} from './helpers/avatar-forge.js';

// Visual capture sweep for the avatar body molds: renders every body preset
// with a representative head, full body front and profile, into
// .tmp-head-views/bodies/. Run on demand with:
//   CAPTURE_BODIES=1 npx playwright test avatar-body-capture
test.describe.configure({ timeout: 600000 });

const BODY_PRESET_IDS = [
  'psx_chibi',
  'psx_heroic',
  'psx_slim',
  'psx_heavy',
  'n64_classic',
  'n64_round',
];

test('captures every body preset front and profile', async ({ page }) => {
  test.skip(!process.env.CAPTURE_BODIES, 'Set CAPTURE_BODIES=1 to run the visual capture sweep.');

  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  for (const bodyPresetId of BODY_PRESET_IDS) {
    for (const view of ['front', 'profile', 'three-quarter']) {
      await page.evaluate(async ({ presetId, viewName }) => {
        const state = window.__LOWPOLY64_STATE__;
        const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
          import('/src/modules/avatar/avatar-builder.js'),
          import('/src/modules/avatar/avatar-recipe.js'),
        ]);

        for (const child of [...state.userObjects.children]) {
          state.userObjects.remove(child);
        }

        const group = await buildAvatarGroup(createMoldAvatarRecipe({
          label: `Capture ${presetId}`,
          bodyPresetId: presetId,
          headMoldId: 'gen_head_heroic',
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
        state.userObjects.add(group);

        // Frame the whole body from its world bounding box, computed by hand
        // because `import('three')` is unavailable inside page.evaluate.
        group.updateWorldMatrix(true, true);
        const min = [Infinity, Infinity, Infinity];
        const max = [-Infinity, -Infinity, -Infinity];
        group.traverse((node) => {
          if (!node.isMesh || !node.geometry) return;
          node.geometry.computeBoundingBox();
          const bb = node.geometry.boundingBox;
          if (!bb) return;
          const e = node.matrixWorld.elements;
          for (let i = 0; i < 8; i += 1) {
            const x = i & 1 ? bb.max.x : bb.min.x;
            const y = i & 2 ? bb.max.y : bb.min.y;
            const z = i & 4 ? bb.max.z : bb.min.z;
            const wx = (e[0] * x) + (e[4] * y) + (e[8] * z) + e[12];
            const wy = (e[1] * x) + (e[5] * y) + (e[9] * z) + e[13];
            const wz = (e[2] * x) + (e[6] * y) + (e[10] * z) + e[14];
            min[0] = Math.min(min[0], wx); max[0] = Math.max(max[0], wx);
            min[1] = Math.min(min[1], wy); max[1] = Math.max(max[1], wy);
            min[2] = Math.min(min[2], wz); max[2] = Math.max(max[2], wz);
          }
        });
        const center = {
          x: (min[0] + max[0]) * 0.5,
          y: (min[1] + max[1]) * 0.5,
          z: (min[2] + max[2]) * 0.5,
        };
        const height = Math.max(max[1] - min[1], 1);
        const distance = height * 1.6;

        state.orbitControls.minDistance = 0.5;
        // The assembled avatar faces +Z in world space.
        const offsets = {
          front: [0, distance],
          profile: [-distance, 0],
          'three-quarter': [-distance * 0.7, distance * 0.7],
        };
        const [dx, dz] = offsets[viewName] || offsets.front;
        state.camera.position.set(center.x + dx, center.y + (height * 0.12), center.z + dz);
        state.orbitControls.target.set(center.x, center.y, center.z);
        state.orbitControls.update();
      }, { presetId: bodyPresetId, viewName: view });

      await page.waitForTimeout(400);
      await page.locator('#viewport-container, canvas').first().screenshot({
        path: `.tmp-head-views/bodies/${bodyPresetId}_${view}.png`,
      });
    }
  }
});
