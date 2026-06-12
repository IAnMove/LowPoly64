import { compileAnimation } from './animation-compiler.js';
import {
  importAnimationDataToGroup,
  importAnimationToGroup,
  normalizeAnimationDefinition,
  validateAnimationJSON,
} from './animation-import-core.js';
import { t } from './i18n.js';
import { showToast } from './ui.js';

export function createBrowserAnimationImporter({
  compileAnimationCommand = compileAnimation,
  showToastCommand = showToast,
  translate = t,
  normalizeAnimationDefinitionCommand = normalizeAnimationDefinition,
  validateAnimationJSONCommand = validateAnimationJSON,
  importAnimationDataToGroupCommand = importAnimationDataToGroup,
  importAnimationToGroupCommand = importAnimationToGroup,
} = {}) {
  function validateAnimation(data) {
    return validateAnimationJSONCommand(data, { translate });
  }

  function importAnimationData(data, group) {
    return importAnimationDataToGroupCommand(data, group, {
      validateAnimation: validateAnimationJSONCommand,
      normalizeAnimation: normalizeAnimationDefinitionCommand,
      compileAnimation: compileAnimationCommand,
      translate,
    });
  }

  function importAnimationFromJSON(jsonString, group) {
    return importAnimationToGroupCommand(jsonString, group, {
      validateAnimation: validateAnimationJSONCommand,
      normalizeAnimation: normalizeAnimationDefinitionCommand,
      compileAnimation: compileAnimationCommand,
      showToast: showToastCommand,
      translate,
    });
  }

  return {
    importAnimationDataToGroup: importAnimationData,
    importAnimationToGroup: importAnimationFromJSON,
    normalizeAnimationDefinition: normalizeAnimationDefinitionCommand,
    validateAnimationJSON: validateAnimation,
  };
}
