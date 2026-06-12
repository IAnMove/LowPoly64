import {
  applyTextureTransform,
  getTextureTransform,
  rememberTextureTransform,
} from './texture-core.js';

export function applyTextureToMesh(mesh, texture, { actionType = 'Apply texture', pushAction = null } = {}) {
  if (!mesh?.material || !texture) return false;

  const oldMap = mesh.material.map;
  const oldTexData = mesh.userData.texture;
  const oldEnabled = mesh.userData.textureEnabled;
  const oldColor = mesh.material.color ? mesh.material.color.getHex() : 0xffffff;
  const previousTransform = mesh.userData.textureTransform || getTextureTransform(oldMap);

  applyTextureTransform(texture, previousTransform);
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  mesh.userData.colorBeforeTexture = oldColor;
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.color.set(0xffffff);
  mesh.material.needsUpdate = true;

  pushAction?.({
    type: actionType,
    undo: () => {
      mesh.material.map = oldMap;
      mesh.material.color.set(oldColor);
      mesh.userData.texture = oldTexData;
      mesh.userData.textureEnabled = oldEnabled;
      mesh.material.needsUpdate = true;
    },
    redo: () => {
      mesh.material.map = texture;
      mesh.material.color.set(0xffffff);
      mesh.userData.texture = texture;
      mesh.userData.textureEnabled = true;
      mesh.material.needsUpdate = true;
    },
  });

  return true;
}

export function toggleMeshTexture(mesh) {
  if (!mesh?.userData.texture || !mesh.material) return false;

  if (mesh.userData.textureEnabled) {
    mesh.material.map = null;
    mesh.userData.textureEnabled = false;
    if (mesh.userData.colorBeforeTexture !== undefined) {
      mesh.material.color.set(mesh.userData.colorBeforeTexture);
    }
  } else {
    mesh.material.map = mesh.userData.texture;
    mesh.userData.textureEnabled = true;
    mesh.userData.colorBeforeTexture = mesh.material.color.getHex();
    mesh.material.color.set(0xffffff);
  }
  mesh.material.needsUpdate = true;
  return true;
}

export function applyTextureFilterToObject(root, filter) {
  root.traverse((child) => {
    if (child.isMesh && child.material?.map) {
      child.material.map.magFilter = filter;
      child.material.map.minFilter = filter;
      child.material.map.needsUpdate = true;
      child.material.needsUpdate = true;
    }
  });

  root.traverse((child) => {
    if (child.isMesh && child.userData.texture) {
      child.userData.texture.magFilter = filter;
      child.userData.texture.minFilter = filter;
      child.userData.texture.needsUpdate = true;
    }
  });
}
