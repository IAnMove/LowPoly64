export const TEXTURE_CANVAS_SIZE = 256;
export const TEXTURE_BRUSH_SIZES = [2, 5, 10, 18, 30];
export const TEXTURE_DEFAULT_PALETTE = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0088ff',
  '#ffcc00', '#ff8800', '#aa00ff', '#ff69b4', '#00ffcc',
  '#8b4513', '#808080', '#c0c0c0', '#004400', '#000066',
];

export function getBrushRadius(brushSizeIndex, brushSizes = TEXTURE_BRUSH_SIZES) {
  return brushSizes[brushSizeIndex] ?? brushSizes[0];
}

export function getCanvasPointerPosition(event, canvas, canvasSize = TEXTURE_CANVAS_SIZE) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasSize / rect.width;
  const scaleY = canvasSize / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function getBrushStrokePoints(start, end, radius) {
  const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  const steps = Math.max(1, Math.ceil(dist / (radius * 0.5)));
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    });
  }
  return points;
}
