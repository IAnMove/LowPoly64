export function getMotionRipperDetectionSource(ui, captureCropState) {
  const region = captureCropState.region;
  if (!region || !ui.video) {
    return { source: ui.video, region: null };
  }

  const videoWidth = Math.max(1, ui.video.videoWidth || 1);
  const videoHeight = Math.max(1, ui.video.videoHeight || 1);
  const cropWidth = Math.max(1, region.width * videoWidth);
  const cropHeight = Math.max(1, region.height * videoHeight);
  const canvas = ensureTrackingCanvas(captureCropState, cropWidth, cropHeight);
  const context = captureCropState.processingContext;
  const width = canvas.width;
  const height = canvas.height;
  const sx = region.x * videoWidth;
  const sy = region.y * videoHeight;
  const sw = Math.max(1, cropWidth);
  const sh = Math.max(1, cropHeight);

  context.clearRect(0, 0, width, height);
  context.drawImage(ui.video, sx, sy, sw, sh, 0, 0, width, height);
  return { source: canvas, region };
}

function ensureTrackingCanvas(captureCropState, width = 1, height = 1) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  if (!captureCropState.processingCanvas) {
    captureCropState.processingCanvas = document.createElement('canvas');
    captureCropState.processingContext = captureCropState.processingCanvas.getContext('2d', { willReadFrequently: false });
  }
  if (captureCropState.processingCanvas.width !== safeWidth || captureCropState.processingCanvas.height !== safeHeight) {
    captureCropState.processingCanvas.width = safeWidth;
    captureCropState.processingCanvas.height = safeHeight;
  }
  return captureCropState.processingCanvas;
}
