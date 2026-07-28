function resolvePixels(imageData) {
  return imageData?.data || imageData;
}

export function findAlphaBounds(imageData, width, height, alphaThreshold = 1) {
  const pixels = resolvePixels(imageData);
  if (!pixels || pixels.length < width * height * 4 || width <= 0 || height <= 0) return null;
  const threshold = Math.min(254, Math.max(1, Math.round(alphaThreshold)));
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let opaquePixels = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < threshold) continue;
      opaquePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    opaquePixels,
  };
}

function cellAlphaMaximum(pixels, imageWidth, bounds, column, row, columns, rows) {
  const x0 = bounds.x + Math.floor((column / columns) * bounds.width);
  const x1 = bounds.x + Math.max(1, Math.ceil(((column + 1) / columns) * bounds.width));
  const y0 = bounds.y + Math.floor((row / rows) * bounds.height);
  const y1 = bounds.y + Math.max(1, Math.ceil(((row + 1) / rows) * bounds.height));
  let maximum = 0;
  for (let y = y0; y < bounds.y + bounds.height && y < y1; y += 1) {
    for (let x = x0; x < bounds.x + bounds.width && x < x1; x += 1) {
      maximum = Math.max(maximum, pixels[(y * imageWidth + x) * 4 + 3]);
      if (maximum === 255) return maximum;
    }
  }
  return maximum;
}

function isInside(mask, columns, rows, column, row) {
  return column >= 0 && row >= 0 && column < columns && row < rows && mask[row * columns + column] === 1;
}

export function computeSilhouetteDistance(mask, columns, rows) {
  const distance = new Float32Array(columns * rows);
  distance.fill(Number.POSITIVE_INFINITY);
  let maxDistance = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (!mask[index]) {
        distance[index] = 0;
        continue;
      }
      const boundary = !isInside(mask, columns, rows, column - 1, row)
        || !isInside(mask, columns, rows, column + 1, row)
        || !isInside(mask, columns, rows, column, row - 1)
        || !isInside(mask, columns, rows, column, row + 1);
      if (boundary) distance[index] = 0.5;
    }
  }

  const diagonal = Math.SQRT2;
  const relax = (index, neighbor, cost) => {
    if (neighbor < 0 || neighbor >= distance.length) return;
    distance[index] = Math.min(distance[index], distance[neighbor] + cost);
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (!mask[index]) continue;
      if (column > 0) relax(index, index - 1, 1);
      if (row > 0) relax(index, index - columns, 1);
      if (column > 0 && row > 0) relax(index, index - columns - 1, diagonal);
      if (column + 1 < columns && row > 0) relax(index, index - columns + 1, diagonal);
    }
  }
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      const index = row * columns + column;
      if (!mask[index]) continue;
      if (column + 1 < columns) relax(index, index + 1, 1);
      if (row + 1 < rows) relax(index, index + columns, 1);
      if (column + 1 < columns && row + 1 < rows) relax(index, index + columns + 1, diagonal);
      if (column > 0 && row + 1 < rows) relax(index, index + columns - 1, diagonal);
      if (Number.isFinite(distance[index])) maxDistance = Math.max(maxDistance, distance[index]);
    }
  }

  const normalizedDistance = new Float32Array(distance.length);
  if (maxDistance > 0) {
    for (let index = 0; index < distance.length; index += 1) {
      if (mask[index]) normalizedDistance[index] = distance[index] / maxDistance;
    }
  }
  return { distance, normalizedDistance, maxDistance };
}

export function buildSilhouetteGrid(imageData, width, height, settings = {}) {
  const pixels = resolvePixels(imageData);
  const alphaThreshold = Math.min(254, Math.max(1, Math.round(Number(settings.alphaThreshold) || 16)));
  const bounds = settings.bounds || findAlphaBounds(pixels, width, height, alphaThreshold);
  if (!bounds) throw new Error('The image is fully transparent at the selected alpha threshold.');

  const density = Math.min(72, Math.max(12, Math.round(Number(settings.density) || 40)));
  const aspect = bounds.width / bounds.height;
  const columns = aspect >= 1 ? density : Math.max(4, Math.round(density * aspect));
  const rows = aspect >= 1 ? Math.max(4, Math.round(density / aspect)) : density;
  const mask = new Uint8Array(columns * rows);
  const sampledAlpha = new Uint8Array(columns * rows);
  let opaqueCells = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const alpha = cellAlphaMaximum(pixels, width, bounds, column, row, columns, rows);
      sampledAlpha[index] = alpha;
      if (alpha >= alphaThreshold) {
        mask[index] = 1;
        opaqueCells += 1;
      }
    }
  }

  if (!opaqueCells) throw new Error('The sampled silhouette contains no opaque cells.');
  const distanceResult = computeSilhouetteDistance(mask, columns, rows);
  return {
    imageWidth: width,
    imageHeight: height,
    bounds: { ...bounds },
    columns,
    rows,
    mask,
    sampledAlpha,
    opaqueCells,
    ...distanceResult,
  };
}
