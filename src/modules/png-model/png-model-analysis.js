function resolvePixels(imageData) {
  return imageData?.data || imageData;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  return clamp(Math.round(Number.isFinite(parsed) ? parsed : fallback), minimum, maximum);
}

export function findAlphaBounds(imageData, width, height, alphaThreshold = 1) {
  const pixels = resolvePixels(imageData);
  if (!pixels || pixels.length < width * height * 4 || width <= 0 || height <= 0) return null;
  const threshold = boundedInteger(alphaThreshold, 1, 1, 254);
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

function cellPixelRange(bounds, column, row, columns, rows) {
  const left = bounds.x + (column / columns) * bounds.width;
  const right = bounds.x + ((column + 1) / columns) * bounds.width;
  const top = bounds.y + (row / rows) * bounds.height;
  const bottom = bounds.y + ((row + 1) / rows) * bounds.height;
  return {
    left,
    right,
    top,
    bottom,
    firstX: Math.floor(left),
    lastX: Math.ceil(right) - 1,
    firstY: Math.floor(top),
    lastY: Math.ceil(bottom) - 1,
    area: Math.max(Number.EPSILON, (right - left) * (bottom - top)),
  };
}

function sampleCellCoverage(
  pixels,
  imageWidth,
  bounds,
  column,
  row,
  columns,
  rows,
  alphaThreshold,
) {
  const range = cellPixelRange(bounds, column, row, columns, rows);
  let alphaArea = 0;
  let coveredArea = 0;

  for (let y = range.firstY; y <= range.lastY; y += 1) {
    if (y < bounds.y || y >= bounds.y + bounds.height) continue;
    const overlapY = Math.max(0, Math.min(range.bottom, y + 1) - Math.max(range.top, y));
    if (!overlapY) continue;
    for (let x = range.firstX; x <= range.lastX; x += 1) {
      if (x < bounds.x || x >= bounds.x + bounds.width) continue;
      const overlapX = Math.max(0, Math.min(range.right, x + 1) - Math.max(range.left, x));
      const area = overlapX * overlapY;
      if (!area) continue;
      const alpha = pixels[(y * imageWidth + x) * 4 + 3];
      if (alpha < alphaThreshold) continue;
      coveredArea += area;
      alphaArea += area * (alpha / 255);
    }
  }

  return {
    coverage: clamp(alphaArea / range.area, 0, 1),
    occupiedCoverage: clamp(coveredArea / range.area, 0, 1),
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
  return column >= 0 && row >= 0 && column < columns && row < rows
    && mask[row * columns + column] === 1;
}

function labelComponents(mask, columns, rows) {
  const labels = new Int32Array(mask.length);
  labels.fill(-1);
  const components = [];
  const queue = new Int32Array(mask.length);

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || labels[start] !== -1) continue;
    const component = {
      id: components.length,
      cells: [],
      minColumn: columns,
      maxColumn: -1,
      minRow: rows,
      maxRow: -1,
    };
    let read = 0;
    let write = 0;
    queue[write] = start;
    write += 1;
    labels[start] = component.id;

    while (read < write) {
      const index = queue[read];
      read += 1;
      const column = index % columns;
      const row = Math.floor(index / columns);
      component.cells.push(index);
      component.minColumn = Math.min(component.minColumn, column);
      component.maxColumn = Math.max(component.maxColumn, column);
      component.minRow = Math.min(component.minRow, row);
      component.maxRow = Math.max(component.maxRow, row);

      const neighbors = [
        column > 0 ? index - 1 : -1,
        column + 1 < columns ? index + 1 : -1,
        row > 0 ? index - columns : -1,
        row + 1 < rows ? index + columns : -1,
      ];
      neighbors.forEach((neighbor) => {
        if (neighbor < 0 || !mask[neighbor] || labels[neighbor] !== -1) return;
        labels[neighbor] = component.id;
        queue[write] = neighbor;
        write += 1;
      });
    }

    component.size = component.cells.length;
    component.bounds = {
      column: component.minColumn,
      row: component.minRow,
      columns: component.maxColumn - component.minColumn + 1,
      rows: component.maxRow - component.minRow + 1,
    };
    components.push(component);
  }

  return { labels, components };
}

