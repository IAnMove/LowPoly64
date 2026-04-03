import { state } from './state.js';
import { t } from './i18n.js';
import { buildGroupFromDefinition } from './templates.js';
import { selectMesh, deselect } from './selection.js';
import { showToast } from './ui.js';
import { pushAction } from './undo.js';
import { importAnimationDataToGroup, importAnimationToGroup } from './animation-import.js';
import { normalizeGeometryDefinition, normalizeGeometryType } from './custom-geometries.js';
import { validateVertexColors } from './vertex-colors.js';
import { validateFaceColors } from './retro-effects.js';
import { detectFormat, validateCharacterModel, characterModelToPieces } from './character-model.js';
import { resolveAnimationProfile, registerProfile } from './animation-profiles.js';
import { getDefaultSkeleton, getSkeletonById, registerSkeleton } from './skeleton-registry.js';
import { compileAnimation } from './animation.js';

const SUPPORTED_TYPES = ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule', 'torus', 'wedge', 'pyramid', 'custom'];
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
  if (params === undefined) return null;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return t('pieceGeometryParamsInvalid', { n: pieceIndex + 1, type });
  }

  if (type === 'custom') {
    const vertices = params.vertices;
    const faces = params.faces;

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
  };

  const rules = numberRulesByType[type] || {};
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
      opacity: piece.opacity !== undefined ? piece.opacity : undefined,
    })),
  };

  if (Array.isArray(data.animations)) {
    normalized.animations = data.animations.map((animation) => ({ ...animation }));
  }

  return normalized;
}

export function validateObjectJSON(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return t('jsonMustBeObject');
  }
  if (!Array.isArray(data.pieces) || data.pieces.length === 0) {
    return t('jsonNeedsPieces');
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

    if (piece.opacity !== undefined) {
      if (!isFiniteNumber(piece.opacity) || piece.opacity < 0 || piece.opacity > 1) {
        return t('pieceGeometryParamOutOfRange', { n: i + 1, param: 'opacity', min: 0, max: 1 });
      }
    }
  }

  const hierarchyError = validateHierarchy(normalizeObjectDefinition(data).pieces);
  if (hierarchyError) {
    return hierarchyError;
  }

  return null;
}

export function importObjectFromJSON(jsonString) {
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

  const normalized = normalizeObjectDefinition(data);
  const group = buildGroupFromDefinition(normalized, { compileAnimations: false });

  if (Array.isArray(normalized.animations) && normalized.animations.length > 0) {
    const warnings = [];
    for (let i = 0; i < normalized.animations.length; i++) {
      const result = importAnimationDataToGroup(normalized.animations[i], group);
      if (!result.success) {
        warnings.push(result.error);
      }
    }
    if (warnings.length > 0) {
      showToast(warnings[0]);
    }
  }

  state.userObjects.add(group);
  selectMesh(group);

  pushAction({
    type: t('actionImportObject'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
  });

  showToast(t('objectImported') + normalized.name);
  return { success: true };
}

export function openImportModal() {
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('import-json-textarea').value = '';
  document.getElementById('import-error').textContent = '';
}

export function closeImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
}

export function handleImportSubmit() {
  const text = document.getElementById('import-json-textarea').value.trim();
  const errorEl = document.getElementById('import-error');
  if (!text) {
    errorEl.textContent = t('pasteJsonFirst');
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    errorEl.textContent = t('jsonInvalid') + e.message;
    return;
  }

  const format = detectFormat(data);

  if (format === 'character-model') {
    const result = importCharacterModel(data);
    if (result.success) {
      closeImportModal();
    } else {
      errorEl.textContent = result.error;
    }
  } else if (format === 'legacy') {
    const result = importObjectFromJSON(text);
    if (result.success) {
      closeImportModal();
    } else {
      errorEl.textContent = result.error;
    }
  } else if (format === 'animation') {
    importAnimToSelected(text, errorEl);
  } else if (format === 'skeleton') {
    const success = registerSkeleton(data);
    if (success) {
      showToast(t('skeletonImported') || `Skeleton "${data.id}" imported`);
      closeImportModal();
    } else {
      errorEl.textContent = t('skeletonInvalid') || 'Invalid skeleton format';
    }
  } else {
    errorEl.textContent = t('jsonNotRecognized');
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

  // Store CharacterModel metadata
  group.userData.archetype = data.archetype;
  group.userData.slotMap = slotMap;
  group.userData.animationProfile = data.animationProfile || null;

  // Resolve skeleton
  const skeletonId = data.skeletonId || null;
  group.userData.skeletonId = skeletonId;

  // Resolve and apply animation profile
  if (data.animationProfile) {
    const resolved = resolveAnimationProfile(data.animationProfile);
    if (resolved) {
      group.userData.skeletonId = resolved.skeleton.id;
      group.userData.slotBindings = { ...resolved.skeleton.defaultBindings };
      group.userData.animations = resolved.animations.map((a) => ({ ...a }));
      group.userData.animationClips = resolved.animations
        .map((animDef) => compileAnimation(animDef, group))
        .filter(Boolean);
    }
  } else if (skeletonId) {
    // Apply default bindings from skeleton even without profile
    const skel = getSkeletonById(skeletonId);
    if (skel) {
      group.userData.slotBindings = { ...skel.defaultBindings };
    }
  }

  state.userObjects.add(group);
  selectMesh(group);

  pushAction({
    type: t('actionImportObject'),
    undo: () => { if (state.selectedMesh === group || group.children.includes(state.selectedMesh)) deselect(); state.userObjects.remove(group); },
    redo: () => { state.userObjects.add(group); selectMesh(group); },
  });

  showToast((t('objectImported') || 'Imported: ') + data.name);
  return { success: true };
}

function importAnimToSelected(jsonText, errorEl) {
  const group = state.selectedMesh;
  if (!group || !group.isGroup) {
    errorEl.textContent = t('selectGroupForAnim');
    return;
  }
  const result = importAnimationToGroup(jsonText, group);
  if (result.success) {
    if (typeof window.showTimelineForGroup === 'function') {
      window.showTimelineForGroup(group);
    }
    closeImportModal();
  } else {
    errorEl.textContent = result.error;
  }
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
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('import-json-textarea').value = e.target.result;
    handleImportSubmit();
  };
  reader.onerror = () => {
    document.getElementById('import-error').textContent = t('jsonFileReadError');
  };
  reader.readAsText(file);
}
