const BAYER_4X4 = Object.freeze([
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]);

export const TEXTURE_PROCESSING_DEFAULTS = Object.freeze({
  downscaleEnabled: false,
  targetSize: 64,
  palette15Bit: false,
  ditheringEnabled: false,
});

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function sanitizeTargetSize(value) {
  const parsed = Number.parseInt(value, 10);
  if ([32, 64, 128].includes(parsed)) return parsed;
  return TEXTURE_PROCESSING_DEFAULTS.targetSize;
}

export function cloneTextureProcessingSettings(settings = {}) {
  return {
    downscaleEnabled: !!settings.downscaleEnabled,
    targetSize: sanitizeTargetSize(settings.targetSize),
    palette15Bit: !!settings.palette15Bit,
    ditheringEnabled: !!settings.ditheringEnabled,
  };
}

export function createPsxifyTextureSettings(settings = {}) {
  const base = cloneTextureProcessingSettings(settings);
  return {
    ...base,
    downscaleEnabled: true,
    palette15Bit: true,
    ditheringEnabled: true,
  };
}

export function createTextureProcessingPreset(presetId, settings = {}) {
  const base = cloneTextureProcessingSettings(settings);
  const preset = String(presetId || '').trim().toLowerCase();

  switch (preset) {
    case 'psx32':
      return {
        ...base,
        downscaleEnabled: true,
        targetSize: 32,
        palette15Bit: true,
        ditheringEnabled: true,
      };
    case 'psx64':
      return {
        ...base,
        downscaleEnabled: true,
        targetSize: 64,
        palette15Bit: true,
        ditheringEnabled: true,
      };
    case 'n64_64':
      return {
        ...base,
        downscaleEnabled: true,
        targetSize: 64,
        palette15Bit: true,
        ditheringEnabled: false,
      };
    default:
      return base;
  }
}

export function hasTextureProcessing(settings = {}) {
  const normalized = cloneTextureProcessingSettings(settings);
  return normalized.downscaleEnabled || normalized.palette15Bit || normalized.ditheringEnabled;
}

function cloneCanvas(sourceCanvas) {
  if (!(sourceCanvas instanceof HTMLCanvasElement)) return null;
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(sourceCanvas, 0, 0);
  return canvas;
}

function scaleCanvasNearest(sourceCanvas, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function quantizeChannel5Bit(value) {
  return Math.round((clampByte(value) / 255) * 31) * (255 / 31);
}

function getDitherBias(x, y, strength = 18) {
  return ((BAYER_4X4[y % 4][x % 4] / 15) - 0.5) * strength;
}

function applyTexturePixelProcessing(canvas, settings) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = ((y * canvas.width) + x) * 4;
      const alpha = data[index + 3];
      if (alpha === 0) continue;

      let r = data[index];
      let g = data[index + 1];
      let b = data[index + 2];

      if (settings.ditheringEnabled) {
        const bias = getDitherBias(x, y);
        r = clampByte(r + bias);
        g = clampByte(g + bias);
        b = clampByte(b + bias);
      }

      if (settings.palette15Bit || settings.ditheringEnabled) {
        r = clampByte(quantizeChannel5Bit(r));
        g = clampByte(quantizeChannel5Bit(g));
        b = clampByte(quantizeChannel5Bit(b));
      }

      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function resolveProcessedSize(sourceCanvas, settings, options = {}) {
  if (!settings.downscaleEnabled) {
    return {
      width: sourceCanvas.width,
      height: sourceCanvas.height,
    };
  }

  const targetSize = sanitizeTargetSize(settings.targetSize);
  const tileCount = Math.max(1, Number.parseInt(options.tileCount || 1, 10) || 1);
  if (tileCount > 1) {
    return {
      width: targetSize * tileCount,
      height: targetSize,
    };
  }

  if (!sourceCanvas.width || !sourceCanvas.height) {
    return { width: targetSize, height: targetSize };
  }

  const aspect = sourceCanvas.width / sourceCanvas.height;
  if (aspect >= 1) {
    return {
      width: Math.max(1, Math.round(targetSize * aspect)),
      height: targetSize,
    };
  }

  return {
    width: targetSize,
    height: Math.max(1, Math.round(targetSize / aspect)),
  };
}

export function processTextureCanvas(sourceCanvas, settings = {}, options = {}) {
  if (!(sourceCanvas instanceof HTMLCanvasElement)) return null;

  const normalized = cloneTextureProcessingSettings(settings);
  const outputSize = resolveProcessedSize(sourceCanvas, normalized, options);
  let workingCanvas = normalized.downscaleEnabled
    ? scaleCanvasNearest(sourceCanvas, outputSize.width, outputSize.height)
    : cloneCanvas(sourceCanvas);

  if (!workingCanvas) return null;

  if (normalized.palette15Bit || normalized.ditheringEnabled) {
    workingCanvas = applyTexturePixelProcessing(workingCanvas, normalized);
  }

  return {
    canvas: workingCanvas,
    settings: normalized,
    width: workingCanvas.width,
    height: workingCanvas.height,
  };
}
