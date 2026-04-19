import whiteMesh180Source from '../../../../artifacts/white_mesh180.legacy.json';
import cabezon175Source from '../../../../artifacts/cabezas/cabezon175.legacy.json';
import duro250Source from '../../../../artifacts/cabezas/duro250.legacy.json';
import duro175Source from '../../../../artifacts/cabezas/duro_175white_mesh.legacy.json';
import gordo175Source from '../../../../artifacts/cabezas/gordo175.legacy.json';
import gordo275Source from '../../../../artifacts/cabezas/gordo275.legacy.json';
import normal175Source from '../../../../artifacts/cabezas/normal175.legacy.json';

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

function rotateZUpVertexToRuntime(vertex) {
  if (!Array.isArray(vertex) || vertex.length !== 3) return Object.freeze([0, 0, 0]);
  const [x, y, z] = vertex;
  // The imported mesh reads as Z-up. Convert it into the editor runtime basis
  // before the downstream mirrorZ step in the avatar head builder.
  // This keeps the imported GLB upright in authored head space; mirrorZ then
  // flips it into the same forward-facing runtime used by the built-in heads.
  return [x, z, -y];
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

  return {
    min,
    max,
    size: {
      x: Math.max(max.x - min.x, 0.0001),
      y: Math.max(max.y - min.y, 0.0001),
      z: Math.max(max.z - min.z, 0.0001),
    },
  };
}

function fitVerticesUniformlyToTargetBox(vertices, targetBox) {
  const bounds = computeBounds(vertices);
  const targetSize = {
    x: targetBox.max.x - targetBox.min.x,
    y: targetBox.max.y - targetBox.min.y,
    z: targetBox.max.z - targetBox.min.z,
  };
  const scale = Math.min(
    targetSize.x / bounds.size.x,
    targetSize.y / bounds.size.y,
    targetSize.z / bounds.size.z,
  );
  const sourceCenter = {
    x: (bounds.min.x + bounds.max.x) * 0.5,
    y: (bounds.min.y + bounds.max.y) * 0.5,
    z: (bounds.min.z + bounds.max.z) * 0.5,
  };
  const targetCenter = {
    x: (targetBox.min.x + targetBox.max.x) * 0.5,
    y: (targetBox.min.y + targetBox.max.y) * 0.5,
    z: (targetBox.min.z + targetBox.max.z) * 0.5,
  };

  return vertices.map((vertex) => Object.freeze([
    (vertex[0] - sourceCenter.x) * scale + targetCenter.x,
    (vertex[1] - sourceCenter.y) * scale + targetCenter.y,
    (vertex[2] - sourceCenter.z) * scale + targetCenter.z,
  ]));
}

const whiteMesh180Geometry = readHeadBaseGeometry(whiteMesh180Source);
const WHITE_MESH180_TARGET_BOX = Object.freeze({
  min: Object.freeze({ x: -1.18, y: 0, z: -0.68 }),
  max: Object.freeze({ x: 1.18, y: 3.58, z: 0.36 }),
});

const IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM = Object.freeze({
  rotationDegrees: Object.freeze({ x: -90, y: 0, z: 0 }),
  position: Object.freeze({ x: 0, y: 0.7, z: 0.1 }),
});

function createRuntimeHeadMesh(id, source, options = {}) {
  const geometry = readHeadBaseGeometry(source);
  const runtimeVertices = fitVerticesUniformlyToTargetBox(
    geometry.vertices.map((vertex) => rotateZUpVertexToRuntime(vertex)),
    WHITE_MESH180_TARGET_BOX,
  );

  return Object.freeze({
    id,
    customGeometry: Object.freeze({
      // Preserve the imported silhouette while moving it into the same authored
      // coordinate space used by the facial SVG layers.
      vertices: Object.freeze(runtimeVertices),
      faces: Object.freeze(geometry.faces.map((face) => Object.freeze([...face]))),
    }),
    rootTransform: options.rootTransform || null,
  });
}

const MESH_PORTRAIT_HEAD_VARIANTS = Object.freeze([
  Object.freeze({ id: 'psx_mesh_portrait_01', source: whiteMesh180Source }),
  Object.freeze({ id: 'psx_mesh_portrait_normal_175', source: normal175Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
  Object.freeze({ id: 'psx_mesh_portrait_cabezon_175', source: cabezon175Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
  Object.freeze({ id: 'psx_mesh_portrait_duro_175', source: duro175Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
  Object.freeze({ id: 'psx_mesh_portrait_duro_250', source: duro250Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
  Object.freeze({ id: 'psx_mesh_portrait_gordo_175', source: gordo175Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
  Object.freeze({ id: 'psx_mesh_portrait_gordo_275', source: gordo275Source, rootTransform: IMPORTED_MESH_PORTRAIT_ROOT_TRANSFORM }),
]);

export const AVATAR_HEAD_MESH_MAP = Object.freeze(
  Object.fromEntries(
    MESH_PORTRAIT_HEAD_VARIANTS.map(({ id, source, rootTransform }) => [id, createRuntimeHeadMesh(id, source, { rootTransform })])
  )
);
