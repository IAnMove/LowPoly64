/**
 * Small pure surface builders for the retro character studio.
 *
 * The returned geometry uses the CharacterModel CUSTOM contract:
 * vertices are [x, y, z] tuples and faces are triangle index tuples.
 * There is deliberately no Three.js dependency here.
 */

const SIDES = 8;
const MIN_SIZE = 1e-8;
const DEFAULT_CORNER = 0.22;

function finiteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(name + ' must be finite');
  return number;
}

function positiveNumber(value, name) {
  const number = finiteNumber(value, name);
  if (number <= 0) throw new RangeError(name + ' must be greater than zero');
  return number;
}

function point3(value, name) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(name + ' must be a three-component array');
  }
  return value.map((component, index) => finiteNumber(component, name + '[' + index + ']'));
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function multiply(vector, scalar) {
  return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function vectorLength(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector, name) {
  const magnitude = vectorLength(vector);
  if (magnitude <= MIN_SIZE) throw new RangeError(name + ' must have a non-zero direction');
  return multiply(vector, 1 / magnitude);
}

function normalizeRing(ring, index) {
  if (!ring || typeof ring !== 'object' || Array.isArray(ring)) {
    throw new TypeError('rings[' + index + '] must be an object');
  }
  const corner = ring.corner === undefined
    ? DEFAULT_CORNER
    : finiteNumber(ring.corner, 'rings[' + index + '].corner');
  return {
    y: finiteNumber(ring.y, 'rings[' + index + '].y'),
    width: positiveNumber(ring.width, 'rings[' + index + '].width'),
    depth: positiveNumber(ring.depth, 'rings[' + index + '].depth'),
    cx: ring.cx === undefined ? 0 : finiteNumber(ring.cx, 'rings[' + index + '].cx'),
    cz: ring.cz === undefined ? 0 : finiteNumber(ring.cz, 'rings[' + index + '].cz'),
    // A tiny chamfer keeps corner=0 inputs non-degenerate while retaining
    // the requested octagonal contract.
    corner: Math.min(0.49, Math.max(0.001, corner)),
  };
}

function octagonPoints(width, depth, cx = 0, cz = 0, corner = DEFAULT_CORNER) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const cutX = width * corner;
  const cutZ = depth * corner;
  // Clockwise when viewed from +Y. This ordering is shared by loft rings
  // and tuft sections; final face orientation is normalized below.
  return [
    [cx - halfWidth + cutX, -halfDepth + cz],
    [cx + halfWidth - cutX, -halfDepth + cz],
    [cx + halfWidth, -halfDepth + cutZ + cz],
    [cx + halfWidth, halfDepth - cutZ + cz],
    [cx + halfWidth - cutX, halfDepth + cz],
    [cx - halfWidth + cutX, halfDepth + cz],
    [cx - halfWidth, halfDepth - cutZ + cz],
    [cx - halfWidth, -halfDepth + cutZ + cz],
  ];
}

function orientFacesOutward(vertices, faces) {
  const center = vertices.reduce((sum, vertex) => [
    sum[0] + vertex[0],
    sum[1] + vertex[1],
    sum[2] + vertex[2],
  ], [0, 0, 0]).map((value) => value / Math.max(vertices.length, 1));

  return faces.map(([aIndex, bIndex, cIndex]) => {
    const a = vertices[aIndex];
    const b = vertices[bIndex];
    const c = vertices[cIndex];
    const normal = cross(subtract(b, a), subtract(c, a));
    const faceCenter = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    return dot(normal, subtract(faceCenter, center)) >= 0
      ? [aIndex, bIndex, cIndex]
      : [aIndex, cIndex, bIndex];
  });
}

function appendRing(vertices, center, width, depth, widthAxis, depthAxis, corner = DEFAULT_CORNER) {
  const local = octagonPoints(width, depth, 0, 0, corner);
  const start = vertices.length;
  local.forEach(([x, z]) => {
    vertices.push(add(center, add(multiply(widthAxis, x), multiply(depthAxis, z))));
  });
  return start;
}

function frameForDirection(direction) {
  const axis = normalize(direction, 'direction');
  // Keep a stable world-facing frame for an upright tuft. The fallback avoids
  // a zero cross product when the axis is close to world Y.
  const reference = Math.abs(axis[1]) < 0.92 ? [0, 1, 0] : [0, 0, 1];
  const widthAxis = normalize(cross(reference, axis), 'width frame');
  const depthAxis = normalize(cross(axis, widthAxis), 'depth frame');
  return { axis, widthAxis, depthAxis };
}

