import { state } from '../shared/state.js';
import { t } from '../shared/i18n.js';
import { buildGroupFromDefinition } from './templates.js';
import { selectMesh, deselect } from './selection.js';
import { showToast } from './ui.js';
import { emit } from '../../event-bus.js';
import { pushAction } from '../shared/undo.js';
import { importAnimationDataToGroup, importAnimationToGroup } from '../animation/animation-import.js';
import { normalizeGeometryDefinition, normalizeGeometryType } from './custom-geometries.js';
import { bakeRetroAO, normalizeRetroAO, validateRetroAO, validateVertexColors } from './vertex-colors.js';
import { evaluateStyleBudget, formatStyleBudgetWarning } from './style-budget.js';
import { getLang } from '../shared/i18n.js';
import { validateFaceColors } from './retro-effects.js';
import { validateFaceDecalSpec } from '../texture/texture-generator.js';
import { detectFormat, validateCharacterModel, characterModelToPieces } from './character-model.js';
import { registerProfile } from '../animation/animation-profiles.js';
import { registerSkeleton } from '../animation/skeleton-registry.js';
import { compileAnimation } from '../animation/animation.js';
import { rebuildRigAnimationsForGroup } from '../animation/rigging-utils.js';
import { createSvgGroupFromSource, findSvgMountTarget, mountSvgGroupToTarget } from '../svg/svg-model.js';
import { createPngModelGroup } from '../png-model/png-model.js';
import { validatePngModelSource } from '../png-model/png-model-metadata.js';

const SUPPORTED_TYPES = ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus', 'wedge', 'pyramid', 'taperedBox', 'limbLoft', 'lathe', 'custom', 'label'];
const VALID_INPUT_TYPES = [...SUPPORTED_TYPES, 'mesh'];
const MAX_PIECES = 400;
const MAX_NAME_LENGTH = 80;
const MAX_ABS_POSITION = 1000;
const MAX_ABS_SCALE = 100;
const MAX_ABS_DIMENSION = 1000;
const MAX_SEGMENTS = 64;
const MAX_CUSTOM_VERTICES = 512;
const MAX_CUSTOM_FACES = 1024;
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

function validateVector3(vector, pieceIndex, field, maxAbs = MAX_ABS_POSITION) {
  if (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !isFiniteNumber(value) || Math.abs(value) > maxAbs)) {
    return t('pieceVectorInvalid', { n: pieceIndex + 1, field });
  }
  return null;
}

