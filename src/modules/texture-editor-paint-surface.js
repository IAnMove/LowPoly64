import { TEXTURE_CANVAS_SIZE } from './texture-editor-paint-core.js';

export function clearPaintSurface(context, {
  canvasSize = TEXTURE_CANVAS_SIZE,
} = {}) {
  context.clearRect(0, 0, canvasSize, canvasSize);
}

export function fillPaintSurface(context, {
  canvasSize = TEXTURE_CANVAS_SIZE,
  color = '#ffffff',
} = {}) {
  context.fillStyle = color;
  context.fillRect(0, 0, canvasSize, canvasSize);
}

export function replacePaintSurfaceWithImage(context, image, {
  canvasSize = TEXTURE_CANVAS_SIZE,
} = {}) {
  clearPaintSurface(context, { canvasSize });
  context.drawImage(image, 0, 0, canvasSize, canvasSize);
}

export function clonePaintCanvas(sourceCanvas, {
  canvasSize = TEXTURE_CANVAS_SIZE,
  createCanvas,
  isCanvas = () => false,
} = {}) {
  if (!isCanvas(sourceCanvas)) return null;
  const copy = createCanvas(sourceCanvas.width || canvasSize, sourceCanvas.height || canvasSize);
  const copyContext = copy.getContext('2d');
  copyContext.drawImage(sourceCanvas, 0, 0);
  return copy;
}

export function drawSourceImageToPaintSurface(context, targetCanvas, sourceImage, {
  canvasSize = TEXTURE_CANVAS_SIZE,
  createCanvas,
  isCanvas = () => false,
  fallbackColor = '#ffffff',
} = {}) {
  if (!sourceImage) return false;

  const source = sourceImage === targetCanvas
    ? clonePaintCanvas(sourceImage, { canvasSize, createCanvas, isCanvas })
    : sourceImage;

  if (!source) {
    fillPaintSurface(context, { canvasSize, color: fallbackColor });
    return false;
  }

  context.drawImage(source, 0, 0, canvasSize, canvasSize);
  return true;
}
