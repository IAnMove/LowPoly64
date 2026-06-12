export function hasExportableSelection(selectedMesh, selectedMeshes) {
  return Boolean(selectedMesh) || Boolean(selectedMeshes?.size);
}
