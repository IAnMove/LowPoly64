import { importAnimationDataToGroup, importAnimationToGroup } from './animation-import.js';
import { readFileAsJSON } from './browser-json-adapter.js';
import { t } from './i18n.js';
import { createJSONImportDomAdapter } from './json-import-dom.js';
import {
  handleJSONImportFile,
  handleJSONImportSubmit,
  importObjectFromJSONString,
} from './json-import-flow.js';
import { normalizeObjectDefinition, validateObjectJSON as validateObjectJSONCore } from './json-import-validation.js';
import { deselect, selectMesh } from './selection.js';
import { state } from './state.js';
import { pushAction } from './undo.js';
import { showToast } from './ui.js';

export function createBrowserJSONImporter({
  importHooks = { showTimelineForGroup: null },
  getImportState = () => state,
  translate = t,
  validateObject = (data) => validateObjectJSONCore(data, { translate }),
  normalizeObject = normalizeObjectDefinition,
  buildGroupFromDefinitionCommand = () => {
    throw new Error('buildGroupFromDefinitionCommand is required');
  },
  importAnimationData = importAnimationDataToGroup,
  addGroup = (group) => getImportState().userObjects.add(group),
  removeGroup = (group) => getImportState().userObjects.remove(group),
  selectGroup = selectMesh,
  deselectCommand = deselect,
  pushActionCommand = pushAction,
  showToastCommand = showToast,
  root = globalThis.document,
  createImportDom = createJSONImportDomAdapter,
  importDom = createImportDom({ root }) || {},
  getImportTextCommand = importDom.getImportText,
  setImportTextCommand = importDom.setImportText,
  setImportErrorCommand = importDom.setImportError,
  showImportModalCommand = importDom.showImportModal,
  hideImportModalCommand = importDom.hideImportModal,
  clearImportModalCommand = importDom.clearImportModal,
  importAnimationToGroupCommand = importAnimationToGroup,
  readFileAsJSONCommand = readFileAsJSON,
  importObjectFromJSONStringCommand = importObjectFromJSONString,
  handleJSONImportSubmitCommand = handleJSONImportSubmit,
  handleJSONImportFileCommand = handleJSONImportFile,
} = {}) {
  function configureImportHooks(hooks = {}) {
    Object.assign(importHooks, hooks);
  }

  function closeImportModal() {
    hideImportModalCommand();
  }

  function createImportDependencies() {
    return {
      validateObject,
      normalizeObject,
      buildObjectGroup: (definition) => buildGroupFromDefinitionCommand(definition, {
        compileAnimations: false,
      }),
      importAnimationData,
      addGroup,
      removeGroup,
      getImportState,
      selectGroup,
      deselect: deselectCommand,
      pushAction: pushActionCommand,
      showToast: showToastCommand,
      translate,
      getImportText: getImportTextCommand,
      setImportText: setImportTextCommand,
      setImportError: setImportErrorCommand,
      closeImportModal,
      importAnimationToGroup: importAnimationToGroupCommand,
      showTimelineForGroup: (group) => importHooks.showTimelineForGroup?.(group),
      readFileAsJSON: readFileAsJSONCommand,
    };
  }

  function importObjectFromJSON(jsonString) {
    return importObjectFromJSONStringCommand(jsonString, createImportDependencies());
  }

  function validateObjectJSON(data) {
    return validateObject(data);
  }

  function openImportModal() {
    showImportModalCommand();
    clearImportModalCommand();
  }

  function handleImportSubmit() {
    return handleJSONImportSubmitCommand(createImportDependencies());
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    return handleJSONImportFileCommand(file, createImportDependencies());
  }

  return {
    closeImportModal,
    configureImportHooks,
    handleImportFile,
    handleImportSubmit,
    importObjectFromJSON,
    openImportModal,
    validateObjectJSON,
  };
}
