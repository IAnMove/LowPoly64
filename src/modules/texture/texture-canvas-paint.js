export function fillTextureCanvas(ctx, canvasSize, fillStyle = '#ffffff') {
  if (!ctx) return;
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
}

export function drawImageToTextureCanvas(ctx, image, canvasSize) {
  if (!ctx || !image) return;
  ctx.clearRect(0, 0, canvasSize, canvasSize);
  ctx.drawImage(image, 0, 0, canvasSize, canvasSize);
}

export function drawSourceImageToTextureCanvas({
  ctx,
  canvas,
  sourceImage,
  canvasSize,
  cloneCanvas,
  fallbackFill = '#ffffff',
}) {
  if (!ctx || !sourceImage) return;

  const sourceIsSameCanvas = sourceImage === canvas;
  const source = sourceIsSameCanvas ? cloneCanvas(sourceImage) : sourceImage;

  if (!source) {
    fillTextureCanvas(ctx, canvasSize, fallbackFill);
    return;
  }

  ctx.drawImage(source, 0, 0, canvasSize, canvasSize);
}

export function getTextureCanvasPosition(canvas, canvasSize, event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvasSize / rect.width;
  const scaleY = canvasSize / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function sampleTextureCanvasHex(ctx, x, y) {
  const px = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  return '#' + [px[0], px[1], px[2]].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export function removeColorRangeFromCanvas(ctx, canvasSize, hexColor, tolerance) {
  if (!ctx) return false;
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const tol = Math.max(0, Math.min(255, parseInt(tolerance) || 30));

  const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    if (Math.abs(data[index] - r) + Math.abs(data[index + 1] - g) + Math.abs(data[index + 2] - b) <= tol * 3) {
      data[index + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return true;
}

export function paintBrushDot(ctx, x, y, { radius, brushColor, eraserMode }) {
  if (!ctx) return;
  ctx.beginPath();
  if (eraserMode) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = brushColor;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function paintBrushLine(ctx, x1, y1, x2, y2, options) {
  const radius = options.radius;
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    paintBrushDot(ctx, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, options);
  }
}
