/**
 * Closed, semantic recipes for the first conversational character demo.
 *
 * The compiler deliberately delegates the base humanoid to character-model.js.
 * This module only validates design intent and composes small editable pieces
 * into the existing CharacterModel slots.
 */

import {
  createRetroCharacterModel,
} from './character-model.js';
import * as heroicShapes from './heroic-character-shapes.js';
import { applyPlumberBody, applyPlumberOutfit } from './plumber-body-shapes.js';
import { applyPlumberHead, applyPlumberCap } from './plumber-head-shapes.js';

export const CHARACTER_DESIGN_FORMAT = 'retrovisor-character-design';
export const CHARACTER_DESIGN_VERSION = 1;

export const CHARACTER_DESIGN_STYLES = Object.freeze(['psx', 'n64']);
export const CHARACTER_DESIGN_BODY_PROFILES = Object.freeze(['classic', 'heroic', 'plumber']);
export const CHARACTER_DESIGN_HEAD_PROFILES = Object.freeze(['classic', 'heroic', 'plumber']);
export const CHARACTER_DESIGN_HAIR_STYLES = Object.freeze(['none', 'short', 'spiky', 'swept_spikes', 'hero_spikes', 'plumber_cap']);
export const CHARACTER_DESIGN_OUTFIT_STYLES = Object.freeze(['plain', 'sleeveless', 'tunic', 'soldier', 'overalls']);
export const CHARACTER_DESIGN_SIDES = Object.freeze(['left', 'right']);
export const CHARACTER_DESIGN_SWORD_PROFILES = Object.freeze(['classic', 'buster']);
export const CHARACTER_DESIGN_PAULDRON_PROFILES = Object.freeze(['plate', 'shell']);

export const CHARACTER_DESIGN_LIMITS = Object.freeze({
  bodyHeight: Object.freeze({ min: 2.8, max: 5.8, default: 4 }),
  bodyWidth: Object.freeze({ min: 1, max: 2.8, default: 1.55 }),
  headScale: Object.freeze({ min: 0.65, max: 1.45, default: 1 }),
  heroicFactor: Object.freeze({ min: 0.7, max: 1.35, default: 1 }),
  heroicJaw: Object.freeze({ min: 0.75, max: 1.2, default: 1 }),
  swordWidth: Object.freeze({ min: 0.12, max: 0.75, default: 0.32 }),
  swordLength: Object.freeze({ min: 0.8, max: 3.5, default: 1.65 }),
  pauldronSize: Object.freeze({ min: 0.2, max: 1.25, default: 0.62 }),
});

export const CHARACTER_DESIGN_DEFAULTS = Object.freeze({
  format: CHARACTER_DESIGN_FORMAT,
  version: CHARACTER_DESIGN_VERSION,
  name: 'Retro Character',
  style: 'n64',
  body: Object.freeze({
    height: CHARACTER_DESIGN_LIMITS.bodyHeight.default,
    width: CHARACTER_DESIGN_LIMITS.bodyWidth.default,
    profile: 'classic',
    shoulders: CHARACTER_DESIGN_LIMITS.heroicFactor.default,
    waist: CHARACTER_DESIGN_LIMITS.heroicFactor.default,
    arms: CHARACTER_DESIGN_LIMITS.heroicFactor.default,
    legs: CHARACTER_DESIGN_LIMITS.heroicFactor.default,
    boots: CHARACTER_DESIGN_LIMITS.heroicFactor.default,
  }),
  head: Object.freeze({
    style: 'n64',
    scale: CHARACTER_DESIGN_LIMITS.headScale.default,
    profile: 'classic',
    jaw: CHARACTER_DESIGN_LIMITS.heroicJaw.default,
  }),
  hair: Object.freeze({ style: 'short', color: '#342219' }),
  outfit: Object.freeze({
    style: 'plain',
    shirt: '#c93d4b',
    pants: '#263451',
    shoes: '#1d2028',
  }),
  skin: '#c58b68',
  equipment: Object.freeze({
    sword: Object.freeze({
      enabled: false,
      profile: 'classic',
      width: CHARACTER_DESIGN_LIMITS.swordWidth.default,
      length: CHARACTER_DESIGN_LIMITS.swordLength.default,
      color: '#c3cbd6',
    }),
    pauldron: Object.freeze({
      enabled: false,
      profile: 'plate',
      side: 'left',
      size: CHARACTER_DESIGN_LIMITS.pauldronSize.default,
      color: '#626a78',
    }),
  }),
});
const HEX_COLOR_PATTERN = '^#[0-9a-fA-F]{6}$';
const DESIGN_ROOT_KEYS = Object.freeze([
  'format', 'version', 'name', 'style', 'body', 'head', 'hair', 'outfit', 'skin', 'equipment',
]);
const BODY_KEYS = Object.freeze(['height', 'width', 'profile', 'shoulders', 'waist', 'arms', 'legs', 'boots']);
const HEAD_KEYS = Object.freeze(['style', 'scale', 'profile', 'jaw']);
const HAIR_KEYS = Object.freeze(['style', 'color']);
const OUTFIT_KEYS = Object.freeze(['style', 'shirt', 'pants', 'shoes']);
const EQUIPMENT_KEYS = Object.freeze(['sword', 'pauldron']);
const SWORD_KEYS = Object.freeze(['enabled', 'profile', 'width', 'length', 'color']);
const PAULDRON_KEYS = Object.freeze(['enabled', 'profile', 'side', 'size', 'color']);

function closedObject(properties, required = []) {
  return {
    type: 'object',
    additionalProperties: false,
    properties,
    ...(required.length ? { required } : {}),
  };
}

