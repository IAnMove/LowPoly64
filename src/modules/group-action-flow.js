import * as THREE from 'three';

export function groupSelectedObjects({
  actionState,
  GroupClass = THREE.Group,
  selectMesh = () => {},
  deselectAll = () => {},
  pushAction = () => {},
  translate = (key) => key,
} = {}) {
  const objects = [...(actionState?.selectedMeshes || [])];
  if (objects.length < 2) return null;

  deselectAll();

  const group = new GroupClass();
  group.userData.name = 'CUSTOM GROUP';

  objects.forEach((object) => {
    const transform = captureWorldTransform(object);
    object.parent?.remove(object);
    applyTransform(object, transform);
    group.add(object);
  });

  actionState.userObjects.add(group);
  selectMesh(group);

  pushAction({
    type: translate('actionGroup'),
    undo: () => {
      deselectAll();
      const children = [...group.children];
      children.forEach((child) => {
        const transform = captureWorldTransform(child);
        group.remove(child);
        applyTransform(child, transform);
        actionState.userObjects.add(child);
      });
      actionState.userObjects.remove(group);
    },
    redo: () => {
      deselectAll();
      const children = actionState.userObjects.children.filter((child) => objects.includes(child));
      children.forEach((child) => {
        const transform = captureWorldTransform(child);
        actionState.userObjects.remove(child);
        applyTransform(child, transform);
        group.add(child);
      });
      actionState.userObjects.add(group);
      selectMesh(group);
    },
  });

  return { success: true, group, objects };
}

export function ungroupSelectedObject({
  actionState,
  selectMesh = () => {},
  deselectAll = () => {},
  pushAction = () => {},
  translate = (key) => key,
} = {}) {
  const group = getSelectedGroupForUngroup(actionState);
  if (!group) return null;

  deselectAll();

  const children = [...group.children];
  children
    .map((child) => ({ child, transform: captureWorldTransform(child) }))
    .forEach(({ child, transform }) => {
      group.remove(child);
      applyTransform(child, transform);
      actionState.userObjects.add(child);
    });

  actionState.userObjects.remove(group);

  if (children.length > 0) {
    const first = children[0].isMesh ? children[0] : children.find((child) => child.isMesh) || children[0];
    selectMesh(first);
  }

  pushAction({
    type: translate('actionUngroup'),
    undo: () => {
      deselectAll();
      children.forEach((child) => {
        actionState.userObjects.remove(child);
        group.add(child);
      });
      actionState.userObjects.add(group);
      selectMesh(group);
    },
    redo: () => {
      deselectAll();
      const currentChildren = [...group.children];
      currentChildren.forEach((child) => {
        const transform = captureWorldTransform(child);
        group.remove(child);
        applyTransform(child, transform);
        actionState.userObjects.add(child);
      });
      actionState.userObjects.remove(group);
    },
  });

  return { success: true, group, children };
}

export function getSelectedGroupForUngroup(actionState) {
  if (!actionState?.selectedMesh) return null;
  if (actionState.selectedMesh.isGroup && actionState.selectedMesh.parent === actionState.userObjects) {
    return actionState.selectedMesh;
  }
  if (actionState.selectedMesh.parent?.isGroup && actionState.selectedMesh.parent !== actionState.userObjects) {
    return actionState.selectedMesh.parent;
  }
  return null;
}

export function captureWorldTransform(object) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  object.getWorldPosition(position);
  object.getWorldQuaternion(quaternion);
  object.getWorldScale(scale);
  return { position, quaternion, scale };
}

export function applyTransform(object, transform) {
  object.position.copy(transform.position);
  object.quaternion.copy(transform.quaternion);
  object.scale.copy(transform.scale);
}