function validateGeometryParams(type, params, pieceIndex) {
  if (type === 'label') return null;
  if (params === undefined) return null;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
  }

  if (type === 'custom') {
    const vertices = params.vertices;
    const faces = params.faces;
    const uvs = params.uvs;

    if (!Array.isArray(vertices) || vertices.length < 3 || vertices.length > MAX_CUSTOM_VERTICES) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'vertices', min: 3, max: MAX_CUSTOM_VERTICES });
    }
    if (!Array.isArray(faces) || faces.length < 1 || faces.length > MAX_CUSTOM_FACES) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'faces', min: 1, max: MAX_CUSTOM_FACES });
    }

    for (const vertex of vertices) {
      if (!Array.isArray(vertex) || vertex.length !== 3 || vertex.some((value) => !isFiniteNumber(value) || Math.abs(value) > MAX_ABS_DIMENSION)) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
    }

    for (const face of faces) {
      if (!Array.isArray(face) || face.length !== 3 || face.some((value) => !Number.isInteger(value) || value < 0 || value >= vertices.length)) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      if (new Set(face).size !== 3) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
    }

    if (uvs !== undefined && (
      !Array.isArray(uvs)
      || uvs.length !== vertices.length
      || uvs.some((uv) => (
        !Array.isArray(uv)
        || uv.length !== 2
        || uv.some((value) => !isFiniteNumber(value) || Math.abs(value) > MAX_ABS_DIMENSION)
      ))
    )) {
      return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
    }

    return null;
  }

  if (type === 'limbLoft') {
    const sides = params.sides ?? 6;
    if (!Number.isInteger(sides) || sides < 4 || sides > 10) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'sides', min: 4, max: 10 });
    }
    if (!Array.isArray(params.sections) || params.sections.length < 2 || params.sections.length > 8) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'sections', min: 2, max: 8 });
    }
    if (params.capTop !== undefined && typeof params.capTop !== 'boolean') {
      return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
    }
    if (params.capBottom !== undefined && typeof params.capBottom !== 'boolean') {
      return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
    }

    let previousY = -Infinity;
    for (const section of params.sections) {
      if (!section || typeof section !== 'object' || Array.isArray(section)) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      const radiusZ = section.radiusZ ?? section.radiusX;
      const entries = [
        ['y', section.y],
        ['radiusX', section.radiusX],
        ['radiusZ', radiusZ],
        ['offsetX', section.offsetX ?? 0],
        ['offsetZ', section.offsetZ ?? 0],
      ];
      for (const [, value] of entries) {
        if (!isFiniteNumber(value) || Math.abs(value) > MAX_ABS_DIMENSION) {
          return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
        }
      }
      if (section.y <= previousY) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      if (section.radiusX <= 0 || radiusZ <= 0) {
        return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'radius', min: 0.01, max: MAX_ABS_DIMENSION });
      }
      previousY = section.y;
    }

    return null;
  }

  if (type === 'lathe') {
    const segments = params.segments ?? 8;
    if (!Number.isInteger(segments) || segments < 4 || segments > 12) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'segments', min: 4, max: 12 });
    }
    if (!Array.isArray(params.points) || params.points.length < 3 || params.points.length > 12) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'points', min: 3, max: 12 });
    }

    let previousY = -Infinity;
    let hasPositiveRadius = false;
    for (const point of params.points) {
      if (!Array.isArray(point) || point.length !== 2) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      const [radius, y] = point;
      if (!isFiniteNumber(radius) || !isFiniteNumber(y) || Math.abs(radius) > MAX_ABS_DIMENSION || Math.abs(y) > MAX_ABS_DIMENSION) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      if (radius < 0) {
        return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'radius', min: 0, max: MAX_ABS_DIMENSION });
      }
      if (y <= previousY) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
      if (radius > 0) hasPositiveRadius = true;
      previousY = y;
    }
    if (!hasPositiveRadius) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: 'radius', min: 0.01, max: MAX_ABS_DIMENSION });
    }

    return null;
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
    wedge: { width: [0.01, MAX_ABS_DIMENSION], height: [0.01, MAX_ABS_DIMENSION], depth: [0.01, MAX_ABS_DIMENSION] },
    pyramid: { width: [0.01, MAX_ABS_DIMENSION], height: [0.01, MAX_ABS_DIMENSION] },
    taperedBox: {
      widthBottom: [0.01, MAX_ABS_DIMENSION],
      depthBottom: [0.01, MAX_ABS_DIMENSION],
      widthTop: [0.01, MAX_ABS_DIMENSION],
      depthTop: [0.01, MAX_ABS_DIMENSION],
      height: [0.01, MAX_ABS_DIMENSION],
      offsetTopX: [-MAX_ABS_DIMENSION, MAX_ABS_DIMENSION],
      offsetTopZ: [-MAX_ABS_DIMENSION, MAX_ABS_DIMENSION],
    },
  };

  const rules = numberRulesByType[type] || {};
  if (type === 'taperedBox') {
    const required = ['widthBottom', 'depthBottom', 'widthTop', 'depthTop', 'height'];
    for (const key of required) {
      if (params[key] === undefined) {
        return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
      }
    }
  }
  for (const [key, value] of Object.entries(params)) {
    if (!isFiniteNumber(value)) {
      return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
    }
    if (!rules[key]) continue;
    const [min, max] = rules[key];
    if (value < min || value > max) {
      return t('pieceGeometryParamOutOfRange', { n: pieceIndex + 1, param: key, min, max });
    }
  }

  return null;
}

