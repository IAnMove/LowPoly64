import { sampleDepthMap } from './png-model-depth-map.js';
import { normalizePngModelSettings } from './png-model-metadata.js';

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isInside(grid, column, row) {
  return column >= 0 && row >= 0 && column < grid.columns && row < grid.rows
    && grid.mask[row * grid.columns + column] === 1;
}

function componentAt(grid, column, row) {
  if (!isInside(grid, column, row)) return -1;
  const label = grid.componentLabels?.[row * grid.columns + column];
  return Number.isInteger(label) && label >= 0 ? label : 0;
}

function resolveGeometrySettings(rawSettings = {}) {
  const normalized = normalizePngModelSettings(rawSettings);
  const value = (name, fallback) => {
    const raw = Number(rawSettings[name] ?? normalized[name]);
    return Number.isFinite(raw) ? raw : fallback;
  };
  return {
    ...normalized,
    algorithmVersion: value('algorithmVersion', 2) === 1 ? 1 : 2,
    edgeDepth: clamp(value('edgeDepth', 0.03), 0, 0.25),
    edgeFalloff: clamp(value('edgeFalloff', 0.18), 0.02, 0.8),
  };
}

function pointDepthSource(grid, column, row) {
  let total = 0;
  let count = 0;
  for (let offsetY = -1; offsetY <= 0; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 0; offsetX += 1) {
      const cellX = column + offsetX;
      const cellY = row + offsetY;
      if (!isInside(grid, cellX, cellY)) continue;
      total += grid.normalizedDistance[cellY * grid.columns + cellX];
      count += 1;
    }
  }
  return count ? total / count : 0;
}

function collectTopology(grid) {
  const pointCount = (grid.columns + 1) * (grid.rows + 1);
  const used = new Uint8Array(pointCount);
  const boundaryPoints = new Uint8Array(pointCount);
  const boundaryEdges = [];
  const pointIndex = (column, row) => row * (grid.columns + 1) + column;
  const markCellPoints = (column, row) => {
    used[pointIndex(column, row)] = 1;
    used[pointIndex(column + 1, row)] = 1;
    used[pointIndex(column, row + 1)] = 1;
    used[pointIndex(column + 1, row + 1)] = 1;
  };
  const addBoundary = (component, aColumn, aRow, bColumn, bRow) => {
    const aPoint = pointIndex(aColumn, aRow);
    const bPoint = pointIndex(bColumn, bRow);
    boundaryPoints[aPoint] = 1;
    boundaryPoints[bPoint] = 1;
    boundaryEdges.push({
      component,
      aColumn,
      aRow,
      bColumn,
      bRow,
      aPoint,
      bPoint,
    });
  };

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!isInside(grid, column, row)) continue;
      markCellPoints(column, row);
      const component = componentAt(grid, column, row);
      if (!isInside(grid, column - 1, row)) addBoundary(component, column, row, column, row + 1);
      if (!isInside(grid, column, row + 1)) addBoundary(component, column, row + 1, column + 1, row + 1);
      if (!isInside(grid, column + 1, row)) addBoundary(component, column + 1, row + 1, column + 1, row);
      if (!isInside(grid, column, row - 1)) addBoundary(component, column + 1, row, column, row);
    }
  }
  return { used, boundaryPoints, boundaryEdges };
}

