export function hasSceneObjects(exportState) {
  return (exportState.userObjects?.children?.length || 0) > 0;
}

export function createExportSource(exportState, {
  GroupClass,
} = {}) {
  if (!GroupClass) {
    throw new Error('GroupClass is required to create an export source');
  }

  if (exportState.animationMode && exportState.animationModeObject) {
    return createGroupFromObjects([exportState.animationModeObject], GroupClass);
  }

  if (exportState.selectedMeshes?.size > 0) {
    return createGroupFromObjects([...exportState.selectedMeshes], GroupClass);
  }

  if (exportState.selectedMesh) {
    return createGroupFromObjects([exportState.selectedMesh], GroupClass);
  }

  return exportState.userObjects.clone(true);
}

function createGroupFromObjects(objects, GroupClass) {
  const group = new GroupClass();
  objects.forEach((object) => group.add(object.clone(true)));
  return group;
}
