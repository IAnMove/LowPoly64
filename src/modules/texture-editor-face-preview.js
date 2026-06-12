import * as THREE from 'three';

export function pickPreviewFaceIndex(event, {
  previewRenderer,
  previewCamera,
  previewMesh,
  Vector2Class = THREE.Vector2,
  RaycasterClass = THREE.Raycaster,
} = {}) {
  if (!previewMesh || !previewRenderer || !previewCamera) return -1;

  const rect = previewRenderer.domElement.getBoundingClientRect();
  const mouse = new Vector2Class(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new RaycasterClass();
  raycaster.setFromCamera(mouse, previewCamera);
  const intersects = raycaster.intersectObject(previewMesh);

  if (intersects.length === 0) return -1;
  const faceIndex = Math.floor(intersects[0].faceIndex / 2);
  return faceIndex >= 0 && faceIndex < 6 ? faceIndex : -1;
}

export function createFaceHighlight(previewMesh, faceIdx, {
  three = THREE,
  color = 0x00ffcc,
  renderOrder = 999,
} = {}) {
  if (!previewMesh?.geometry?.attributes?.position) return null;

  const posAttr = previewMesh.geometry.attributes.position;
  const base = faceIdx * 4;
  const order = [0, 1, 3, 2];
  const positions = new Float32Array(12);
  order.forEach((vertexIndex, index) => {
    positions[index * 3] = posAttr.getX(base + vertexIndex);
    positions[index * 3 + 1] = posAttr.getY(base + vertexIndex);
    positions[index * 3 + 2] = posAttr.getZ(base + vertexIndex);
  });

  const geometry = new three.BufferGeometry();
  geometry.setAttribute('position', new three.BufferAttribute(positions, 3));
  const material = new three.LineBasicMaterial({ color, depthTest: false });
  const highlight = new three.LineLoop(geometry, material);
  highlight.renderOrder = renderOrder;
  previewMesh.add(highlight);
  return highlight;
}

export function disposeFaceHighlight(faceHighlight) {
  if (!faceHighlight) return null;
  if (faceHighlight.parent) faceHighlight.parent.remove(faceHighlight);
  faceHighlight.geometry?.dispose?.();
  faceHighlight.material?.dispose?.();
  return null;
}