function buildBoundaryProjection(grid, settings, topology) {
  const projected = new Map();
  const pointIndex = (column, row) => row * (grid.columns + 1) + column;
  const keyFor = (component, column, row) => `${component}:${pointIndex(column, row)}`;
  if (settings.algorithmVersion === 1 || !grid.sampledCoverage?.length) return projected;

  const candidates = new Map();
  topology.boundaryEdges.forEach((edge) => {
    candidates.set(keyFor(edge.component, edge.aColumn, edge.aRow), {
      component: edge.component,
      column: edge.aColumn,
      row: edge.aRow,
    });
    candidates.set(keyFor(edge.component, edge.bColumn, edge.bRow), {
      component: edge.component,
      column: edge.bColumn,
      row: edge.bRow,
    });
  });

  candidates.forEach(({ component, column, row }, key) => {
    let vectorX = 0;
    let vectorY = 0;
    let missingTotal = 0;
    let adjacentCells = 0;
    for (let offsetY = -1; offsetY <= 0; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 0; offsetX += 1) {
        const cellColumn = column + offsetX;
        const cellRow = row + offsetY;
        if (componentAt(grid, cellColumn, cellRow) !== component) continue;
        const coverage = clamp(
          Number(grid.sampledCoverage[cellRow * grid.columns + cellColumn]) || 0,
          0,
          1,
        );
        const missing = 1 - coverage;
        vectorX += (cellColumn + 0.5 - column) * missing;
        vectorY += (cellRow + 0.5 - row) * missing;
        missingTotal += missing;
        adjacentCells += 1;
      }
    }

    if (!adjacentCells || missingTotal <= Number.EPSILON) return;
    const averageMissing = missingTotal / adjacentCells;
    const directionX = vectorX / missingTotal;
    const directionY = vectorY / missingTotal;
    // Staying below half a cell prevents neighboring corners from crossing,
    // even for a barely accepted coverage cell.
    const maximumInset = 0.4;
    const projectionStrength = 0.9;
    const offsetX = clamp(directionX * averageMissing * projectionStrength, -maximumInset, maximumInset);
    const offsetY = clamp(directionY * averageMissing * projectionStrength, -maximumInset, maximumInset);
    projected.set(key, {
      column: column + offsetX,
      row: row + offsetY,
      offset: Math.hypot(offsetX, offsetY),
    });
  });
  return projected;
}

function smoothPointDepths(depths, used, boundaryPoints, columns, rows, passes, options = {}) {
  let current = depths;
  const lockBoundary = options.lockBoundary === true;
  const minimum = options.minimum ?? Number.NEGATIVE_INFINITY;
  const maximum = options.maximum ?? Number.POSITIVE_INFINITY;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const index = row * (columns + 1) + column;
        if (!used[index] || (lockBoundary && boundaryPoints[index])) continue;
        let total = current[index] * 2;
        let count = 2;
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
          const x = column + dx;
          const y = row + dy;
          if (x < 0 || y < 0 || x > columns || y > rows) return;
          const neighbor = y * (columns + 1) + x;
          if (!used[neighbor]) return;
          total += current[neighbor];
          count += 1;
        });
        next[index] = clamp(total / count, minimum, maximum);
      }
    }
    current = next;
  }
  return current;
}

function automaticDepth(distance, settings) {
  const normalized = clamp(distance, 0, 1);
  if (settings.depthProfile === 'organic') {
    const roundedCrossSection = Math.sqrt(normalized * (2 - normalized));
    return Math.pow(roundedCrossSection, settings.bulge);
  }
  if (settings.depthProfile === 'relief') {
    return Math.pow(normalized, Math.max(1, settings.bulge)) * 0.55;
  }
  return Math.pow(normalized, settings.bulge);
}

function smoothStep(value) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function buildLegacyPointDepths(grid, settings, depthMap, topology) {
  const depths = new Float64Array(topology.used.length);
  const minimum = settings.thickness * 0.06;
  const maximum = settings.thickness * 0.5;
  for (let row = 0; row <= grid.rows; row += 1) {
    for (let column = 0; column <= grid.columns; column += 1) {
      const index = row * (grid.columns + 1) + column;
      if (!topology.used[index]) continue;
      const automatic = automaticDepth(pointDepthSource(grid, column, row), settings);
      const manual = sampleDepthMap(depthMap, column / grid.columns, row / grid.rows);
      depths[index] = Math.max(
        settings.thickness * 0.015,
        minimum + (maximum - minimum) * automatic + maximum * manual * settings.manualStrength,
      );
    }
  }
  return smoothPointDepths(
    depths,
    topology.used,
    topology.boundaryPoints,
    grid.columns,
    grid.rows,
    settings.smoothing,
  );
}