function validateHierarchy(pieces) {
  const parentByName = new Map(pieces.map((piece) => [piece.name, piece.parent || null]));

  for (const piece of pieces) {
    if (!piece.parent) continue;
    if (!parentByName.has(piece.parent)) {
      return t('pieceParentMissing', { name: piece.name, parent: piece.parent });
    }
    if (piece.parent === piece.name) {
      return t('pieceParentSelf', { name: piece.name });
    }

    let depth = 0;
    let current = piece.name;
    const visited = new Set([current]);

    while (parentByName.get(current)) {
      current = parentByName.get(current);
      depth++;
      if (visited.has(current)) {
        return t('pieceParentCycle', { name: piece.name, max: MAX_NESTING_DEPTH });
      }
      visited.add(current);
      if (depth >= MAX_NESTING_DEPTH) {
        return t('pieceParentCycle', { name: piece.name, max: MAX_NESTING_DEPTH });
      }
    }
  }

  return null;
}

function normalizeObjectDefinition(data) {
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
      geometry: normalizeGeometryDefinition(piece.geometry),
      vertexColors: piece.vertexColors !== undefined ? piece.vertexColors : undefined,
      faceColors: piece.faceColors !== undefined ? piece.faceColors : undefined,
      decal: piece.decal !== undefined ? cloneJsonValue(piece.decal) : undefined,
      opacity: piece.opacity !== undefined ? piece.opacity : undefined,
    })),
  };

  if (Array.isArray(data.animations)) {
    normalized.animations = data.animations.map((animation) => ({ ...animation }));
  }
  if (typeof data.archetype === 'string' && data.archetype.trim()) {
    normalized.archetype = data.archetype.trim();
  }
  if (data.slotMap && typeof data.slotMap === 'object' && !Array.isArray(data.slotMap)) {
    normalized.slotMap = cloneJsonValue(data.slotMap);
  }
  if (data.slotColors && typeof data.slotColors === 'object' && !Array.isArray(data.slotColors)) {
    normalized.slotColors = cloneJsonValue(data.slotColors);
  }
  if (data.slotSvgSources && typeof data.slotSvgSources === 'object' && !Array.isArray(data.slotSvgSources)) {
    normalized.slotSvgSources = cloneJsonValue(data.slotSvgSources);
  }
  if (typeof data.animationProfile === 'string' && data.animationProfile.trim()) {
    normalized.animationProfile = data.animationProfile.trim();
  }
  if (typeof data.skeletonId === 'string' && data.skeletonId.trim()) {
    normalized.skeletonId = data.skeletonId.trim();
  }
  if (data.slotBindings && typeof data.slotBindings === 'object' && !Array.isArray(data.slotBindings)) {
    normalized.slotBindings = cloneJsonValue(data.slotBindings);
  }
  if (data.retroAO !== undefined && data.retroAO !== null && data.retroAO !== false) {
    normalized.retroAO = normalizeRetroAO(data.retroAO);
  }
  if (data.avatarRecipe && typeof data.avatarRecipe === 'object' && !Array.isArray(data.avatarRecipe)) {
    normalized.avatarRecipe = cloneJsonValue(data.avatarRecipe);
  }
  if (Array.isArray(data.attachments)) {
    normalized.attachments = cloneJsonValue(data.attachments);
  }

  return normalized;
}

function hasSvgSourcePayload(data) {
  return typeof data?.svgSource?.markup === 'string' && data.svgSource.markup.trim().length > 0;
}

function hasPngModelPayload(data) {
  return typeof data?.pngModelSource?.dataURL === 'string' && data.pngModelSource.dataURL.length > 0;
}

function validatePngModelPayload(data) {
  const sourceValidation = validatePngModelSource(data.pngModelSource);
  if (!sourceValidation.ok) return sourceValidation.error;
  if (data.pngModelSettings !== undefined && (!data.pngModelSettings || typeof data.pngModelSettings !== 'object' || Array.isArray(data.pngModelSettings))) {
    return 'Invalid PNG model settings.';
  }
  const depthMap = data.pngModelDepthMap;
  if (depthMap !== undefined && (
    !depthMap || typeof depthMap !== 'object' || Array.isArray(depthMap)
    || !Array.isArray(depthMap.values) || depthMap.values.length > 96 * 96
  )) return 'Invalid PNG model depth map.';
  if (data.transform !== undefined) {
    if (!data.transform || typeof data.transform !== 'object' || Array.isArray(data.transform)) return 'Invalid PNG model transform.';
    const positionError = data.transform.position ? validateVector3(data.transform.position, 0, 'position') : null;
    if (positionError) return positionError;
    const rotationError = data.transform.rotation ? validateVector3(data.transform.rotation, 0, 'rotation', Math.PI * 100) : null;
    if (rotationError) return rotationError;
    const scaleError = data.transform.scale ? validateVector3(data.transform.scale, 0, 'scale', MAX_ABS_SCALE) : null;
    if (scaleError) return scaleError;
  }
  return null;
}

