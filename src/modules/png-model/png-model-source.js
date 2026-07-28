import {
  PNG_MODEL_MAX_SOURCE_BYTES,
  PNG_MODEL_MAX_SOURCE_DIMENSION,
  normalizePngModelSource,
  validatePngModelSource,
} from './png-model-metadata.js';

const ACCEPTED_TYPES = new Set(['image/png', 'image/webp']);

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function decodePngModelImage(dataURL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The embedded image could not be decoded.'));
    image.src = dataURL;
  });
}

export function imageToBoundedCanvas(image, maxDimension = PNG_MODEL_MAX_SOURCE_DIMENSION) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) throw new Error('The image dimensions are invalid.');
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('A 2D canvas is required to process the image.');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function getCanvasImageData(canvas) {
  const context = canvas?.getContext?.('2d', { willReadFrequently: true });
  if (!context) throw new Error('The image pixels could not be read.');
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function loadPngModelFile(file) {
  if (!file) throw new Error('Choose a PNG or WebP image first.');
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Only PNG and WebP images are supported.');
  if (file.size > PNG_MODEL_MAX_SOURCE_BYTES) throw new Error('The source image must be 5 MB or smaller.');
  const rawDataURL = await readFileAsDataURL(file);
  const image = await decodePngModelImage(rawDataURL);
  const canvas = imageToBoundedCanvas(image);
  const dataURL = canvas.toDataURL('image/png');
  const source = normalizePngModelSource({
    dataURL,
    filename: file.name || 'image.png',
    mime: 'image/png',
    width: canvas.width,
    height: canvas.height,
  });
  const validation = validatePngModelSource(source);
  if (!validation.ok) throw new Error(validation.error);
  return { source: validation.source, canvas, imageData: getCanvasImageData(canvas) };
}

export async function loadPngModelSource(source) {
  const validation = validatePngModelSource(source);
  if (!validation.ok) throw new Error(validation.error);
  const image = await decodePngModelImage(validation.source.dataURL);
  const canvas = imageToBoundedCanvas(image);
  return { source: validation.source, canvas, imageData: getCanvasImageData(canvas) };
}