function buildV2PointDepths(grid, settings, depthMap, topology) {
  const depths = new Float64Array(topology.used.length);
  const maximum = settings.thickness * 0.5;
  const edge = maximum * settings.edgeDepth;

  for (let row = 0; row <= grid.rows; row += 1) {
    for (let column = 0; column <= grid.columns; column += 1) {
      const index = row * (grid.columns + 1) + column;
      if (!topology.used[index]) continue;
      if (topology.boundaryPoints[index]) {
        depths[index] = edge;
        continue;
      }
      const distance = pointDepthSource(grid, column, row);
      const taper = settings.edgeFalloff > 0
        ? smoothStep(distance / settings.edgeFalloff)
        : 1;
      const automatic = automaticDepth(distance, settings);
      // Preserve a small amount of headroom for the Inflate brush. The setting
      // remains a strict ceiling, while an untouched automatic model does not
      // arrive pre-saturated and can still respond visibly to manual sculpting.
      const automaticCeiling = 0.92;
      const baseRatio = settings.edgeDepth
        + (automaticCeiling - settings.edgeDepth) * automatic * taper;
      const manual = sampleDepthMap(depthMap, column / grid.columns, row / grid.rows);
      const manualRatio = manual * settings.manualStrength * taper * (1 - settings.edgeDepth);
      const ratio = clamp(baseRatio + manualRatio, settings.edgeDepth, 1);
      depths[index] = maximum * ratio;
    }
  }

  const smoothed = smoothPointDepths(
    depths,
    topology.used,
    topology.boundaryPoints,
    grid.columns,
    grid.rows,
    settings.smoothing,
    {
      lockBoundary: true,
      minimum: edge,
      maximum,
    },
  );
  for (let index = 0; index < smoothed.length; index += 1) {
    if (!topology.used[index]) continue;
    smoothed[index] = topology.boundaryPoints[index]
      ? edge
      : clamp(smoothed[index], edge, maximum);
  }
  return smoothed;
}

function buildPointDepths(grid, settings, depthMap, topology) {
  return settings.algorithmVersion === 1
    ? buildLegacyPointDepths(grid, settings, depthMap, topology)
    : buildV2PointDepths(grid, settings, depthMap, topology);
}

function createGeometryBucket() {
  return { vertices: [], faces: [], uvs: [] };
}

function pushVertex(bucket, vertex, uv) {
  bucket.vertices.push(vertex);
  bucket.uvs.push(uv);
  return bucket.vertices.length - 1;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const blend = position - lower;
  return sorted[lower] * (1 - blend) + sorted[upper] * blend;
}

function countComponents(grid) {
  if (Number.isInteger(grid.componentCount)) return grid.componentCount;
  if (!grid.componentLabels?.length) return grid.opaqueCells ? 1 : 0;
  return new Set(Array.from(grid.componentLabels).filter((value) => value >= 0)).size;
}

function polygonArea(points) {
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.column * next.row - next.column * current.row;
  }
  return Math.abs(doubledArea) * 0.5;
}

function measureSilhouetteCoverageError(grid, projectedCoordinates) {
  let before = 0;
  let after = 0;
  let samples = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!isInside(grid, column, row)) continue;
      const component = componentAt(grid, column, row);
      const desired = grid.sampledCoverage?.length
        ? clamp(Number(grid.sampledCoverage[row * grid.columns + column]) || 0, 0, 1)
        : 1;
      const area = polygonArea([
        projectedCoordinates(component, column, row),
        projectedCoordinates(component, column + 1, row),
        projectedCoordinates(component, column + 1, row + 1),
        projectedCoordinates(component, column, row + 1),
      ]);
      before += Math.abs(1 - desired);
      after += Math.abs(area - desired);
      samples += 1;
    }
  }
  return {
    before: samples ? before / samples : 0,
    after: samples ? after / samples : 0,
  };
}

