import {
  buildGeneratedHead,
  buildGeneratedHeadById,
  GENERATED_HEAD_PRESETS,
} from '../generated-heads.js';

export const HEAD_LANDMARK_KEYS = Object.freeze([
  'eyeL', 'eyeR', 'noseTip', 'mouth', 'earL', 'earR', 'hairline', 'crown', 'chin',
]);

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

const GENERATED_HEAD_VARIANTS = Object.freeze(
  GENERATED_HEAD_PRESETS.map((preset) => Object.freeze({
    id: preset.id,
    entry: createGeneratedRuntimeHeadMesh(preset),
  }))
);

export const AVATAR_HEAD_MESH_MAP = Object.freeze(
  Object.fromEntries(
    GENERATED_HEAD_VARIANTS.map(({ id, entry }) => [id, entry])
  )
);
