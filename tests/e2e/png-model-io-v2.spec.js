import { test, expect } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp } from './helpers/app.js';

test.describe.configure({ timeout: 120000 });

test('PNG recipe v2 preserves external metadata, persists compactly and exports MASK without editorial extras', async ({ page }) => {
  await bootstrapApp(page);
  await page.evaluate(() => window.openPngModelWorkbench());
  await page.locator('#png-model-example-fish').dispatchEvent('click');
  await expect(page.locator('#png-model-status')).toContainText('Ready', { timeout: 30000 });
  await page.locator('#png-model-confirm').dispatchEvent('click');
  await expect(page.locator('#png-model-modal')).toBeHidden();

  const result = await page.evaluate(async () => {
    const { state } = await import('/src/modules/shared/state.js');
    const { clonePngModelSnapshot, applyPngModelSnapshot } = await import('/src/modules/png-model/png-model.js');
    const {
      serializeGroupAsImportJSON,
      serializeScene,
      deserializeScene,
    } = await import('/src/modules/viewport/persistence.js');
    const { importObjectFromJSON } = await import('/src/modules/viewport/json-import.js');
    const { compileAnimation } = await import('/src/modules/animation/animation.js');
    const { exportGLBToBuffer, prepareObjectForGlbExport } = await import('/src/modules/viewport/export.js');

    const group = state.userObjects.children[0];
    const surface = group.children.find((node) => node.userData?.pngModelRole === 'surface');
    group.userData.agentId = 'rv_pngmodel_external';
    group.userData.integration = { channel: 'gameplay' };
    const animationDefinition = {
      name: 'PNG IDLE',
      duration: 1,
      tracks: [{
        target: 'EXTERNAL ATTACHMENT',
        property: 'rotation',
        keyframes: [
          { time: 0, value: [0, 0, 0] },
          { time: 1, value: [0, 0.2, 0] },
        ],
      }],
    };
    surface.userData.agentId = 'rv_pngmodel_surface';
    surface.userData.integration = { channel: 'surface-runtime' };
    const attachment = new surface.constructor(new surface.geometry.constructor(), surface.material.clone());
    attachment.name = 'EXTERNAL ATTACHMENT';
    attachment.userData = {
      name: 'EXTERNAL ATTACHMENT',
      agentId: 'rv_pngmodel_attachment',
      geometryType: 'cube',
      geometryParams: { width: 0.2, height: 0.2, depth: 0.2 },
    };
    group.add(attachment);
    group.userData.animations = [animationDefinition];
    group.userData.animationClips = [compileAnimation(animationDefinition, group)];

    const snapshot = clonePngModelSnapshot(group);
    snapshot.name = 'SNAPSHOT NAME';
    snapshot.userData.name = 'SNAPSHOT NAME';
    applyPngModelSnapshot(group, snapshot);
    const restoredSurface = group.children.find((node) => node.userData?.pngModelRole === 'surface');
    const restoredAttachment = group.children.find(
      (node) => node.userData?.name === 'EXTERNAL ATTACHMENT',
    );
    const snapshotPreservedRuntimeState = {
      attachmentIdentity: restoredAttachment === attachment,
      surfaceAgentId: restoredSurface?.userData?.agentId,
      animationClip: typeof group.userData.animationClips?.[0]?.clone === 'function',
      keyframeTrack: typeof group.userData.animationClips?.[0]?.tracks?.[0]?.clone === 'function',
    };

    const prepared = prepareObjectForGlbExport(group).object;
    const preparedShell = prepared.children.find((node) => node.userData?.pngModelRole === 'shell');
    const shellIndex = preparedShell.geometry.getIndex();
    const edgeCounts = new Map();
    for (let offset = 0; offset < shellIndex.count; offset += 3) {
      const triangle = [
        shellIndex.getX(offset),
        shellIndex.getX(offset + 1),
        shellIndex.getX(offset + 2),
      ];
      for (const [a, b] of [[triangle[0], triangle[1]], [triangle[1], triangle[2]], [triangle[2], triangle[0]]]) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
      }
    }
    const surfaceMaterial = preparedShell.material[0];
    const preparedMetadata = {
      rootAgentId: prepared.userData.agentId,
      hasSource: 'pngModelSource' in prepared.userData,
      hasGeometryParams: 'geometryParams' in preparedShell.userData,
      alphaTest: surfaceMaterial.alphaTest,
      transparent: surfaceMaterial.transparent,
      manifold: Array.from(edgeCounts.values()).every((count) => count === 2),
    };

    const scene = serializeScene();
    const compact = serializeGroupAsImportJSON(group);
    const serialized = scene.objects[0];
    const sceneText = JSON.stringify(scene);
    const embeddedImageCount = (sceneText.match(/data:image\//g) || []).length;

    const { buffer } = await exportGLBToBuffer('png-model-v2.glb');
    const view = new DataView(buffer);
    const jsonLength = view.getUint32(12, true);
    const jsonBytes = new Uint8Array(buffer, 20, jsonLength);
    const gltf = JSON.parse(new TextDecoder().decode(jsonBytes).replace(/\0+$/g, '').trim());
    const gltfText = JSON.stringify(gltf);

    const rejectsFutureVersion = async (field, value) => {
      const future = structuredClone(scene);
      future.objects[0][field] = value;
      try {
        await deserializeScene(future);
        return false;
      } catch {
        return true;
      }
    };
    const futureVersionRejected = await rejectsFutureVersion('pngModelVersion', 99);
    const futureAlgorithmRejected = await rejectsFutureVersion('pngModelAlgorithmVersion', 99);
    const legacyScene = structuredClone(scene);
    legacyScene.objects[0].pngModelVersion = 1;
    legacyScene.objects[0].pngModelAlgorithmVersion = 1;
    legacyScene.objects[0].pngModelSource.version = 1;
    legacyScene.objects[0].pngModelSettings.algorithmVersion = 1;
    await deserializeScene(legacyScene);
    const reloaded = state.userObjects.children[0];
    const reloadedSurface = reloaded.children.find((node) => node.userData?.pngModelRole === 'surface');
    const compactImport = await importObjectFromJSON(JSON.stringify(compact));
    const importedCompact = state.userObjects.children.at(-1);
    const importedSurface = importedCompact.children.find(
      (node) => node.userData?.pngModelRole === 'surface',
    );
    return {
      preservedGroupAgent: group.userData.agentId,
      preservedIntegration: group.userData.integration,
      snapshotPreservedRuntimeState,
      preparedMetadata,
      sceneVersion: scene.version,
      recipeOnly: serialized.pngModelRecipeOnly,
      childCount: serialized.children.length,
      compactAnimationCount: compact.animations?.length || 0,
      compactChildCount: compact.children?.length || 0,
      algorithmVersion: serialized.pngModelAlgorithmVersion,
      embeddedImageCount,
      futureVersionRejected,
      futureAlgorithmRejected,
      gltfAlphaModes: (gltf.materials || []).map((material) => material.alphaMode || 'OPAQUE'),
      gltfContainsDataUrl: gltfText.includes('data:image/'),
      gltfContainsGeometryParams: gltfText.includes('geometryParams'),
      reloadedEditable: !!reloaded.userData.pngModelSource?.dataURL,
      reloadedHasTexture: !!reloadedSurface?.material?.map,
      reloadedAlgorithmVersion: reloaded.userData.pngModelAlgorithmVersion,
      reloadedMigration: reloaded.userData.pngModelMigrations,
      reloadedAnimationCount: reloaded.userData.animations?.length || 0,
      reloadedSurfaceAgentId: reloadedSurface?.userData?.agentId,
      reloadedSurfaceIntegration: reloadedSurface?.userData?.integration,
      reloadedHasExternalAttachment: reloaded.children.some(
        (node) => node.userData?.name === 'EXTERNAL ATTACHMENT',
      ),
      compactImportSuccess: compactImport.success,
      compactImportedAnimationCount: importedCompact.userData.animations?.length || 0,
      compactImportedSurfaceAgentId: importedSurface?.userData?.agentId,
      compactImportedHasExternalAttachment: importedCompact.children.some(
        (node) => node.userData?.name === 'EXTERNAL ATTACHMENT',
      ),
    };
  });

  expect(result.preservedGroupAgent).toBe('rv_pngmodel_external');
  expect(result.preservedIntegration).toEqual({ channel: 'gameplay' });
  expect(result.snapshotPreservedRuntimeState).toEqual({
    attachmentIdentity: true,
    surfaceAgentId: 'rv_pngmodel_surface',
    animationClip: true,
    keyframeTrack: true,
  });
  expect(result.preparedMetadata).toMatchObject({
    rootAgentId: 'rv_pngmodel_external',
    hasSource: false,
    hasGeometryParams: false,
    transparent: false,
    manifold: true,
  });
  expect(result.preparedMetadata.alphaTest).toBeGreaterThan(0);
  expect(result.sceneVersion).toBe(2);
  expect(result.recipeOnly).toBe(true);
  expect(result.childCount).toBe(1);
  expect(result.compactAnimationCount).toBe(1);
  expect(result.compactChildCount).toBe(1);
  expect(result.algorithmVersion).toBe(2);
  expect(result.embeddedImageCount).toBe(1);
  expect(result.futureVersionRejected).toBe(true);
  expect(result.futureAlgorithmRejected).toBe(true);
  expect(result.gltfAlphaModes).toContain('MASK');
  expect(result.gltfContainsDataUrl).toBe(false);
  expect(result.gltfContainsGeometryParams).toBe(false);
  expect(result.reloadedEditable).toBe(true);
  expect(result.reloadedHasTexture).toBe(true);
  expect(result.reloadedAlgorithmVersion).toBe(2);
  expect(result.reloadedMigration).toContain('legacy-balanced-v2');
  expect(result.reloadedAnimationCount).toBe(1);
  expect(result.reloadedSurfaceAgentId).toBe('rv_pngmodel_surface');
  expect(result.reloadedSurfaceIntegration).toEqual({ channel: 'surface-runtime' });
  expect(result.reloadedHasExternalAttachment).toBe(true);
  expect(result.compactImportSuccess).toBe(true);
  expect(result.compactImportedAnimationCount).toBe(1);
  expect(result.compactImportedSurfaceAgentId).toBe('rv_pngmodel_surface');
  expect(result.compactImportedHasExternalAttachment).toBe(true);
  await assertNoPageErrors(page);
});
