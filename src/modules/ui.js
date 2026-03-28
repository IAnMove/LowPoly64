import * as THREE from 'three';
import { state } from './state.js';
import { setColor } from './materials.js';
import { updateMaterialType } from './materials.js';
import { pushAction } from './undo.js';

export function updatePropertiesPanel() {
  const mesh = state.selectedMesh;
  if (!mesh) return;

  // Show single-selection fields, hide multi-selection
  document.getElementById('single-selection-fields').classList.remove('hidden');
  const multiPanel = document.getElementById('multi-selection-fields');
  if (multiPanel) multiPanel.classList.add('hidden');

  document.getElementById('prop-name').value = mesh.userData.name || '';
  document.getElementById('selected-name').textContent = mesh.userData.name || 'Mesh';

  document.getElementById('prop-posx').value = mesh.position.x.toFixed(2);
  document.getElementById('prop-posy').value = mesh.position.y.toFixed(2);
  document.getElementById('prop-posz').value = mesh.position.z.toFixed(2);

  document.getElementById('prop-rotx').value = THREE.MathUtils.radToDeg(mesh.rotation.x).toFixed(1);
  document.getElementById('prop-roty').value = THREE.MathUtils.radToDeg(mesh.rotation.y).toFixed(1);
  document.getElementById('prop-rotz').value = THREE.MathUtils.radToDeg(mesh.rotation.z).toFixed(1);

  document.getElementById('prop-scalex').value = mesh.scale.x.toFixed(2);
  document.getElementById('prop-scaley').value = mesh.scale.y.toFixed(2);
  document.getElementById('prop-scalez').value = mesh.scale.z.toFixed(2);

  if (mesh.material && mesh.material.color) {
    const hex = '#' + mesh.material.color.getHexString();
    document.getElementById('prop-color').value = hex;
    syncColorPickers(hex);
  }

  const matSelect = document.getElementById('prop-material');
  if (mesh.material) {
    if (mesh.material.isMeshBasicMaterial) matSelect.value = 'Basic';
    else if (mesh.material.isMeshLambertMaterial) matSelect.value = 'Lambert';
    else if (mesh.material.isMeshPhongMaterial) matSelect.value = 'Phong';
    else if (mesh.material.isMeshStandardMaterial) matSelect.value = 'Standard';
  }

  // UV controls
  updateUVDisplay(mesh);

  // Group buttons visibility
  const ungroupBtn = document.getElementById('btn-ungroup');
  if (ungroupBtn) {
    const isInGroup = mesh.parent && mesh.parent.isGroup && mesh.parent !== state.userObjects;
    const isGroup = mesh.isGroup;
    ungroupBtn.classList.toggle('hidden', !isInGroup && !isGroup);
  }

  // Animation mode button: show for groups
  const animModeBtn = document.getElementById('btn-anim-mode');
  if (animModeBtn) {
    animModeBtn.classList.toggle('hidden', !mesh.isGroup);
  }
}

function updateUVDisplay(mesh) {
  const uvSection = document.getElementById('uv-controls');
  const preview = document.getElementById('texture-preview');
  if (!uvSection) return;

  const tex = mesh.isMesh && mesh.material && mesh.material.map;
  if (tex) {
    uvSection.classList.remove('hidden');
    document.getElementById('uv-offset-x').value = tex.offset.x.toFixed(2);
    document.getElementById('uv-offset-y').value = tex.offset.y.toFixed(2);
    document.getElementById('uv-repeat-x').value = tex.repeat.x.toFixed(2);
    document.getElementById('uv-repeat-y').value = tex.repeat.y.toFixed(2);
    document.getElementById('uv-rotation').value = THREE.MathUtils.radToDeg(tex.rotation).toFixed(1);

    if (preview && tex.image) {
      preview.src = tex.image.src || '';
      preview.classList.remove('hidden');
    }
  } else {
    uvSection.classList.add('hidden');
    if (preview) {
      preview.classList.add('hidden');
      preview.src = '';
    }
  }
}

export function showMultiSelectionPanel() {
  const singleFields = document.getElementById('single-selection-fields');
  const multiFields = document.getElementById('multi-selection-fields');
  if (singleFields) singleFields.classList.add('hidden');
  if (multiFields) multiFields.classList.remove('hidden');
}

export function clearPropertiesPanel() {
  document.getElementById('properties-panel').classList.add('hidden');
  document.getElementById('selected-name').textContent = 'NINGUN OBJETO';
}

export function updatePosition() {
  if (!state.selectedMesh) return;
  state.selectedMesh.position.set(
    parseFloat(document.getElementById('prop-posx').value) || 0,
    parseFloat(document.getElementById('prop-posy').value) || 0,
    parseFloat(document.getElementById('prop-posz').value) || 0
  );
}

