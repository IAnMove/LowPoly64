import { sampleDepthMap } from './png-model-depth-map.js';
import { normalizePngModelSettings } from './png-model-metadata.js';

function isInside(grid, column, row) {
  return column >= 0 && row >= 0 && column < grid.columns && row < grid.rows
    && grid.mask[row * grid.columns + column] === 1;
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

function smoothPointDepths(depths, used, columns, rows, passes) {
  let current = depths;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = current.slice();
    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        const index = row * (columns + 1) + column;
        if (!used[index]) continue;
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
        next[index] = total / count;
      }
    }
    current = next;
  }
  return current;
}

function buildPointDepths(grid, settings, depthMap) {
  const count = (grid.columns + 1) * (grid.rows + 1);
  const used = new Uint8Array(count);
  const depths = new Float32Array(count);
  const minimum = settings.thickness * 0.06;
  const maximum = settings.thickness * 0.5;

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!isInside(grid, column, row)) continue;
      [
        [column, row], [column + 1, row],
        [column, row + 1], [column + 1, row + 1],
      ].forEach(([x, y]) => { used[y * (grid.columns + 1) + x] = 1; });
    }
  }

  for (let row = 0; row <= grid.rows; row += 1) {
    for (let column = 0; column <= grid.columns; column += 1) {
      const index = row * (grid.columns + 1) + column;
      if (!used[index]) continue;
      const automatic = Math.pow(pointDepthSource(grid, column, row), settings.bulge);
      const manual = sampleDepthMap(depthMap, column / grid.columns, row / grid.rows);
      depths[index] = Math.max(
        settings.thickness * 0.015,
        minimum + (maximum - minimum) * automatic + maximum * manual * settings.manualStrength,
      );
    }
  }
  return { used, depths: smoothPointDepths(depths, used, grid.columns, grid.rows, settings.smoothing) };
}

function createGeometryBucket() {
  return { vertices: [], faces: [], uvs: [] };
}

function pushVertex(bucket, vertex, uv) {
  bucket.vertices.push(vertex);
  bucket.uvs.push(uv);
  return bucket.vertices.length - 1;
}

export function generateInflatedPngGeometry(grid, rawSettings = {}, depthMap) {
  if (!grid?.mask || !grid.columns || !grid.rows) throw new Error('A valid silhouette grid is required.');
  const settings = normalizePngModelSettings(rawSettings);
  const cropAspect = grid.bounds.width / grid.bounds.height;
  const width = cropAspect >= 1 ? settings.targetSize : settings.targetSize * cropAspect;
  const height = cropAspect >= 1 ? settings.targetSize / cropAspect : settings.targetSize;
  const { used, depths } = buildPointDepths(grid, settings, depthMap);
  const surface = createGeometryBucket();
  const sides = createGeometryBucket();
  const frontIndices = new Int32Array(used.length);
  const backIndices = new Int32Array(used.length);
  frontIndices.fill(-1);
  backIndices.fill(-1);

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

  for (let row = 0; row <= grid.rows; row += 1) {
    for (let column = 0; column <= grid.columns; column += 1) {
      const pointIndex = row * (grid.columns + 1) + column;
      if (!used[pointIndex]) continue;
      const depth = depths[pointIndex];
      frontIndices[pointIndex] = pushVertex(surface, position(column, row, depth), sourceUv(column, row));
      backIndices[pointIndex] = pushVertex(surface, position(column, row, -depth), sourceUv(column, row, settings.mirrorBack));
    }
  }

  const pointIndex = (column, row) => row * (grid.columns + 1) + column;
  const addSide = (aColumn, aRow, bColumn, bRow) => {
    const aPoint = pointIndex(aColumn, aRow);
    const bPoint = pointIndex(bColumn, bRow);
    const aDepth = depths[aPoint];
    const bDepth = depths[bPoint];
    const aUv = sourceUv(aColumn, aRow);
    const bUv = sourceUv(bColumn, bRow);
    const fa = pushVertex(sides, position(aColumn, aRow, aDepth), aUv);
    const ba = pushVertex(sides, position(aColumn, aRow, -aDepth), aUv);
    const bb = pushVertex(sides, position(bColumn, bRow, -bDepth), bUv);
    const fb = pushVertex(sides, position(bColumn, bRow, bDepth), bUv);
    sides.faces.push([fa, ba, bb], [fa, bb, fb]);
  };

  let surfaceCells = 0;
  let boundaryEdges = 0;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (!isInside(grid, column, row)) continue;
      surfaceCells += 1;
      const tl = pointIndex(column, row);
      const tr = pointIndex(column + 1, row);
      const bl = pointIndex(column, row + 1);
      const br = pointIndex(column + 1, row + 1);
      surface.faces.push(
        [frontIndices[tl], frontIndices[bl], frontIndices[br]],
        [frontIndices[tl], frontIndices[br], frontIndices[tr]],
        [backIndices[tl], backIndices[tr], backIndices[br]],
        [backIndices[tl], backIndices[br], backIndices[bl]],
      );
      if (!isInside(grid, column - 1, row)) { addSide(column, row, column, row + 1); boundaryEdges += 1; }
      if (!isInside(grid, column, row + 1)) { addSide(column, row + 1, column + 1, row + 1); boundaryEdges += 1; }
      if (!isInside(grid, column + 1, row)) { addSide(column + 1, row + 1, column + 1, row); boundaryEdges += 1; }
      if (!isInside(grid, column, row - 1)) { addSide(column + 1, row, column, row); boundaryEdges += 1; }
    }
  }

  return {
    surface,
    sides,
    analysis: {
      width,
      height,
      columns: grid.columns,
      rows: grid.rows,
      opaqueCells: grid.opaqueCells,
      surfaceCells,
      boundaryEdges,
      vertexCount: surface.vertices.length + sides.vertices.length,
      triangleCount: surface.faces.length + sides.faces.length,
      maximumHalfDepth: Math.max(...depths),
      bounds: { ...grid.bounds },
    },
  };
}
