import * as THREE from 'three';

export function getChildMesh(object) {
  if (!object) return null;
  if (object.userData?.isPivot) {
    return object.children.find((child) => child.isMesh) || null;
  }
  return object.isMesh ? object : null;
}

export function getMaterialTypeName(mesh) {
  const material = mesh?.material;
  if (!material) return 'Lambert';
  if (material.isMeshBasicMaterial) return 'Basic';
  if (material.isMeshLambertMaterial) return 'Lambert';
  if (material.isMeshPhongMaterial) return 'Phong';
  if (material.isMeshStandardMaterial) return 'Standard';
  return 'Lambert';
}

export function getMaterialColorHex(mesh) {
  if (!mesh?.material?.color) return null;
  return `#${mesh.material.color.getHexString()}`;
}

export function getTextureMesh(selectedObject) {
  const mesh = getChildMesh(selectedObject) || selectedObject;
  return mesh?.isMesh && mesh.material?.map ? mesh : null;
}

export function getSelectionActionVisibility(object, {
  userObjects,
  bonesVisible,
} = {}) {
  return {
    isGroup: Boolean(object?.isGroup),
    isInGroup: Boolean(object?.parent?.isGroup && object.parent !== userObjects),
    showBone: Boolean(bonesVisible && object?.userData?.isPivot),
    hasParentPivot: Boolean(object?.parent?.userData?.isPivot),
  };
}

export function applyPosition(object, position) {
  object.position.set(position.x, position.y, position.z);
}

export function applyRotationDegrees(object, rotationDegrees) {
  object.rotation.set(
    THREE.MathUtils.degToRad(rotationDegrees.x),
    THREE.MathUtils.degToRad(rotationDegrees.y),
    THREE.MathUtils.degToRad(rotationDegrees.z)
  );
}

export function applyScale(object, scale) {
  object.scale.set(scale.x, scale.y, scale.z);
}

export function renameObject(object, name) {
  object.userData.name = name;
}

export function applyTextureOffset(mesh, uv, rememberTextureTransform) {
  const texture = mesh.material.map;
  texture.offset.x = uv.offsetX;
  texture.offset.y = uv.offsetY;
  texture.needsUpdate = true;
  rememberTextureTransform(mesh, texture);
}

export function applyTextureRepeat(mesh, uv, rememberTextureTransform) {
  const texture = mesh.material.map;
  texture.repeat.x = uv.repeatX;
  texture.repeat.y = uv.repeatY;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  rememberTextureTransform(mesh, texture);
}

export function applyTextureRotation(mesh, uv, rememberTextureTransform) {
  const texture = mesh.material.map;
  texture.rotation = THREE.MathUtils.degToRad(uv.rotationDeg);
  texture.center.set(0.5, 0.5);
  texture.needsUpdate = true;
  rememberTextureTransform(mesh, texture);
}
