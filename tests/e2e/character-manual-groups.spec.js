import { test, expect } from '@playwright/test';
import { bootstrapApp, assertNoPageErrors } from './helpers/app.js';

test.describe.configure({ timeout: 180000 });

test('manual groups under a humanoid pivot preserve all meshes, transforms and recipe metadata through JSON import', async ({ page }) => {
  await bootstrapApp(page, '/', { requireEditorModals: false });
  const report = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { buildRetroCharacterGroup } = await import('/src/modules/character-studio/character-studio.js');
    const { serializeGroupAsImportJSON } = await import('/src/modules/viewport/persistence.js');
    const { importObjectFromJSON } = await import('/src/modules/viewport/json-import.js');
    const state = window.__LOWPOLY64_STATE__;
    state.userObjects.clear();
    const group = buildRetroCharacterGroup({ style: 'n64', name: 'Manual group fixture' });
    const torso = group.getObjectByName('TORSO');
    if (!torso) throw new Error('TORSO pivot missing from humanoid fixture.');

    const manual = new THREE.Group();
    manual.name = 'MANUAL_GROUP';
    manual.userData.name = 'MANUAL_GROUP';
    manual.position.set(0.23, 0.41, -0.17);
    manual.rotation.set(0.17, -0.23, 0.11);
    manual.scale.set(1.27, 0.82, 1.11);
    const first = new THREE.Mesh(
      new THREE.BoxGeometry(0.31, 0.48, 0.22),
      new THREE.MeshBasicMaterial({ color: '#ef6a4a' }),
    );
    first.name = 'MANUAL_GROUP_BOX';
    first.userData.name = first.name;
    first.position.set(0.18, 0.32, 0.12);
    first.rotation.set(-0.09, 0.21, 0.06);
    first.scale.set(0.8, 1.25, 0.9);
    const second = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#49a7e8' }),
    );
    second.name = 'MANUAL_GROUP_SPHERE';
    second.userData.name = second.name;
    second.position.set(-0.21, 0.19, -0.14);
    second.rotation.set(0.14, -0.08, 0.19);
    second.scale.set(1.15, 0.74, 1.31);
    manual.add(first, second);
    torso.add(manual);
    state.userObjects.add(group);
    group.updateMatrixWorld(true);

    function inspect(root) {
      root.updateMatrixWorld(true);
      const names = ['MANUAL_GROUP', 'MANUAL_GROUP_BOX', 'MANUAL_GROUP_SPHERE'];
      const nodes = Object.fromEntries(names.map((name) => {
        const node = root.getObjectByName(name);
        if (!node) throw new Error(`Missing ${name}`);
        return [name, {
          matrix: node.matrixWorld.toArray(),
          position: node.getWorldPosition(new THREE.Vector3()).toArray(),
        }];
      }));
      const bounds = new THREE.Box3().setFromObject(root);
      return {
        nodes,
        bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
        recipe: root.userData.retroCharacterRecipe,
      };
    }

    const before = inspect(group);
    const definition = serializeGroupAsImportJSON(group);
    const manualPieces = definition.pieces.filter((piece) => piece.name.startsWith('MANUAL_GROUP'));
    state.userObjects.clear();
    const imported = await importObjectFromJSON(JSON.stringify(definition));
    const restored = state.userObjects.children.at(-1);
    const after = restored ? inspect(restored) : null;
    const matrixError = after
      ? Math.max(...Object.keys(before.nodes).flatMap((name) => before.nodes[name].matrix.map((value, index) => Math.abs(value - after.nodes[name].matrix[index]))))
      : Infinity;
    const boundsError = after
      ? Math.max(...before.bounds.min.map((value, index) => Math.abs(value - after.bounds.min[index])), ...before.bounds.max.map((value, index) => Math.abs(value - after.bounds.max[index])))
      : Infinity;
    return {
      imported,
      manualPieces,
      before,
      after,
      matrixError,
      boundsError,
      restoredHasRecipe: Boolean(restored?.userData?.retroCharacterRecipe),
    };
  });

  expect(report.imported.success, report.imported.error).toBe(true);
  expect(report.manualPieces.filter((piece) => piece.geometry.type === 'label')).toHaveLength(1);
  expect(report.manualPieces.find((piece) => piece.name === 'MANUAL_GROUP').parent).toBe('TORSO');
  expect(report.manualPieces.filter((piece) => piece.parent === 'MANUAL_GROUP')).toHaveLength(2);
  expect(report.manualPieces.find((piece) => piece.name === 'MANUAL_GROUP').rotation).toBeDefined();
  expect(report.manualPieces.find((piece) => piece.name === 'MANUAL_GROUP').scale).toBeDefined();
  expect(report.matrixError).toBeLessThan(0.005);
  expect(report.boundsError).toBeLessThan(0.005);
  expect(report.after.recipe).toEqual(report.before.recipe);
  expect(report.restoredHasRecipe).toBe(true);
  await assertNoPageErrors(page);
});