/** JSON Schema for the canonical normalized recipe. */
export const CHARACTER_DESIGN_SCHEMA = Object.freeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Retrovisor Character Design',
  type: 'object',
  additionalProperties: false,
  required: ['format', 'version', 'name', 'style'],
  properties: {
    format: { const: CHARACTER_DESIGN_FORMAT },
    version: { const: CHARACTER_DESIGN_VERSION },
    name: { type: 'string', minLength: 1, maxLength: 64 },
    style: { enum: [...CHARACTER_DESIGN_STYLES] },
    body: closedObject({
      profile: { enum: [...CHARACTER_DESIGN_BODY_PROFILES] },
      height: {
        type: 'number', minimum: CHARACTER_DESIGN_LIMITS.bodyHeight.min,
        maximum: CHARACTER_DESIGN_LIMITS.bodyHeight.max,
        default: CHARACTER_DESIGN_LIMITS.bodyHeight.default,
      },
      width: {
        type: 'number', minimum: CHARACTER_DESIGN_LIMITS.bodyWidth.min,
        maximum: CHARACTER_DESIGN_LIMITS.bodyWidth.max,
        default: CHARACTER_DESIGN_LIMITS.bodyWidth.default,
      },
      shoulders: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicFactor.min, maximum: CHARACTER_DESIGN_LIMITS.heroicFactor.max, default: CHARACTER_DESIGN_LIMITS.heroicFactor.default },
      waist: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicFactor.min, maximum: CHARACTER_DESIGN_LIMITS.heroicFactor.max, default: CHARACTER_DESIGN_LIMITS.heroicFactor.default },
      arms: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicFactor.min, maximum: CHARACTER_DESIGN_LIMITS.heroicFactor.max, default: CHARACTER_DESIGN_LIMITS.heroicFactor.default },
      legs: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicFactor.min, maximum: CHARACTER_DESIGN_LIMITS.heroicFactor.max, default: CHARACTER_DESIGN_LIMITS.heroicFactor.default },
      boots: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicFactor.min, maximum: CHARACTER_DESIGN_LIMITS.heroicFactor.max, default: CHARACTER_DESIGN_LIMITS.heroicFactor.default },
    }),
    head: closedObject({
      style: { enum: [...CHARACTER_DESIGN_STYLES] },
      scale: {
        type: 'number', minimum: CHARACTER_DESIGN_LIMITS.headScale.min,
        maximum: CHARACTER_DESIGN_LIMITS.headScale.max,
        default: CHARACTER_DESIGN_LIMITS.headScale.default,
      },
      profile: { enum: [...CHARACTER_DESIGN_HEAD_PROFILES] },
      jaw: { type: 'number', minimum: CHARACTER_DESIGN_LIMITS.heroicJaw.min, maximum: CHARACTER_DESIGN_LIMITS.heroicJaw.max, default: CHARACTER_DESIGN_LIMITS.heroicJaw.default },
    }),
    hair: closedObject({
      style: { enum: [...CHARACTER_DESIGN_HAIR_STYLES] },
      color: { type: 'string', pattern: HEX_COLOR_PATTERN },
    }),
    outfit: closedObject({
      style: { enum: [...CHARACTER_DESIGN_OUTFIT_STYLES] },
      shirt: { type: 'string', pattern: HEX_COLOR_PATTERN },
      pants: { type: 'string', pattern: HEX_COLOR_PATTERN },
      shoes: { type: 'string', pattern: HEX_COLOR_PATTERN },
    }),
    skin: { type: 'string', pattern: HEX_COLOR_PATTERN },
    equipment: closedObject({
      sword: closedObject({
        profile: { enum: [...CHARACTER_DESIGN_SWORD_PROFILES] },
        enabled: { type: 'boolean' },
        width: {
          type: 'number', minimum: CHARACTER_DESIGN_LIMITS.swordWidth.min,
          maximum: CHARACTER_DESIGN_LIMITS.swordWidth.max,
        },
        length: {
          type: 'number', minimum: CHARACTER_DESIGN_LIMITS.swordLength.min,
          maximum: CHARACTER_DESIGN_LIMITS.swordLength.max,
        },
        color: { type: 'string', pattern: HEX_COLOR_PATTERN },
      }),
      pauldron: closedObject({
        profile: { enum: [...CHARACTER_DESIGN_PAULDRON_PROFILES] },
        enabled: { type: 'boolean' },
        side: { enum: [...CHARACTER_DESIGN_SIDES] },
        size: {
          type: 'number', minimum: CHARACTER_DESIGN_LIMITS.pauldronSize.min,
          maximum: CHARACTER_DESIGN_LIMITS.pauldronSize.max,
        },
        color: { type: 'string', pattern: HEX_COLOR_PATTERN },
      }),
    }),
  },
});

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function addError(errors, path, message, allowed) {
  const error = { path, message };
  if (Array.isArray(allowed)) error.allowed = [...allowed];
  errors.push(error);
}

function checkUnknownKeys(value, allowedKeys, path, errors) {
  if (!isObject(value)) return;
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.includes(key)) addError(errors, path ? `${path}.${key}` : key, 'Unknown field');
  });
}

function readObject(value, path, errors) {
  if (value === undefined) return {};
  if (!isObject(value)) {
    addError(errors, path, 'Expected an object');
    return {};
  }
  return value;
}

function readEnum(value, fallback, allowed, path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') {
    addError(errors, path, `Expected one of: ${allowed.join(', ')}`, allowed);
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    addError(errors, path, `Unknown value "${value}"`, allowed);
    return fallback;
  }
  return normalized;
}

