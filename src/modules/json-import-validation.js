const VALID_TYPES = ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus'];
const MAX_PIECES = 200;
const MAX_NAME_LENGTH = 80;
const MAX_ABS_POSITION = 1000;
const MAX_ABS_SCALE = 100;
const MAX_ABS_DIMENSION = 1000;
const MAX_SEGMENTS = 64;
const MAX_NESTING_DEPTH = 8;
const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function sanitizeName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
  return normalized || fallback;
}

function normalizeColor(color) {
  return typeof color === 'string' && HEX_COLOR_RE.test(color) ? color : '#ffcc00';
}

function cloneVector3(vector, fallback) {
  return Array.isArray(vector) ? [...vector] : [...fallback];
}

function validateVector3(vector, pieceIndex, field, translate, maxAbs = MAX_ABS_POSITION) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !isFiniteNumber(value) || Math.abs(value) > maxAbs)) {
    return translate('pieceVectorInvalid', { n: pieceIndex + 1, field });
  }
  return null;
}

function validateGeometryParams(type, params, pieceIndex, translate) {
  if (params === undefined) return null;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return translate('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
  }

  const numberRulesByType = {
    cube: { width: [0.01, MAX_ABS_DIMENSION], height: [0.01, MAX_ABS_DIMENSION], depth: [0.01, MAX_ABS_DIMENSION] },
    sphere: { radius: [0.01, MAX_ABS_DIMENSION], widthSegments: [3, MAX_SEGMENTS], heightSegments: [2, MAX_SEGMENTS] },
    cylinder: {
      radiusTop: [0, MAX_ABS_DIMENSION],
      radiusBottom: [0, MAX_ABS_DIMENSION],
      height: [0.01, MAX_ABS_DIMENSION],
      radialSegments: [3, MAX_SEGMENTS],
    },
    cone: { radius: [0.01, MAX_ABS_DIMENSION], height: [0.01, MAX_ABS_DIMENSION], radialSegments: [3, MAX_SEGMENTS] },
    plane: { width: [0.01, MAX_ABS_DIMENSION], height: [0.01, MAX_ABS_DIMENSION] },
    capsule: {
      radius: [0.01, MAX_ABS_DIMENSION],
      length: [0.01, MAX_ABS_DIMENSION],
      capSegments: [1, MAX_SEGMENTS],
      radialSegments: [3, MAX_SEGMENTS],
    },
    torus: {
      radius: [0.01, MAX_ABS_DIMENSION],
      tube: [0.01, MAX_ABS_DIMENSION],
      radialSegments: [3, MAX_SEGMENTS],
      tubularSegments: [3, MAX_SEGMENTS],
    },
  };

  const rules = numberRulesByType[type] || {};
  for (const [key, value] of Object.entries(params)) {
    if (!isFiniteNumber(value)) {
      return translate('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
    }
    if (!rules[key]) continue;
    const [min, max] = rules[key];
    if (value < min || value > max) {
      return translate('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: key, min, max });
    }
  }

  return null;
}

function validateHierarchy(pieces, translate) {
  const parentByName = new Map(pieces.map((piece) => [piece.name, piece.parent || null]));

  for (const piece of pieces) {
    if (!piece.parent) continue;
    if (!parentByName.has(piece.parent)) {
      return translate('pieceParentMissing', { name: piece.name, parent: piece.parent });
    }
    if (piece.parent === piece.name) {
      return translate('pieceParentSelf', { name: piece.name });
    }

    let depth = 0;
    let current = piece.name;
    const visited = new Set([current]);

    while (parentByName.get(current)) {
      current = parentByName.get(current);
      depth++;
      if (visited.has(current)) {
        return translate('pieceParentCycle', { name: piece.name, max: MAX_NESTING_DEPTH });
      }
      visited.add(current);
      if (depth >= MAX_NESTING_DEPTH) {
        return translate('pieceParentCycle', { name: piece.name, max: MAX_NESTING_DEPTH });
      }
    }
  }

  return null;
}

export function normalizeObjectDefinition(data) {
  const normalized = {
    name: sanitizeName(data.name, 'IMPORTED OBJECT'),
    pieces: data.pieces.map((piece, index) => ({
      ...piece,
      name: sanitizeName(piece.name, `PIECE_${index + 1}`),
      color: normalizeColor(piece.color),
      position: cloneVector3(piece.position, [0, 0, 0]),
      rotation: piece.rotation ? [...piece.rotation] : undefined,
      scale: piece.scale ? [...piece.scale] : undefined,
      pivot: piece.pivot ? [...piece.pivot] : undefined,
      parent: piece.parent ? sanitizeName(piece.parent, '') : undefined,
      geometry: {
        type: piece.geometry.type,
        params: piece.geometry.params ? { ...piece.geometry.params } : {},
      },
    })),
  };

  if (Array.isArray(data.animations)) {
    normalized.animations = data.animations.map((animation) => ({ ...animation }));
  }

  return normalized;
}

export function validateObjectJSON(data, {
  translate = (key) => key,
} = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return translate('jsonMustBeObject');
  }
  if (!Array.isArray(data.pieces) || data.pieces.length === 0) {
    return translate('jsonNeedsPieces');
  }
  if (data.pieces.length > MAX_PIECES) {
    return translate('jsonTooManyPieces', { max: MAX_PIECES });
  }

  const seenNames = new Set();

  for (let i = 0; i < data.pieces.length; i++) {
    const piece = data.pieces[i];
    if (!piece || typeof piece !== 'object' || Array.isArray(piece)) {
      return translate('jsonPieceInvalid', { n: i + 1 });
    }
    if (!piece.geometry || !piece.geometry.type) {
      return translate('pieceMissingGeometry', { n: i + 1 });
    }
    if (!VALID_TYPES.includes(piece.geometry.type)) {
      return translate('pieceUnsupportedType', { n: i + 1, type: piece.geometry.type, types: VALID_TYPES.join(', ') });
    }
    if (piece.parent !== undefined && (typeof piece.parent !== 'string' || piece.parent.trim().length === 0)) {
      return translate('pieceParentInvalid', { n: i + 1 });
    }

    const normalizedName = sanitizeName(piece.name, `PIECE_${i + 1}`);
    if (seenNames.has(normalizedName)) {
      return translate('pieceDuplicateName', { name: normalizedName });
    }
    seenNames.add(normalizedName);

    const positionError = piece.position ? validateVector3(piece.position, i, 'position', translate) : null;
    if (positionError) return positionError;

    const rotationError = piece.rotation ? validateVector3(piece.rotation, i, 'rotation', translate, Math.PI * 100) : null;
    if (rotationError) return rotationError;

    const scaleError = piece.scale ? validateVector3(piece.scale, i, 'scale', translate, MAX_ABS_SCALE) : null;
    if (scaleError) return scaleError;

    const pivotError = piece.pivot ? validateVector3(piece.pivot, i, 'pivot', translate) : null;
    if (pivotError) return pivotError;

    const geometryError = validateGeometryParams(piece.geometry.type, piece.geometry.params || {}, i, translate);
    if (geometryError) return geometryError;
  }

  const hierarchyError = validateHierarchy(normalizeObjectDefinition(data).pieces, translate);
  if (hierarchyError) {
    return hierarchyError;
  }

  return null;
}
