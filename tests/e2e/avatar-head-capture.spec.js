import { test } from '@playwright/test';
import {
  bootstrapApp,
  suppressKnownAvatarForgeWarnings,
} from './helpers/avatar-forge.js';

// Visual capture sweep for the landmark-mounted heads: renders every generated
// head mold with a representative feature set, front and profile, into
// .tmp-head-views/avatars/. Run on demand with:
//   CAPTURE_HEADS=1 npx playwright test avatar-head-capture
test.describe.configure({ timeout: 600000 });

test('captures every head mold front and profile', async ({ page }) => {
  test.skip(!process.env.CAPTURE_HEADS, 'Set CAPTURE_HEADS=1 to run the visual capture sweep.');

  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const headMoldIds = await page.evaluate(async () => {
    const { GENERATED_HEAD_MOLDS } = await import('/src/data/avatar/catalog/head-molds.js');
    return GENERATED_HEAD_MOLDS.map((entry) => entry.id);
  });

  for (const headMoldId of headMoldIds) {
    for (const view of ['front', 'profile', 'back']) {
      await page.evaluate(async ({ moldId, viewName }) => {
        const state = window.__LOWPOLY64_STATE__;
        const [{ buildAvatarGroup }, { createMoldAvatarRecipe }] = await Promise.all([
          import('/src/modules/avatar/avatar-builder.js'),
          import('/src/modules/avatar/avatar-recipe.js'),
        ]);

        for (const child of [...state.userObjects.children]) {
          state.userObjects.remove(child);
        }

        const group = await buildAvatarGroup(createMoldAvatarRecipe({
          label: `Capture ${moldId}`,
          bodyPresetId: 'psx_chibi',
          headMoldId: moldId,
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

        // Frame the head: find HEAD pivot world position and aim the camera at it.
        group.updateWorldMatrix(true, true);
        let headNode = null;
        group.traverse((node) => {
          if (headNode) return;
          if ((node.userData?.name || node.name) === 'HEAD') headNode = node;
        });
        const matrix = (headNode || group).matrixWorld.elements;
        const target = { x: matrix[12], y: matrix[13] + 0.6, z: matrix[14] };

        state.orbitControls.minDistance = 0.5;
        // The assembled avatar faces +Z in world space.
        const offsets = {
          front: [0, 4.2],
          back: [0, -4.2],
          profile: [-4.2, 0],
        };
        const [dx, dz] = offsets[viewName] || offsets.front;
        state.camera.position.set(target.x + dx, target.y + 0.4, target.z + dz);
        state.orbitControls.target.set(target.x, target.y, target.z);
        state.orbitControls.update();
      }, { moldId: headMoldId, viewName: view });

      await page.waitForTimeout(400);
      await page.locator('#viewport-container, canvas').first().screenshot({
        path: `.tmp-head-views/avatars/${headMoldId}_${view}.png`,
      });
    }
  }
});
