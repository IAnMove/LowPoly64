import { downloadJSON } from './browser-json-adapter.js';
import { t } from './i18n.js';
import {
  copyJSONExport,
  copyJSONToClipboard,
  copySceneJSONExport,
  downloadJSONExport,
} from './json-export-flow.js';
import {
  serializeGroupAsImportJSON,
  serializeScene,
} from './persistence.js';
import { state } from './state.js';
import { showToast } from './ui.js';

export function createBrowserJSONExporter({
  exportState = state,
  serializeGroup = serializeGroupAsImportJSON,
  serializeSceneCommand = serializeScene,
  downloadJSONCommand = downloadJSON,
  showToastCommand = showToast,
  translate = t,
  writeText = (json) => navigator.clipboard.writeText(json),
  promptCopy = (message, json) => prompt(message, json),
  copyJSONToClipboardCommand = copyJSONToClipboard,
  downloadJSONExportCommand = downloadJSONExport,
  copyJSONExportCommand = copyJSONExport,
  copySceneJSONExportCommand = copySceneJSONExport,
} = {}) {
  function copyJSON(data) {
    return copyJSONToClipboardCommand(data, {
      writeText,
      promptCopy,
      showToast: showToastCommand,
      translate,
    });
  }

  function exportObjectJSON() {
    return downloadJSONExportCommand({
      exportState,
      serializeGroup,
      downloadJSON: downloadJSONCommand,
      showToast: showToastCommand,
      translate,
      showSuccessToast: true,
    });
  }

  function copyObjectJSON() {
    return copyJSONExportCommand({
      exportState,
      requireSelection: true,
      serializeGroup,
      copyJSON,
      showToast: showToastCommand,
      translate,
    });
  }

  function downloadObjectJSON() {
    return downloadJSONExportCommand({
      exportState,
      requireSelection: true,
      serializeGroup,
      downloadJSON: downloadJSONCommand,
      showToast: showToastCommand,
      translate,
    });
  }

  function copyExportJSON() {
    return copyJSONExportCommand({
      exportState,
      serializeGroup,
      copyJSON,
      showToast: showToastCommand,
      translate,
    });
  }

  function copySceneJSON() {
    return copySceneJSONExportCommand({
      serializeScene: serializeSceneCommand,
      copyJSON,
    });
  }

  return {
    copyExportJSON,
    copyObjectJSON,
    copySceneJSON,
    downloadObjectJSON,
    exportObjectJSON,
  };
}
