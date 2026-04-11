import * as THREE from 'three';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function hexToRGB(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

function isGradientDef(def) {
  return def && typeof def === 'object' && !Array.isArray(def) && (def.top || def.bottom);
}

/**
 * Apply vertex colors to a BufferGeometry.
 *
 * Supports two modes:
 *   Gradient object: { top: "#hex", bottom: "#hex" }
 *     Interpolates vertically (Y axis) between bottom and top colors.
 *
 *   Per-vertex array: ["#hex", "#hex", ...]
 *     One color per vertex. Length must match geometry vertex count.
 *     If shorter, remaining vertices get white. If longer, extras are ignored.
 */
export function applyVertexColors(geometry, def) {
  if (!geometry || !def) return false;

  const posAttr = geometry.attributes.position;
  if (!posAttr) return false;
  const count = posAttr.count;

  const colors = new Float32Array(count * 3);

  if (isGradientDef(def)) {
    const topRGB = hexToRGB(def.top || '#ffffff');
    const bottomRGB = hexToRGB(def.bottom || '#000000');

    // Find Y range
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const range = maxY - minY || 1;

    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      const t = (y - minY) / range; // 0 = bottom, 1 = top
      colors[i * 3] = bottomRGB[0] + (topRGB[0] - bottomRGB[0]) * t;
      colors[i * 3 + 1] = bottomRGB[1] + (topRGB[1] - bottomRGB[1]) * t;
      colors[i * 3 + 2] = bottomRGB[2] + (topRGB[2] - bottomRGB[2]) * t;
    }
  } else if (Array.isArray(def)) {
    for (let i = 0; i < count; i++) {
      if (i < def.length && typeof def[i] === 'string') {
        const rgb = hexToRGB(def[i]);
        colors[i * 3] = rgb[0];
        colors[i * 3 + 1] = rgb[1];
        colors[i * 3 + 2] = rgb[2];
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      }
    }
  } else {
    return false;
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return true;
}

/**
 * Extract vertex colors from a mesh geometry as a serializable definition.
 * Returns null if no vertex colors, a gradient object if it looks like a gradient,
 * or an array of hex strings for per-vertex colors.
 */
export function serializeVertexColors(mesh) {
  if (!mesh || !mesh.geometry) return null;
  const colorAttr = mesh.geometry.attributes.color;
  if (!colorAttr) return null;

  const count = colorAttr.count;
  if (count === 0) return null;

  const hexColors = [];
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    c.setRGB(colorAttr.getX(i), colorAttr.getY(i), colorAttr.getZ(i));
    hexColors.push('#' + c.getHexString());
  }

  // Try to detect if it's a simple vertical gradient (optimization for export readability)
  const posAttr = mesh.geometry.attributes.position;
  if (posAttr && count >= 2) {
    let minY = Infinity;
    let maxY = -Infinity;
    let minYColor = null;
    let maxYColor = null;
    for (let i = 0; i < count; i++) {
      const y = posAttr.getY(i);
      if (y < minY) { minY = y; minYColor = hexColors[i]; }
      if (y > maxY) { maxY = y; maxYColor = hexColors[i]; }
    }

    if (minY < maxY && minYColor && maxYColor) {
      // Check if all vertex colors match a linear gradient between these two
      const range = maxY - minY;
      const bottomRGB = hexToRGB(minYColor);
      const topRGB = hexToRGB(maxYColor);
      let isGradient = true;

      for (let i = 0; i < count; i++) {
        const y = posAttr.getY(i);
        const t = (y - minY) / range;
        const expectedR = bottomRGB[0] + (topRGB[0] - bottomRGB[0]) * t;
        const expectedG = bottomRGB[1] + (topRGB[1] - bottomRGB[1]) * t;
        const expectedB = bottomRGB[2] + (topRGB[2] - bottomRGB[2]) * t;
        const actualR = colorAttr.getX(i);
        const actualG = colorAttr.getY(i);
        const actualB = colorAttr.getZ(i);
        if (Math.abs(expectedR - actualR) > 0.02
          || Math.abs(expectedG - actualG) > 0.02
          || Math.abs(expectedB - actualB) > 0.02) {
          isGradient = false;
          break;
        }
      }

      if (isGradient) {
        return { top: maxYColor, bottom: minYColor };
      }
    }
  }

  return hexColors;
}

/**
 * Validate a vertexColors definition from JSON import.
 * Returns an error string or null if valid.
 */
export function validateVertexColors(def, pieceIndex) {
  if (def === undefined || def === null) return null;

  if (isGradientDef(def)) {
    if (def.top !== undefined && (typeof def.top !== 'string' || !HEX_RE.test(def.top))) {
      return `Piece ${pieceIndex + 1}: vertexColors.top must be a valid hex color.`;
    }
    if (def.bottom !== undefined && (typeof def.bottom !== 'string' || !HEX_RE.test(def.bottom))) {
      return `Piece ${pieceIndex + 1}: vertexColors.bottom must be a valid hex color.`;
    }
    return null;
  }

  if (Array.isArray(def)) {
    if (def.length > 4096) {
      return `Piece ${pieceIndex + 1}: vertexColors array too large (max 4096).`;
    }
    for (let i = 0; i < def.length; i++) {
      if (typeof def[i] !== 'string' || !HEX_RE.test(def[i])) {
        return `Piece ${pieceIndex + 1}: vertexColors[${i}] must be a valid hex color.`;
      }
    }
    return null;
  }

  return `Piece ${pieceIndex + 1}: vertexColors must be a gradient object or an array of hex colors.`;
}

/**
 * Check if a mesh has vertex colors enabled.
 */
export function hasVertexColors(mesh) {
  return !!(mesh && mesh.geometry && mesh.geometry.attributes.color);
}
