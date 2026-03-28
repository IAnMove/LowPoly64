import { initScene } from './modules/scene.js';
import { addPrimitive } from './modules/primitives.js';
import { addTemplate, generateTemplateListUI } from './modules/templates.js';
import { onMouseDown, onDoubleClick } from './modules/selection.js';
import { onKeyDown } from './modules/shortcuts.js';
import { toggleFlatShading, toggleWireframe, quickColor, randomRetroColor as getRandomRetroColor, setColor } from './modules/materials.js';
import { handleTextureUpload, toggleTexture, togglePixelated, setupTextureDragDrop } from './modules/textures.js';
import {
  updatePosition, updateRotation, updateScale, updateName,
  updateColorFromPanel, updateMaterialFromPanel,
  updateUVOffset, updateUVRepeat, updateUVRotation,
  showToast, applyColorToAll,
} from './modules/ui.js';
import { duplicateSelected, deleteSelected, centerCameraOnSelected, resetScene, groupSelected, ungroupSelected } from './modules/actions.js';
import { exportGLB } from './modules/export.js';
import { saveToLocalStorage, loadFromLocalStorage, exportSceneJSON, importSceneJSON } from './modules/persistence.js';
import { toggleSnap } from './modules/snap.js';
import { openImportModal, closeImportModal, handleImportSubmit, handleImportFile } from './modules/json-import.js';
import { state } from './modules/state.js';

document.addEventListener('DOMContentLoaded', () => {
  initScene();

  // Canvas events
  state.renderer.domElement.addEventListener('mousedown', onMouseDown);
  state.renderer.domElement.addEventListener('dblclick', onDoubleClick);

  // Keyboard
  window.addEventListener('keydown', onKeyDown);

  // Generate template list dynamically
  const templateList = document.getElementById('template-list');
  if (templateList) generateTemplateListUI(templateList);

  // Setup texture drag-drop zone
  const texDropZone = document.getElementById('texture-drop-zone');
  if (texDropZone) setupTextureDragDrop(texDropZone);
});

// Expose functions to HTML onclick handlers
window.addPrimitive = addPrimitive;
window.addTemplate = addTemplate;
window.toggleFlatShading = toggleFlatShading;
window.toggleWireframe = toggleWireframe;
window.quickColor = quickColor;
window.randomRetroColor = () => {
  if (state.selectedMesh) {
    setColor(state.selectedMesh, getRandomRetroColor());
  }
};
window.handleTextureUpload = handleTextureUpload;
window.toggleTexture = toggleTexture;
window.togglePixelated = togglePixelated;
window.updatePosition = updatePosition;
window.updateRotation = updateRotation;
window.updateScale = updateScale;
window.updateName = updateName;
window.updateColor = updateColorFromPanel;
window.updateMaterial = updateMaterialFromPanel;
window.updateUVOffset = updateUVOffset;
window.updateUVRepeat = updateUVRepeat;
window.updateUVRotation = updateUVRotation;
window.duplicateSelected = duplicateSelected;
window.deleteSelected = deleteSelected;
window.centerCameraOnSelected = centerCameraOnSelected;
window.resetScene = resetScene;
window.exportGLB = exportGLB;
window.toggleSnap = toggleSnap;
window.saveScene = saveToLocalStorage;
window.loadScene = loadFromLocalStorage;
window.exportSceneJSON = exportSceneJSON;
window.importSceneJSON = (event) => {
  const file = event.target.files[0];
  if (file) importSceneJSON(file);
};
window.groupSelected = groupSelected;
window.ungroupSelected = ungroupSelected;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleImportSubmit = handleImportSubmit;
window.handleImportFile = handleImportFile;
window.applyColorToAll = () => {
  const hex = document.getElementById('multi-color-picker')?.value || '#ffcc00';
  applyColorToAll(hex);
};