function validateSvgPayload(data) {
  if (!data.svgSource || typeof data.svgSource !== 'object' || Array.isArray(data.svgSource)) {
    return t('svgSourceInvalid');
  }
  if (typeof data.svgSource.markup !== 'string' || data.svgSource.markup.trim().length === 0) {
    return t('svgSourceInvalid');
  }
  if (data.svgImportSettings !== undefined && (!data.svgImportSettings || typeof data.svgImportSettings !== 'object' || Array.isArray(data.svgImportSettings))) {
    return t('svgSourceInvalid');
  }
  return null;
}

export function validateObjectJSON(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return t('jsonMustBeObject');
  }

  if (hasSvgSourcePayload(data)) {
    return validateSvgPayload(data);
  }

  if (hasPngModelPayload(data)) {
    return validatePngModelPayload(data);
  }

  if (!Array.isArray(data.pieces) || data.pieces.length === 0) {
    return t('jsonNeedsPiecesOrSvgSource');
  }
  if (data.pieces.length > MAX_PIECES) {
    return t('jsonTooManyPieces', { max: MAX_PIECES });
  }

  const seenNames = new Set();

  for (let i = 0; i < data.pieces.length; i++) {
    const piece = data.pieces[i];
    if (!piece || typeof piece !== 'object' || Array.isArray(piece)) {
      return t('jsonPieceInvalid', { n: i + 1 });
    }
    if (!piece.geometry || !piece.geometry.type) {
      return t('pieceMissingGeometry', { n: i + 1 });
    }
    const normalizedGeometry = normalizeGeometryDefinition(piece.geometry);
    const normalizedType = normalizeGeometryType(piece.geometry.type);
    if (!SUPPORTED_TYPES.includes(normalizedGeometry.type)) {
      return t('pieceUnsupportedType', { n: i + 1, type: normalizedType || piece.geometry.type, types: VALID_INPUT_TYPES.join(', ') });
    }
    if (piece.parent !== undefined && (typeof piece.parent !== 'string' || piece.parent.trim().length === 0)) {
      return t('pieceParentInvalid', { n: i + 1 });
    }

    const normalizedName = sanitizeName(piece.name, `PIECE_${i + 1}`);
    if (seenNames.has(normalizedName)) {
      return t('pieceDuplicateName', { name: normalizedName });
    }
    seenNames.add(normalizedName);

    const positionError = piece.position ? validateVector3(piece.position, i, 'position') : null;
    if (positionError) return positionError;

    const rotationError = piece.rotation ? validateVector3(piece.rotation, i, 'rotation', Math.PI * 100) : null;
    if (rotationError) return rotationError;

    const scaleError = piece.scale ? validateVector3(piece.scale, i, 'scale', MAX_ABS_SCALE) : null;
    if (scaleError) return scaleError;

    const pivotError = piece.pivot ? validateVector3(piece.pivot, i, 'pivot') : null;
    if (pivotError) return pivotError;

    const geometryError = validateGeometryParams(normalizedGeometry.type, normalizedGeometry.params || {}, i);
    if (geometryError) return geometryError;

    const vcError = validateVertexColors(piece.vertexColors, i);
    if (vcError) return vcError;

    const fcError = validateFaceColors(piece.faceColors, i);
    if (fcError) return fcError;

    const decalError = validateFaceDecalSpec(piece.decal, i);
    if (decalError) return decalError;

    if (piece.opacity !== undefined) {
      if (!isFiniteNumber(piece.opacity) || piece.opacity < 0 || piece.opacity > 1) {
        return t('pieceGeometryParamOutOfRange', { n: i + 1, param: 'opacity', min: 0, max: 1 });
      }
    }
  }

  const retroAOError = validateRetroAO(data.retroAO);
  if (retroAOError) {
    return retroAOError;
  }

  const hierarchyError = validateHierarchy(normalizeObjectDefinition(data).pieces);
  if (hierarchyError) {
    return hierarchyError;
  }

  return null;
}

