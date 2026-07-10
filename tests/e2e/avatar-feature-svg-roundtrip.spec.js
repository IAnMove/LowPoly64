import { expect, test } from '@playwright/test';
import { assertNoPageErrors, bootstrapApp, waitForUi } from './helpers/app.js';

test.describe.configure({ timeout: 300000 });

test('roundtrips an edited avatar feature SVG with role and mount metadata intact', async ({ page }) => {
  assertNoPageErrors(page);
  await bootstrapApp(page);
  await waitForUi(page);

  const result = await page.evaluate(async () => {
    const [{
      createAvatarFeatureSvgSource,
      exportAvatarFeaturePresetSvg,
      parseAvatarFeatureSvg,
    }, {
      buildSvgModelPayload,
      createSvgGroupFromPayload,
    }] = await Promise.all([
      import('/src/modules/avatar/avatar-feature-svg.js'),
      import('/src/modules/svg/svg-model.js'),
    ]);

    const exported = exportAvatarFeaturePresetSvg('ears', 'ear_soft_01');
    const edited = exported.replaceAll('#d89f83', '#43b59f');
    const parsed = parseAvatarFeatureSvg(edited, {
      expectedRole: 'ears',
      expectedSourceId: 'ear_soft_01',
    });
    const source = createAvatarFeatureSvgSource(edited, {
      expectedRole: 'ears',
      expectedSourceId: 'ear_soft_01',
    });
    const payload = await buildSvgModelPayload(source, {
      name: 'IMPORTED EAR FEATURE',
      renderMode: 'plane',
      preserveColors: true,
      targetSize: 1,
      autoMount: true,
    });
    const group = createSvgGroupFromPayload(payload);

    let changedRoleError = '';
    try {
      parseAvatarFeatureSvg(edited.replace('data-rv-feature-role="ears"', 'data-rv-feature-role="mouth"'), {
        expectedRole: 'ears',
      });
    } catch (error) {
      changedRoleError = error?.message || String(error);
    }

    return {
      editedColorPreserved: payload.parts.some((part) => String(part.color).toLowerCase() === '#43b59f'),
      metadata: parsed.metadata,
      sourceFeature: source.feature,
      storedFeature: group.userData?.svgSource?.feature,
      storedMarkup: group.userData?.svgSource?.markup,
      analysisMountTarget: payload.analysis?.mountTarget,
      partCount: payload.parts.length,
      partFeatureKeys: [...new Set(payload.parts.map((part) => part.featureKey).filter(Boolean))],
      partMountRoles: [...new Set(payload.parts.map((part) => part.mountRole).filter(Boolean))],
      partRoles: [...new Set(payload.parts.map((part) => part.role).filter(Boolean))].sort(),
      changedRoleError,
    };
  });

  expect(result.metadata).toEqual({
    role: 'ears',
    mountRole: 'earPair',
    mountTarget: 'HEAD',
    sourceId: 'ear_soft_01',
    sourceKind: 'avatar-feature-preset',
    viewBox: '0 0 512 512',
  });
  expect(result.sourceFeature).toEqual(result.metadata);
  expect(result.storedFeature).toEqual(result.metadata);
  expect(result.storedMarkup).toContain('#43b59f');
  expect(result.editedColorPreserved).toBe(true);
  expect(result.analysisMountTarget).toBe('HEAD');
  expect(result.partCount).toBeGreaterThanOrEqual(2);
  expect(result.partFeatureKeys).toEqual(['ears']);
  expect(result.partMountRoles).toEqual(['earpair']);
  expect(result.partRoles).toEqual(['ear']);
  expect(result.changedRoleError).toContain('role changed');
});
