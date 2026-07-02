// CharacterModel — conversion between CharacterModel format and internal pieces format

import { getArchetype, validateSlot } from '../animation/archetype-system.js';
import { validateFaceColors } from './retro-effects.js';
import { validateVertexColors } from './vertex-colors.js';
import { validateFaceDecalSpec } from '../texture/texture-generator.js';

const TEMPLATE_TO_GEOMETRY = {
  CUBE: 'cube',
  PRISM: 'wedge',
  PLANE: 'plane',
  CYLINDER: 'cylinder',
  SPHERE: 'sphere',
  CONE: 'cone',
  CAPSULE: 'capsule',
  TORUS: 'torus',
  PYRAMID: 'pyramid',
  TAPERED_BOX: 'taperedBox',
  TAPEREDBOX: 'taperedBox',
  LIMB_LOFT: 'limbLoft',
  LIMBLOFT: 'limbLoft',
  LATHE: 'lathe',
  LABEL: 'label',
  CUSTOM: 'custom',
};

const MAX_CUSTOM_VERTICES = 512;
const MAX_CUSTOM_FACES = 1024;

function cloneOptionalValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateTextureDefinition(texture, pieceName) {
  if (texture === undefined || texture === null) return null;
  if (!isPlainObject(texture)) {
    return `Piece "${pieceName}" optional "texture" must be an object`;
  }
  if (typeof texture.dataURL !== 'string' || texture.dataURL.length === 0) {
    return `Piece "${pieceName}" texture requires a non-empty "dataURL" string`;
  }
  if (texture.transform !== undefined) {
    if (!isPlainObject(texture.transform)) {
      return `Piece "${pieceName}" texture "transform" must be an object`;
    }
    const { offset, repeat, center, rotation } = texture.transform;
    const vec2Props = [
      ['offset', offset],
      ['repeat', repeat],
      ['center', center],
    ];
    for (const [label, value] of vec2Props) {
      if (value !== undefined && (!Array.isArray(value) || value.length !== 2 || value.some((entry) => !Number.isFinite(entry)))) {
        return `Piece "${pieceName}" texture transform "${label}" must be [x, y]`;
      }
    }
    if (rotation !== undefined && !Number.isFinite(rotation)) {
      return `Piece "${pieceName}" texture transform "rotation" must be a number`;
    }
  }
  if (texture.faceUVs !== undefined) {
    if (!Array.isArray(texture.faceUVs) || texture.faceUVs.length > 6) {
      return `Piece "${pieceName}" texture "faceUVs" must be an array with up to 6 entries`;
    }
    for (const entry of texture.faceUVs) {
      if (entry == null) continue;
      if (!isPlainObject(entry)) {
        return `Piece "${pieceName}" texture faceUV entries must be objects`;
      }
      const required = ['ou', 'ov', 'su', 'sv'];
      for (const key of required) {
        if (!Number.isFinite(entry[key])) {
          return `Piece "${pieceName}" texture faceUV entry requires numeric "${key}"`;
        }
      }
      if (entry.rot !== undefined && !Number.isFinite(entry.rot)) {
        return `Piece "${pieceName}" texture faceUV "rot" must be a number`;
      }
    }
  }
  if (texture.processing !== undefined) {
    if (!isPlainObject(texture.processing)) {
      return `Piece "${pieceName}" texture "processing" must be an object`;
    }
    const { downscaleEnabled, targetSize, palette15Bit, ditheringEnabled } = texture.processing;
    if (downscaleEnabled !== undefined && typeof downscaleEnabled !== 'boolean') {
      return `Piece "${pieceName}" texture processing "downscaleEnabled" must be boolean`;
    }
    if (targetSize !== undefined && ![32, 64, 128].includes(targetSize)) {
      return `Piece "${pieceName}" texture processing "targetSize" must be 32, 64 or 128`;
    }
    if (palette15Bit !== undefined && typeof palette15Bit !== 'boolean') {
      return `Piece "${pieceName}" texture processing "palette15Bit" must be boolean`;
    }
    if (ditheringEnabled !== undefined && typeof ditheringEnabled !== 'boolean') {
      return `Piece "${pieceName}" texture processing "ditheringEnabled" must be boolean`;
    }
  }
  return null;
}