function readNumber(value, fallback, limits, path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addError(errors, path, `Expected a finite number between ${limits.min} and ${limits.max}`);
    return fallback;
  }
  if (value < limits.min || value > limits.max) {
    addError(errors, path, `Expected a number between ${limits.min} and ${limits.max}`);
    return fallback;
  }
  return value;
}

function readBoolean(value, fallback, path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') {
    addError(errors, path, 'Expected a boolean');
    return fallback;
  }
  return value;
}

function readColor(value, fallback, path, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !new RegExp(HEX_COLOR_PATTERN).test(value)) {
    addError(errors, path, 'Expected a #RRGGBB color');
    return fallback;
  }
  return value.toLowerCase();
}

function readName(value, fallback, errors) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 64) {
    addError(errors, 'name', 'Expected a non-empty name up to 64 characters');
    return fallback;
  }
  return value.trim();
}

function normalizeDesignInput(input, errors = []) {
  const source = isObject(input) ? input : {};
  if (!isObject(input)) addError(errors, '', 'Expected a design object');
  checkUnknownKeys(source, DESIGN_ROOT_KEYS, '', errors);

  if (hasOwn(source, 'format') && source.format !== CHARACTER_DESIGN_FORMAT) {
    addError(errors, 'format', `Expected "${CHARACTER_DESIGN_FORMAT}"`);
  }
  if (hasOwn(source, 'version') && source.version !== CHARACTER_DESIGN_VERSION) {
    addError(errors, 'version', `Expected version ${CHARACTER_DESIGN_VERSION}`);
  }

  const style = readEnum(source.style, CHARACTER_DESIGN_DEFAULTS.style, CHARACTER_DESIGN_STYLES, 'style', errors);
  const bodySource = readObject(source.body, 'body', errors);
  checkUnknownKeys(bodySource, BODY_KEYS, 'body', errors);
  const bodyProfile = readEnum(bodySource.profile, CHARACTER_DESIGN_DEFAULTS.body.profile, CHARACTER_DESIGN_BODY_PROFILES, 'body.profile', errors);
  const headSource = readObject(source.head, 'head', errors);
  checkUnknownKeys(headSource, HEAD_KEYS, 'head', errors);
  const hairSource = readObject(source.hair, 'hair', errors);
  checkUnknownKeys(hairSource, HAIR_KEYS, 'hair', errors);
  const outfitSource = readObject(source.outfit, 'outfit', errors);
  checkUnknownKeys(outfitSource, OUTFIT_KEYS, 'outfit', errors);
  const equipmentSource = readObject(source.equipment, 'equipment', errors);
  checkUnknownKeys(equipmentSource, EQUIPMENT_KEYS, 'equipment', errors);
  const swordSource = readObject(equipmentSource.sword, 'equipment.sword', errors);
  checkUnknownKeys(swordSource, SWORD_KEYS, 'equipment.sword', errors);
  const pauldronSource = readObject(equipmentSource.pauldron, 'equipment.pauldron', errors);
  checkUnknownKeys(pauldronSource, PAULDRON_KEYS, 'equipment.pauldron', errors);

  const headStyle = readEnum(headSource.style, style, CHARACTER_DESIGN_STYLES, 'head.style', errors);
  const hairStyle = readEnum(hairSource.style, CHARACTER_DESIGN_DEFAULTS.hair.style, CHARACTER_DESIGN_HAIR_STYLES, 'hair.style', errors);
  const outfitStyle = readEnum(outfitSource.style, CHARACTER_DESIGN_DEFAULTS.outfit.style, CHARACTER_DESIGN_OUTFIT_STYLES, 'outfit.style', errors);
  const pauldronSide = readEnum(pauldronSource.side, CHARACTER_DESIGN_DEFAULTS.equipment.pauldron.side, CHARACTER_DESIGN_SIDES, 'equipment.pauldron.side', errors);
  const headProfile = readEnum(headSource.profile, CHARACTER_DESIGN_DEFAULTS.head.profile, CHARACTER_DESIGN_HEAD_PROFILES, 'head.profile', errors);
  const swordProfile = readEnum(swordSource.profile, CHARACTER_DESIGN_DEFAULTS.equipment.sword.profile, CHARACTER_DESIGN_SWORD_PROFILES, 'equipment.sword.profile', errors);
  const pauldronProfile = readEnum(pauldronSource.profile, CHARACTER_DESIGN_DEFAULTS.equipment.pauldron.profile, CHARACTER_DESIGN_PAULDRON_PROFILES, 'equipment.pauldron.profile', errors);

  return {
    format: CHARACTER_DESIGN_FORMAT,
    version: CHARACTER_DESIGN_VERSION,
    name: readName(source.name, `${style.toUpperCase()} Retro Character`, errors),
    style,
    body: {
      height: readNumber(bodySource.height, CHARACTER_DESIGN_LIMITS.bodyHeight.default, CHARACTER_DESIGN_LIMITS.bodyHeight, 'body.height', errors),
      width: readNumber(bodySource.width, CHARACTER_DESIGN_LIMITS.bodyWidth.default, CHARACTER_DESIGN_LIMITS.bodyWidth, 'body.width', errors),
      profile: bodyProfile,
      shoulders: readNumber(bodySource.shoulders, CHARACTER_DESIGN_LIMITS.heroicFactor.default, CHARACTER_DESIGN_LIMITS.heroicFactor, 'body.shoulders', errors),
      waist: readNumber(bodySource.waist, CHARACTER_DESIGN_LIMITS.heroicFactor.default, CHARACTER_DESIGN_LIMITS.heroicFactor, 'body.waist', errors),
      arms: readNumber(bodySource.arms, CHARACTER_DESIGN_LIMITS.heroicFactor.default, CHARACTER_DESIGN_LIMITS.heroicFactor, 'body.arms', errors),
      legs: readNumber(bodySource.legs, CHARACTER_DESIGN_LIMITS.heroicFactor.default, CHARACTER_DESIGN_LIMITS.heroicFactor, 'body.legs', errors),
      boots: readNumber(bodySource.boots, CHARACTER_DESIGN_LIMITS.heroicFactor.default, CHARACTER_DESIGN_LIMITS.heroicFactor, 'body.boots', errors),
    },
    head: {
      style: headStyle,
      scale: readNumber(headSource.scale, CHARACTER_DESIGN_LIMITS.headScale.default, CHARACTER_DESIGN_LIMITS.headScale, 'head.scale', errors),
      profile: headProfile,
      jaw: readNumber(headSource.jaw, CHARACTER_DESIGN_LIMITS.heroicJaw.default, CHARACTER_DESIGN_LIMITS.heroicJaw, 'head.jaw', errors),
    },
    hair: {
      style: hairStyle,
      color: readColor(hairSource.color, CHARACTER_DESIGN_DEFAULTS.hair.color, 'hair.color', errors),
    },
    outfit: {
      style: outfitStyle,
      shirt: readColor(outfitSource.shirt, CHARACTER_DESIGN_DEFAULTS.outfit.shirt, 'outfit.shirt', errors),
      pants: readColor(outfitSource.pants, CHARACTER_DESIGN_DEFAULTS.outfit.pants, 'outfit.pants', errors),
      shoes: readColor(outfitSource.shoes, CHARACTER_DESIGN_DEFAULTS.outfit.shoes, 'outfit.shoes', errors),
    },
    skin: readColor(source.skin, CHARACTER_DESIGN_DEFAULTS.skin, 'skin', errors),
    equipment: {
      sword: {
        enabled: readBoolean(swordSource.enabled, CHARACTER_DESIGN_DEFAULTS.equipment.sword.enabled, 'equipment.sword.enabled', errors),
        profile: swordProfile,
        width: readNumber(swordSource.width, CHARACTER_DESIGN_LIMITS.swordWidth.default, CHARACTER_DESIGN_LIMITS.swordWidth, 'equipment.sword.width', errors),
        length: readNumber(swordSource.length, CHARACTER_DESIGN_LIMITS.swordLength.default, CHARACTER_DESIGN_LIMITS.swordLength, 'equipment.sword.length', errors),
        color: readColor(swordSource.color, CHARACTER_DESIGN_DEFAULTS.equipment.sword.color, 'equipment.sword.color', errors),
      },
      pauldron: {
        enabled: readBoolean(pauldronSource.enabled, CHARACTER_DESIGN_DEFAULTS.equipment.pauldron.enabled, 'equipment.pauldron.enabled', errors),
        profile: pauldronProfile,
        side: pauldronSide,
        size: readNumber(pauldronSource.size, CHARACTER_DESIGN_LIMITS.pauldronSize.default, CHARACTER_DESIGN_LIMITS.pauldronSize, 'equipment.pauldron.size', errors),
        color: readColor(pauldronSource.color, CHARACTER_DESIGN_DEFAULTS.equipment.pauldron.color, 'equipment.pauldron.color', errors),
      },
    },
  };
}

