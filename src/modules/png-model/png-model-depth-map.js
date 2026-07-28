import { PNG_MODEL_DEPTH_MAP_SIZE } from './png-model-metadata.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createDepthMap(size = PNG_MODEL_DEPTH_MAP_SIZE, values = []) {
  const safeSize = clamp(Math.round(Number(size) || PNG_MODEL_DEPTH_MAP_SIZE), 8, 96);
  const map = {
    size: safeSize,
    values: new Float32Array(safeSize * safeSize),
  };
  Array.from(values || []).slice(0, map.values.length).forEach((value, index) => {
    map.values[index] = clamp(Number(value) || 0, -1, 1);
  });
  return map;
}

export function deserializeDepthMap(serialized = {}) {
  const values = Array.from(serialized.values || []).map((value) => clamp((Number(value) || 0) / 100, -1, 1));
  return createDepthMap(serialized.size, values);
}

export function serializeDepthMap(depthMap = {}) {
  const normalized = depthMap.values instanceof Float32Array
    ? depthMap
    : createDepthMap(depthMap.size, depthMap.values);
  return {
    size: normalized.size,
    values: Array.from(normalized.values, (value) => Math.round(clamp(value, -1, 1) * 100)),
  };
}

export function sampleDepthMap(depthMap, u, v) {
  if (!depthMap?.values?.length || !depthMap.size) return 0;
  const size = depthMap.size;
  const x = clamp(u, 0, 1) * (size - 1);
  const y = clamp(v, 0, 1) * (size - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = depthMap.values[y0 * size + x0] * (1 - fx) + depthMap.values[y0 * size + x1] * fx;
  const bottom = depthMap.values[y1 * size + x0] * (1 - fx) + depthMap.values[y1 * size + x1] * fx;
  return top * (1 - fy) + bottom * fy;
}

function neighborAverage(values, size, x, y) {
  let total = 0;
  let count = 0;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      const sampleX = x + offsetX;
      const sampleY = y + offsetY;
      if (sampleX < 0 || sampleY < 0 || sampleX >= size || sampleY >= size) continue;
      total += values[sampleY * size + sampleX];
      count += 1;
    }
  }
  return count ? total / count : 0;
}

export function paintDepthMap(depthMap, options = {}) {
  if (!depthMap?.values?.length) return depthMap;
  const size = depthMap.size;
  const centerX = clamp(Number(options.u) || 0, 0, 1) * (size - 1);
  const centerY = clamp(Number(options.v) || 0, 0, 1) * (size - 1);
  const radius = clamp(Number(options.radius) || 6, 1, size / 2);
  const strength = clamp(Number(options.strength) || 0.2, 0.01, 1);
  const tool = ['inflate', 'deflate', 'smooth', 'erase'].includes(options.tool) ? options.tool : 'inflate';
  const source = tool === 'smooth' ? depthMap.values.slice() : depthMap.values;

  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(size - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(size - 1, Math.ceil(centerY + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance > radius) continue;
      const falloff = (1 - distance / radius) ** 2;
      const amount = strength * falloff;
      const index = y * size + x;
      if (tool === 'inflate') depthMap.values[index] = clamp(depthMap.values[index] + amount, -1, 1);
      if (tool === 'deflate') depthMap.values[index] = clamp(depthMap.values[index] - amount, -1, 1);
      if (tool === 'erase') depthMap.values[index] *= 1 - amount;
      if (tool === 'smooth') {
        const average = neighborAverage(source, size, x, y);
        depthMap.values[index] = source[index] * (1 - amount) + average * amount;
      }
    }
  }
  return depthMap;
}

export function clearDepthMap(depthMap) {
  depthMap?.values?.fill?.(0);
  return depthMap;
}
