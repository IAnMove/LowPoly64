import { createBrowserJSONExporter } from './json-export-browser-adapter.js';

const jsonExporter = createBrowserJSONExporter();

export function exportObjectJSON() {
  return jsonExporter.exportObjectJSON();
}

export function copyObjectJSON() {
  return jsonExporter.copyObjectJSON();
}

export function downloadObjectJSON() {
  return jsonExporter.downloadObjectJSON();
}

export function copyExportJSON() {
  return jsonExporter.copyExportJSON();
}

export function copySceneJSON() {
  return jsonExporter.copySceneJSON();
}