function applyImportedAnimations(group, animations) {
  if (!Array.isArray(animations) || animations.length === 0) return;

  const warnings = [];
  for (let i = 0; i < animations.length; i++) {
    const result = importAnimationDataToGroup(animations[i], group);
    if (!result.success) {
      warnings.push(result.error);
    }
  }
  if (warnings.length > 0) {
    showToast(warnings.join(' | '), 4500);
  }
}

function cloneJsonValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneJsonValue(entry));
  if (value && typeof value === 'object') {
    const clone = {};
    Object.entries(value).forEach(([key, entry]) => {
      clone[key] = cloneJsonValue(entry);
    });
    return clone;
  }
  return value;
}

function applyImportedRigMetadata(group, data = {}) {
  if (!group?.isGroup || !data?.archetype) return;

  group.userData.archetype = data.archetype;
  group.userData.slotMap = cloneJsonValue(data.slotMap || {});
  if (data.slotColors && typeof data.slotColors === 'object' && !Array.isArray(data.slotColors)) {
    group.userData.slotColors = cloneJsonValue(data.slotColors);
  } else {
    delete group.userData.slotColors;
  }
  if (data.slotSvgSources && typeof data.slotSvgSources === 'object' && !Array.isArray(data.slotSvgSources)) {
    group.userData.slotSvgSources = cloneJsonValue(data.slotSvgSources);
  } else {
    delete group.userData.slotSvgSources;
  }
  group.userData.animationProfile = data.animationProfile || null;
  group.userData.skeletonId = data.skeletonId || null;

  if (data.slotBindings && typeof data.slotBindings === 'object' && !Array.isArray(data.slotBindings)) {
    group.userData.slotBindings = cloneJsonValue(data.slotBindings);
  } else {
    delete group.userData.slotBindings;
  }
  if (data.avatarRecipe && typeof data.avatarRecipe === 'object' && !Array.isArray(data.avatarRecipe)) {
    group.userData.avatarRecipe = cloneJsonValue(data.avatarRecipe);
  } else {
    delete group.userData.avatarRecipe;
  }

  if (group.userData.skeletonId || group.userData.animationProfile) {
    rebuildRigAnimationsForGroup(group, {
      skeletonId: group.userData.skeletonId,
      animationProfile: group.userData.animationProfile,
    });
    return;
  }

  if (Array.isArray(group.userData.animations) && group.userData.animations.length > 0) {
    group.userData.animationClips = group.userData.animations
      .map((animDef) => compileAnimation(animDef, group))
      .filter(Boolean);
  }
}

async function applyImportedAttachments(group, attachments = []) {
  if (!group?.isGroup || !Array.isArray(attachments) || attachments.length === 0) return;

  for (const attachment of attachments) {
    if (attachment?.type !== 'svg' || !attachment.object?.svgSource?.markup) continue;

    try {
      const attachmentGroup = await createSvgGroupFromSource(
        attachment.object.svgSource,
        {
          ...(attachment.object.svgImportSettings || {}),
          name: sanitizeName(
            attachment.object.name || attachment.object.svgImportSettings?.name || 'SVG MODEL',
            'SVG MODEL'
          ),
        }
      );

      if (attachment.object.svgImportAnalysis) {
        attachmentGroup.userData.svgImportAnalysis = cloneJsonValue(attachment.object.svgImportAnalysis);
      }
      if (attachment.attachTo) {
        attachmentGroup.userData.svgImportAnalysis = {
          ...(attachmentGroup.userData.svgImportAnalysis || {}),
          mountTarget: attachment.attachTo,
        };
      }

      const mountTarget = findSvgMountTarget(group, attachmentGroup);
      if (mountTarget) {
        if (attachment.transform) {
          mountTarget.add(attachmentGroup);
          if (Array.isArray(attachment.transform.position)) attachmentGroup.position.fromArray(attachment.transform.position);
          if (Array.isArray(attachment.transform.rotation)) attachmentGroup.rotation.set(...attachment.transform.rotation);
          if (Array.isArray(attachment.transform.scale)) attachmentGroup.scale.fromArray(attachment.transform.scale);
        } else {
          mountSvgGroupToTarget(attachmentGroup, mountTarget, attachmentGroup.userData?.svgImportSettings || {});
          mountTarget.add(attachmentGroup);
        }
      } else {
        group.add(attachmentGroup);
        if (attachment.transform) {
          if (Array.isArray(attachment.transform.position)) attachmentGroup.position.fromArray(attachment.transform.position);
          if (Array.isArray(attachment.transform.rotation)) attachmentGroup.rotation.set(...attachment.transform.rotation);
          if (Array.isArray(attachment.transform.scale)) attachmentGroup.scale.fromArray(attachment.transform.scale);
        }
      }
    } catch (error) {
      console.warn('Failed to import SVG attachment', error);
    }
  }
}

