import { cloneTexture, getTextureTransform } from './texture-core.js';

export function duplicateSelectedObject({
  actionState,
  selectMesh = () => {},
  deselect = () => {},
  pushAction = () => {},
  translate = (key) => key,
  cloneTextureCommand = cloneTexture,
  getTextureTransformCommand = getTextureTransform,
} = {}) {
  if (!actionState?.selectedMesh) return null;
  const original = actionState.selectedMesh;
  const clone = original.clone(true);

  cloneMaterials(original, clone);
  clone.userData = { ...original.userData };
  cloneTextureState(original, clone, {
    cloneTexture: cloneTextureCommand,
    getTextureTransform: getTextureTransformCommand,
  });
  delete clone.userData.animationClips;
  clone.position.x += 1;

  const parent = original.parent || actionState.userObjects;
  parent.add(clone);
  selectMesh(clone);

  pushAction({
    type: translate('actionDuplicate'),
    undo: () => {
      if (actionState.selectedMesh === clone) deselect();
      parent.remove(clone);
    },
    redo: () => {
      parent.add(clone);
      selectMesh(clone);
    },
  });

  return { success: true, original, clone, parent };
}

export function deleteSelectedObject({
  actionState,
  selectMesh = () => {},
  deselect = () => {},
  pushAction = () => {},
  translate = (key) => key,
} = {}) {
  if (!actionState?.selectedMesh || actionState.animationMode) return null;
  const mesh = actionState.selectedMesh;
  const parent = mesh.parent || actionState.userObjects;
  deselect();
  parent.remove(mesh);

  pushAction({
    type: translate('actionDelete'),
    undo: () => {
      parent.add(mesh);
      selectMesh(mesh);
    },
    redo: () => {
      if (actionState.selectedMesh === mesh) deselect();
      parent.remove(mesh);
    },
  });

  return { success: true, mesh, parent };
}

function cloneMaterials(original, clone) {
  if (clone.isMesh && clone.material) {
    clone.material = original.material.clone();
    return;
  }

  if (!clone.isGroup) return;
  clone.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material = child.material.clone();
    }
  });
}

function cloneTextureState(original, clone, {
  cloneTexture: cloneTextureCommand,
  getTextureTransform: getTextureTransformCommand,
}) {
  if (original.isMesh && clone.isMesh) {
    cloneMeshTextureState(original, clone, {
      cloneTexture: cloneTextureCommand,
      getTextureTransform: getTextureTransformCommand,
    });
    return;
  }

  const originalMeshes = [];
  const cloneMeshes = [];
  original.traverse((child) => { if (child.isMesh) originalMeshes.push(child); });
  clone.traverse((child) => { if (child.isMesh) cloneMeshes.push(child); });

  for (let i = 0; i < Math.min(originalMeshes.length, cloneMeshes.length); i++) {
    cloneMeshTextureState(originalMeshes[i], cloneMeshes[i], {
      cloneTexture: cloneTextureCommand,
      getTextureTransform: getTextureTransformCommand,
    });
  }
}

function cloneMeshTextureState(originalMesh, cloneMesh, {
  cloneTexture: cloneTextureCommand,
  getTextureTransform: getTextureTransformCommand,
}) {
  if (!cloneMesh.material) return;

  if (originalMesh.material?.map) {
    cloneMesh.material.map = cloneTextureCommand(originalMesh.material.map);
    cloneMesh.material.needsUpdate = true;
  }

  cloneMesh.userData = {
    ...originalMesh.userData,
    textureTransform: originalMesh.userData.textureTransform
      ? { ...originalMesh.userData.textureTransform }
      : getTextureTransformCommand(originalMesh.material?.map),
  };

  if (originalMesh.userData.texture) {
    cloneMesh.userData.texture = cloneTextureCommand(originalMesh.userData.texture);
  }
  if (Array.isArray(originalMesh.userData.faceUVs)) {
    cloneMesh.userData.faceUVs = originalMesh.userData.faceUVs.map((face) => ({ ...face }));
  }
}
