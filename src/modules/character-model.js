// CharacterModel — conversion between CharacterModel format and internal pieces format

import { getArchetype, validateSlot } from './archetype-system.js';

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
};

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
      if (!Array.isArray(piece.size) || piece.size.length !== 3) {
        return `Piece "${piece.name}" requires "size" as [x,y,z]`;
      }
      if (!Array.isArray(piece.offset) || piece.offset.length !== 3) {
        return `Piece "${piece.name}" requires "offset" as [x,y,z]`;
      }
      if (piece.material === undefined || piece.material === null) {
        return `Piece "${piece.name}" requires a "material" field`;
      }
    }
  }

  return null;
}

// Convert template type + size to geometry definition
function templateToGeometry(template, size) {
  const geoType = TEMPLATE_TO_GEOMETRY[template.toUpperCase()] || 'cube';
  const params = {};

  switch (geoType) {
    case 'cube':
    case 'wedge':
      params.width = size[0];
      params.height = size[1];
      params.depth = size[2];
      break;
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

  return { type: geoType, params };
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
        geometry: templateToGeometry(piece.template, piece.size),
        color: piece.material || '#ffcc00',
        position: [...piece.offset],
      };

      if (piece.rotation) converted.rotation = [...piece.rotation];
      if (piece.scale) converted.scale = [...piece.scale];
      if (piece.parent) converted.parent = piece.parent;
      if (piece.pivot) converted.pivot = [...piece.pivot];

      pieces.push(converted);
      names.push(piece.name);
    }
    slotMap[slot.slotId] = names;
  }

  return { pieces, slotMap };
}

// Convert internal pieces[] back to CharacterModel format
export function piecesToCharacterModel(pieces, metadata) {
  const { archetype, slotMap, animationProfile, skeletonId } = metadata;
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
    if (piece.rotation) cmPiece.rotation = piece.rotation;
    if (piece.scale) cmPiece.scale = piece.scale;
    if (piece.parent) cmPiece.parent = piece.parent;
    if (piece.pivot) cmPiece.pivot = piece.pivot;

    slotPieces[slotId].push(cmPiece);
  }

  for (const [slotId, pcs] of Object.entries(slotPieces)) {
    slots.push({ slotId, pieces: pcs });
  }

  const model = { name: metadata.name || 'MODEL', archetype, slots };
  if (animationProfile) model.animationProfile = animationProfile;
  if (skeletonId) model.skeletonId = skeletonId;

  return model;
}

function geometryTypeToTemplate(type) {
  const map = { cube: 'CUBE', wedge: 'PRISM', plane: 'PLANE', cylinder: 'CYLINDER', sphere: 'SPHERE', cone: 'CONE', capsule: 'CAPSULE', torus: 'TORUS', pyramid: 'PYRAMID' };
  return map[type] || 'CUBE';
}

function geometryToSize(geometry) {
  if (!geometry || !geometry.params) return [1, 1, 1];
  const p = geometry.params;
  switch (geometry.type) {
    case 'cube': case 'wedge': return [p.width || 1, p.height || 1, p.depth || 1];
    case 'plane': return [p.width || 1, p.height || 1, 0];
    case 'cylinder': return [(p.radiusTop || 0.5) * 2, p.height || 1, (p.radiusBottom || 0.5) * 2];
    case 'sphere': return [(p.radius || 0.5) * 2, (p.radius || 0.5) * 2, (p.radius || 0.5) * 2];
    case 'cone': return [(p.radius || 0.5) * 2, p.height || 1, (p.radius || 0.5) * 2];
    case 'capsule': return [(p.radius || 0.5) * 2, p.length || 1, (p.radius || 0.5) * 2];
    case 'torus': return [(p.radius || 0.5) * 2, (p.tube || 0.1) * 2, 0];
    case 'pyramid': return [p.width || 1, p.height || 1, 0];
    default: return [1, 1, 1];
  }
}

// Detect which format a JSON object uses
export function detectFormat(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.archetype && Array.isArray(data.slots)) return 'character-model';
  if (Array.isArray(data.pieces)) return 'legacy';
  if (Array.isArray(data.tracks)) return 'animation';
  if (data.animations && !data.pieces) return 'animation';
  if (data.bones && data.defaultBindings) return 'skeleton';
  return null;
}
