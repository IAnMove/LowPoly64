import {
  cloneImageToCanvas,
  cloneTexture,
  createDetachedCanvasTexture,
  imageToDataURL,
} from './texture-core.js';

export function createBrowserCanvas({
  root = globalThis.document,
} = {}) {
  return root?.createElement?.('canvas') || null;
}

export function isBrowserCanvas(value, {
  CanvasElementClass = globalThis.HTMLCanvasElement,
} = {}) {
  return typeof CanvasElementClass !== 'undefined' && value instanceof CanvasElementClass;
}

export function cloneBrowserImageToCanvas(image, options = {}) {
  return cloneImageToCanvas(image, {
    ...options,
    createCanvas: options.createCanvas || (() => createBrowserCanvas(options)),
  });
}

export function imageToBrowserDataURL(image, options = {}) {
  return imageToDataURL(image, {
    ...options,
    createCanvas: options.createCanvas || (() => createBrowserCanvas(options)),
    isCanvas: options.isCanvas || ((value) => isBrowserCanvas(value, options)),
  });
}

export function createDetachedBrowserCanvasTexture(sourceImage, transform, options = {}) {
  return createDetachedCanvasTexture(sourceImage, transform, {
    ...options,
    createCanvas: options.createCanvas || (() => createBrowserCanvas(options)),
  });
}

export function cloneBrowserTexture(texture, options = {}) {
  return cloneTexture(texture, {
    ...options,
    createCanvas: options.createCanvas || (() => createBrowserCanvas(options)),
  });
}