export function updateRotation() {
  if (!state.selectedMesh) return;
  state.selectedMesh.rotation.set(
    THREE.MathUtils.degToRad(parseFloat(document.getElementById('prop-rotx').value) || 0),
    THREE.MathUtils.degToRad(parseFloat(document.getElementById('prop-roty').value) || 0),
    THREE.MathUtils.degToRad(parseFloat(document.getElementById('prop-rotz').value) || 0)
  );
}

export function updateScale() {
  if (!state.selectedMesh) return;
  state.selectedMesh.scale.set(
    parseFloat(document.getElementById('prop-scalex').value) || 1,
    parseFloat(document.getElementById('prop-scaley').value) || 1,
    parseFloat(document.getElementById('prop-scalez').value) || 1
  );
}

export function updateName(value) {
  if (!state.selectedMesh) return;
  state.selectedMesh.userData.name = value;
  document.getElementById('selected-name').textContent = value || 'Mesh';
}

export function updateColorFromPanel(hex) {
  if (!state.selectedMesh) return;
  const mesh = state.selectedMesh;
  const oldColor = '#' + mesh.material.color.getHexString();
  setColor(mesh, hex);
  syncColorPickers(hex);
  pushAction({
    type: 'Cambiar color',
    undo: () => { setColor(mesh, oldColor); syncColorPickers(oldColor); if (state.selectedMesh === mesh) updatePropertiesPanel(); },
    redo: () => { setColor(mesh, hex); syncColorPickers(hex); if (state.selectedMesh === mesh) updatePropertiesPanel(); },
  });
}

export function updateMaterialFromPanel() {
  if (!state.selectedMesh) return;
  const mesh = state.selectedMesh;
  const oldType = getMaterialTypeName(mesh);
  const newType = document.getElementById('prop-material').value;
  updateMaterialType(mesh, newType);
  pushAction({
    type: 'Cambiar material',
    undo: () => { updateMaterialType(mesh, oldType); if (state.selectedMesh === mesh) updatePropertiesPanel(); },
    redo: () => { updateMaterialType(mesh, newType); if (state.selectedMesh === mesh) updatePropertiesPanel(); },
  });
}

function getMaterialTypeName(mesh) {
  const m = mesh.material;
  if (!m) return 'Lambert';
  if (m.isMeshBasicMaterial) return 'Basic';
  if (m.isMeshLambertMaterial) return 'Lambert';
  if (m.isMeshPhongMaterial) return 'Phong';
  if (m.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

export function updateUVOffset() {
  if (!state.selectedMesh || !state.selectedMesh.material || !state.selectedMesh.material.map) return;
  const tex = state.selectedMesh.material.map;
  tex.offset.x = parseFloat(document.getElementById('uv-offset-x').value) || 0;
  tex.offset.y = parseFloat(document.getElementById('uv-offset-y').value) || 0;
  tex.needsUpdate = true;
}

export function updateUVRepeat() {
  if (!state.selectedMesh || !state.selectedMesh.material || !state.selectedMesh.material.map) return;
  const tex = state.selectedMesh.material.map;
  tex.repeat.x = parseFloat(document.getElementById('uv-repeat-x').value) || 1;
  tex.repeat.y = parseFloat(document.getElementById('uv-repeat-y').value) || 1;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
}

export function updateUVRotation() {
  if (!state.selectedMesh || !state.selectedMesh.material || !state.selectedMesh.material.map) return;
  const tex = state.selectedMesh.material.map;
  tex.rotation = THREE.MathUtils.degToRad(parseFloat(document.getElementById('uv-rotation').value) || 0);
  tex.center.set(0.5, 0.5);
  tex.needsUpdate = true;
}

// Toast notification system
export function showToast(message, duration = 2000) {
  const container = document.getElementById('toast-container') || document.body;
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 bg-black border-2 border-[#ffcc00] text-[#ffcc00] px-6 py-3 text-xs font-mono z-50 pointer-events-none';
  toast.style.fontFamily = "'Press Start 2P', monospace";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, duration);
}

export function applyColorToAll(hex) {
  state.selectedMeshes.forEach((mesh) => {
    if (mesh.isMesh && mesh.material) {
      setColor(mesh, hex);
    }
  });
}

export function syncColorPickers(hex) {
  const palettePicker = document.getElementById('palette-color-picker');
  if (palettePicker) palettePicker.value = hex;
  const propColor = document.getElementById('prop-color');
  if (propColor) propColor.value = hex;
}

export function updateExportButtonText() {
  const btn = document.getElementById('btn-export');
  if (!btn) return;
  if (state.selectedMeshes.size > 0 || state.selectedMesh) {
    btn.textContent = 'EXPORTAR SELECCIÓN';
  } else {
    btn.textContent = 'EXPORTAR GLB';
  }
}
