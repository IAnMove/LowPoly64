import * as THREE from 'three';
import { state } from './state.js';
import { setColor } from './materials.js';
import { updateMaterialType } from './materials.js';
import { pushAction } from './undo.js';
import { t } from './i18n.js';

// Find the actual mesh for color/material operations (child mesh if PivotGroup, else the object itself)
export function getChildMesh(obj) {
  if (obj.userData.isPivot) {
    let found = null;
    for (const child of obj.children) {
      if (child.isMesh) { found = child; break; }
    }
    return found;
  }
  return obj.isMesh ? obj : null;
}

export function updatePropertiesPanel() {
  const mesh = state.selectedMesh;
  if (!mesh) return;

  // Show single-selection fields, hide multi-selection
  document.getElementById('single-selection-fields').classList.remove('hidden');
  const multiPanel = document.getElementById('multi-selection-fields');
  if (multiPanel) multiPanel.classList.add('hidden');

  document.getElementById('prop-name').value = mesh.userData.name || '';
  document.getElementById('selected-name').textContent = mesh.userData.name || 'Mesh';

  // Position/rotation/scale: from the selected object (PivotGroup or mesh)
  document.getElementById('prop-posx').value = mesh.position.x.toFixed(2);
  document.getElementById('prop-posy').value = mesh.position.y.toFixed(2);
  document.getElementById('prop-posz').value = mesh.position.z.toFixed(2);

  document.getElementById('prop-rotx').value = THREE.MathUtils.radToDeg(mesh.rotation.x).toFixed(1);
  document.getElementById('prop-roty').value = THREE.MathUtils.radToDeg(mesh.rotation.y).toFixed(1);
  document.getElementById('prop-rotz').value = THREE.MathUtils.radToDeg(mesh.rotation.z).toFixed(1);

  document.getElementById('prop-scalex').value = mesh.scale.x.toFixed(2);
  document.getElementById('prop-scaley').value = mesh.scale.y.toFixed(2);
  document.getElementById('prop-scalez').value = mesh.scale.z.toFixed(2);

  // Color/material: from the child mesh (for PivotGroups) or the mesh itself
  const childMesh = getChildMesh(mesh);
  if (childMesh && childMesh.material && childMesh.material.color) {
    const hex = '#' + childMesh.material.color.getHexString();
    document.getElementById('prop-color').value = hex;
    syncColorPickers(hex);
  }

  const matSelect = document.getElementById('prop-material');
  if (childMesh && childMesh.material) {
    if (childMesh.material.isMeshBasicMaterial) matSelect.value = 'Basic';
    else if (childMesh.material.isMeshLambertMaterial) matSelect.value = 'Lambert';
    else if (childMesh.material.isMeshPhongMaterial) matSelect.value = 'Phong';
    else if (childMesh.material.isMeshStandardMaterial) matSelect.value = 'Standard';
  }

  // UV controls
  updateUVDisplay(childMesh || mesh);

  // Group buttons visibility
  const ungroupBtn = document.getElementById('btn-ungroup');
  if (ungroupBtn) {
    const isInGroup = mesh.parent && mesh.parent.isGroup && mesh.parent !== state.userObjects;
    const isGroup = mesh.isGroup;
    ungroupBtn.classList.toggle('hidden', !isInGroup && !isGroup);
  }

  // Bone controls: show when bones visible and a PivotGroup is selected
  const boneControls = document.getElementById('bone-controls');
  if (boneControls) {
    const showBone = state.bonesVisible && mesh.userData.isPivot;
    boneControls.classList.toggle('hidden', !showBone);
    // Detach button: only if parent is also a PivotGroup
    const detachBtn = document.getElementById('btn-detach-bone');
    if (detachBtn) {
      const hasParentPivot = mesh.parent && mesh.parent.userData.isPivot;
      detachBtn.classList.toggle('hidden', !hasParentPivot);
    }
  }

  // Animation mode button: show for groups (root groups, not individual PivotGroups)
  const animModeBtn = document.getElementById('btn-anim-mode');
  if (animModeBtn) {
    animModeBtn.classList.toggle('hidden', !mesh.isGroup);
  }

  // Copy JSON buttons: show for groups
  const copyJsonGroup = document.getElementById('btn-copy-json-group');
  if (copyJsonGroup) {
    copyJsonGroup.classList.toggle('hidden', !mesh.isGroup);
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
  document.getElementById('selected-name').textContent = t('noObject');
  const overlay = document.getElementById('selected-overlay');
  if (overlay) overlay.classList.add('hidden');
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
  const target = getChildMesh(state.selectedMesh) || state.selectedMesh;
  if (!target.material) return;
  const oldColor = '#' + target.material.color.getHexString();
  setColor(target, hex);
  syncColorPickers(hex);
  pushAction({
    type: t('actionChangeColor'),
    undo: () => { setColor(target, oldColor); syncColorPickers(oldColor); if (state.selectedMesh) updatePropertiesPanel(); },
    redo: () => { setColor(target, hex); syncColorPickers(hex); if (state.selectedMesh) updatePropertiesPanel(); },
  });
}

export function updateMaterialFromPanel() {
  if (!state.selectedMesh) return;
  const target = getChildMesh(state.selectedMesh) || state.selectedMesh;
  if (!target.material) return;
  const oldType = getMaterialTypeName(target);
  const newType = document.getElementById('prop-material').value;
  updateMaterialType(target, newType);
  pushAction({
    type: t('actionChangeMaterial'),
    undo: () => { updateMaterialType(target, oldType); if (state.selectedMesh) updatePropertiesPanel(); },
    redo: () => { updateMaterialType(target, newType); if (state.selectedMesh) updatePropertiesPanel(); },
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

function getTextureMesh() {
  if (!state.selectedMesh) return null;
  const m = getChildMesh(state.selectedMesh) || state.selectedMesh;
  return (m && m.material && m.material.map) ? m : null;
}

export function updateUVOffset() {
  const m = getTextureMesh();
  if (!m) return;
  const tex = m.material.map;
  tex.offset.x = parseFloat(document.getElementById('uv-offset-x').value) || 0;
  tex.offset.y = parseFloat(document.getElementById('uv-offset-y').value) || 0;
  tex.needsUpdate = true;
}

export function updateUVRepeat() {
  const m = getTextureMesh();
  if (!m) return;
  const tex = m.material.map;
  tex.repeat.x = parseFloat(document.getElementById('uv-repeat-x').value) || 1;
  tex.repeat.y = parseFloat(document.getElementById('uv-repeat-y').value) || 1;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
}

export function updateUVRotation() {
  const m = getTextureMesh();
  if (!m) return;
  const tex = m.material.map;
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
    btn.textContent = t('exportSelection');
  } else {
    btn.textContent = t('exportGlb');
  }
}
