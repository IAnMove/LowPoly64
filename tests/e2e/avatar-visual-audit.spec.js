import { test, expect } from '@playwright/test';
import {
  assertNoPageErrors,
  bootstrapApp,
  suppressKnownAvatarForgeWarnings,
} from './helpers/avatar-forge.js';
import { collectAvatarVisualAuditReport } from './helpers/avatar-visual-audit.js';

test.describe.configure({ timeout: 600000 });

test('keeps landmark-mounted avatar heads within visual tolerances', async ({ page }) => {
  await suppressKnownAvatarForgeWarnings(page);
  await bootstrapApp(page, '/', { requireEditorModals: false });

  const report = await collectAvatarVisualAuditReport(page, { includeAllBundles: false });

  expect(
    report.failureCount,
    JSON.stringify({
      checkedCount: report.checkedCount,
      thresholds: report.thresholds,
      failures: report.failures,
    }, null, 2)
  ).toBe(0);
  expect(report.checkedCount).toBeGreaterThan(0);

  await assertNoPageErrors(page);
});
