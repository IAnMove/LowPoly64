export function resolveLocalVideoSpeed(value, allowedSpeeds, fallbackSpeed) {
  const speed = Number.parseFloat(value);
  return allowedSpeeds.includes(speed) ? speed : fallbackSpeed;
}

export function getLocalVideoFrameStepSeconds(value) {
  const fps = Number.parseFloat(value || '30');
  const safeFps = Math.max(1, Math.min(Number.isFinite(fps) && fps > 0 ? fps : 30, 120));
  return 1 / safeFps;
}

export function formatVideoTime(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

export function remapLandmarksFromCaptureRegion(landmarks, region) {
  if (!Array.isArray(landmarks) || !region) return landmarks;
  const zScale = Math.max(Math.sqrt(region.width * region.height), 0.001);
  return landmarks.map((landmark) => ({
    ...landmark,
    x: region.x + (landmark.x ?? 0) * region.width,
    y: region.y + (landmark.y ?? 0) * region.height,
    z: (landmark.z ?? 0) * zScale,
  }));
}
