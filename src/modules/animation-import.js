import { createBrowserAnimationImporter } from './animation-import-browser-adapter.js';

export { normalizeAnimationDefinition } from './animation-import-core.js';

const animationImporter = createBrowserAnimationImporter();

export function validateAnimationJSON(data) {
  return animationImporter.validateAnimationJSON(data);
}

export function importAnimationDataToGroup(data, group) {
  return animationImporter.importAnimationDataToGroup(data, group);
}

export function importAnimationToGroup(jsonString, group) {
  return animationImporter.importAnimationToGroup(jsonString, group);
}