// Non-blocking retro-style feedback: import always succeeds even when the
// result won't read as N64/PSX; this just tells the author (human or LLM)
// which budget was blown, so the render/import loop can self-correct.
function warnStyleBudgetOverage(group) {
  const evaluation = evaluateStyleBudget(group);
  if (evaluation.withinBudget) return;
  const lang = getLang();
  const message = evaluation.warnings
    .map((warning) => formatStyleBudgetWarning(warning, lang))
    .join(' ');
  setTimeout(() => showToast(message, 4000), 2200);
}

function registerImportedGroup(group, name) {
  state.userObjects.add(group);
  selectMesh(group);

  pushAction({
    type: t('actionImportObject'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
  });

  showToast(t('objectImported') + name);
  warnStyleBudgetOverage(group);
  return { success: true };
}

async function importSvgObjectDefinition(data) {
  try {
    const group = await createSvgGroupFromSource(data.svgSource, {
      ...(data.svgImportSettings || {}),
      name: sanitizeName(data.name || data.svgImportSettings?.name || 'SVG MODEL', 'SVG MODEL'),
    });
    applyImportedAnimations(group, data.animations);
    return registerImportedGroup(group, group.userData.name || data.name || 'SVG MODEL');
  } catch (error) {
    return {
      success: false,
      error: t('svgImportFailed') + (error?.message ? ` ${error.message}` : ''),
    };
  }
}

async function importPngModelDefinition(data) {
  try {
    const group = await createPngModelGroup(
      data.pngModelSource,
      { ...(data.pngModelSettings || {}), name: sanitizeName(data.name, 'PNG FLAT MODEL') },
      data.pngModelDepthMap,
    );
    if (data.transform) {
      if (Array.isArray(data.transform.position)) group.position.fromArray(data.transform.position);
      if (Array.isArray(data.transform.rotation)) group.rotation.set(...data.transform.rotation);
      if (Array.isArray(data.transform.scale)) group.scale.fromArray(data.transform.scale);
    }
    return registerImportedGroup(group, group.userData.name || data.name || 'PNG FLAT MODEL');
  } catch (error) {
    return { success: false, error: `PNG model import failed. ${error?.message || ''}`.trim() };
  }
}

export async function importObjectFromJSON(jsonString) {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { success: false, error: t('jsonInvalid') + e.message };
  }

  const validationError = validateObjectJSON(data);
  if (validationError) {
    return { success: false, error: validationError };
  }
  if (hasSvgSourcePayload(data)) {
    return importSvgObjectDefinition(data);
  }
  if (hasPngModelPayload(data)) {
    return importPngModelDefinition(data);
  }

  const normalized = normalizeObjectDefinition(data);
  const group = buildGroupFromDefinition(normalized, { compileAnimations: false });
  if (normalized.retroAO) {
    bakeRetroAO(group, normalized.retroAO);
  }
  applyImportedAnimations(group, normalized.animations);
  applyImportedRigMetadata(group, normalized);
  await applyImportedAttachments(group, normalized.attachments);
  return registerImportedGroup(group, normalized.name);
}

export function openImportModal() {
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('import-json-textarea').value = '';
  document.getElementById('import-error').textContent = '';
}

export function closeImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
}