export function validateCharacterDesign(input = {}) {
  const errors = [];
  const recipe = normalizeDesignInput(input, errors);
  return errors.length === 0
    ? { ok: true, errors: [], recipe }
    : { ok: false, errors };
}

export function normalizeCharacterDesign(input = {}) {
  const result = validateCharacterDesign(input);
  if (!result.ok) {
    const summary = result.errors.map((error) => `${error.path || '<root>'}: ${error.message}`).join('; ');
    throw new Error(`Invalid character design: ${summary}`);
  }
  return result.recipe;
}
function makePiece({
  template,
  name,
  offset,
  material,
  size,
  parent,
  pivot,
  params,
  semanticPart,
}) {
  const result = {
    template,
    name,
    offset: [...offset],
    material,
  };
  if (size) result.size = [...size];
  if (parent) result.parent = parent;
  if (pivot) result.pivot = [...pivot];
  if (params) result.params = cloneValue(params);
  if (semanticPart) result.semanticPart = semanticPart;
  return result;
}

function allPieces(model) {
  return model.slots.flatMap((slot) => slot.pieces);
}

function findPiece(model, name) {
  return allPieces(model).find((piece) => piece.name === name) || null;
}

function findSlot(model, slotId) {
  const slot = model.slots.find((entry) => entry.slotId === slotId);
  if (!slot) throw new Error(`CharacterModel slot "${slotId}" is missing`);
  return slot;
}

function addPiece(model, slotId, piece) {
  const slot = findSlot(model, slotId);
  if (findPiece(model, piece.name)) throw new Error(`Duplicate character design piece "${piece.name}"`);
  slot.pieces.push(piece);
  return piece;
}

function removePieces(model, predicate) {
  model.slots.forEach((slot) => {
    slot.pieces = slot.pieces.filter((piece) => !predicate(piece));
  });
}

function pointFromPiece(piece) {
  return [...(piece?.pivot || piece?.offset || [0, 0, 0])];
}

