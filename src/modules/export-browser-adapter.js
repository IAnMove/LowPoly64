import * as THREE from 'three';
import { compileAnimation } from './animation-compiler.js';
import { downloadBlob } from './browser-download-adapter.js';
import { exportGLBFlow } from './glb-export-flow.js';
import { t } from './i18n.js';
import { state } from './state.js';
import { cloneBrowserTexture } from './browser-canvas-adapter.js';

export function createBrowserGLBExporter({
  exportState = state,
  GroupClass = THREE.Group,
  MeshStandardMaterialClass = THREE.MeshStandardMaterial,
  ColorClass = THREE.Color,
  compileAnimationCommand = compileAnimation,
  cloneTextureCommand = cloneBrowserTexture,
  loadGLTFExporter = async () => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    return GLTFExporter;
  },
  createBlob = (parts, options) => new Blob(parts, options),
  downloadBlobCommand = downloadBlob,
  alertUser = (message) => alert(message),
  logError = (...args) => console.error(...args),
  translate = t,
  exportGLBCommand = exportGLBFlow,
} = {}) {
  async function exportGLB() {
    return exportGLBCommand({
      exportState,
      GroupClass,
      MeshStandardMaterialClass,
      ColorClass,
      compileAnimation: compileAnimationCommand,
      cloneTexture: cloneTextureCommand,
      loadGLTFExporter,
      createBlob,
      downloadBlob: downloadBlobCommand,
      alertUser,
      logError,
      translate,
    });
  }

  return {
    exportGLB,
  };
}