export async function handleImportSubmit() {
  const text = document.getElementById('import-json-textarea').value.trim();
  const errorEl = document.getElementById('import-error');
  if (!text) {
    errorEl.textContent = t('pasteJsonFirst');
    return { success: false, error: t('pasteJsonFirst') };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errorEl.textContent = t('jsonInvalid') + e.message;
    return { success: false, error: t('jsonInvalid') + e.message };
  }

  const format = detectFormat(data);

  if (format === 'character-model') {
    const result = importCharacterModel(data);
    if (result.success) {
      closeImportModal();
    } else {
      errorEl.textContent = result.error;
    }
    return result;
  } else if (format === 'legacy') {
    const result = await importObjectFromJSON(text);
    if (result.success) {
      closeImportModal();
    } else {
      errorEl.textContent = result.error;
    }
    return result;
  } else if (format === 'animation') {
    return importAnimToSelected(text, errorEl);
  } else if (format === 'skeleton') {
    const success = registerSkeleton(data);
    if (success) {
      showToast(t('skeletonImported') || `Skeleton "${data.id}" imported`);
      closeImportModal();
      return { success: true };
    } else {
      errorEl.textContent = t('skeletonInvalid') || 'Invalid skeleton format';
      return { success: false, error: errorEl.textContent };
    }
  } else {
    errorEl.textContent = t('jsonNotRecognized');
    return { success: false, error: t('jsonNotRecognized') };
  }
}

function importCharacterModel(data) {
  const validationError = validateCharacterModel(data);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { pieces, slotMap } = characterModelToPieces(data);
  const def = { name: data.name, pieces };
  const group = buildGroupFromDefinition(def, { compileAnimations: false });
  applyImportedRigMetadata(group, {
    archetype: data.archetype,
    slotMap,
    animationProfile: data.animationProfile || null,
    skeletonId: data.skeletonId || null,
    slotBindings: data.slotBindings || null,
  });

  state.userObjects.add(group);
  selectMesh(group);

  pushAction({
    type: t('actionImportObject'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
  });

  showToast((t('objectImported') || 'Imported: ') + data.name);
  warnStyleBudgetOverage(group);
  return { success: true };
}

function importAnimToSelected(jsonText, errorEl) {
  const group = state.selectedMesh;
  if (!group || !group.isGroup) {
    errorEl.textContent = t('selectGroupForAnim');
    return { success: false, error: t('selectGroupForAnim') };
  }
  const result = importAnimationToGroup(jsonText, group);
  if (result.success) {
    errorEl.textContent = '';
    if (result.warnings?.length) {
      showToast(result.warnings.join(' | '), 4500);
    }
    emit('animation:show-timeline', group);
    closeImportModal();
  } else {
    errorEl.textContent = result.error;
  }
  return result;
}

export function handleArchetypeImportSubmit() {
  const text = document.getElementById('import-archetype-textarea')?.value?.trim();
  const errorEl = document.getElementById('import-archetype-error');
  if (!text) {
    errorEl.textContent = t('pasteArchetypeJson');
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errorEl.textContent = t('jsonInvalid') + e.message;
    return;
  }

  // Detect: skeleton (has bones[]) or animation profile (has skeletonId + animations[string])
  if (Array.isArray(data.bones) && data.id && data.archetype) {
    const success = registerSkeleton(data);
    if (success) {
      errorEl.textContent = '';
      showToast(`Skeleton "${data.id}" imported`);
      document.getElementById('import-archetype-textarea').value = '';
    } else {
      errorEl.textContent = t('skeletonInvalid') || 'Invalid skeleton format';
    }
  } else if (data.id && data.skeletonId && Array.isArray(data.animations) && (data.animations.length === 0 || typeof data.animations[0] === 'string')) {
    const success = registerProfile(data);
    if (success) {
      errorEl.textContent = '';
      showToast(`Profile "${data.id}" imported`);
      document.getElementById('import-archetype-textarea').value = '';
    } else {
      errorEl.textContent = 'Invalid animation profile format';
    }
  } else {
    errorEl.textContent = 'Expected skeleton JSON (with "bones") or animation profile JSON (with "skeletonId" + "animations")';
  }
}

export function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return Promise.resolve({ success: false, error: t('jsonFileReadError') });

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      document.getElementById('import-json-textarea').value = e.target.result;
      resolve(await handleImportSubmit());
    };
    reader.onerror = () => {
      const error = t('jsonFileReadError');
      document.getElementById('import-error').textContent = error;
      resolve({ success: false, error });
    };
    reader.readAsText(file);
  });
}