function headMetrics(model) {
  const head = findPiece(model, 'HEAD');
  if (!head) throw new Error('CharacterModel requires a HEAD piece');
  const vertices = head.params?.vertices;
  if (!Array.isArray(vertices) || vertices.length === 0) {
    return {
      anchor: pointFromPiece(head),
      width: head.size?.[0] || 1,
      height: head.size?.[1] || 1,
      depth: head.size?.[2] || 1,
    };
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  vertices.forEach((vertex) => {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
  });
  return {
    anchor: pointFromPiece(head),
    width: Math.max(max[0] - min[0], 0.01),
    height: Math.max(max[1] - min[1], 0.01),
    depth: Math.max(max[2] - min[2], 0.01),
  };
}

function appendBox(vertices, faces, { center = [0, 0, 0], size = [1, 1, 1] } = {}) {
  const [cx, cy, cz] = center;
  const [width, height, depth] = size;
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;
  const start = vertices.length;
  vertices.push(
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  );
  faces.push(
    [start, start + 2, start + 1], [start, start + 3, start + 2],
    [start + 4, start + 5, start + 6], [start + 4, start + 6, start + 7],
    [start, start + 1, start + 5], [start, start + 5, start + 4],
    [start + 3, start + 7, start + 6], [start + 3, start + 6, start + 2],
    [start, start + 4, start + 7], [start, start + 7, start + 3],
    [start + 1, start + 2, start + 6], [start + 1, start + 6, start + 5],
  );
}

function orientFacesOutward(vertices, faces) {
  const center = vertices.reduce((sum, vertex) => {
    sum[0] += vertex[0];
    sum[1] += vertex[1];
    sum[2] += vertex[2];
    return sum;
  }, [0, 0, 0]).map((value) => value / Math.max(vertices.length, 1));

  return faces.map(([aIndex, bIndex, cIndex]) => {
    const a = vertices[aIndex];
    const b = vertices[bIndex];
    const c = vertices[cIndex];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const faceCenter = [
      (a[0] + b[0] + c[0]) / 3,
      (a[1] + b[1] + c[1]) / 3,
      (a[2] + b[2] + c[2]) / 3,
    ];
    const outward = [faceCenter[0] - center[0], faceCenter[1] - center[1], faceCenter[2] - center[2]];
    return normal[0] * outward[0] + normal[1] * outward[1] + normal[2] * outward[2] >= 0
      ? [aIndex, bIndex, cIndex]
      : [aIndex, cIndex, bIndex];
  });
}

function buildHairTuftGeometry({ width, height, depth, tipX = 0, tipZ = 0 }) {
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  const baseY = -height * 0.5;
  const tipY = height * 0.5;
  const vertices = [
    [-halfWidth, baseY, -halfDepth],
    [halfWidth, baseY, -halfDepth],
    [halfWidth, baseY, halfDepth],
    [-halfWidth, baseY, halfDepth],
    [tipX, tipY, tipZ],
  ];
  return {
    vertices,
    faces: orientFacesOutward(vertices, [
      [0, 1, 2], [0, 2, 3],
      [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4],
    ]),
  };
}
function appendExtrudedPolygon(vertices, faces, polygon, depth) {
  const start = vertices.length;
  const halfDepth = depth / 2;
  polygon.forEach(([x, y]) => vertices.push([x, y, -halfDepth]));
  polygon.forEach(([x, y]) => vertices.push([x, y, halfDepth]));
  const count = polygon.length;
  for (let index = 1; index < count - 1; index += 1) {
    faces.push([start, start + index + 1, start + index]);
    faces.push([start + count, start + count + index, start + count + index + 1]);
  }
  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    faces.push(
      [start + index, start + next, start + count + next],
      [start + index, start + count + next, start + count + index],
    );
  }
}

function buildSwordGeometry(width, length) {
  const vertices = [];
  const faces = [];
  const bladeDepth = Math.max(width * 0.18, 0.025);
  const guardHeight = Math.max(length * 0.055, 0.04);
  const gripLength = Math.max(length * 0.16, 0.1);
  const bladeTop = -guardHeight * 0.35;
  const shoulderY = -length * 0.82;
  appendExtrudedPolygon(vertices, faces, [
    [-width * 0.50, bladeTop],
    [width * 0.50, bladeTop],
    [width * 0.42, shoulderY],
    [0, -length],
    [-width * 0.42, shoulderY],
  ], bladeDepth);
  appendBox(vertices, faces, {
    center: [0, -guardHeight, 0],
    size: [width * 1.55, guardHeight, bladeDepth * 1.35],
  });
  appendBox(vertices, faces, {
    center: [0, gripLength * 0.45, 0],
    size: [width * 0.25, gripLength, bladeDepth * 1.1],
  });
  appendBox(vertices, faces, {
    center: [0, gripLength * 1.02, 0],
    size: [width * 0.38, width * 0.28, bladeDepth * 1.25],
  });
  return { vertices, faces };
}

function buildPauldronGeometry(size, side) {
  const sign = side === 'left' ? -1 : 1;
  const outer = size;
  const inner = size * 0.16;
  const halfY = size * 0.34;
  const halfZ = size * 0.48;
  const vertices = [
    [sign * inner, -halfY * 0.70, -halfZ * 0.78],
    [sign * inner, -halfY * 0.70, halfZ * 0.78],
    [sign * inner, halfY * 0.70, -halfZ * 0.78],
    [sign * inner, halfY * 0.70, halfZ * 0.78],
    [sign * outer, -halfY, -halfZ],
    [sign * outer, -halfY, halfZ],
    [sign * outer, halfY, -halfZ],
    [sign * outer, halfY, halfZ],
  ];
  const faces = [
    [0, 4, 6], [0, 6, 2],
    [1, 3, 7], [1, 7, 5],
    [0, 1, 5], [0, 5, 4],
    [2, 6, 7], [2, 7, 3],
    [4, 5, 7], [4, 7, 6],
    [0, 2, 3], [0, 3, 1],
  ];
  return { vertices, faces };
}

