import { expect, test } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

test('renders imported animation names as text and creates a safe empty state', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await page.evaluate(async () => {
    const [{ state }, { importAnimationDataToGroup }, { refreshAnimationList }, { buildGroupFromDefinition }] = await Promise.all([
      import('/src/modules/shared/state.js'),
      import('/src/modules/animation/animation-import.js'),
      import('/src/modules/animation/anim-mode-ui.js'),
      import('/src/modules/viewport/templates.js'),
    ]);
    const group = buildGroupFromDefinition({
      name: 'Hardening Probe',
      pieces: [{ name: 'ROOT', geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } }, position: [0, 0, 0] }],
    });

    const maliciousName = '<img src=x onerror="window.__xssProbe=1"> ' + 'A'.repeat(120);
    const imported = importAnimationDataToGroup({
      name: maliciousName,
      duration: 1,
      tracks: [{
        target: 'ROOT',
        property: 'position',
        keyframes: [
          { time: 0, value: [0, 0, 0] },
          { time: 1, value: [0, 1, 0] },
        ],
      }],
    }, group);
    state.animationModeObject = group;
    refreshAnimationList();
    const list = document.getElementById('anim-mode-list');
    const renderedName = list?.querySelector('span')?.textContent || '';
    const injectedImages = list?.querySelectorAll('img').length || 0;

    group.userData.animations = [];
    refreshAnimationList();
    const emptyChildren = [...(list?.children || [])].map((node) => ({
      tag: node.tagName,
      text: node.textContent,
    }));
    state.animationModeObject = null;

    return {
      imported,
      normalizedName: group.userData.animations?.[0]?.name || renderedName,
      renderedName,
      injectedImages,
      xssProbe: window.__xssProbe || 0,
      emptyChildren,
    };
  });

  expect(result.imported.success).toBe(true);
  expect(result.renderedName).toContain('<img src=x onerror=');
  expect(result.renderedName.length).toBeLessThanOrEqual(80);
  expect(result.injectedImages).toBe(0);
  expect(result.xssProbe).toBe(0);
  expect(result.emptyChildren).toEqual([{ tag: 'P', text: expect.any(String) }]);
});

test('rejects invalid numeric geometry and excessive import complexity', async ({ page }) => {
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await page.evaluate(async () => {
    const [{ validateObjectJSON }, { validateAnimationJSON, normalizeAnimationDefinition }] = await Promise.all([
      import('/src/modules/viewport/json-import.js'),
      import('/src/modules/animation/animation-import.js'),
    ]);
    const cubePiece = (index, overrides = {}) => ({
      name: `PIECE_${index}`,
      geometry: { type: 'cube', params: { width: 1, height: 1, depth: 1 } },
      position: [0, 0, 0],
      ...overrides,
    });
    const animation = {
      name: 'Safe animation',
      duration: 1,
      tracks: [{
        target: 'ROOT',
        property: 'rotation',
        keyframes: [{ time: 0, value: [0, 0, 0] }],
      }],
    };
    return {
      invalidTuple: validateObjectJSON({ name: 'Bad tuple', pieces: [cubePiece(1, { position: ['x', 0, 0] })] }),
      excessivePieces: validateObjectJSON({ name: 'Too many', pieces: Array.from({ length: 401 }, (_, index) => cubePiece(index)) }),
      excessiveSegments: validateObjectJSON({
        name: 'Too round',
        pieces: [cubePiece(1, { geometry: { type: 'sphere', params: { radius: 1, widthSegments: 999, heightSegments: 8 } } })],
      }),
      excessiveTracks: validateAnimationJSON({
        ...animation,
        tracks: Array.from({ length: 65 }, (_, index) => ({ ...animation.tracks[0], target: `ROOT_${index}` })),
      }),
      excessiveKeyframes: validateAnimationJSON({
        ...animation,
        duration: 241,
        tracks: [{
          ...animation.tracks[0],
          keyframes: Array.from({ length: 241 }, (_, index) => ({ time: index, value: [0, 0, 0] })),
        }],
      }),
      normalizedName: normalizeAnimationDefinition({ ...animation, name: `  ${'N'.repeat(120)}  ` }).name,
    };
  });

  expect(result.invalidTuple).toBeTruthy();
  expect(result.excessivePieces).toBeTruthy();
  expect(result.excessiveSegments).toBeTruthy();
  expect(result.excessiveTracks).toBeTruthy();
  expect(result.excessiveKeyframes).toBeTruthy();
  expect(result.normalizedName).toHaveLength(80);
});