export function generateInflatedPngGeometry(grid, rawSettings = {}, depthMap) {
  if (!grid?.mask || !grid.columns || !grid.rows) throw new Error('A valid silhouette grid is required.');
  const settings = resolveGeometrySettings(rawSettings);
  const cropAspect = grid.bounds.width / grid.bounds.height;
  const width = cropAspect >= 1 ? settings.targetSize : settings.targetSize * cropAspect;
  const height = cropAspect >= 1 ? settings.targetSize / cropAspect : settings.targetSize;
  const topology = collectTopology(grid);
  const depths = buildPointDepths(grid, settings, depthMap, topology);
  const boundaryProjection = buildBoundaryProjection(grid, settings, topology);
  const surface = createGeometryBucket();
  const sides = createGeometryBucket();
  const surfaceFront = new Map();
  const surfaceBack = new Map();
  const sideFront = new Map();
  const sideBack = new Map();
  const pointIndex = (column, row) => row * (grid.columns + 1) + column;
  const vertexKey = (component, point) => `${component}:${point}`;
  const projectedCoordinates = (component, column, row) => (
    boundaryProjection.get(vertexKey(component, pointIndex(column, row))) || { column, row, offset: 0 }
  );

  const sourceUv = (column, row, mirror = false) => {
    const fractionX = mirror ? 1 - column / grid.columns : column / grid.columns;
    const sourceX = grid.bounds.x + fractionX * grid.bounds.width;
    const sourceY = grid.bounds.y + (row / grid.rows) * grid.bounds.height;
    return [sourceX / grid.imageWidth, sourceY / grid.imageHeight];
  };
  const position = (column, row, z) => [
    (column / grid.columns - 0.5) * width,
    (0.5 - row / grid.rows) * height,
    z,
  ];
  const getSurfacePair = (component, column, row) => {
    const point = pointIndex(column, row);
    const key = vertexKey(component, point);
    if (!surfaceFront.has(key)) {
      const depth = depths[point];
      const projected = projectedCoordinates(component, column, row);
      surfaceFront.set(key, pushVertex(
        surface,
        position(projected.column, projected.row, depth),
        sourceUv(projected.column, projected.row),
      ));
      surfaceBack.set(key, pushVertex(
        surface,
        position(projected.column, projected.row, -depth),
        sourceUv(projected.column, projected.row, settings.mirrorBack),
      ));
    }
    return { front: surfaceFront.get(key), back: surfaceBack.get(key) };
  };
  const getSidePair = (component, column, row) => {
    const point = pointIndex(column, row);
    const key = vertexKey(component, point);
    if (!sideFront.has(key)) {
      const depth = depths[point];
      const projected = projectedCoordinates(component, column, row);
      const uv = sourceUv(projected.column, projected.row);
      sideFront.set(key, pushVertex(
        sides,
        position(projected.column, projected.row, depth),
        uv,
      ));
      sideBack.set(key, pushVertex(
        sides,
        position(projected.column, projected.row, -depth),
        uv,
      ));
    }
    return { front: sideFront.get(key), back: sideBack.get(key) };
  };

  let surfaceCells = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!isInside(grid, column, row)) continue;
      surfaceCells += 1;
      const component = componentAt(grid, column, row);
      const tl = getSurfacePair(component, column, row);
      const tr = getSurfacePair(component, column + 1, row);
      const bl = getSurfacePair(component, column, row + 1);
      const br = getSurfacePair(component, column + 1, row + 1);
      surface.faces.push(
        [tl.front, bl.front, br.front],
        [tl.front, br.front, tr.front],
        [tl.back, tr.back, br.back],
        [tl.back, br.back, bl.back],
      );
    }
  }

  topology.boundaryEdges.forEach((edge) => {
    const a = getSidePair(edge.component, edge.aColumn, edge.aRow);
    const b = getSidePair(edge.component, edge.bColumn, edge.bRow);
    sides.faces.push(
      [a.front, a.back, b.back],
      [a.front, b.back, b.front],
    );
  });

  let depthTotal = 0;
  let depthSamples = 0;
  let maximumHalfDepth = 0;
  for (let index = 0; index < depths.length; index += 1) {
    if (!topology.used[index]) continue;
    const depth = depths[index];
    depthTotal += depth;
    depthSamples += 1;
    maximumHalfDepth = Math.max(maximumHalfDepth, depth);
  }
  const averageHalfDepth = depthSamples ? depthTotal / depthSamples : 0;
  const maximumDepth = maximumHalfDepth * 2;
  const uniqueBoundarySamples = new Map();
  topology.boundaryEdges.forEach((edge) => {
    uniqueBoundarySamples.set(vertexKey(edge.component, edge.aPoint), depths[edge.aPoint] * 2);
    uniqueBoundarySamples.set(vertexKey(edge.component, edge.bPoint), depths[edge.bPoint] * 2);
  });
  const boundaryDepths = [...uniqueBoundarySamples.values()];
  const boundaryDepthMedian = percentile(boundaryDepths, 0.5);
  const boundaryDepthP95 = percentile(boundaryDepths, 0.95);
  const averageBoundaryDepth = boundaryDepths.length
    ? boundaryDepths.reduce((total, depth) => total + depth, 0) / boundaryDepths.length
    : 0;
  const maximumBoundaryDepth = boundaryDepths.length ? Math.max(...boundaryDepths) : 0;
  const projectionOffsets = [...boundaryProjection.values()].map((entry) => entry.offset);
  const boundaryProjectionMean = projectionOffsets.length
    ? projectionOffsets.reduce((total, offset) => total + offset, 0) / projectionOffsets.length
    : 0;
  const boundaryProjectionMax = projectionOffsets.length ? Math.max(...projectionOffsets) : 0;
  const silhouetteCoverageError = measureSilhouetteCoverageError(grid, projectedCoordinates);

  return {
    surface,
    sides,
    analysis: {
      algorithmVersion: settings.algorithmVersion,
      width,
      height,
      columns: grid.columns,
      rows: grid.rows,
      opaqueCells: grid.opaqueCells,
      componentCount: countComponents(grid),
      originalComponentCount: grid.originalComponentCount ?? countComponents(grid),
      removedCells: grid.removedCells ?? 0,
      keptComponentCells: grid.opaqueCells,
      discardedComponentCells: grid.removedCells ?? 0,
      coverageThreshold: grid.coverageThreshold ?? 0,
      surfaceCells,
      boundaryEdges: topology.boundaryEdges.length,
      boundaryVertexCount: uniqueBoundarySamples.size,
      boundaryDepthMedian,
      boundaryDepthP95,
      medianBoundaryDepth: boundaryDepthMedian,
      p95BoundaryDepth: boundaryDepthP95,
      averageBoundaryDepth,
      maximumBoundaryDepth,
      boundaryProjectionMean,
      boundaryProjectionMax,
      silhouetteCoverageErrorBefore: silhouetteCoverageError.before,
      silhouetteCoverageErrorAfter: silhouetteCoverageError.after,
      boundaryMedian: boundaryDepthMedian,
      boundaryP95: boundaryDepthP95,
      sideVertexSavings: topology.boundaryEdges.length * 4 - sides.vertices.length,
      vertexCount: surface.vertices.length + sides.vertices.length,
      triangleCount: surface.faces.length + sides.faces.length,
      maximumHalfDepth,
      maximumDepth,
      averageHalfDepth,
      depthToHeightRatio: height > 0 ? maximumDepth / height : 0,
      bounds: { ...grid.bounds },
    },
  };
}
