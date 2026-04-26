import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { state } from '../shared/state.js';
import { selectMesh, deselect, deselectAll, toggleMultiSelect } from './selection.js';
import { pushAction } from '../shared/undo.js';
import { showToast } from './ui.js';
import { cloneTexture, getTextureTransform } from '../shared/textures.js';
import { t } from '../shared/i18n.js';
import { compileAnimation } from '../animation/animation.js';

function cloneMaterialInstance(material) {
  if (Array.isArray(material)) {
    return material.map((entry) => (entry?.clone ? entry.clone() : entry));
  }
  return material?.clone ? material.clone() : material;
}

function cloneUserDataValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneUserDataValue(entry));
  }

  if (value && typeof value === 'object') {
    if (typeof value.clone === 'function' && !value.isObject3D) {
      return value.clone();
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      const cloned = {};
      Object.entries(value).forEach(([key, entry]) => {
        if (key === 'animationClips') return;
        cloned[key] = cloneUserDataValue(entry);
      });
      return cloned;
    }
  }

  return value;
}

function cloneUserData(userData = {}) {
  const cloned = {};
  Object.entries(userData).forEach(([key, value]) => {
    if (key === 'animationClips') return;
    cloned[key] = cloneUserDataValue(value);
  });
  return cloned;
}

function containsSkinnedMesh(object) {
  let found = false;
  object?.traverse?.((child) => {
    if (child?.isSkinnedMesh) {
      found = true;
    }
  });
  return found;
}

function syncCloneState(original, clone) {
  const originalNodes = [];
  const cloneNodes = [];
  original.traverse((node) => originalNodes.push(node));
  clone.traverse((node) => cloneNodes.push(node));

  for (let i = 0; i < Math.min(originalNodes.length, cloneNodes.length); i++) {
    const originalNode = originalNodes[i];
    const cloneNode = cloneNodes[i];
    cloneNode.userData = cloneUserData(originalNode.userData);

    if (cloneNode.isMesh && cloneNode.material) {
      cloneNode.material = cloneMaterialInstance(originalNode.material);
    }
  }

  cloneTextureState(original, clone);

  clone.traverse((node) => {
    if (!Array.isArray(node.userData.animations) || node.userData.animations.length === 0) {
      delete node.userData.animationClips;
      return;
    }

    node.userData.animationClips = node.userData.animations
      .map((animDef) => compileAnimation(animDef, node))
      .filter(Boolean);
  });
}

function resolveDuplicationParent(parent) {
  if (!parent) return state.userObjects;
  if (parent === state.userObjects) return state.userObjects;

  let current = parent;
  while (current) {
    if (current === state.userObjects) return parent;
    current = current.parent;
  }

  return state.userObjects;
}

function selectDuplicatedObjects(objects = []) {
  const clones = objects.filter(Boolean);
  if (clones.length === 0) return;

  deselectAll();
  if (clones.length === 1) {
    selectMesh(clones[0]);
    return;
  }

  clones.forEach((clone) => toggleMultiSelect(clone));
}

export function cloneObjectForDuplication(original) {
  if (!original) return null;
  const clone = containsSkinnedMesh(original) ? SkeletonUtils.clone(original) : original.clone(true);
  syncCloneState(original, clone);
  return clone;
}

export function insertDuplicatedObject(source, options = {}) {
  if (!source) return null;

  const clone = cloneObjectForDuplication(source);
  if (!clone) return null;

  const parent = resolveDuplicationParent(options.parent || source.parent || state.userObjects);
  const offset = options.offset || [1, 0, 0];
  clone.position.x += offset[0] || 0;
  clone.position.y += offset[1] || 0;
  clone.position.z += offset[2] || 0;

  parent.add(clone);
  if (options.select !== false) {
    selectMesh(clone);
  }

  if (options.pushHistory !== false) {
    pushAction({
      type: t('actionDuplicate'),
      undo: () => { if (state.selectedMesh === clone) deselect(); parent.remove(clone); },
      redo: () => { parent.add(clone); if (options.select !== false) selectMesh(clone); },
    });
  }

  return clone;
}

export function insertDuplicatedObjects(entries = [], options = {}) {
  const clones = [];
  const placements = [];
  const offset = options.offset || [1, 0, 0];

  entries.forEach((entry) => {
    const source = entry?.source || entry;
    if (!source) return;

    const parent = resolveDuplicationParent(entry?.parent || source.parent || state.userObjects);
    const clone = insertDuplicatedObject(source, {
      parent,
      offset,
      pushHistory: false,
      select: false,
    });
    if (!clone) return;

    clones.push(clone);
    placements.push({ clone, parent });
  });

  if (clones.length === 0) return [];

  if (options.select !== false) {
    selectDuplicatedObjects(clones);
  }

  if (options.pushHistory !== false) {
    pushAction({
      type: t('actionDuplicate'),
      undo: () => {
        deselectAll();
        placements.forEach(({ clone, parent }) => parent.remove(clone));
      },
      redo: () => {
        placements.forEach(({ clone, parent }) => parent.add(clone));
        if (options.select !== false) {
          selectDuplicatedObjects(clones);
        }
      },
    });
  }

  return clones;
}

export function duplicateSelected() {
  if (!state.selectedMesh) return;
  insertDuplicatedObject(state.selectedMesh, {
    parent: state.selectedMesh.parent || state.userObjects,
    offset: [1, 0, 0],
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

  cloneMesh.userData = cloneUserData(originalMesh.userData);
  cloneMesh.userData.textureTransform = originalMesh.userData.textureTransform
    ? cloneUserDataValue(originalMesh.userData.textureTransform)
    : getTextureTransform(originalMesh.material?.map);

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
