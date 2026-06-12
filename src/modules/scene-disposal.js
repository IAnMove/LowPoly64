export function disposeSceneObject(root) {
  root.traverse((object) => {
    if (!object.isMesh) return;
    object.geometry?.dispose?.();
    disposeMaterial(object.material);
  });
}

function disposeMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry?.dispose?.());
    return;
  }
  material?.dispose?.();
}
