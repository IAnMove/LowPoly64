import * as THREE from 'three';

const pointer = new THREE.Vector2();

export function createSelectionRaycaster() {
  return new THREE.Raycaster();
}

export function updateRaycasterFromPointer(raycaster, event, camera, domElement) {
  const rect = domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

export function getSelectionTargetFromIntersections(intersects) {
  if (intersects.length === 0) return null;
  const object = intersects[0].object;
  if (!object.isMesh) return null;
  if (object.parent?.userData?.isPivot) {
    return object.parent;
  }
  return object;
}

export function pickSelectionTarget(raycaster, rootGroup) {
  const intersects = raycaster.intersectObjects(rootGroup.children, true);
  return getSelectionTargetFromIntersections(intersects);
}

export function findRootSelectionTarget(target, rootGroup) {
  if (!target) return null;
  let current = target;
  while (current.parent && current.parent !== rootGroup) {
    current = current.parent;
  }
  return current !== target && current.isGroup ? current : null;
}