function validateCustomGeometryParams(params, pieceName) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return `Piece "${pieceName}" custom geometry requires a "params" object`;
  }

  const { vertices, faces } = params;
  if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > MAX_CUSTOM_VERTICES) {
    return `Piece "${pieceName}" custom geometry requires 3-${MAX_CUSTOM_VERTICES} vertices`;
  }
  if (!Array.isArray(faces) || faces.length < 1 || faces.length > MAX_CUSTOM_FACES) {
    return `Piece "${pieceName}" custom geometry requires 1-${MAX_CUSTOM_FACES} faces`;
  }

  for (const vertex of vertices) {
    if (!Array.isArray(vertex) || vertex.length !== 3 || vertex.some((value) => !Number.isFinite(value))) {
      return `Piece "${pieceName}" custom geometry has an invalid vertex`;
    }
  }

  for (const face of faces) {
    if (!Array.isArray(face) || face.length !== 3 || face.some((value) => !Number.isInteger(value) || value < 0 || value >= vertices.length)) {
      return `Piece "${pieceName}" custom geometry has an invalid face`;
    }
    if (new Set(face).size !== 3) {
      return `Piece "${pieceName}" custom geometry has a degenerate face`;
    }
  }

  return null;
}

function geometryParamsToBounds(vertices) {
  if (!Array.isArray(vertices) || vertices.length === 0) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  vertices.forEach((vertex) => {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], vertex[i]);
      max[i] = Math.max(max[i], vertex[i]);
    }
  });

  return [
    Math.max(max[0] - min[0], 0.01),
    Math.max(max[1] - min[1], 0.01),
    Math.max(max[2] - min[2], 0.01),
  ];
}

function defaultLimbLoftSectionsFromSize(size = [1, 1, 1]) {
  const radiusX = Math.max((size[0] || 1) / 2, 0.01);
  const radiusZ = Math.max((size[2] || size[0] || 1) / 2, 0.01);
  const halfHeight = Math.max((size[1] || 1) / 2, 0.01);
  return [
    { y: -halfHeight, radiusX, radiusZ, offsetX: 0, offsetZ: 0 },
    { y: halfHeight, radiusX, radiusZ, offsetX: 0, offsetZ: 0 },
  ];
}

function limbLoftGeometryToSize(params = {}) {
  const sections = Array.isArray(params.sections) ? params.sections : [];
  if (sections.length === 0) return [1, 1, 1];

  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  sections.forEach((section) => {
    const radiusX = section.radiusX ?? 0.5;
    const radiusZ = section.radiusZ ?? radiusX;
    const offsetX = section.offsetX ?? 0;
    const offsetZ = section.offsetZ ?? 0;
    minY = Math.min(minY, section.y ?? 0);
    maxY = Math.max(maxY, section.y ?? 0);
    minX = Math.min(minX, offsetX - radiusX);
    maxX = Math.max(maxX, offsetX + radiusX);
    minZ = Math.min(minZ, offsetZ - radiusZ);
    maxZ = Math.max(maxZ, offsetZ + radiusZ);
  });

  return [
    Math.max(maxX - minX, 0.01),
    Math.max(maxY - minY, 0.01),
    Math.max(maxZ - minZ, 0.01),
  ];
}

function defaultLathePointsFromSize(size = [1, 1, 1]) {
  const radius = Math.max((size[0] || 1) / 2, 0.01);
  const halfHeight = Math.max((size[1] || 1) / 2, 0.01);
  return [
    [0, -halfHeight],
    [radius, -halfHeight * 0.55],
    [radius * 0.86, halfHeight * 0.45],
    [0, halfHeight],
  ];
}

