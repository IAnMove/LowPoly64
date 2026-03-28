import * as THREE from 'three';
import { state } from './state.js';
import { updatePropertiesPanel, clearPropertiesPanel, showMultiSelectionPanel, updateExportButtonText } from './ui.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function getMeshFromIntersect(intersects) {
  if (intersects.length === 0) return null;
  let obj = intersects[0].object;
  return obj.isMesh ? obj : null;
}

export function onMouseDown(event) {
  if (state.transformControls.dragging) return;

  const rect = state.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, state.camera);
  const intersects = raycaster.intersectObjects(state.userObjects.children, true);
  const mesh = getMeshFromIntersect(intersects);

  if ((event.ctrlKey || event.metaKey) && !state.animationMode) {
    // Multi-selection toggle (disabled in animation mode)
    if (mesh) {
      if (state.selectedMeshes.has(mesh)) {
        removeFromMultiSelection(mesh);
      } else {
        addToMultiSelection(mesh);
      }
      updateSelectionUI();
    }
    return;
  }

  // In animation mode, keep the group selected — don't allow changing selection
  if (state.animationMode) return;

  // Normal click
  if (mesh) {
    deselectAll();
    selectMesh(mesh);
  } else {
    deselectAll();
  }
}

export function onDoubleClick(event) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, state.camera);
  const intersects = raycaster.intersectObjects(state.userObjects.children, true);
  const mesh = getMeshFromIntersect(intersects);

  if (mesh) {
    // Find parent Group (if any, and if it's a user group, not userObjects itself)
    let parent = mesh.parent;
    if (parent && parent !== state.userObjects && parent.isGroup) {
      deselectAll();
      selectMesh(parent);
    }
  }
}

function highlightMesh(mesh) {
  if (mesh.isMesh && mesh.material && mesh.material.emissive) {
    state.originalEmissive.set(mesh.uuid, mesh.material.emissive.clone());
    mesh.material.emissive = new THREE.Color(0x4488ff);
    mesh.material.emissiveIntensity = 0.4;
  }
  // If it's a Group, highlight all children
  if (mesh.isGroup) {
    mesh.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive) {
        state.originalEmissive.set(child.uuid, child.material.emissive.clone());
        child.material.emissive = new THREE.Color(0x4488ff);
        child.material.emissiveIntensity = 0.4;
      }
    });
  }
}

function unhighlightMesh(mesh) {
  if (mesh.isMesh) {
    const orig = state.originalEmissive.get(mesh.uuid);
    if (orig && mesh.material && mesh.material.emissive) {
      mesh.material.emissive.copy(orig);
      mesh.material.emissiveIntensity = 0;
    }
    state.originalEmissive.delete(mesh.uuid);
  }
  if (mesh.isGroup) {
    mesh.traverse((child) => {
      if (child.isMesh) {
        const orig = state.originalEmissive.get(child.uuid);
        if (orig && child.material && child.material.emissive) {
          child.material.emissive.copy(orig);
          child.material.emissiveIntensity = 0;
        }
        state.originalEmissive.delete(child.uuid);
      }
    });
  }
}

export function selectMesh(mesh) {
  // If coming from multi-selection, clear it first
  if (state.selectedMeshes.size > 0) {
    deselectAll();
  }
  deselect();

  state.selectedMesh = mesh;
  state.transformControls.attach(mesh);
  highlightMesh(mesh);

  document.getElementById('properties-panel').classList.remove('hidden');
  document.getElementById('selected-name').textContent = mesh.userData.name || 'Mesh';
  updatePropertiesPanel();
  updateExportButtonText();
  // Show timeline if group has animations
  if (typeof window.showTimelineForGroup === 'function') {
    window.showTimelineForGroup(mesh);
  }
}

export function deselect() {
  if (state.selectedMesh) {
    unhighlightMesh(state.selectedMesh);
    state.transformControls.detach();
    state.selectedMesh = null;
  }
  clearPropertiesPanel();
}

function addToMultiSelection(mesh) {
  // If there was a single selection, move it to multi
  if (state.selectedMesh && !state.selectedMeshes.has(state.selectedMesh)) {
    state.selectedMeshes.add(state.selectedMesh);
    // Already highlighted
  }
  state.selectedMesh = null;
  state.transformControls.detach();

  state.selectedMeshes.add(mesh);
  highlightMesh(mesh);
}

function removeFromMultiSelection(mesh) {
  state.selectedMeshes.delete(mesh);
  unhighlightMesh(mesh);

  // If only one left, switch to single selection
  if (state.selectedMeshes.size === 1) {
    const remaining = state.selectedMeshes.values().next().value;
    state.selectedMeshes.clear();
    selectMesh(remaining);
    return;
  }
  if (state.selectedMeshes.size === 0) {
    clearPropertiesPanel();
  }
}

function updateSelectionUI() {
  const count = state.selectedMeshes.size;
  if (count > 1) {
    document.getElementById('selected-name').textContent = `${count} OBJETOS`;
    document.getElementById('properties-panel').classList.remove('hidden');
    showMultiSelectionPanel();
  } else if (count === 1) {
    const mesh = state.selectedMeshes.values().next().value;
    state.selectedMeshes.clear();
    selectMesh(mesh);
  }
}

export function deselectAll() {
  // Clear multi-selection
  state.selectedMeshes.forEach((mesh) => unhighlightMesh(mesh));
  state.selectedMeshes.clear();

  // Clear single selection
  if (state.selectedMesh) {
    unhighlightMesh(state.selectedMesh);
    state.transformControls.detach();
    state.selectedMesh = null;
  }
  clearPropertiesPanel();
  updateExportButtonText();
  // Hide timeline (but keep it in animation mode)
  if (!state.animationMode) {
    const timeline = document.getElementById('animation-timeline');
    if (timeline) timeline.classList.add('hidden');
  }
}
