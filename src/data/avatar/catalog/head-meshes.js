import whiteMesh180Source from '../heads/white_mesh180.json';
import cabezon175Source from '../heads/cabezon175.json';
import duro250Source from '../heads/duro250.json';
import duro175Source from '../heads/duro175.json';
import gordo175Source from '../heads/gordo175.json';
import gordo275Source from '../heads/gordo275.json';
import normal175Source from '../heads/normal175.json';
import {
  buildGeneratedHead,
  buildGeneratedHeadById,
  GENERATED_HEAD_PRESETS,
} from '../generated-heads.js';

// Every head is normalized into the same canonical authoring space:
// +Y up, +Z toward the face (the avatar head builder mirrors Z afterwards so
// the assembled humanoid looks toward -Z), uniform height, bottom at y=0 and
// centered on x/z. Landmarks declared in each head JSON ride along through
// the exact same transform, so they always stay glued to the mesh surface.
const HEAD_CANONICAL_HEIGHT = 1.2;

export const HEAD_LANDMARK_KEYS = Object.freeze([
  'eyeL', 'eyeR', 'noseTip', 'mouth', 'earL', 'earR', 'hairline', 'crown', 'chin',
]);

function readHeadBaseGeometry(source) {
  const headPiece = source?.pieces?.find((piece) => piece?.name === 'HEAD_BASE') || source?.pieces?.[0];
  const geometry = headPiece?.geometry?.params || headPiece?.geometry || {};
  const vertices = Array.isArray(geometry.vertices) ? geometry.vertices : [];
  const faces = Array.isArray(geometry.faces) ? geometry.faces : [];

  return {
    vertices,
    faces,
  };
}

// `axes` in the head JSON declares the file's own conventions so each head is
// self-describing: { up: '+z', front: '-y' } (legacy Z-up exports) or
// { up: '+y', front: '+z' } (standard glTF orientation).
function createCanonicalizer(axes) {
  const up = String(axes?.up || '+y');
  const front = String(axes?.front || '+z');
  if (up === '+z' && front === '-y') {
    return (vertex) => [vertex[0], vertex[2], -vertex[1]];
  }
  if (up === '+y' && front === '+z') {
    return (vertex) => [vertex[0], vertex[1], vertex[2]];
  }
  throw new Error(`Unsupported head axes: up=${up} front=${front}`);
}

function computeBounds(vertices) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  vertices.forEach((vertex) => {
    if (!Array.isArray(vertex) || vertex.length !== 3) return;
    min.x = Math.min(min.x, vertex[0]);
    min.y = Math.min(min.y, vertex[1]);
    min.z = Math.min(min.z, vertex[2]);
    max.x = Math.max(max.x, vertex[0]);
    max.y = Math.max(max.y, vertex[1]);
    max.z = Math.max(max.z, vertex[2]);
  });

  return { min, max };
}

function createCanonicalNormalizer(vertices) {
  const bounds = computeBounds(vertices);
  const height = Math.max(bounds.max.y - bounds.min.y, 0.0001);
  const scale = HEAD_CANONICAL_HEIGHT / height;
  const centerX = (bounds.min.x + bounds.max.x) * 0.5;
  const centerZ = (bounds.min.z + bounds.max.z) * 0.5;

  return (vertex) => [
    (vertex[0] - centerX) * scale,
    (vertex[1] - bounds.min.y) * scale,
    (vertex[2] - centerZ) * scale,
  ];
}

function createRuntimeHeadMesh(id, source) {
  const geometry = readHeadBaseGeometry(source);
  const canonicalize = createCanonicalizer(source?.axes);
  const canonicalVertices = geometry.vertices.map((vertex) => canonicalize(vertex));
  const normalize = createCanonicalNormalizer(canonicalVertices);
  const runtimeVertices = canonicalVertices.map((vertex) => Object.freeze(normalize(vertex)));

  const landmarks = {};
  Object.entries(source?.landmarks || {}).forEach(([key, vertex]) => {
    if (!Array.isArray(vertex) || vertex.length !== 3) return;
    landmarks[key] = Object.freeze(normalize(canonicalize(vertex)));
  });

  return Object.freeze({
    id,
    customGeometry: Object.freeze({
      vertices: Object.freeze(runtimeVertices),
      faces: Object.freeze(geometry.faces.map((face) => Object.freeze([...face]))),
    }),
    landmarks: Object.keys(landmarks).length > 0 ? Object.freeze(landmarks) : null,
  });
}

function createGeneratedRuntimeHeadMesh(preset) {
  const generated = buildGeneratedHead(preset.spec);
  return createRuntimeGeneratedHeadEntry(preset.id, generated);
}

export function createRuntimeGeneratedHeadEntry(id, generated) {
  return Object.freeze({
    id,
    customGeometry: Object.freeze({
      vertices: Object.freeze(generated.customGeometry.vertices.map((vertex) => Object.freeze([...vertex]))),
      faces: Object.freeze(generated.customGeometry.faces.map((face) => Object.freeze([...face]))),
    }),
    landmarks: Object.freeze(
      Object.fromEntries(
        Object.entries(generated.landmarks).map(([key, vertex]) => [key, Object.freeze([...vertex])])
      )
    ),
    axes: Object.freeze({ ...generated.axes }),
  });
}

export function buildGeneratedRuntimeHeadMesh(id, headParams = {}) {
  const generated = buildGeneratedHeadById(id, headParams);
  return createRuntimeGeneratedHeadEntry(generated.id, generated);
}

const MESH_PORTRAIT_HEAD_VARIANTS = Object.freeze([
  Object.freeze({ id: 'psx_mesh_portrait_01', source: whiteMesh180Source }),
  Object.freeze({ id: 'psx_mesh_portrait_normal_175', source: normal175Source }),
  Object.freeze({ id: 'psx_mesh_portrait_cabezon_175', source: cabezon175Source }),
  Object.freeze({ id: 'psx_mesh_portrait_duro_175', source: duro175Source }),
  Object.freeze({ id: 'psx_mesh_portrait_duro_250', source: duro250Source }),
  Object.freeze({ id: 'psx_mesh_portrait_gordo_175', source: gordo175Source }),
  Object.freeze({ id: 'psx_mesh_portrait_gordo_275', source: gordo275Source }),
]);

const GENERATED_HEAD_VARIANTS = Object.freeze(
  GENERATED_HEAD_PRESETS.map((preset) => Object.freeze({
    id: preset.id,
    entry: createGeneratedRuntimeHeadMesh(preset),
  }))
);

export const AVATAR_HEAD_MESH_MAP = Object.freeze(
  Object.fromEntries(
    [
      ...MESH_PORTRAIT_HEAD_VARIANTS.map(({ id, source }) => [id, createRuntimeHeadMesh(id, source)]),
      ...GENERATED_HEAD_VARIANTS.map(({ id, entry }) => [id, entry]),
    ]
  )
);
