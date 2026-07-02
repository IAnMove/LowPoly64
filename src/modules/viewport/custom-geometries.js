import * as THREE from 'three';

const CUSTOM_GEOMETRY_ALIASES = new Set(['custom', 'mesh']);

function cloneGeometryParamValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneGeometryParamValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneGeometryParamValue(entry);
    }
    return clone;
  }
  return value;
}

function cloneNestedTriples(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => (Array.isArray(entry) ? [...entry] : entry));
}

export function normalizeGeometryType(type) {
  if (typeof type !== 'string') return '';
  const normalized = type.trim().toLowerCase();
  if (CUSTOM_GEOMETRY_ALIASES.has(normalized)) return 'custom';
  if (['taperedbox', 'tapered_box', 'tapered-box'].includes(normalized)) return 'taperedBox';
  if (['limbloft', 'limb_loft', 'limb-loft'].includes(normalized)) return 'limbLoft';
  if (normalized === 'label') return 'label';
  return normalized;
}

export function cloneGeometryParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};

  const clone = {};
  for (const [key, value] of Object.entries(params)) {
    clone[key] = cloneGeometryParamValue(value);
  }
  return clone;
}

export function normalizeGeometryDefinition(geometry = {}) {
  if (!geometry || typeof geometry !== 'object' || Array.isArray(geometry)) {
    return { type: '', params: {} };
  }

  const type = normalizeGeometryType(geometry.type);
  const params = cloneGeometryParams(geometry.params);

  if (type === 'custom') {
    params.vertices = geometry.vertices !== undefined
      ? cloneNestedTriples(geometry.vertices)
      : cloneNestedTriples(params.vertices);
    params.faces = geometry.faces !== undefined
      ? cloneNestedTriples(geometry.faces)
      : cloneNestedTriples(params.faces);
  }

  return { type, params };
}

export function serializeGeometryDefinition(type, params = {}) {
  const normalizedType = normalizeGeometryType(type);
  const cleanParams = cloneGeometryParams(params);

  if (normalizedType === 'custom') {
    return {
      type: 'custom',
      vertices: cloneNestedTriples(cleanParams.vertices),
      faces: cloneNestedTriples(cleanParams.faces),
    };
  }

  if (normalizedType === 'label') {
    return {
      type: 'label',
      params: {},
    };
  }

  return {
    type: normalizedType,
    params: cleanParams,
  };
}

/**
 * Wedge (triangular prism): a box cut diagonally along the top.
 * The base is a full rectangle (width x depth), the top is a single edge.
 * Vertices form a triangular cross-section when viewed from the side.
 *
 *       top edge
 *       /|
 *      / |
 *     /  | height
 *    /   |
 *   /____|
 *   width
 */
