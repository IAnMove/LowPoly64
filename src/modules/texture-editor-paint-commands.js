import { getBrushStrokePoints } from './texture-editor-paint-core.js';

export function drawBrushDot(context, {
  x,
  y,
  radius,
  color,
  eraserMode = false,
  backgroundColor = '#ffffff',
} = {}) {
  context.beginPath();
  if (eraserMode) {
    context.globalCompositeOperation = 'destination-out';
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = backgroundColor;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.fillStyle = color;
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

export function drawBrushStroke(context, {
  start,
  end,
  radius,
  color,
  eraserMode = false,
  backgroundColor = '#ffffff',
  getStrokePoints = getBrushStrokePoints,
} = {}) {
  const points = getStrokePoints(start, end, radius);
  points.forEach((point) => drawBrushDot(context, {
    x: point.x,
    y: point.y,
    radius,
    color,
    eraserMode,
    backgroundColor,
  }));
  return points;
}
