import * as THREE from 'three';

export function detachSelectedBone({
  actionState,
  selectMesh = () => {},
  pushAction = () => {},
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const pivot = actionState?.selectedMesh;
  if (!pivot?.userData.isPivot) return null;

  const oldParent = pivot.parent;
  if (!oldParent?.userData.isPivot) {
    showToast(translate('boneNoParent'));
    return { success: false, reason: 'no-parent' };
  }

  const rootGroup = findRootGroup(pivot, actionState.userObjects);
  const savedPos = detachPivotToRoot(pivot, oldParent, rootGroup);

  selectMesh(pivot);
  showToast(translate('boneDetached'));

  pushAction({
    type: translate('actionDetachBone'),
    undo: () => {
      rootGroup.remove(pivot);
      oldParent.add(pivot);
      oldParent.updateWorldMatrix(true, false);
      const worldPos = savedPos.clone();
      rootGroup.localToWorld(worldPos);
      oldParent.worldToLocal(worldPos);
      pivot.position.copy(worldPos);
      selectMesh(pivot);
    },
    redo: () => {
      oldParent.remove(pivot);
      rootGroup.add(pivot);
      pivot.position.copy(savedPos);
      selectMesh(pivot);
    },
  });

  return { success: true, pivot, oldParent, rootGroup, savedPos };
}

export function attachSelectedBone(targetParent, {
  actionState,
  selectMesh = () => {},
  pushAction = () => {},
  showToast = () => {},
  translate = (key) => key,
} = {}) {
  const pivot = actionState?.selectedMesh;
  if (!pivot?.userData.isPivot) return null;
  if (!targetParent?.isGroup || targetParent === pivot) return null;

  if (isDescendantOf(targetParent, pivot)) {
    showToast(translate('cannotAttachDescendant'));
    return { success: false, reason: 'descendant' };
  }
  if (getPivotDepth(targetParent) >= 4) {
    showToast(translate('maxNesting'));
    return { success: false, reason: 'max-depth' };
  }

  const oldParent = pivot.parent;
  const oldLocalPos = pivot.position.clone();
  const newLocalPos = attachPivotToParent(pivot, oldParent, targetParent);

  selectMesh(pivot);
  showToast(translate('boneAttachedTo') + (targetParent.userData.name || 'grupo'));

  pushAction({
    type: translate('actionAttachBone'),
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

  return { success: true, pivot, oldParent, targetParent, oldLocalPos, newLocalPos };
}

export function findRootGroup(node, userObjects) {
  let current = node;
  while (current?.parent && current.parent !== userObjects) {
    current = current.parent;
  }
  return current;
}

export function detachPivotToRoot(pivot, oldParent, rootGroup) {
  pivot.updateWorldMatrix(true, false);
  rootGroup.updateWorldMatrix(true, false);
  const worldPos = new THREE.Vector3();
  pivot.getWorldPosition(worldPos);

  oldParent.remove(pivot);
  rootGroup.add(pivot);
  rootGroup.worldToLocal(worldPos);
  pivot.position.copy(worldPos);
  return pivot.position.clone();
}

export function attachPivotToParent(pivot, oldParent, targetParent) {
  pivot.updateWorldMatrix(true, false);
  targetParent.updateWorldMatrix(true, false);
  const worldPos = new THREE.Vector3();
  pivot.getWorldPosition(worldPos);

  oldParent.remove(pivot);
  targetParent.add(pivot);
  targetParent.worldToLocal(worldPos);
  pivot.position.copy(worldPos);
  return pivot.position.clone();
}

export function isDescendantOf(node, possibleAncestor) {
  let current = node;
  while (current) {
    if (current === possibleAncestor) return true;
    current = current.parent;
  }
  return false;
}

export function getPivotDepth(node) {
  let depth = 0;
  let ancestor = node;
  while (ancestor?.userData.isPivot) {
    depth++;
    ancestor = ancestor.parent;
  }
  return depth;
}