function darkenSkinColor(hex) {
  const value = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return '#4a2028';
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  const tinted = [
    channels[0] * 0.46,
    channels[1] * 0.27,
    channels[2] * 0.30,
  ].map((channel) => Math.max(0, Math.min(255, Math.round(channel))));
  return '#' + tinted.map((channel) => channel.toString(16).padStart(2, '0')).join('');
}
function getHeadAnchor(model) {
  return pointFromPiece(findPiece(model, 'HEAD'));
}

function getShoulderAnchor(model, side) {
  const name = side === 'left' ? 'CLAVICLE_L' : 'CLAVICLE_R';
  const piece = findPiece(model, name);
  if (!piece) throw new Error(`CharacterModel requires ${name} for equipment`);
  return { name, point: pointFromPiece(piece) };
}

function designHairBaseStyle(style) {
  if (style === 'hero_spikes' || style === 'plumber_cap') return 'none';
  return style === 'swept_spikes' ? 'spiky' : style;
}

function addSweptHair(model, recipe) {
  if (recipe.hair.style !== 'swept_spikes') return;
  removePieces(model, (piece) => /^HAIR_TUFT_/i.test(piece.name));
  const metrics = headMetrics(model);
  const [anchorX, anchorY, anchorZ] = metrics.anchor;
  const tuftColor = recipe.hair.color;
  // Four sparse pyramidal tufts keep the swept silhouette readable from the
  // front and three-quarter views. Their bases enter the cap; their tips
  // lean in different directions instead of forming a flat wedge.
  const tufts = [
    {
      name: 'HAIR_SWEEP_MAIN',
      x: metrics.width * 0.07,
      z: metrics.depth * 0.02,
      baseY: metrics.height * 0.68,
      height: metrics.height * 0.70,
      width: metrics.width * 0.40,
      depth: metrics.depth * 0.44,
      tipX: metrics.width * 0.14,
      tipZ: metrics.depth * 0.05,
    },
    {
      name: 'HAIR_SWEEP_SIDE',
      x: -metrics.width * 0.23,
      z: metrics.depth * 0.01,
      baseY: metrics.height * 0.68,
      height: metrics.height * 0.70,
      width: metrics.width * 0.28,
      depth: metrics.depth * 0.35,
      tipX: -metrics.width * 0.18,
      tipZ: metrics.depth * 0.08,
    },
    {
      name: 'HAIR_SWEEP_BACK',
      x: metrics.width * 0.27,
      z: -metrics.depth * 0.13,
      baseY: metrics.height * 0.68,
      height: metrics.height * 0.73,
      width: metrics.width * 0.30,
      depth: metrics.depth * 0.34,
      tipX: metrics.width * 0.11,
      tipZ: -metrics.depth * 0.18,
    },
    {
      name: 'HAIR_SWEEP_ACCENT',
      x: -metrics.width * 0.02,
      z: metrics.depth * 0.13,
      baseY: metrics.height * 0.78,
      height: metrics.height * 0.64,
      width: metrics.width * 0.24,
      depth: metrics.depth * 0.27,
      tipX: -metrics.width * 0.10,
      tipZ: metrics.depth * 0.17,
    },
  ];
  tufts.forEach((tuft) => {
    addPiece(model, 'HEAD', makePiece({
      template: 'CUSTOM',
      name: tuft.name,
      offset: [
        anchorX + tuft.x,
        anchorY + tuft.baseY + (tuft.height * 0.5),
        anchorZ + tuft.z,
      ],
      pivot: metrics.anchor,
      parent: 'HEAD',
      material: tuftColor,
      params: buildHairTuftGeometry({
        width: tuft.width,
        height: tuft.height,
        depth: tuft.depth,
        tipX: tuft.tipX,
        tipZ: tuft.tipZ,
      }),
      semanticPart: 'hair',
    }));
  });
}
function addOutfitPieces(model, recipe) {
  if (['plain', 'soldier', 'overalls'].includes(recipe.outfit.style)) return;
  const torso = findPiece(model, 'TORSO');
  if (!torso) throw new Error('CharacterModel requires TORSO for outfit composition');
  const shirt = recipe.outfit.shirt;
  if (recipe.outfit.style === 'sleeveless') {
    ['left', 'right'].forEach((side) => {
      const shoulder = getShoulderAnchor(model, side);
      const sideSign = side === 'left' ? -1 : 1;
      addPiece(model, side === 'left' ? 'ARM_L' : 'ARM_R', makePiece({
        template: 'CUBE',
        name: `OUTFIT_SLEEVELESS_${side.toUpperCase()}`,
        size: [torso.size[0] * 0.17, torso.size[1] * 0.16, torso.size[2] * 0.88],
        offset: [shoulder.point[0] + (sideSign * torso.size[0] * 0.015), shoulder.point[1], shoulder.point[2]],
        pivot: shoulder.point,
        parent: shoulder.name,
        material: shirt,
        semanticPart: 'outfit',
      }));
    });
    return;
  }

  const pelvis = findPiece(model, 'PELVIS');
  if (!pelvis) throw new Error('CharacterModel requires PELVIS for tunic composition');
  const tunicHeight = Math.max(pelvis.size[1] * 1.75, torso.size[1] * 0.36);
  const tunicWidth = pelvis.size[0] * 1.12;
  const tunicDepth = pelvis.size[2] * 1.08;
  const tunicOffset = [
    pelvis.offset[0],
    pelvis.offset[1] - (pelvis.size[1] * 0.38),
    pelvis.offset[2],
  ];
  addPiece(model, 'TORSO', makePiece({
    template: 'TAPERED_BOX',
    name: 'OUTFIT_TUNIC',
    size: [tunicWidth, tunicHeight, tunicDepth],
    offset: tunicOffset,
    pivot: pelvis.pivot || pelvis.offset,
    parent: 'PELVIS',
    material: shirt,
    params: {
      widthTop: tunicWidth * 0.88,
      depthTop: tunicDepth * 0.92,
    },
    semanticPart: 'outfit',
  }));
}