/**
 * Loft an octagonal rectangular surface through Y-oriented rings.
 *
 * Each ring is { y, width, depth, cx?, cz?, corner? }, where corner is the
 * fraction of each rectangle dimension removed at its four corners. The
 * default caps add a center vertex per end and produce a closed manifold.
 */
export function loftSurface(rings, { capBottom = true, capTop = true } = {}) {
  if (!Array.isArray(rings) || rings.length < 2) {
    throw new RangeError('loftSurface requires at least two rings');
  }
  const normalized = rings.map(normalizeRing);
  const vertices = [];
  const faces = [];
  const starts = normalized.map((ring) => {
    const start = vertices.length;
    octagonPoints(ring.width, ring.depth, ring.cx, ring.cz, ring.corner)
      .forEach(([x, z]) => vertices.push([x, ring.y, z]));
    return start;
  });

  for (let ringIndex = 0; ringIndex < starts.length - 1; ringIndex += 1) {
    const lower = starts[ringIndex];
    const upper = starts[ringIndex + 1];
    for (let side = 0; side < SIDES; side += 1) {
      const next = (side + 1) % SIDES;
      faces.push(
        [lower + side, upper + side, upper + next],
        [lower + side, upper + next, lower + next],
      );
    }
  }

  if (capBottom) {
    const ring = normalized[0];
    const centerIndex = vertices.length;
    vertices.push([ring.cx, ring.y, ring.cz]);
    for (let side = 0; side < SIDES; side += 1) {
      const next = (side + 1) % SIDES;
      faces.push([starts[0] + side, starts[0] + next, centerIndex]);
    }
  }

  if (capTop) {
    const lastIndex = starts.length - 1;
    const ring = normalized[lastIndex];
    const centerIndex = vertices.length;
    vertices.push([ring.cx, ring.y, ring.cz]);
    for (let side = 0; side < SIDES; side += 1) {
      const next = (side + 1) % SIDES;
      faces.push([starts[lastIndex] + side, centerIndex, starts[lastIndex] + next]);
    }
  }

  return { vertices, faces: orientFacesOutward(vertices, faces) };
}

/**
 * Build a thick, low-poly tuft between a base and a 3D tip.
 *
 * The optional bend is an absolute intermediate center in world/model space.
 * Two octagonal sections taper toward a single tip, so a tuft keeps volume
 * while allowing its silhouette to lean in any direction.
 */
export function taperedTuft({ base, tip, width, depth, bend } = {}) {
  const basePoint = point3(base, 'base');
  const tipPoint = point3(tip, 'tip');
  const tuftWidth = positiveNumber(width, 'width');
  const tuftDepth = positiveNumber(depth, 'depth');
  const axis = subtract(tipPoint, basePoint);
  const frame = frameForDirection(axis);
  const middlePoint = bend === undefined
    ? add(basePoint, multiply(axis, 0.55))
    : point3(bend, 'bend');
  if (vectorLength(subtract(middlePoint, basePoint)) <= MIN_SIZE || vectorLength(subtract(tipPoint, middlePoint)) <= MIN_SIZE) {
    throw new RangeError('bend must lie between distinct base and tip sections');
  }

  const vertices = [];
  const faces = [];
  const baseStart = appendRing(vertices, basePoint, tuftWidth, tuftDepth, frame.widthAxis, frame.depthAxis);
  const middleStart = appendRing(
    vertices,
    middlePoint,
    tuftWidth * 0.62,
    tuftDepth * 0.62,
    frame.widthAxis,
    frame.depthAxis,
  );
  const baseCenter = vertices.length;
  vertices.push([...basePoint]);
  const tipIndex = vertices.length;
  vertices.push([...tipPoint]);

  for (let side = 0; side < SIDES; side += 1) {
    const next = (side + 1) % SIDES;
    faces.push(
      [baseStart + side, baseStart + next, baseCenter],
      [baseStart + side, middleStart + side, middleStart + next],
      [baseStart + side, middleStart + next, baseStart + next],
      [middleStart + side, tipIndex, middleStart + next],
    );
  }

  return { vertices, faces: orientFacesOutward(vertices, faces) };
}