function cleanComponents(mask, columns, rows, settings = {}) {
  const raw = labelComponents(mask, columns, rows);
  if (!raw.components.length) {
    return {
      mask,
      componentLabels: raw.labels,
      components: [],
      originalComponentCount: 0,
      removedCells: 0,
    };
  }

  const mode = settings.componentMode === 'all' ? 'all' : 'largest';
  const minCells = boundedInteger(settings.minComponentCells, 2, 1, mask.length);
  const largest = raw.components.reduce((winner, component) => (
    component.size > winner.size ? component : winner
  ), raw.components[0]);
  let selected = mode === 'all'
    ? raw.components.filter((component) => component.size >= minCells)
    : [largest];
  // A valid one-pixel subject must never disappear merely because the cleanup
  // threshold is larger than the complete crop.
  if (!selected.length) selected = [largest];

  const cleanMask = new Uint8Array(mask.length);
  selected.forEach((component) => {
    component.cells.forEach((index) => { cleanMask[index] = 1; });
  });
  const relabeled = labelComponents(cleanMask, columns, rows);
  const keptCells = relabeled.components.reduce((total, component) => total + component.size, 0);
  const originalCells = raw.components.reduce((total, component) => total + component.size, 0);
  return {
    mask: cleanMask,
    componentLabels: relabeled.labels,
    components: relabeled.components,
    originalComponentCount: raw.components.length,
    removedCells: originalCells - keptCells,
  };
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

function resolveGridDimensions(bounds, density, algorithmVersion) {
  if (algorithmVersion === 1) {
    const legacyDensity = boundedInteger(density, 40, 12, 72);
    const aspect = bounds.width / bounds.height;
    return {
      columns: aspect >= 1 ? legacyDensity : Math.max(4, Math.round(legacyDensity * aspect)),
      rows: aspect >= 1 ? Math.max(4, Math.round(legacyDensity / aspect)) : legacyDensity,
    };
  }

  const maximumDimension = Math.max(bounds.width, bounds.height);
  const targetLongestSide = boundedInteger(density, 40, 1, 72);
  const scale = Math.min(1, targetLongestSide / maximumDimension);
  return {
    columns: clamp(Math.round(bounds.width * scale), 1, bounds.width),
    rows: clamp(Math.round(bounds.height * scale), 1, bounds.height),
  };
}

export function buildSilhouetteGrid(imageData, width, height, settings = {}) {
  const pixels = resolvePixels(imageData);
  const alphaThreshold = boundedInteger(settings.alphaThreshold, 16, 1, 254);
  const bounds = settings.bounds || findAlphaBounds(pixels, width, height, alphaThreshold);
  if (!bounds) throw new Error('The image is fully transparent at the selected alpha threshold.');

  const algorithmVersion = Number(settings.algorithmVersion) === 1 ? 1 : 2;
  const { columns, rows } = resolveGridDimensions(bounds, settings.density, algorithmVersion);
  const mask = new Uint8Array(columns * rows);
  const sampledAlpha = new Uint8Array(columns * rows);
  const sampledCoverage = new Float32Array(columns * rows);
  const occupiedCoverage = new Float32Array(columns * rows);
  const coverageThreshold = clamp(
    Number.isFinite(Number(settings.coverageThreshold)) ? Number(settings.coverageThreshold) : 0.2,
    0.01,
    1,
  );

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      if (algorithmVersion === 1) {
        const alpha = cellAlphaMaximum(pixels, width, bounds, column, row, columns, rows);
        sampledAlpha[index] = alpha;
        sampledCoverage[index] = alpha / 255;
        occupiedCoverage[index] = alpha >= alphaThreshold ? 1 : 0;
        if (alpha >= alphaThreshold) mask[index] = 1;
        continue;
      }
      const sample = sampleCellCoverage(
        pixels,
        width,
        bounds,
        column,
        row,
        columns,
        rows,
        alphaThreshold,
      );
      sampledCoverage[index] = sample.coverage;
      occupiedCoverage[index] = sample.occupiedCoverage;
      sampledAlpha[index] = Math.round(sample.coverage * 255);
      if (sample.coverage >= coverageThreshold) mask[index] = 1;
    }
  }

  if (!mask.some(Boolean)) {
    throw new Error('The sampled silhouette contains no opaque cells.');
  }

  const cleaned = algorithmVersion === 1
    ? cleanComponents(mask, columns, rows, { componentMode: 'all', minComponentCells: 1 })
    : cleanComponents(mask, columns, rows, settings);
  const opaqueCells = cleaned.components.reduce((total, component) => total + component.size, 0);
  if (!opaqueCells) throw new Error('The sampled silhouette contains no opaque cells after cleanup.');
  const distanceResult = computeSilhouetteDistance(cleaned.mask, columns, rows);

  return {
    imageWidth: width,
    imageHeight: height,
    bounds: { ...bounds },
    algorithmVersion,
    columns,
    rows,
    mask: cleaned.mask,
    sampledAlpha,
    sampledCoverage,
    occupiedCoverage,
    coverageThreshold,
    opaqueCells,
    componentLabels: cleaned.componentLabels,
    components: cleaned.components.map((component) => ({
      id: component.id,
      size: component.size,
      bounds: { ...component.bounds },
    })),
    componentCount: cleaned.components.length,
    originalComponentCount: cleaned.originalComponentCount,
    removedCells: cleaned.removedCells,
    ...distanceResult,
  };
}