function latheGeometryToSize(params = {}) {
  const points = Array.isArray(params.points) ? params.points : [];
  if (points.length === 0) return [1, 1, 1];
  let maxRadius = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach((point) => {
    const radius = point?.[0] ?? 0;
    const y = point?.[1] ?? 0;
    maxRadius = Math.max(maxRadius, radius);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const diameter = Math.max(maxRadius * 2, 0.01);
  return [diameter, Math.max(maxY - minY, 0.01), diameter];
}

// Validate a CharacterModel JSON object, returns error string or null
export function validateCharacterModel(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'CharacterModel must be an object';
  }
  if (!data.name || typeof data.name !== 'string') {
    return 'CharacterModel requires a "name" string';
  }
  if (!data.archetype || typeof data.archetype !== 'string') {
    return 'CharacterModel requires an "archetype" string';
  }
  const arch = getArchetype(data.archetype);
  if (!arch) {
    return `Archetype not recognized: ${data.archetype}`;
  }
  if (!Array.isArray(data.slots) || data.slots.length === 0) {
    return 'CharacterModel requires a non-empty "slots" array';
  }

  const pieceNames = new Set();

  for (let i = 0; i < data.slots.length; i++) {
    const slot = data.slots[i];
    if (!slot.slotId || typeof slot.slotId !== 'string') {
      return `Slot ${i + 1} requires a "slotId" string`;
    }
    if (!validateSlot(data.archetype, slot.slotId)) {
      return `Slot "${slot.slotId}" is not valid for archetype "${data.archetype}"`;
    }
    if (!Array.isArray(slot.pieces) || slot.pieces.length === 0) {
      return `Slot "${slot.slotId}" requires a non-empty "pieces" array`;
    }

    for (let j = 0; j < slot.pieces.length; j++) {
      const piece = slot.pieces[j];
      if (!piece.template || typeof piece.template !== 'string') {
        return `Piece ${j + 1} in slot "${slot.slotId}" requires a "template" string`;
      }
      const geoType = TEMPLATE_TO_GEOMETRY[piece.template.toUpperCase()];
      if (!geoType) {
        return `Unknown template type "${piece.template}" in slot "${slot.slotId}"`;
      }
      if (!piece.name || typeof piece.name !== 'string') {
        return `Piece ${j + 1} in slot "${slot.slotId}" requires a "name" string`;
      }
      if (pieceNames.has(piece.name)) {
        return `Duplicate piece name "${piece.name}"`;
      }
      pieceNames.add(piece.name);
      if (geoType === 'label') {
        // Label pieces are empty pivot nodes used by rigs and grouping.
      } else if (geoType === 'custom') {
        const customError = validateCustomGeometryParams(piece.params, piece.name);
        if (customError) return customError;
        if (piece.size !== undefined && (!Array.isArray(piece.size) || piece.size.length !== 3)) {
          return `Piece "${piece.name}" optional "size" must be [x,y,z] when provided`;
        }
      } else if (!Array.isArray(piece.size) || piece.size.length !== 3) {
        return `Piece "${piece.name}" requires "size" as [x,y,z]`;
      }
      if (!Array.isArray(piece.offset) || piece.offset.length !== 3) {
        return `Piece "${piece.name}" requires "offset" as [x,y,z]`;
      }
      if (piece.material === undefined || piece.material === null) {
        return `Piece "${piece.name}" requires a "material" field`;
      }
      if (piece.params !== undefined && (!piece.params || typeof piece.params !== 'object' || Array.isArray(piece.params))) {
        return `Piece "${piece.name}" optional "params" must be an object`;
      }
      const texError = validateTextureDefinition(piece.texture, piece.name);
      if (texError) return texError;
      const decalError = validateFaceDecalSpec(piece.decal, j);
      if (decalError) return decalError;
      if (piece.opacity !== undefined && (!Number.isFinite(piece.opacity) || piece.opacity < 0 || piece.opacity > 1)) {
        return `Piece "${piece.name}" optional "opacity" must be a number between 0 and 1`;
      }
      const vcError = validateVertexColors(piece.vertexColors, j);
      if (vcError) return vcError;
      const fcError = validateFaceColors(piece.faceColors, j);
      if (fcError) return fcError;
    }
  }

  return null;
}

// Convert template type + size to geometry definition
function templateToGeometry(template, size, extraParams = {}) {
  const geoType = TEMPLATE_TO_GEOMETRY[template.toUpperCase()] || 'cube';
  const params = {};

  switch (geoType) {
    case 'label':
      return {
        type: 'label',
        params: {},
      };
    case 'custom':
      return {
        type: 'custom',
        params: {
          vertices: cloneOptionalValue(extraParams.vertices) || [],
          faces: cloneOptionalValue(extraParams.faces) || [],
        },
      };
    case 'cube':
    case 'wedge':
      params.width = size[0];
      params.height = size[1];
      params.depth = size[2];
      break;
    case 'taperedBox':
      params.widthBottom = size[0];
      params.height = size[1];
      params.depthBottom = size[2];
      params.widthTop = extraParams.widthTop ?? size[0];
      params.depthTop = extraParams.depthTop ?? size[2];
      break;
    case 'limbLoft':
      return {
        type: 'limbLoft',
        params: {
          sides: extraParams.sides ?? 6,
          sections: cloneOptionalValue(extraParams.sections) || defaultLimbLoftSectionsFromSize(size),
          capTop: extraParams.capTop ?? true,
          capBottom: extraParams.capBottom ?? true,
        },
      };
    case 'lathe':
      return {
        type: 'lathe',
        params: {
          points: cloneOptionalValue(extraParams.points) || defaultLathePointsFromSize(size),
          segments: extraParams.segments ?? 8,
        },
      };
    case 'plane':
      params.width = size[0];
      params.height = size[1];
      break;
    case 'cylinder':
      params.radiusTop = size[0] / 2;
      params.radiusBottom = size[0] / 2;
      params.height = size[1];
      break;
    case 'sphere':
      params.radius = size[0] / 2;
      break;
    case 'cone':
      params.radius = size[0] / 2;
      params.height = size[1];
      break;
    case 'capsule':
      params.radius = size[0] / 2;
      params.length = size[1];
      break;
    case 'torus':
      params.radius = size[0] / 2;
      params.tube = size[1] / 2;
      break;
    case 'pyramid':
      params.width = size[0];
      params.height = size[1];
      break;
    default:
      params.width = size[0];
      params.height = size[1];
      params.depth = size[2];
  }

  return { type: geoType, params: { ...params, ...extraParams } };
}

// Convert a CharacterModel to the internal pieces[] format
export function characterModelToPieces(model) {
  const pieces = [];
  const slotMap = {};

  for (const slot of model.slots) {
    const names = [];
    for (const piece of slot.pieces) {
      const converted = {
        name: piece.name,
        geometry: templateToGeometry(piece.template, piece.size, piece.params),
        color: piece.material || '#ffcc00',
        position: [...piece.offset],
      };

      if (piece.rotation) converted.rotation = [...piece.rotation];
      if (piece.scale) converted.scale = [...piece.scale];
      if (piece.parent) converted.parent = piece.parent;
      if (piece.pivot) converted.pivot = [...piece.pivot];
      if (piece.opacity !== undefined) converted.opacity = piece.opacity;
      if (piece.vertexColors !== undefined) converted.vertexColors = cloneOptionalValue(piece.vertexColors);
      if (piece.faceColors !== undefined) converted.faceColors = cloneOptionalValue(piece.faceColors);
      if (piece.texture !== undefined) converted.texture = cloneOptionalValue(piece.texture);
      if (piece.decal !== undefined) converted.decal = cloneOptionalValue(piece.decal);

      pieces.push(converted);
      names.push(piece.name);
    }
    slotMap[slot.slotId] = names;
  }

  return { pieces, slotMap };
}

// Convert internal pieces[] back to CharacterModel format
export function piecesToCharacterModel(pieces, metadata) {
  const { archetype, slotMap, animationProfile, skeletonId, slotBindings } = metadata;
  const slots = [];

  // Invert slotMap: piece name → slotId
  const pieceToSlot = {};
  for (const [slotId, names] of Object.entries(slotMap || {})) {
    for (const name of names) {
      pieceToSlot[name] = slotId;
    }
  }

  // Group pieces by slot
  const slotPieces = {};
  for (const piece of pieces) {
    const slotId = pieceToSlot[piece.name] || 'BODY';
    if (!slotPieces[slotId]) slotPieces[slotId] = [];

    const cmPiece = {
      template: geometryTypeToTemplate(piece.geometry?.type || 'cube'),
      name: piece.name,
      size: geometryToSize(piece.geometry),
      offset: piece.position || [0, 0, 0],
      material: piece.color || '#ffcc00',
    };
    const extraParams = extractGeometryExtraParams(piece.geometry);
    if (extraParams) cmPiece.params = extraParams;
    if (piece.rotation) cmPiece.rotation = piece.rotation;
    if (piece.scale) cmPiece.scale = piece.scale;
    if (piece.parent) cmPiece.parent = piece.parent;
    if (piece.pivot) cmPiece.pivot = piece.pivot;
    if (piece.opacity !== undefined) cmPiece.opacity = piece.opacity;
    if (piece.vertexColors !== undefined) cmPiece.vertexColors = cloneOptionalValue(piece.vertexColors);
    if (piece.faceColors !== undefined) cmPiece.faceColors = cloneOptionalValue(piece.faceColors);
    if (piece.texture !== undefined) cmPiece.texture = cloneOptionalValue(piece.texture);
    if (piece.decal !== undefined) cmPiece.decal = cloneOptionalValue(piece.decal);

    slotPieces[slotId].push(cmPiece);
  }

  for (const [slotId, pcs] of Object.entries(slotPieces)) {
    slots.push({ slotId, pieces: pcs });
  }

  const model = { name: metadata.name || 'MODEL', archetype, slots };
  if (animationProfile) model.animationProfile = animationProfile;
  if (skeletonId) model.skeletonId = skeletonId;
  if (slotBindings) model.slotBindings = cloneOptionalValue(slotBindings);

  return model;
}

function geometryTypeToTemplate(type) {
  const map = { cube: 'CUBE', wedge: 'PRISM', plane: 'PLANE', cylinder: 'CYLINDER', sphere: 'SPHERE', cone: 'CONE', capsule: 'CAPSULE', torus: 'TORUS', pyramid: 'PYRAMID', taperedBox: 'TAPERED_BOX', limbLoft: 'LIMB_LOFT', lathe: 'LATHE', label: 'LABEL', custom: 'CUSTOM' };
  return map[type] || 'CUBE';
}

function extractGeometryExtraParams(geometry) {
  if (!geometry || !geometry.params) return null;
  const params = { ...geometry.params };

  switch (geometry.type) {
    case 'cube':
    case 'wedge':
      delete params.width;
      delete params.height;
      delete params.depth;
      break;
    case 'taperedBox':
      delete params.widthBottom;
      delete params.height;
      delete params.depthBottom;
      break;
    case 'limbLoft':
      break;
    case 'lathe':
      break;
    case 'plane':
      delete params.width;
      delete params.height;
      break;
    case 'cylinder':
      delete params.radiusTop;
      delete params.radiusBottom;
      delete params.height;
      break;
    case 'sphere':
      delete params.radius;
      break;
    case 'cone':
      delete params.radius;
      delete params.height;
      break;
    case 'capsule':
      delete params.radius;
      delete params.length;
      break;
    case 'torus':
      delete params.radius;
      delete params.tube;
      break;
    case 'pyramid':
      delete params.width;
      delete params.height;
      break;
    case 'custom':
      break;
    default:
      break;
  }

  return Object.keys(params).length > 0 ? params : null;
}

function geometryToSize(geometry) {
  if (!geometry || !geometry.params) return [1, 1, 1];
  const p = geometry.params;
  switch (geometry.type) {
    case 'cube': case 'wedge': return [p.width || 1, p.height || 1, p.depth || 1];
    case 'taperedBox': return [p.widthBottom || 1, p.height || 1, p.depthBottom || 1];
    case 'limbLoft': return limbLoftGeometryToSize(p);
    case 'lathe': return latheGeometryToSize(p);
    case 'plane': return [p.width || 1, p.height || 1, 0];
    case 'cylinder': return [(p.radiusTop || 0.5) * 2, p.height || 1, (p.radiusBottom || 0.5) * 2];
    case 'sphere': return [(p.radius || 0.5) * 2, (p.radius || 0.5) * 2, (p.radius || 0.5) * 2];
    case 'cone': return [(p.radius || 0.5) * 2, p.height || 1, (p.radius || 0.5) * 2];
    case 'capsule': return [(p.radius || 0.5) * 2, p.length || 1, (p.radius || 0.5) * 2];
    case 'torus': return [(p.radius || 0.5) * 2, (p.tube || 0.1) * 2, 0];
    case 'pyramid': return [p.width || 1, p.height || 1, 0];
    case 'custom': return geometryParamsToBounds(p.vertices) || [1, 1, 1];
    default: return [1, 1, 1];
  }
}

// Detect which format a JSON object uses
export function detectFormat(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.archetype && Array.isArray(data.slots)) return 'character-model';
  if (data.svgSource?.markup) return 'legacy';
  if (Array.isArray(data.pieces)) return 'legacy';
  if (data.format === 'fast-poser-asset' && data.type === 'animation' && Array.isArray(data.keyframes)) return 'animation';
  if (Array.isArray(data.tracks)) return 'animation';
  if (data.animations && !data.pieces) return 'animation';
  if (data.bones && data.defaultBindings) return 'skeleton';
  return null;
}
