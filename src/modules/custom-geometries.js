import * as THREE from 'three';

const CUSTOM_GEOMETRY_ALIASES = new Set(['custom', 'mesh']);

function cloneNestedTriples(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry) => (Array.isArray(entry) ? [...entry] : entry));
}

export function normalizeGeometryType(type) {
  if (typeof type !== 'string') return '';
  const normalized = type.trim().toLowerCase();
  if (CUSTOM_GEOMETRY_ALIASES.has(normalized)) return 'custom';
  return normalized;
}

export function cloneGeometryParams(params = {}) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};

  const clone = {};
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      clone[key] = cloneNestedTriples(value);
    } else {
      clone[key] = value;
    }
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

  geometry.parameters = {
    vertices: cloneNestedTriples(vertices),
    faces: cloneNestedTriples(faces),
  };
  geometry.type = 'CustomGeometry';

  return geometry;
}
