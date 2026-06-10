import { drawMotionRipperOverlay } from './motion-ripper-overlay.js';

export function setMotionRipperStatus(ui, message, tone = 'info') {
  if (!ui.statusText) return;
  ui.statusText.textContent = message;
  ui.statusText.className = tone === 'error'
    ? 'text-rose-300 text-[10px] leading-relaxed'
    : tone === 'success'
      ? 'text-emerald-300 text-[10px] leading-relaxed'
      : 'text-zinc-300 text-[10px] leading-relaxed';
}

export function resizeMotionRipperOverlayCanvas(ui) {
  if (!ui.overlay) return;
  const width = ui.overlay.clientWidth || 1;
  const height = ui.overlay.clientHeight || 1;
  if (ui.overlay.width !== width || ui.overlay.height !== height) {
    ui.overlay.width = width;
    ui.overlay.height = height;
  }
}

export function clearMotionRipperOverlay(ui) {
  if (!ui.overlay) return;
  resizeMotionRipperOverlayCanvas(ui);
  const context = ui.overlay.getContext('2d');
  context.clearRect(0, 0, ui.overlay.width, ui.overlay.height);
}

export function drawMotionRipperOverlayView({
  ui,
  landmarks = null,
  frameEditState,
  captureCropState,
  originalLandmarks,
  workingLandmarks,
  isReliableLandmark,
}) {
  if (!ui.overlay || !ui.video) return;
  resizeMotionRipperOverlayCanvas(ui);
  drawMotionRipperOverlay({
    overlay: ui.overlay,
    video: ui.video,
    landmarks,
    frameEditState,
    captureCropState,
    originalLandmarks,
    workingLandmarks,
    isReliableLandmark,
  });
}
