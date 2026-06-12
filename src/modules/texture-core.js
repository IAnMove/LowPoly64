import * as THREE from 'three';

export function isTexturePixelated(texture, fallback = true) {
  if (!texture) return fallback;
  return texture.magFilter === THREE.NearestFilter || texture.minFilter === THREE.NearestFilter;
}

export function configureTexture(texture, { pixelated = true } = {}) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.magFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

function defaultCreateCanvas() {
  return null;
}

function defaultIsCanvas() {
  return false;
}

export function cloneImageToCanvas(image, {
  fallbackSize = 256,
  createCanvas = defaultCreateCanvas,
} = {}) {
  if (!image) return null;
  const canvas = createCanvas();
  if (!canvas) return null;
  canvas.width = image.width || image.naturalWidth || fallbackSize;
  canvas.height = image.height || image.naturalHeight || fallbackSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function imageToDataURL(image, {
  mimeType = 'image/png',
  fallbackSize = 256,
  createCanvas = defaultCreateCanvas,
  isCanvas = defaultIsCanvas,
} = {}) {
  if (!image) return null;

  try {
    if (isCanvas(image)) {
      return image.toDataURL(mimeType);
    }

    const canvas = createCanvas();
    if (!canvas) return null;
    canvas.width = image.width || image.naturalWidth || fallbackSize;
    canvas.height = image.height || image.naturalHeight || fallbackSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mimeType);
  } catch (_) {
    return null;
  }
}

export function createDetachedCanvasTexture(sourceImage, transform, {
  createCanvas = defaultCreateCanvas,
  fallbackSize = 256,
  CanvasTextureClass = THREE.CanvasTexture,
  configure = configureTexture,
  applyTransform = applyTextureTransform,
  ...options
} = {}) {
  const canvas = cloneImageToCanvas(sourceImage, { createCanvas, fallbackSize });
  if (!canvas) return null;
  const texture = new CanvasTextureClass(canvas);
  configure(texture, options);
  applyTransform(texture, transform);
  return texture;
}

export function createLiveCanvasTexture(sourceCanvas, transform, {
  pixelated = true,
  CanvasTextureClass = THREE.CanvasTexture,
  configure = configureTexture,
  applyTransform = applyTextureTransform,
} = {}) {
  if (!sourceCanvas) return null;
  const texture = new CanvasTextureClass(sourceCanvas);
  configure(texture, { pixelated });
  applyTransform(texture, transform);
  return texture;
}

export function cloneTexture(texture, options = {}) {
  if (!texture) return null;
  const cloned = createDetachedCanvasTexture(
    texture.image,
    getTextureTransform(texture),
    { ...options, pixelated: options.pixelated ?? isTexturePixelated(texture) }
  );
  if (!cloned) return texture.clone();
  return cloned;
}

export function getTextureTransform(texture) {
  if (!texture) {
    return { offset: [0, 0], repeat: [1, 1], rotation: 0, center: [0.5, 0.5] };
  }
  return {
    offset: [texture.offset.x, texture.offset.y],
    repeat: [texture.repeat.x, texture.repeat.y],
    rotation: texture.rotation || 0,
    center: [texture.center.x, texture.center.y],
  };
}

export function applyTextureTransform(texture, transform) {
  if (!texture || !transform) return;
  const offset = transform.offset || [0, 0];
  const repeat = transform.repeat || [1, 1];
  const center = transform.center || [0.5, 0.5];
  texture.offset.set(offset[0] ?? 0, offset[1] ?? 0);
  texture.repeat.set(repeat[0] ?? 1, repeat[1] ?? 1);
  texture.center.set(center[0] ?? 0.5, center[1] ?? 0.5);
  texture.rotation = transform.rotation ?? 0;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

export function rememberTextureTransform(mesh, texture = mesh?.material?.map) {
  if (!mesh) return;
  mesh.userData.textureTransform = getTextureTransform(texture);
}
