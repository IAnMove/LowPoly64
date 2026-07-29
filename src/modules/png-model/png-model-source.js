import {
  PNG_MODEL_MAX_SOURCE_BYTES,
  PNG_MODEL_MAX_SOURCE_DIMENSION,
  inspectPngModelImageHeader,
  normalizePngModelSource,
  validatePngModelSource,
} from './png-model-metadata.js';

const ACCEPTED_TYPES = new Set(['image/png', 'image/webp']);
const HEADER_BYTES = 64;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The image file could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function readFileHeader(file) {
  if (typeof file.slice === 'function') {
    return new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  }
  if (typeof file.arrayBuffer === 'function') {
    return new Uint8Array((await file.arrayBuffer()).slice(0, HEADER_BYTES));
  }
  throw new Error('The image file header could not be read.');
}

function canonicalDataURL(rawDataURL, mime) {
  return rawDataURL.replace(/^data:[^;,]*;base64,/i, `data:${mime};base64,`);
}

function canonicalSourceFromCanvas(canvas, filename) {
  const source = normalizePngModelSource({
    dataURL: canvas.toDataURL('image/png'),
    filename: filename || 'image.png',
    mime: 'image/png',
    width: canvas.width,
    height: canvas.height,
  });
  const validation = validatePngModelSource(source);
  if (!validation.ok) throw new Error(validation.error);
  return validation.source;
}

function loadedFromImage(image, filename) {
  const canvas = imageToBoundedCanvas(image);
  const source = canonicalSourceFromCanvas(canvas, filename);
  return { source, canvas, imageData: getCanvasImageData(canvas) };
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

export async function prevalidatePngModelFile(file) {
  if (!file) throw new Error('Choose a PNG or WebP image first.');
  const declaredType = String(file.type || '').toLowerCase();
  if (declaredType && !ACCEPTED_TYPES.has(declaredType)) {
    throw new Error('Only PNG and WebP images are supported.');
  }
  if (!Number.isFinite(file.size) || file.size < 1) {
    throw new Error('The image file is empty.');
  }
  if (file.size > PNG_MODEL_MAX_SOURCE_BYTES) {
    throw new Error('The source image must be 5 MB or smaller.');
  }
  const inspection = inspectPngModelImageHeader(await readFileHeader(file));
  if (!inspection.ok) throw new Error(inspection.error);
  if (declaredType && inspection.mime !== declaredType) {
    throw new Error('The image MIME type does not match its file header.');
  }
  return inspection;
}

export async function loadPngModelFile(file) {
  const inspection = await prevalidatePngModelFile(file);
  const rawDataURL = canonicalDataURL(await readFileAsDataURL(file), inspection.mime);
  const image = await decodePngModelImage(rawDataURL);
  return loadedFromImage(image, file.name || 'image.png');
}

export async function loadPngModelSource(source) {
  const validation = validatePngModelSource(source);
  if (!validation.ok) throw new Error(validation.error);
  const image = await decodePngModelImage(validation.source.dataURL);
  // Imports are always re-rasterized so dimensions, MIME and the <=1024px bound
  // are canonical even for legacy recipes with stale or forged metadata.
  return loadedFromImage(image, validation.source.filename);
}

export async function loadPngModelAsset(url, filename = 'example.png') {
  const image = await decodePngModelImage(url);
  return loadedFromImage(image, filename);
}
