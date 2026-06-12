import { createBrowserGLBExporter } from './export-browser-adapter.js';

const glbExporter = createBrowserGLBExporter();

export async function exportGLB() {
  return glbExporter.exportGLB();
}