export function createWedgeGeometry(width = 2, height = 2, depth = 2) {
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  // 6 unique vertices of the wedge (triangular prism)
  // Bottom face: 4 corners of rectangle
  // Top: 2 vertices (top edge along depth axis, centered on width)
  const vertices = [
    // bottom-left-front, bottom-right-front, bottom-right-back, bottom-left-back
    -hw, -hh, hd,   // 0: bottom-left-front
    hw, -hh, hd,    // 1: bottom-right-front
    hw, -hh, -hd,   // 2: bottom-right-back
    -hw, -hh, -hd,  // 3: bottom-left-back
    // top-front, top-back (top edge centered at x=0)
    0, hh, hd,      // 4: top-front
    0, hh, -hd,     // 5: top-back
  ];

  // Triangles (CCW winding for front faces)
  const indices = [
    // bottom face (2 triangles)
    0, 2, 1,
    0, 3, 2,
    // front face (triangle)
    0, 1, 4,
    // back face (triangle)
    2, 3, 5,
    // left face (2 triangles)
    0, 4, 5,
    0, 5, 3,
    // right face (2 triangles)
    1, 2, 5,
    1, 5, 4,
    // top face (2 triangles) — the sloped face between top edge and bottom edges
    // Actually the wedge has no flat top — the two sloped faces ARE the left and right faces above
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Store parameters for serialization
  geometry.parameters = { width, height, depth };
  geometry.type = 'WedgeGeometry';

  return geometry;
}

/**
 * Pyramid: square base with a single apex point.
 * Base is a square (width x width), apex is at (0, height/2, 0).
 */
export function createPyramidGeometry(width = 2, height = 2) {
  const hw = width / 2;
  const hh = height / 2;

  const vertices = [
    // base corners
    -hw, -hh, hw,   // 0: front-left
    hw, -hh, hw,    // 1: front-right
    hw, -hh, -hw,   // 2: back-right
    -hw, -hh, -hw,  // 3: back-left
    // apex
    0, hh, 0,       // 4: top
  ];

  const indices = [
    // base (2 triangles)
    0, 2, 1,
    0, 3, 2,
    // front face
    0, 1, 4,
    // right face
    1, 2, 4,
    // back face
    2, 3, 4,
    // left face
    3, 0, 4,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  geometry.parameters = { width, height };
  geometry.type = 'PyramidGeometry';

  return geometry;
}

/**
 * Tapered box: an 8-corner frustum whose top rectangle can differ from the
 * base rectangle and shift in X/Z. The local origin follows the existing
 * primitive pattern: centered vertically, with the base at -height / 2.
 */
export function createTaperedBoxGeometry({
  widthBottom = 2,
  depthBottom = 2,
  widthTop = 1.5,
  depthTop = 1.5,
  height = 2,
  offsetTopX = 0,
  offsetTopZ = 0,
} = {}) {
  const wb = widthBottom / 2;
  const db = depthBottom / 2;
  const wt = widthTop / 2;
  const dt = depthTop / 2;
  const bottomY = -height / 2;
  const topY = height / 2;

  const vertices = [
    -wb, bottomY, db,                 // 0: back-left-bottom
    wb, bottomY, db,                  // 1: back-right-bottom
    offsetTopX + wt, topY, offsetTopZ + dt,   // 2: back-right-top
    offsetTopX - wt, topY, offsetTopZ + dt,   // 3: back-left-top
    -wb, bottomY, -db,                // 4: front-left-bottom
    wb, bottomY, -db,                 // 5: front-right-bottom
    offsetTopX + wt, topY, offsetTopZ - dt,   // 6: front-right-top
    offsetTopX - wt, topY, offsetTopZ - dt,   // 7: front-left-top
  ];

  const indices = [
    // back, front, left, right, top, bottom. Keep this order aligned with
    // generated-character-molds makeFaceColors/faceColors documentation.
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    0, 4, 5, 0, 5, 1,
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  applyGeneratedCustomUvs(geometry);

  geometry.parameters = { widthBottom, depthBottom, widthTop, depthTop, height, offsetTopX, offsetTopZ };
  geometry.type = 'TaperedBoxGeometry';

  return geometry;
}

export function createLimbLoftGeometry({
  sides = 6,
  sections = [
    { y: -1, radiusX: 0.35, radiusZ: 0.3, offsetX: 0, offsetZ: 0 },
    { y: 1, radiusX: 0.25, radiusZ: 0.22, offsetX: 0, offsetZ: 0 },
  ],
  capTop = true,
  capBottom = true,
} = {}) {
  const safeSides = Math.max(4, Math.min(10, Math.round(sides || 6)));
  const safeSections = (Array.isArray(sections) && sections.length >= 2 ? sections : [
    { y: -1, radiusX: 0.35, radiusZ: 0.3, offsetX: 0, offsetZ: 0 },
    { y: 1, radiusX: 0.25, radiusZ: 0.22, offsetX: 0, offsetZ: 0 },
  ]).map((section) => ({
    y: section.y ?? 0,
    radiusX: section.radiusX ?? 0.25,
    radiusZ: section.radiusZ ?? section.radiusX ?? 0.25,
    offsetX: section.offsetX ?? 0,
    offsetZ: section.offsetZ ?? 0,
  }));

  const vertices = [];
  for (const section of safeSections) {
    for (let side = 0; side < safeSides; side += 1) {
      const angle = (side / safeSides) * Math.PI * 2;
      vertices.push(
        section.offsetX + Math.cos(angle) * section.radiusX,
        section.y,
        section.offsetZ + Math.sin(angle) * section.radiusZ
      );
    }
  }

  const indices = [];
  for (let ring = 0; ring < safeSections.length - 1; ring += 1) {
    const current = ring * safeSides;
    const next = (ring + 1) * safeSides;
    for (let side = 0; side < safeSides; side += 1) {
      const a = current + side;
      const b = current + ((side + 1) % safeSides);
      const c = next + ((side + 1) % safeSides);
      const d = next + side;
      indices.push(a, d, b, b, d, c);
    }
  }

  if (capBottom) {
    const centerIndex = vertices.length / 3;
    const bottom = safeSections[0];
    vertices.push(bottom.offsetX, bottom.y, bottom.offsetZ);
    for (let side = 0; side < safeSides; side += 1) {
      indices.push(centerIndex, side, (side + 1) % safeSides);
    }
  }

  if (capTop) {
    const centerIndex = vertices.length / 3;
    const ringStart = (safeSections.length - 1) * safeSides;
    const top = safeSections[safeSections.length - 1];
    vertices.push(top.offsetX, top.y, top.offsetZ);
    for (let side = 0; side < safeSides; side += 1) {
      indices.push(centerIndex, ringStart + ((side + 1) % safeSides), ringStart + side);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  applyGeneratedCustomUvs(geometry);

  geometry.parameters = {
    sides: safeSides,
    sections: cloneGeometryParamValue(safeSections),
    capTop: !!capTop,
    capBottom: !!capBottom,
  };
  geometry.type = 'LimbLoftGeometry';

  return geometry;
}

export function createCustomGeometry(vertices = [], faces = []) {
  const geometry = new THREE.BufferGeometry();
  const flatVertices = [];
  vertices.forEach((vertex) => {
    flatVertices.push(vertex[0], vertex[1], vertex[2]);
  });

  const indices = [];
  faces.forEach((face) => {
    indices.push(face[0], face[1], face[2]);
  });

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(flatVertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  applyGeneratedCustomUvs(geometry);

  geometry.parameters = {
    vertices: cloneNestedTriples(vertices),
    faces: cloneNestedTriples(faces),
  };
  geometry.type = 'CustomGeometry';

  return geometry;
}

function applyGeneratedCustomUvs(geometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal) return;

  const bounds = geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(position);
  const boundsSize = new THREE.Vector3();
  bounds.getSize(boundsSize);
  const maxDimension = Math.max(boundsSize.x, boundsSize.y, boundsSize.z, 1);
  const uvs = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index++) {
    const px = position.getX(index);
    const py = position.getY(index);
    const pz = position.getZ(index);
    const nx = Math.abs(normal.getX(index));
    const ny = Math.abs(normal.getY(index));
    const nz = Math.abs(normal.getZ(index));

    let u = 0;
    let v = 0;

    if (nz >= nx && nz >= ny) {
      u = (px - bounds.min.x) / maxDimension;
      v = 1 - (py - bounds.min.y) / maxDimension;
    } else if (nx >= ny) {
      u = (pz - bounds.min.z) / maxDimension;
      v = 1 - (py - bounds.min.y) / maxDimension;
    } else {
      u = (px - bounds.min.x) / maxDimension;
      v = (pz - bounds.min.z) / maxDimension;
    }

    uvs[index * 2] = u;
    uvs[index * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
}
