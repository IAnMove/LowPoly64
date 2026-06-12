export function setSingleSelection(selectionState, mesh, {
  attachTransformControls,
  highlightSelection,
}) {
  selectionState.selectedMesh = mesh;
  attachTransformControls(mesh);
  highlightSelection(mesh, selectionState.originalEmissive);
}

export function clearSingleSelection(selectionState, {
  detachTransformControls,
  unhighlightSelection,
}) {
  if (!selectionState.selectedMesh) return null;

  const cleared = selectionState.selectedMesh;
  unhighlightSelection(cleared, selectionState.originalEmissive);
  detachTransformControls();
  selectionState.selectedMesh = null;
  return cleared;
}

export function addMeshToMultiSelection(selectionState, mesh, {
  detachTransformControls,
  highlightSelection,
}) {
  if (selectionState.selectedMesh && !selectionState.selectedMeshes.has(selectionState.selectedMesh)) {
    selectionState.selectedMeshes.add(selectionState.selectedMesh);
  }

  selectionState.selectedMesh = null;
  detachTransformControls();
  selectionState.selectedMeshes.add(mesh);
  highlightSelection(mesh, selectionState.originalEmissive);

  return selectionState.selectedMeshes.size;
}

export function removeMeshFromMultiSelection(selectionState, mesh, {
  unhighlightSelection,
}) {
  const removed = selectionState.selectedMeshes.delete(mesh);
  if (removed) {
    unhighlightSelection(mesh, selectionState.originalEmissive);
  }

  const size = selectionState.selectedMeshes.size;
  return {
    removed,
    size,
    remaining: size === 1 ? selectionState.selectedMeshes.values().next().value : null,
  };
}

export function clearMultiSelection(selectionState, {
  unhighlightSelection,
}) {
  const cleared = [...selectionState.selectedMeshes];
  cleared.forEach((mesh) => unhighlightSelection(mesh, selectionState.originalEmissive));
  selectionState.selectedMeshes.clear();
  return cleared;
}
