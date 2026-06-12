import { disposeSceneObject } from './scene-disposal.js';

export function centerCameraOnSelectedObject({
  actionState,
  createVector3,
} = {}) {
  if (!actionState?.selectedMesh || !actionState.orbitControls?.target) return null;
  const position = createVector3();
  actionState.selectedMesh.getWorldPosition(position);
  actionState.orbitControls.target.copy(position);
  return { success: true, position };
}

export function resetSceneObjects({
  actionState,
  deselectAll = () => {},
  disposeSceneObjectCommand = disposeSceneObject,
} = {}) {
  if (!actionState?.userObjects) return null;
  deselectAll();
  const removed = [];
  while (actionState.userObjects.children.length > 0) {
    const child = actionState.userObjects.children[0];
    actionState.userObjects.remove(child);
    disposeSceneObjectCommand(child);
    removed.push(child);
  }
  return { success: true, removed };
}
