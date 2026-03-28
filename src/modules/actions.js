import * as THREE from 'three';
import { state } from './state.js';
import { selectMesh, deselect, deselectAll } from './selection.js';
import { pushAction } from './undo.js';

export function duplicateSelected() {
  if (!state.selectedMesh) return;
  const original = state.selectedMesh;
  const clone = original.clone(true);

  // Clone materials for meshes (Groups don't have .material directly)
  if (clone.isMesh && clone.material) {
    clone.material = original.material.clone();
  } else if (clone.isGroup) {
    // Deep-clone materials for all child meshes
    clone.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone();
      }
    });
  }

  clone.userData = { ...original.userData };
  // Remove animation clips from clone (they reference the original group's nodes)
  delete clone.userData.animationClips;
  clone.position.x += 1;

  const parent = original.parent || state.userObjects;
  parent.add(clone);
  selectMesh(clone);

  pushAction({
    type: 'Duplicar',
    undo: () => { if (state.selectedMesh === clone) deselect(); parent.remove(clone); },
    redo: () => { parent.add(clone); selectMesh(clone); },
  });
}

export function deleteSelected() {
  if (!state.selectedMesh || state.animationMode) return;
  const mesh = state.selectedMesh;
  const parent = mesh.parent || state.userObjects;
  deselect();
  parent.remove(mesh);

  pushAction({
    type: 'Eliminar',
    undo: () => { parent.add(mesh); selectMesh(mesh); },
    redo: () => { if (state.selectedMesh === mesh) deselect(); parent.remove(mesh); },
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

  pushAction({
    type: 'Agrupar',
    undo: () => {
      deselectAll();
      const children = [...group.children];
      children.forEach((child) => {
        const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
        child.getWorldPosition(wp); child.getWorldQuaternion(wq); child.getWorldScale(ws);
        group.remove(child);
        child.position.copy(wp); child.quaternion.copy(wq); child.scale.copy(ws);
        state.userObjects.add(child);
      });
      state.userObjects.remove(group);
    },
    redo: () => {
      deselectAll();
      const children = [...state.userObjects.children.filter(c => objects.includes(c))];
      children.forEach((child) => {
        const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
        child.getWorldPosition(wp); child.getWorldQuaternion(wq); child.getWorldScale(ws);
        state.userObjects.remove(child);
        child.position.copy(wp); child.quaternion.copy(wq); child.scale.copy(ws);
        group.add(child);
      });
      state.userObjects.add(group);
      selectMesh(group);
    },
  });
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
  // Capture world transforms before ungroup
  const childTransforms = children.map(c => {
    const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
    c.getWorldPosition(wp); c.getWorldQuaternion(wq); c.getWorldScale(ws);
    return { child: c, pos: wp, quat: wq, scale: ws };
  });

  childTransforms.forEach(({ child, pos, quat, scale }) => {
    group.remove(child);
    child.position.copy(pos);
    child.quaternion.copy(quat);
    child.scale.copy(scale);
    state.userObjects.add(child);
  });

  state.userObjects.remove(group);

  if (children.length > 0) {
    const first = children[0].isMesh ? children[0] : children.find(c => c.isMesh) || children[0];
    selectMesh(first);
  }

  pushAction({
    type: 'Desagrupar',
    undo: () => {
      deselectAll();
      children.forEach((child) => {
        state.userObjects.remove(child);
        group.add(child);
      });
      state.userObjects.add(group);
      selectMesh(group);
    },
    redo: () => {
      deselectAll();
      const kids = [...group.children];
      kids.forEach((child) => {
        const wp = new THREE.Vector3(); const wq = new THREE.Quaternion(); const ws = new THREE.Vector3();
        child.getWorldPosition(wp); child.getWorldQuaternion(wq); child.getWorldScale(ws);
        group.remove(child);
        child.position.copy(wp); child.quaternion.copy(wq); child.scale.copy(ws);
        state.userObjects.add(child);
      });
      state.userObjects.remove(group);
    },
  });
}