function addEquipmentPieces(model, recipe) {
  if (recipe.equipment.sword.enabled && recipe.equipment.sword.profile === 'classic') {
    const hand = findPiece(model, 'HAND_R');
    if (!hand) throw new Error('CharacterModel requires HAND_R for a sword');
    const anchor = pointFromPiece(hand);
    const geometry = buildSwordGeometry(recipe.equipment.sword.width, recipe.equipment.sword.length);
    addPiece(model, 'WEAPON_MAIN', makePiece({
      template: 'CUSTOM',
      name: 'EQUIP_SWORD_BLADE',
      size: [recipe.equipment.sword.width * 1.55, recipe.equipment.sword.length * 1.22, recipe.equipment.sword.width * 0.24],
      offset: anchor,
      pivot: anchor,
      parent: 'HAND_R',
      material: recipe.equipment.sword.color,
      params: geometry,
      semanticPart: 'equipment.sword',
    }));
  }

  if (recipe.equipment.pauldron.enabled && recipe.equipment.pauldron.profile === 'plate') {
    const shoulder = getShoulderAnchor(model, recipe.equipment.pauldron.side);
    addPiece(model, recipe.equipment.pauldron.side === 'left' ? 'ARM_L' : 'ARM_R', makePiece({
      template: 'CUSTOM',
      name: `EQUIP_PAULDRON_${recipe.equipment.pauldron.side.toUpperCase()}`,
      size: [recipe.equipment.pauldron.size, recipe.equipment.pauldron.size * 0.68, recipe.equipment.pauldron.size * 0.96],
      offset: shoulder.point,
      pivot: shoulder.point,
      parent: shoulder.name,
      material: recipe.equipment.pauldron.color,
      params: buildPauldronGeometry(recipe.equipment.pauldron.size, recipe.equipment.pauldron.side),
      semanticPart: 'equipment.pauldron',
    }));
  }
}

function baseRecipeFromDesign(recipe) {
  return {
    format: 'retrovisor-character',
    version: 1,
    label: recipe.name,
    style: recipe.style,
    headStyle: recipe.head.style,
    includeHead: true,
    headScale: recipe.head.scale,
    bodyHeight: recipe.body.height,
    bodyWidth: recipe.body.width,
    colors: {
      skin: recipe.skin,
      hair: recipe.hair.color,
      shirt: recipe.outfit.shirt,
      pants: recipe.outfit.pants,
      shoes: recipe.outfit.shoes,
    },
    hair: designHairBaseStyle(recipe.hair.style),
  };
}

const BODY_PIECE_NAMES = new Set([
  'PELVIS', 'TORSO', 'CHEST', 'NECK',
  'CLAVICLE_L', 'CLAVICLE_R',
  'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L',
  'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R',
  'LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L',
  'LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R',
]);

function semanticPartForBaseName(name) {
  const normalized = String(name || '').toUpperCase();
  if (normalized.startsWith('HAIR_')) return 'hair';
  if (
    normalized === 'HEAD'
    || normalized.startsWith('EYE_')
    || normalized.startsWith('PUPIL_')
    || normalized === 'NOSE'
    || normalized === 'MOUTH'
    || normalized.startsWith('EAR_')
    || normalized.startsWith('BROW_')
    || normalized.startsWith('FACE_')
  ) return 'head';
  return BODY_PIECE_NAMES.has(normalized) ? 'body' : null;
}

function tagSemanticPieces(model) {
  const semanticParts = {};
  allPieces(model).forEach((piece) => {
    const semanticPart = piece.semanticPart || semanticPartForBaseName(piece.name);
    piece.semanticPart = semanticPart;
    semanticParts[piece.name] = semanticPart;
  });
  model.semanticParts = semanticParts;
  return semanticParts;
}

function rebuildSemanticMap(model) {
  const semanticParts = {};
  allPieces(model).forEach((piece) => {
    const semanticPart = piece.semanticPart || getCharacterDesignPart(piece.name);
    if (semanticPart) {
      piece.semanticPart = semanticPart;
      semanticParts[piece.name] = semanticPart;
    }
  });
  model.semanticParts = semanticParts;
  return semanticParts;
}

