import * as THREE from 'three';
import { state } from './state.js';
import { selectMesh, deselect, deselectAll } from './selection.js';
import { pushAction } from './undo.js';
import { showToast } from './ui.js';
import { cloneTexture, getTextureTransform } from './textures.js';
import { t } from './i18n.js';

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
  cloneTextureState(original, clone);
  // Remove animation clips from clone (they reference the original group's nodes)
  delete clone.userData.animationClips;
  clone.position.x += 1;

  const parent = original.parent || state.userObjects;
  parent.add(clone);
  selectMesh(clone);

  pushAction({
    type: t('actionDuplicate'),
    undo: () => { if (state.selectedMesh === clone) deselect(); parent.remove(clone); },
    redo: () => { parent.add(clone); selectMesh(clone); },
  });
}

function cloneTextureState(original, clone) {
  if (original.isMesh && clone.isMesh) {
    cloneMeshTextureState(original, clone);
    return;
  }

  const originalMeshes = [];
  const cloneMeshes = [];
  original.traverse((child) => { if (child.isMesh) originalMeshes.push(child); });
  clone.traverse((child) => { if (child.isMesh) cloneMeshes.push(child); });

  for (let i = 0; i < Math.min(originalMeshes.length, cloneMeshes.length); i++) {
    cloneMeshTextureState(originalMeshes[i], cloneMeshes[i]);
  }
}

function cloneMeshTextureState(originalMesh, cloneMesh) {
  if (!cloneMesh.material) return;

  if (originalMesh.material?.map) {
    cloneMesh.material.map = cloneTexture(originalMesh.material.map);
    cloneMesh.material.needsUpdate = true;
  }

  cloneMesh.userData = {
    ...originalMesh.userData,
    textureTransform: originalMesh.userData.textureTransform
      ? { ...originalMesh.userData.textureTransform }
      : getTextureTransform(originalMesh.material?.map),
  };

  if (originalMesh.userData.texture) {
    cloneMesh.userData.texture = cloneTexture(originalMesh.userData.texture);
  }
  if (Array.isArray(originalMesh.userData.faceUVs)) {
    cloneMesh.userData.faceUVs = originalMesh.userData.faceUVs.map((face) => ({ ...face }));
  }
}

export function deleteSelected() {
  if (state.animationMode) return;

  // Multi-selection delete
  if (state.selectedMeshes.size > 0) {
    const items = [];
    state.selectedMeshes.forEach((m) => {
      items.push({ mesh: m, parent: m.parent || state.userObjects });
    });
    deselectAll();
    items.forEach(({ mesh, parent }) => parent.remove(mesh));
    pushAction({
      type: t('actionDelete'),
      undo: () => { items.forEach(({ mesh, parent }) => parent.add(mesh)); },
      redo: () => { deselectAll(); items.forEach(({ mesh, parent }) => parent.remove(mesh)); },
    });
    return;
  }

  // Single selection delete
  if (!state.selectedMesh) return;
  const mesh = state.selectedMesh;
  const parent = mesh.parent || state.userObjects;
  deselect();
  parent.remove(mesh);

  pushAction({
    type: t('actionDelete'),
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
    type: t('actionGroup'),
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
    type: t('actionUngroup'),
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

// ── Bone re-parenting ───────────────────────────────────────────

// Find the root group (direct child of userObjects) that contains this node
function findRootGroup(node) {
  let current = node;
  while (current && current.parent && current.parent !== state.userObjects) {
    current = current.parent;
  }
  return current;
}

export function detachBone() {
  const pivot = state.selectedMesh;
  if (!pivot || !pivot.userData.isPivot) return;

  const oldParent = pivot.parent;
  // Must have a PivotGroup parent (not the root group)
  if (!oldParent || !oldParent.userData.isPivot) {
    showToast(t('boneNoParent'));
    return;
  }

  const rootGroup = findRootGroup(pivot);

  // Save world position before detaching
  pivot.updateWorldMatrix(true, false);
  rootGroup.updateWorldMatrix(true, false);
  const worldPos = new THREE.Vector3();
  pivot.getWorldPosition(worldPos);

  // Move to root group
  oldParent.remove(pivot);
  rootGroup.add(pivot);
  // Convert world → root group local
  rootGroup.worldToLocal(worldPos);
  pivot.position.copy(worldPos);

  selectMesh(pivot);
  showToast(t('boneDetached'));

  const savedPos = pivot.position.clone();
  pushAction({
    type: t('actionDetachBone'),
    undo: () => {
      rootGroup.remove(pivot);
      oldParent.add(pivot);
      // Recompute local position relative to old parent
      oldParent.updateWorldMatrix(true, false);
      const wp = savedPos.clone();
      rootGroup.localToWorld(wp);
      oldParent.worldToLocal(wp);
      pivot.position.copy(wp);
      selectMesh(pivot);
    },
    redo: () => {
      oldParent.remove(pivot);
      rootGroup.add(pivot);
      pivot.position.copy(savedPos);
      selectMesh(pivot);
    },
  });
}

export function attachBone(targetParent) {
  const pivot = state.selectedMesh;
  if (!pivot || !pivot.userData.isPivot) return;
  if (!targetParent || !targetParent.isGroup) return;
  if (targetParent === pivot) return;

  // Prevent circular: target can't be a descendant of pivot
  let check = targetParent;
  while (check) {
    if (check === pivot) {
      showToast(t('cannotAttachDescendant'));
      return;
    }
    check = check.parent;
  }

  // Depth check
  let depth = 0;
  let ancestor = targetParent;
  while (ancestor && ancestor.userData.isPivot) {
    depth++;
    ancestor = ancestor.parent;
  }
  if (depth >= 4) {
    showToast(t('maxNesting'));
    return;
  }

  const oldParent = pivot.parent;
  const oldLocalPos = pivot.position.clone();

  // Get world position before re-parenting
  pivot.updateWorldMatrix(true, false);
  targetParent.updateWorldMatrix(true, false);
  const worldPos = new THREE.Vector3();
  pivot.getWorldPosition(worldPos);

  // Re-parent
  oldParent.remove(pivot);
  targetParent.add(pivot);
  // Convert world → new parent local
  targetParent.worldToLocal(worldPos);
  pivot.position.copy(worldPos);

  selectMesh(pivot);
  showToast(t('boneAttachedTo') + (targetParent.userData.name || 'grupo'));

  const newLocalPos = pivot.position.clone();
  pushAction({
    type: t('actionAttachBone'),
    undo: () => {
      targetParent.remove(pivot);
      oldParent.add(pivot);
      pivot.position.copy(oldLocalPos);
      selectMesh(pivot);
    },
    redo: () => {
      oldParent.remove(pivot);
      targetParent.add(pivot);
      pivot.position.copy(newLocalPos);
      selectMesh(pivot);
    },
  });
}
