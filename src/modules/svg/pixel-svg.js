function createPointKey(x, y) {
  return `${x},${y}`;
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

export function createEmptyPixelGrid(size = 16) {
  return Array.from({ length: size }, () => Array(size).fill(false));
}

export function clonePixelGrid(grid) {
  return Array.isArray(grid) ? grid.map((row) => (Array.isArray(row) ? [...row] : [])) : [];
}

export function pixelsToSvg(pixels, gridSize, options = {}) {
  if (!Array.isArray(pixels) || !Number.isInteger(gridSize) || gridSize <= 0) return '';

  const cellSize = Math.max(1, Math.floor((options.canvasSize || 200) / gridSize));
  const totalSize = cellSize * gridSize;
  const isFilled = (x, y) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && !!pixels[y]?.[x];

  const edges = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!isFilled(x, y)) continue;

      const left = x * cellSize;
      const top = y * cellSize;
      const right = left + cellSize;
      const bottom = top + cellSize;

      if (!isFilled(x, y - 1)) edges.push({ start: { x: left, y: top }, end: { x: right, y: top } });
      if (!isFilled(x + 1, y)) edges.push({ start: { x: right, y: top }, end: { x: right, y: bottom } });
      if (!isFilled(x, y + 1)) edges.push({ start: { x: right, y: bottom }, end: { x: left, y: bottom } });
      if (!isFilled(x - 1, y)) edges.push({ start: { x: left, y: bottom }, end: { x: left, y: top } });
    }
  }

  if (edges.length === 0) return '';

  const outgoing = new Map();
  edges.forEach((edge) => {
    const key = createPointKey(edge.start.x, edge.start.y);
    if (!outgoing.has(key)) outgoing.set(key, []);
    outgoing.get(key).push(edge);
  });

  const used = new Set();
  const loops = [];

  edges.forEach((edge) => {
    if (used.has(edge)) return;

    const loop = [clonePoint(edge.start)];
    let current = edge;

    while (current && !used.has(current)) {
      used.add(current);
      loop.push(clonePoint(current.end));

      const nextCandidates = outgoing.get(createPointKey(current.end.x, current.end.y)) || [];
      current = nextCandidates.find((candidate) => !used.has(candidate)) || null;

      if (current && current.start.x === loop[0].x && current.start.y === loop[0].y && used.has(current)) {
        break;
      }
    }

    if (loop.length > 2) loops.push(loop);
  });

  if (loops.length === 0) return '';

  const pathData = loops.map((loop) => {
    let segment = `M${loop[0].x},${loop[0].y}`;
    for (let i = 1; i < loop.length; i++) {
      segment += `L${loop[i].x},${loop[i].y}`;
    }
    return `${segment}Z`;
  }).join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}"><path d="${pathData}" fill="black" fill-rule="evenodd"/></svg>`;
}
