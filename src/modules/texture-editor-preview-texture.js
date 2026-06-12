import {
  applyTextureTransform,
  createLiveCanvasTexture,
  getTextureTransform,
  isTexturePixelated,
} from './texture-core.js';

export function applyCanvasToPreviewTexture(mesh, canvas, transform, {
  createLiveTexture = createLiveCanvasTexture,
  getTransform = getTextureTransform,
  isPixelated = isTexturePixelated,
} = {}) {
  if (!mesh?.material || !canvas) return null;

  const previousMap = mesh.material.map;
  const texture = createLiveTexture(
    canvas,
    transform || getTransform(previousMap),
    { pixelated: isPixelated(previousMap) }
  );
  if (!texture) return null;
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  if (previousMap?.isCanvasTexture && previousMap.image === canvas) {
    previousMap.dispose();
  }

  return texture;
}

export function applyTransformToPreviewTexture(mesh, transform, {
  applyTransform = applyTextureTransform,
} = {}) {
  if (!mesh?.material?.map) return false;
  applyTransform(mesh.material.map, transform);
  return true;
}
