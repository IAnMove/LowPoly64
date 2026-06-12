import {
  getTextureTransform,
  isTexturePixelated,
  rememberTextureTransform,
} from './texture-core.js';
import { createDetachedBrowserCanvasTexture } from './browser-canvas-adapter.js';

export function commitCanvasTextureToMesh(mesh, paintCanvas, {
  createDetachedTexture = createDetachedBrowserCanvasTexture,
} = {}) {
  if (!mesh || !paintCanvas) return false;

  const previousMap = mesh.material.map;
  const texture = createDetachedTexture(
    paintCanvas,
    mesh.userData.textureTransform || getTextureTransform(previousMap),
    { pixelated: previousMap ? isTexturePixelated(previousMap) : true }
  );
  if (!texture) return false;

  if (!mesh.userData.textureEnabled) {
    mesh.userData.colorBeforeTexture = mesh.material.color.getHex();
    mesh.material.color.set(0xffffff);
  }
  mesh.userData.texture = texture;
  mesh.userData.textureEnabled = true;
  rememberTextureTransform(mesh, texture);
  mesh.material.map = texture;
  mesh.material.needsUpdate = true;

  if (previousMap && previousMap !== texture) {
    previousMap.dispose();
  }

  return true;
}
