import {
  CONNECTIONS,
  EDITABLE_LANDMARK_INDICES,
} from './motion-ripper-constants.js';

export function projectLandmark(landmark, rect) {
  return {
    x: rect.x + landmark.x * rect.width,
    y: rect.y + landmark.y * rect.height,
  };
}

export function getContainedVideoRect(canvasWidth, canvasHeight, videoWidth, videoHeight) {
  const canvasAspect = canvasWidth / canvasHeight;
  const videoAspect = videoWidth / videoHeight;

  if (!Number.isFinite(videoAspect) || videoAspect <= 0) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  if (videoAspect > canvasAspect) {
    const width = canvasWidth;
    const height = width / videoAspect;
    return { x: 0, y: (canvasHeight - height) / 2, width, height };
  }

  const height = canvasHeight;
  const width = height * videoAspect;
  return { x: (canvasWidth - width) / 2, y: 0, width, height };
}

function drawLandmarkRig(context, rect, landmarks, {
  lineColor = 'rgba(0, 255, 204, 0.95)',
  pointColor = 'rgba(255, 204, 0, 0.95)',
  pointRadius = 4.5,
  lineWidth = 3,
  dashed = false,
  highlightIndex = -1,
  highlightColor = 'rgba(0, 255, 136, 1)',
} = {}) {
  if (!Array.isArray(landmarks)) return;

  context.save();
  context.shadowBlur = 0;
  context.lineCap = 'round';
  context.lineWidth = lineWidth;
  context.strokeStyle = lineColor;
  if (dashed) {
    context.setLineDash([8, 6]);
  }

  CONNECTIONS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!start || !end) return;
    const startPoint = projectLandmark(start, rect);
    const endPoint = projectLandmark(end, rect);
    context.beginPath();
    context.moveTo(startPoint.x, startPoint.y);
    context.lineTo(endPoint.x, endPoint.y);
    context.stroke();
  });

  if (dashed) {
    context.setLineDash([]);
  }

  EDITABLE_LANDMARK_INDICES.forEach((index) => {
    const landmark = landmarks[index];
    if (!landmark) return;
    const point = projectLandmark(landmark, rect);
    const selected = index === highlightIndex;
    context.beginPath();
    context.fillStyle = selected ? highlightColor : pointColor;
    context.arc(point.x, point.y, selected ? pointRadius + 1.5 : pointRadius, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawFrameEditOverlay(context, rect, originalLandmarks, workingLandmarks, draggingLandmarkIndex) {
  context.save();
  context.fillStyle = 'rgba(0, 0, 0, 0.74)';
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();

  drawLandmarkRig(context, rect, originalLandmarks, {
    lineColor: 'rgba(255, 184, 0, 0.45)',
    pointColor: 'rgba(255, 184, 0, 0.45)',
    pointRadius: 3.5,
    lineWidth: 2,
    dashed: true,
  });

  drawLandmarkRig(context, rect, workingLandmarks, {
    lineColor: 'rgba(0, 255, 204, 0.95)',
    pointColor: 'rgba(255, 204, 0, 0.95)',
    pointRadius: 4.5,
    lineWidth: 3,
    highlightIndex: draggingLandmarkIndex,
  });

  context.save();
  context.fillStyle = 'rgba(0, 208, 255, 0.95)';
  context.font = "10px 'Press Start 2P', monospace";
  context.textBaseline = 'top';
  context.fillText('EDIT FRAME', rect.x + 8, rect.y + 8);
  context.fillStyle = 'rgba(255, 184, 0, 0.95)';
  context.fillText('ORANGE = ORIGINAL', rect.x + 8, rect.y + 24);
  context.fillStyle = 'rgba(0, 255, 204, 0.95)';
  context.fillText('CYAN = EDITED', rect.x + 8, rect.y + 40);
  context.restore();
}

function drawCaptureAreaOverlay(context, rect, captureCropState) {
  const region = captureCropState.draftRegion || captureCropState.region;
  const showPrompt = captureCropState.selecting && !region;
  if (!region && !showPrompt) return;

  context.save();
  context.shadowBlur = 0;

  if (region) {
    const x = rect.x + region.x * rect.width;
    const y = rect.y + region.y * rect.height;
    const width = region.width * rect.width;
    const height = region.height * rect.height;

    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.rect(x, y, width, height);
    context.fill('evenodd');

    context.strokeStyle = captureCropState.selecting ? 'rgba(0, 208, 255, 1)' : 'rgba(255, 204, 0, 1)';
    context.lineWidth = 2;
    context.setLineDash([8, 5]);
    context.strokeRect(x, y, width, height);
    context.setLineDash([]);

    context.fillStyle = captureCropState.selecting ? 'rgba(0, 208, 255, 0.95)' : 'rgba(255, 204, 0, 0.95)';
    context.font = "10px 'Press Start 2P', monospace";
    context.textBaseline = 'top';
    context.fillText(captureCropState.selecting ? 'DRAWING AREA' : 'CAPTURE AREA', x + 6, Math.max(rect.y + 6, y + 6));
  } else if (showPrompt) {
    context.strokeStyle = 'rgba(0, 208, 255, 0.95)';
    context.lineWidth = 2;
    context.setLineDash([8, 5]);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
    context.setLineDash([]);
    context.fillStyle = 'rgba(0, 208, 255, 0.95)';
    context.font = "10px 'Press Start 2P', monospace";
    context.textBaseline = 'top';
    context.fillText('DRAG TO SELECT AREA', rect.x + 8, rect.y + 8);
  }

  context.restore();
}

export function drawMotionRipperOverlay({
  overlay,
  video,
  landmarks = null,
  frameEditState,
  captureCropState,
  originalLandmarks,
  workingLandmarks,
  isReliableLandmark,
}) {
  if (!overlay || !video) return;

  const context = overlay.getContext('2d');
  const width = overlay.width;
  const height = overlay.height;
  context.clearRect(0, 0, width, height);

  const rect = getContainedVideoRect(width, height, video.videoWidth || 1, video.videoHeight || 1);
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(0, 255, 204, 0.95)';
  context.shadowBlur = 14;
  context.shadowColor = 'rgba(0, 255, 204, 0.38)';

  if (frameEditState.active) {
    drawFrameEditOverlay(context, rect, originalLandmarks, workingLandmarks, frameEditState.draggingLandmarkIndex);
    drawCaptureAreaOverlay(context, rect, captureCropState);
    return;
  }

  if (Array.isArray(landmarks)) {
    CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!isReliableLandmark(start) || !isReliableLandmark(end)) return;
      const startPoint = projectLandmark(start, rect);
      const endPoint = projectLandmark(end, rect);
      context.beginPath();
      context.moveTo(startPoint.x, startPoint.y);
      context.lineTo(endPoint.x, endPoint.y);
      context.stroke();
    });

    context.shadowBlur = 0;
    landmarks.forEach((landmark) => {
      if (!isReliableLandmark(landmark)) return;
      const point = projectLandmark(landmark, rect);
      context.beginPath();
      context.fillStyle = 'rgba(255, 204, 0, 0.95)';
      context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
      context.fill();
    });
  }

  drawCaptureAreaOverlay(context, rect, captureCropState);
}
