import * as THREE from 'three';
import { state } from './state.js';
import { selectMesh, deselect, deselectAll } from './selection.js';

export function duplicateSelected() {
  if (!state.selectedMesh) return;
  const clone = state.selectedMesh.clone();
  clone.material = state.selectedMesh.material.clone();
  clone.userData = { ...state.selectedMesh.userData };
  clone.position.x += 1;

  const parent = state.selectedMesh.parent;
  if (parent) {
    parent.add(clone);
  } else {
    state.userObjects.add(clone);
  }
  selectMesh(clone);
}

export function deleteSelected() {
  if (!state.selectedMesh) return;
  const mesh = state.selectedMesh;
  deselect();
  if (mesh.parent) {
    mesh.parent.remove(mesh);
  }
  mesh.traverse((obj) => {
    if (obj.isMesh) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  });
}

export function centerCameraOnSelected() {
  if (!state.selectedMesh) return;
  const pos = new THREE.Vector3();
  state.selectedMesh.getWorldPosition(pos);
  state.orbitControls.target.copy(pos);
}

export function resetScene() {
  deselectAll();
  while (state.userObjects.children.length > 0) {
    const child = state.userObjects.children[0];
    state.userObjects.remove(child);
    child.traverse((obj) => {
      if (obj.isMesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }
}

export function groupSelected() {
  // Gather all objects to group
  const objects = [];
  if (state.selectedMeshes.size >= 2) {
    state.selectedMeshes.forEach((m) => objects.push(m));
  } else {
    return; // Need at least 2 objects
  }

  deselectAll();

  const group = new THREE.Group();
  group.userData.name = 'CUSTOM GROUP';

  objects.forEach((obj) => {
    // Save world position/rotation/scale before reparenting
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    obj.getWorldQuaternion(worldQuat);
    obj.getWorldScale(worldScale);

    if (obj.parent) obj.parent.remove(obj);

    obj.position.copy(worldPos);
    obj.quaternion.copy(worldQuat);
    obj.scale.copy(worldScale);
    group.add(obj);
  });

  state.userObjects.add(group);
  selectMesh(group);
}

export function ungroupSelected() {
  let group = null;

  if (state.selectedMesh) {
    if (state.selectedMesh.isGroup && state.selectedMesh.parent === state.userObjects) {
      group = state.selectedMesh;
    } else if (state.selectedMesh.parent && state.selectedMesh.parent.isGroup && state.selectedMesh.parent !== state.userObjects) {
      group = state.selectedMesh.parent;
    }
  }

  if (!group) return;

  deselectAll();

  const children = [...group.children];
  children.forEach((child) => {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    child.getWorldPosition(worldPos);
    child.getWorldQuaternion(worldQuat);
    child.getWorldScale(worldScale);

    group.remove(child);
    child.position.copy(worldPos);
    child.quaternion.copy(worldQuat);
    child.scale.copy(worldScale);
    state.userObjects.add(child);
  });

  state.userObjects.remove(group);

  if (children.length > 0) {
    const first = children[0].isMesh ? children[0] : children.find(c => c.isMesh) || children[0];
    selectMesh(first);
  }
}
