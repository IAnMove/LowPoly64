import * as THREE from 'three';
import { state } from '../shared/state.js';
import { setColor, setOpacity } from '../shared/materials.js';
import { updateMaterialType } from '../shared/materials.js';
import { rememberTextureTransform } from '../shared/textures.js';
import { pushAction } from '../shared/undo.js';
import { t } from '../shared/i18n.js';
import { emit } from '../../event-bus.js';
import { isSvgDerivedGroup } from '../svg/svg-metadata.js';
import { canApplySvgHeadToGroup, getStoredHeadSlotSource } from '../svg/svg-head-integration.js';

export {
  collectEditableMeshes,
  getChildMesh,
  getEditableMeshes,
  getPrimaryEditableMesh,
  showToast,
} from '../shared/ui-helpers.js';
import { collectEditableMeshes, getEditableMeshes, getPrimaryEditableMesh } from '../shared/ui-helpers.js';

function snapshotColors(meshes) {
  return meshes.map((mesh) => ({ mesh, color: '#' + mesh.material.color.getHexString() }));
}

function snapshotOpacities(meshes) {
  return meshes.map((mesh) => ({ mesh, opacity: mesh.material.opacity ?? 1 }));
}

function snapshotMaterialTypes(meshes) {
  return meshes.map((mesh) => ({ mesh, type: getMaterialTypeName(mesh) }));
}

function applyColorToMeshes(meshes, hex) {
  meshes.forEach((mesh) => setColor(mesh, hex));
}

function applyOpacityToMeshes(meshes, opacity) {
  meshes.forEach((mesh) => setOpacity(mesh, opacity));
}

