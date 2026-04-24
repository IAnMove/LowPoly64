import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 30000 });

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');
}

test('rig panel exposes persistent color controls per animation slot', async () => {
  const rigUi = readRepoFile('src', 'modules', 'animation', 'rig-ui.js');

  expect(rigUi).toContain('SLOT COLOR');
  expect(rigUi).toContain('function applySlotColor(slotId, color)');
  expect(rigUi).toContain('rigGroup.userData.slotColors[slotId]');
  expect(rigUi).toContain('applySlotColorToRoot(rigGroup, slotId, resolvedColor)');
  expect(rigUi).toContain('applySlotColorToRoot(modelClone, slotId, resolvedColor)');
});

test('slotColors survive legacy JSON export and import', async () => {
  const persistence = readRepoFile('src', 'modules', 'viewport', 'persistence.js');
  const jsonImport = readRepoFile('src', 'modules', 'viewport', 'json-import.js');

  expect(persistence).toContain('data.slotColors = cloneStructuredValue(obj.userData.slotColors)');
  expect(persistence).toContain('group.userData.slotColors = cloneStructuredValue(data.slotColors)');
  expect(jsonImport).toContain('normalized.slotColors = cloneJsonValue(data.slotColors)');
  expect(jsonImport).toContain('group.userData.slotColors = cloneJsonValue(data.slotColors)');
});
