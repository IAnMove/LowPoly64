import { createBrowserJSONImporter } from './json-import-browser-adapter.js';
import { buildGroupFromDefinition } from './templates.js';

const jsonImporter = createBrowserJSONImporter({
  buildGroupFromDefinitionCommand: buildGroupFromDefinition,
});

export function configureImportHooks(hooks = {}) {
  return jsonImporter.configureImportHooks(hooks);
}

export function importObjectFromJSON(jsonString) {
  return jsonImporter.importObjectFromJSON(jsonString);
}

export function validateObjectJSON(data) {
  return jsonImporter.validateObjectJSON(data);
}

export function openImportModal() {
  return jsonImporter.openImportModal();
}

export function closeImportModal() {
  return jsonImporter.closeImportModal();
}

export function handleImportSubmit() {
  return jsonImporter.handleImportSubmit();
}

export async function handleImportFile(event) {
  return jsonImporter.handleImportFile(event);
}