function applyMaterialTypeToMeshes(meshes, materialType) {
  meshes.forEach((mesh) => updateMaterialType(mesh, materialType));
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

  // Color/material/opacity: from the primary editable mesh inside the current selection.
  const childMesh = getPrimaryEditableMesh(mesh);
  if (childMesh && childMesh.material && childMesh.material.color) {
    const hex = '#' + childMesh.material.color.getHexString();
    document.getElementById('prop-color').value = hex;
    syncColorPickers(hex);
  }

  // Opacity
  const opacitySlider = document.getElementById('prop-opacity');
  const opacityLabel = document.getElementById('prop-opacity-value');
  if (opacitySlider && childMesh && childMesh.material) {
    const val = childMesh.material.opacity !== undefined ? childMesh.material.opacity : 1;
    opacitySlider.value = val;
    if (opacityLabel) opacityLabel.textContent = val.toFixed(2);
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

  // Rig / Animations button: show for any group; label changes based on archetype
  const rigBtn = document.getElementById('btn-rig-panel');
  if (rigBtn) {
    rigBtn.classList.toggle('hidden', !mesh.isGroup);
    if (mesh.isGroup) {
      const hasRig = !!mesh.userData.archetype;
      rigBtn.textContent = hasRig ? t('rigAnimations') : t('assignRig');
      rigBtn.className = rigBtn.className
        .replace(/border-\[#[^\]]+\]/g, hasRig ? 'border-[#00ffcc]' : 'border-[#ff00ff]')
        .replace(/text-\[#[^\]]+\]/g, hasRig ? 'text-[#00ffcc]' : 'text-[#ff00ff]');
    }
  }

  // Copy JSON buttons: show for groups
  const copyJsonGroup = document.getElementById('btn-copy-json-group');
  if (copyJsonGroup) {
    copyJsonGroup.classList.toggle('hidden', !mesh.isGroup);
  }

  const editSvgBtn = document.getElementById('btn-edit-svg-source');
  if (editSvgBtn) {
    editSvgBtn.classList.toggle('hidden', !isSvgDerivedGroup(mesh));
  }

  const editAvatarBtn = document.getElementById('btn-edit-avatar');
  if (editAvatarBtn) {
    const showEditAvatar = mesh.isGroup && !!mesh.userData?.avatarRecipe;
    editAvatarBtn.classList.toggle('hidden', !showEditAvatar);
  }

  const headLabBtn = document.getElementById('btn-head-lab');
  if (headLabBtn) {
    const showHeadLab = canApplySvgHeadToGroup(mesh);
    headLabBtn.classList.toggle('hidden', !showHeadLab);
    if (showHeadLab) {
      headLabBtn.textContent = getStoredHeadSlotSource(mesh)
        ? t('editHeadSvg')
        : t('openHeadLab');
    }
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
  const sceneInfo = document.getElementById('scene-info-view');
  const props = document.getElementById('properties-panel');
  const singleFields = document.getElementById('single-selection-fields');
  const multiFields = document.getElementById('multi-selection-fields');
  if (sceneInfo) sceneInfo.classList.add('hidden');
  if (props) props.classList.remove('hidden');
  if (singleFields) singleFields.classList.add('hidden');
  if (multiFields) multiFields.classList.remove('hidden');
  updateMultiSelectionPanel();
}

export function updateMultiSelectionPanel() {
  const count = state.selectedMeshes.size;
  if (count < 2) return;
  const label = document.getElementById('selected-name');
  if (label) label.textContent = t('nObjects', { n: count });
  const countLabel = document.getElementById('multi-count');
  if (countLabel) countLabel.textContent = `${count}`;
}

export function clearPropertiesPanel() {
  const props = document.getElementById('properties-panel');
  const sceneInfo = document.getElementById('scene-info-view');
  if (props) props.classList.add('hidden');
  if (sceneInfo) sceneInfo.classList.remove('hidden');
  document.getElementById('selected-name').textContent = t('noObject');
  const overlay = document.getElementById('selected-overlay');
  if (overlay) overlay.classList.add('hidden');
  emit('scene:objects-changed');
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
  const meshes = getEditableMeshes(state.selectedMesh).filter((mesh) => mesh.material?.color);
  if (meshes.length === 0) return;

  const previous = snapshotColors(meshes);
  const oldColor = previous[0]?.color || hex;
  applyColorToMeshes(meshes, hex);
  syncColorPickers(hex);
  pushAction({
    type: t('actionChangeColor'),
    undo: () => {
      previous.forEach(({ mesh, color }) => setColor(mesh, color));
      syncColorPickers(oldColor);
      if (state.selectedMesh) updatePropertiesPanel();
    },
    redo: () => {
      applyColorToMeshes(meshes, hex);
      syncColorPickers(hex);
      if (state.selectedMesh) updatePropertiesPanel();
    },
  });
}

export function updateOpacityFromPanel(value) {
  const meshes = getEditableMeshes(state.selectedMesh).filter((mesh) => mesh.material);
  if (meshes.length === 0) return;

  const previous = snapshotOpacities(meshes);
  const oldOpacity = previous[0]?.opacity ?? 1;
  const parsedOpacity = parseFloat(value);
  const newOpacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
  applyOpacityToMeshes(meshes, newOpacity);
  const label = document.getElementById('prop-opacity-value');
  if (label) label.textContent = newOpacity.toFixed(2);
  pushAction({
    type: t('actionChangeOpacity'),
    undo: () => {
      previous.forEach(({ mesh, opacity }) => setOpacity(mesh, opacity));
      const undoLabel = document.getElementById('prop-opacity-value');
      if (undoLabel) undoLabel.textContent = oldOpacity.toFixed(2);
      if (state.selectedMesh) updatePropertiesPanel();
    },
    redo: () => {
      applyOpacityToMeshes(meshes, newOpacity);
      const redoLabel = document.getElementById('prop-opacity-value');
      if (redoLabel) redoLabel.textContent = newOpacity.toFixed(2);
      if (state.selectedMesh) updatePropertiesPanel();
    },
  });
}

export function updateMaterialFromPanel() {
  const meshes = getEditableMeshes(state.selectedMesh).filter((mesh) => mesh.material);
  if (meshes.length === 0) return;

  const previous = snapshotMaterialTypes(meshes);
  const oldType = previous[0]?.type || 'Lambert';
  const newType = document.getElementById('prop-material').value;
  applyMaterialTypeToMeshes(meshes, newType);
  pushAction({
    type: t('actionChangeMaterial'),
    undo: () => {
      previous.forEach(({ mesh, type }) => updateMaterialType(mesh, type));
      const matSelect = document.getElementById('prop-material');
      if (matSelect) matSelect.value = oldType;
      if (state.selectedMesh) updatePropertiesPanel();
    },
    redo: () => {
      applyMaterialTypeToMeshes(meshes, newType);
      const matSelect = document.getElementById('prop-material');
      if (matSelect) matSelect.value = newType;
      if (state.selectedMesh) updatePropertiesPanel();
    },
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
  const m = getPrimaryEditableMesh(state.selectedMesh);
  return (m && m.material && m.material.map) ? m : null;
}

export function updateUVOffset() {
  const m = getTextureMesh();
  if (!m) return;
  const tex = m.material.map;
  tex.offset.x = parseFloat(document.getElementById('uv-offset-x').value) || 0;
  tex.offset.y = parseFloat(document.getElementById('uv-offset-y').value) || 0;
  tex.needsUpdate = true;
  rememberTextureTransform(m, tex);
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
  rememberTextureTransform(m, tex);
}

export function updateUVRotation() {
  const m = getTextureMesh();
  if (!m) return;
  const tex = m.material.map;
  tex.rotation = THREE.MathUtils.degToRad(parseFloat(document.getElementById('uv-rotation').value) || 0);
  tex.center.set(0.5, 0.5);
  tex.needsUpdate = true;
  rememberTextureTransform(m, tex);
}


export function applyColorToAll(hex) {
  const meshes = collectEditableMeshes(Array.from(state.selectedMeshes));
  if (meshes.length === 0) return;

  const previous = snapshotColors(meshes);
  applyColorToMeshes(meshes, hex);
  pushAction({
    type: t('actionChangeColor'),
    undo: () => previous.forEach(({ mesh, color }) => setColor(mesh, color)),
    redo: () => applyColorToMeshes(meshes, hex),
  });
}

export function applyOpacityToAll(value) {
  const parsedOpacity = parseFloat(value);
  const opacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1;
  const label = document.getElementById('multi-opacity-value');
  if (label) label.textContent = opacity.toFixed(2);

  const meshes = collectEditableMeshes(Array.from(state.selectedMeshes));
  if (meshes.length === 0) return;

  const previous = snapshotOpacities(meshes);
  applyOpacityToMeshes(meshes, opacity);
  pushAction({
    type: t('actionChangeOpacity'),
    undo: () => {
      previous.forEach(({ mesh, opacity: oldOpacity }) => setOpacity(mesh, oldOpacity));
      if (label && previous[0]) label.textContent = previous[0].opacity.toFixed(2);
    },
    redo: () => {
      applyOpacityToMeshes(meshes, opacity);
      if (label) label.textContent = opacity.toFixed(2);
    },
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
