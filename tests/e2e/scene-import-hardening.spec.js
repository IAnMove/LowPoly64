import { expect, test } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

test('preserves the current scene when saved or imported scene JSON is invalid', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await page.evaluate(async () => {
    const [{ state }, { buildGroupFromDefinition }, { loadFromLocalStorage, importSceneJSON }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/viewport/templates.js'),
      import('/src/modules/viewport/persistence.js'),
    ]);
    const baseline = buildGroupFromDefinition({
      name: 'PERSISTENCE_SENTINEL',
      pieces: [{ name: 'ROOT', geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } }, position: [0, 0, 0] }],
    });
    state.userObjects.add(baseline);
    window.confirm = () => true;

    const snapshot = () => state.userObjects.children.map((entry) => entry.userData?.name || entry.name);
    const toastTexts = () => [...document.querySelectorAll('#toast-container > div')].map((entry) => entry.textContent || '');

    localStorage.setItem('lowpoly64-scene', '{not json');
    await loadFromLocalStorage();
    const malformedLocal = { objects: snapshot(), toasts: toastTexts() };

    localStorage.setItem('lowpoly64-scene', JSON.stringify({ version: 1, objects: 'invalid' }));
    await loadFromLocalStorage();
    const incompatibleLocal = { objects: snapshot(), toasts: toastTexts() };

    const malformedFileResult = await importSceneJSON(new File(['{broken'], 'broken-scene.json', { type: 'application/json' }));
    const malformedFile = { result: malformedFileResult, objects: snapshot(), toasts: toastTexts() };

    const incompatibleFileResult = await importSceneJSON(new File([
      JSON.stringify({ version: 1, objects: [{ type: 'mesh', name: 'BAD', position: ['x', 0, 0] }] }),
    ], 'incompatible-scene.json', { type: 'application/json' }));
    const incompatibleFile = { result: incompatibleFileResult, objects: snapshot(), toasts: toastTexts() };

    localStorage.removeItem('lowpoly64-scene');
    return { malformedLocal, incompatibleLocal, malformedFile, incompatibleFile };
  });

  for (const entry of [result.malformedLocal, result.incompatibleLocal, result.malformedFile, result.incompatibleFile]) {
    expect(entry.objects).toEqual(['PERSISTENCE_SENTINEL']);
    expect(entry.toasts.join(' ')).toMatch(/load|import|scene|escena|cargar|importar/i);
  }
  expect(result.malformedFile.result.success).toBe(false);
  expect(result.incompatibleFile.result.success).toBe(false);
  expect(result.malformedFile.result.error).toBeTruthy();
  expect(result.incompatibleFile.result.error).toBeTruthy();

  await assertNoPageErrors(page);
});