/** Stable semantic category lookup for patch commands and external callers. */
export function getCharacterDesignPart(name) {
  const normalized = String(name || '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.startsWith('EQUIP_SWORD_')) return 'equipment.sword';
  if (normalized.startsWith('EQUIP_PAULDRON_')) return 'equipment.pauldron';
  if (normalized.startsWith('OUTFIT_')) return 'outfit';
  return semanticPartForBaseName(normalized);
}

function compileDesign(recipe) {
  const model = createRetroCharacterModel(baseRecipeFromDesign(recipe));

  if (recipe.body.profile === 'plumber') applyPlumberBody(model, recipe);
  if (recipe.head.profile === 'plumber') applyPlumberHead(model, recipe);
  if (recipe.hair.style === 'plumber_cap') applyPlumberCap(model, recipe);
  if (recipe.outfit.style === 'overalls') applyPlumberOutfit(model, recipe);

  // Keep the profile pipeline ordered: body establishes joints, head replaces
  // its anchored face, then hair/outfit/equipment attach to those joints.
  if (recipe.body.profile === 'heroic') {
    heroicShapes.applyHeroicBody(model, recipe);
  }
  if (recipe.head.profile === 'heroic') {
    heroicShapes.applyHeroicHead(model, recipe);
  }
  if (recipe.hair.style === 'hero_spikes') {
    heroicShapes.applyHeroicHair(model, recipe);
  }
  if (recipe.outfit.style === 'soldier') {
    heroicShapes.applyHeroicOutfit(model, recipe);
  }
  if (recipe.equipment.sword.profile === 'buster' || recipe.equipment.pauldron.profile === 'shell') {
    heroicShapes.applyHeroicEquipment(model, recipe);
  }

  // Keep the mouth independent from hair colour, including after a heroic
  // head helper has replaced the face pieces.
  const mouth = findPiece(model, 'MOUTH');
  if (mouth && recipe.head.profile === 'classic') mouth.material = darkenSkinColor(recipe.skin);
  if (recipe.outfit.style === 'sleeveless' || recipe.outfit.style === 'soldier') {
    ['ARM_L_UPPER', 'ARM_R_UPPER'].forEach((name) => {
      const arm = findPiece(model, name);
      if (arm) arm.material = recipe.skin;
    });
  }

  if (recipe.hair.style !== 'hero_spikes') addSweptHair(model, recipe);
  addOutfitPieces(model, recipe);
  addEquipmentPieces(model, recipe);

  model.name = recipe.name;
  model.characterDesignRecipe = cloneValue(recipe);
  model.characterDesignFormat = CHARACTER_DESIGN_FORMAT;
  model.characterDesignVersion = CHARACTER_DESIGN_VERSION;
  tagSemanticPieces(model);
  rebuildSemanticMap(model);
  return model;
}

export function createCharacterDesignModel(input = {}) {
  return compileDesign(normalizeCharacterDesign(input));
}

/**
 * Rebuild only the authored hair pieces while preserving the supplied model's
 * head, body, outfit, equipment, and any manual material or transform edits.
 */
export function regenerateCharacterDesignHair(model, hairPatch = {}) {
  if (!model || !Array.isArray(model.slots)) throw new Error('A CharacterModel is required');
  const current = model.characterDesignRecipe;
  if (!current) throw new Error('CharacterModel has no characterDesignRecipe');
  const patch = isObject(hairPatch) && hasOwn(hairPatch, 'hair') ? hairPatch.hair : hairPatch;
  const nextInput = {
    ...cloneValue(current),
    hair: { ...cloneValue(current.hair), ...(isObject(patch) ? cloneValue(patch) : {}) },
  };
  const nextRecipe = normalizeCharacterDesign(nextInput);
  const generated = compileDesign(nextRecipe);
  const result = cloneValue(model);
  result.slots = result.slots.map((slot) => ({ ...slot, pieces: slot.pieces.map((piece) => cloneValue(piece)) }));
  removePieces(result, (piece) => piece.semanticPart === 'hair' || /^HAIR_/i.test(piece.name));
  const generatedHair = allPieces(generated)
    .filter((piece) => piece.semanticPart === 'hair' || /^HAIR_/i.test(piece.name))
    .map((piece) => cloneValue(piece));
  findSlot(result, 'HEAD').pieces.push(...generatedHair);
  result.characterDesignRecipe = cloneValue(nextRecipe);
  result.retroCharacterRecipe = cloneValue(model.retroCharacterRecipe);
  rebuildSemanticMap(result);
  return result;
}

export const espadachinPSX = Object.freeze({
  format: CHARACTER_DESIGN_FORMAT,
  version: CHARACTER_DESIGN_VERSION,
  name: 'Espadachin PSX',
  style: 'psx',
  body: { height: 4.45, width: 1.38 },
  head: { style: 'psx', scale: 0.9 },
  hair: { style: 'swept_spikes', color: '#d9b95b' },
  outfit: { style: 'sleeveless', shirt: '#403658', pants: '#222c4b', shoes: '#171b28' },
  skin: '#c28a6d',
  equipment: {
    sword: { enabled: true, width: 0.52, length: 2.75, color: '#b8c4d2' },
    pauldron: { enabled: true, side: 'left', size: 0.78, color: '#667184' },
  },
});

export const exploradoraN64 = Object.freeze({
  format: CHARACTER_DESIGN_FORMAT,
  version: CHARACTER_DESIGN_VERSION,
  name: 'Exploradora N64',
  style: 'n64',
  body: { height: 3.85, width: 1.72 },
  head: { style: 'n64', scale: 1.08 },
  hair: { style: 'short', color: '#4a2f24' },
  outfit: { style: 'tunic', shirt: '#bc743f', pants: '#394d3a', shoes: '#28221e' },
  skin: '#d29a77',
  equipment: {
    sword: { enabled: false, width: 0.3, length: 1.5, color: '#bbc8d2' },
    pauldron: { enabled: false, side: 'right', size: 0.55, color: '#6d745b' },
  },
});

export const ESPADACHIN_PSX = espadachinPSX;
export const EXPLORADORA_N64 = exploradoraN64;
export const CHARACTER_DESIGN_EXAMPLES = Object.freeze({
  espadachinPSX,
  exploradoraN64,
});
