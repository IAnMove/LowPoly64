export function decideMouseSelection({
  isDragging = false,
  mesh = null,
  pivotFromBone = null,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
  animationMode = false,
  bonesVisible = false,
  selectedMesh = null,
  selectedMeshes = new Set(),
}) {
  if (isDragging) return { type: 'ignore' };

  if ((ctrlKey || metaKey) && !animationMode) {
    if (!mesh) return { type: 'ignore' };
    return selectedMeshes.has(mesh)
      ? { type: 'remove-from-multi', mesh }
      : { type: 'add-to-multi', mesh };
  }

  if (animationMode) return { type: 'ignore' };

  if (bonesVisible && pivotFromBone) {
    if (
      shiftKey
      && selectedMesh?.userData?.isPivot
      && pivotFromBone !== selectedMesh
    ) {
      return { type: 'attach-bone', pivot: pivotFromBone };
    }
    return { type: 'select', mesh: pivotFromBone };
  }

  if (mesh) return { type: 'select', mesh };

  return { type: 'deselect' };
}

export function decideDoubleClickSelection(rootTarget) {
  return rootTarget ? { type: 'select', mesh: rootTarget } : { type: 'ignore' };
}
