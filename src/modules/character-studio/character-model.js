/**
 * Small, deterministic character definitions for the retro character studio.
 *
 * This module deliberately only emits CharacterModel data.  It does not use
 * Avatar Forge, SVGs or scene state, which keeps a recipe useful as a compact
 * interchange format and makes the geometry budget easy to reason about.
 */

export const RETRO_CHARACTER_FORMAT = 'retrovisor-character';
export const RETRO_CHARACTER_VERSION = 1;
export const RETRO_CHARACTER_MODEL_FORMAT = 'retrovisor-character-model';

export const RETRO_STYLES = Object.freeze(['n64', 'psx']);
export const RETRO_HAIR_STYLES = Object.freeze(['short', 'spiky', 'none']);

export const RETRO_DEFAULT_COLORS = Object.freeze({
  skin: '#c58b68',
  hair: '#342219',
  shirt: '#c93d4b',
  pants: '#263451',
  shoes: '#1d2028',
});

const COLOR_KEYS = Object.freeze(['skin', 'hair', 'shirt', 'pants', 'shoes']);
const REQUIRED_HUMANOID_SLOTS = Object.freeze([
  'HEAD',
  'TORSO',
  'ARM_L',
  'ARM_R',
  'LEG_L',
  'LEG_R',
  'WEAPON_MAIN',
  'WEAPON_SECONDARY',
]);

const SLOT_BINDINGS = Object.freeze({
  HEAD: ['HEAD'],
  TORSO: ['PELVIS', 'TORSO', 'CHEST', 'NECK'],
  ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
  ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
  LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
  LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
  WEAPON_MAIN: ['HAND_R'],
  WEAPON_SECONDARY: ['HAND_L'],
});

const STYLE_DEFAULTS = Object.freeze({
  n64: Object.freeze({
    bodyWidthScale: 1.08,
    torsoDepthScale: 0.66,
    limbSides: 6,
    legLower: 0.16,
    legUpper: 0.17,
    pelvis: 0.12,
    torso: 0.27,
    neck: 0.04,
    headWidth: 1.68,
    headHeight: 1.66,
    headDepth: 1.42,
  }),
  psx: Object.freeze({
    bodyWidthScale: 0.92,
    torsoDepthScale: 0.54,
    limbSides: 4,
    legLower: 0.25,
    legUpper: 0.25,
    pelvis: 0.11,
    torso: 0.27,
    neck: 0.04,
    headWidth: 1.40,
    headHeight: 1.48,
    headDepth: 1.18,
  }),
});

function cloneValue(value) {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }
  return value;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeHexColor(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function normalizeStyle(value, fallback = 'n64') {
  const style = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return RETRO_STYLES.includes(style) ? style : fallback;
}

function normalizeHair(value) {
  const hair = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return RETRO_HAIR_STYLES.includes(hair) ? hair : 'short';
}

function normalizeDimension(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? clamp(numeric, min, max) : fallback;
}

function safeLabel(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().slice(0, 64);
}

/**
 * Normalize the compact recipe accepted by the studio and by JSON import.
 * The return value is always complete and safe to feed into a model builder.
 */
export function normalizeRetroCharacterRecipe(input = {}) {
  const source = isObject(input) ? input : {};
  const style = normalizeStyle(source.style, 'n64');
  const headStyle = normalizeStyle(source.headStyle, style);
  const colors = isObject(source.colors) ? source.colors : {};

  return {
    format: RETRO_CHARACTER_FORMAT,
    version: RETRO_CHARACTER_VERSION,
    label: safeLabel(source.label, `${style.toUpperCase()} Retro Character`),
    style,
    headStyle,
    includeHead: source.includeHead !== false,
    headScale: normalizeDimension(source.headScale, 1, 0.65, 1.45),
    bodyHeight: normalizeDimension(source.bodyHeight, 4, 2.8, 5.8),
    bodyWidth: normalizeDimension(source.bodyWidth, 1.55, 1, 2.8),
    colors: Object.fromEntries(
      COLOR_KEYS.map((key) => [key, normalizeHexColor(colors[key], RETRO_DEFAULT_COLORS[key])]),
    ),
    hair: normalizeHair(source.hair),
  };
}

/**
 * Validate a recipe without making callers repeat normalization rules.
 * This follows the app's other recipe validators and returns the normalized
 * recipe alongside actionable errors.
 */
export function validateRetroCharacterRecipe(input = {}) {
  const errors = [];
  const source = isObject(input) ? input : {};
  const normalized = normalizeRetroCharacterRecipe(source);

  if (source.format !== undefined && source.format !== RETRO_CHARACTER_FORMAT) {
    errors.push(`Unsupported recipe format "${source.format}"`);
  }
  if (source.version !== undefined && Number(source.version) !== RETRO_CHARACTER_VERSION) {
    errors.push(`Unsupported recipe version "${source.version}"`);
  }
  if (source.style !== undefined && !RETRO_STYLES.includes(String(source.style).trim().toLowerCase())) {
    errors.push(`Unknown style "${source.style}"`);
  }
  if (source.headStyle !== undefined && !RETRO_STYLES.includes(String(source.headStyle).trim().toLowerCase())) {
    errors.push(`Unknown head style "${source.headStyle}"`);
  }
  if (source.hair !== undefined && !RETRO_HAIR_STYLES.includes(String(source.hair).trim().toLowerCase())) {
    errors.push(`Unknown hair style "${source.hair}"`);
  }
  if (source.includeHead !== undefined && typeof source.includeHead !== 'boolean') {
    errors.push('includeHead must be a boolean');
  }

  for (const [key, min, max] of [
    ['headScale', 0.65, 1.45],
    ['bodyHeight', 2.8, 5.8],
    ['bodyWidth', 1, 2.8],
  ]) {
    if (source[key] !== undefined && (!Number.isFinite(Number(source[key])) || Number(source[key]) < min || Number(source[key]) > max)) {
      errors.push(`${key} must be between ${min} and ${max}`);
    }
  }

  if (source.colors !== undefined && !isObject(source.colors)) {
    errors.push('colors must be an object');
  } else if (isObject(source.colors)) {
    COLOR_KEYS.forEach((key) => {
      if (source.colors[key] !== undefined && !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(String(source.colors[key]).trim())) {
        errors.push(`colors.${key} must be a hex color`);
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    recipe: normalized,
  };
}

function piece({
  template,
  name,
  size,
  offset,
  material,
  parent,
  pivot,
  params,
  scale,
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
  if (scale) result.scale = [...scale];
  return result;
}

function labelPiece(name, offset, parent, material = '#ffffff') {
  return piece({
    template: 'LABEL',
    name,
    offset,
    pivot: offset,
    parent,
    material,
  });
}

function limbPiece({ name, offset, pivot, parent, width, height, depth, sides, material }) {
  const radiusX = Math.max(width * 0.48, 0.025);
  const radiusZ = Math.max(depth * 0.48, 0.025);
  return piece({
    template: 'LIMB_LOFT',
    name,
    size: [width, height, depth],
    offset,
    pivot,
    parent,
    material,
    params: {
      sides,
      sections: [
        { y: -height / 2, radiusX, radiusZ, offsetX: 0, offsetZ: 0 },
        { y: height / 2, radiusX: radiusX * 0.92, radiusZ: radiusZ * 0.92, offsetX: 0, offsetZ: 0 },
      ],
      capTop: true,
      capBottom: true,
    },
  });
}

function taperedPiece({ name, offset, pivot, parent, width, height, depth, widthTop, depthTop, material }) {
  return piece({
    template: 'TAPERED_BOX',
    name,
    size: [width, height, depth],
    offset,
    pivot,
    parent,
    material,
    params: {
      widthTop,
      depthTop,
    },
  });
}

function wedgePiece({ name, offset, pivot, parent, width, height, depth, material }) {
  return piece({
    template: 'PRISM',
    name,
    size: [width, height, depth],
    offset,
    pivot,
    parent,
    material,
  });
}

function headCustomHull(width, height, depth) {
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  const vertices = [
    [-halfW * 0.72, -halfH, halfD * 0.78],
    [halfW * 0.72, -halfH, halfD * 0.78],
    [halfW, halfH * 0.72, halfD],
    [-halfW, halfH * 0.72, halfD],
    [-halfW * 0.58, -halfH * 0.92, -halfD * 0.76],
    [halfW * 0.58, -halfH * 0.92, -halfD * 0.76],
    [halfW * 0.70, halfH * 0.62, -halfD * 0.72],
    [-halfW * 0.70, halfH * 0.62, -halfD * 0.72],
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3],
    [4, 6, 5], [4, 7, 6],
    [0, 3, 7], [0, 7, 4],
    [1, 5, 6], [1, 6, 2],
    [3, 2, 6], [3, 6, 7],
    [0, 4, 5], [0, 5, 1],
  ];
  return { vertices, faces };
}

function headEllipsoidGeometry(width, height, depth, segments = 8) {
  // Four low-poly rings keep the N64 face rounded while the small bottom ring
  // gives the chin a flat, readable base instead of a pointed cap.
  const rings = [
    { y: -height * 0.50, radiusX: width * 0.28, radiusZ: depth * 0.30 },
    { y: -height * 0.28, radiusX: width * 0.44, radiusZ: depth * 0.46 },
    { y: height * 0.18, radiusX: width * 0.50, radiusZ: depth * 0.50 },
    { y: height * 0.50, radiusX: width * 0.38, radiusZ: depth * 0.40 },
  ];
  const vertices = [];
  rings.forEach((ring) => {
    for (let side = 0; side < segments; side += 1) {
      const angle = (side / segments) * Math.PI * 2;
      vertices.push([
        Math.cos(angle) * ring.radiusX,
        ring.y,
        Math.sin(angle) * ring.radiusZ,
      ]);
    }
  });
  const bottomIndex = vertices.length;
  vertices.push([0, -height / 2, 0]);
  const topIndex = vertices.length;
  vertices.push([0, height / 2, 0]);
  const faces = [];
  for (let side = 0; side < segments; side += 1) {
    const next = (side + 1) % segments;
    faces.push([bottomIndex, next, side]);
    for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
      const lower = ringIndex * segments + side;
      const nextLower = ringIndex * segments + next;
      const upper = (ringIndex + 1) * segments + side;
      const nextUpper = (ringIndex + 1) * segments + next;
      faces.push([lower, nextLower, nextUpper], [lower, nextUpper, upper]);
    }
    const topRing = (rings.length - 1) * segments;
    faces.push([topRing + side, topRing + next, topIndex]);
  }
  // The original face order pointed normals inward. Reverse every triangle so
  // the low-poly skin receives front-facing lighting and remains visible.
  return { vertices, faces: faces.map(([a, b, c]) => [a, c, b]) };
}

function headHairCapGeometry(width, height, depth, segments = 8) {
  const rings = [
    { y: height * 0.62, radiusX: width * 0.54, radiusZ: depth * 0.54 },
    { y: height * 0.86, radiusX: width * 0.47, radiusZ: depth * 0.48 },
    { y: height * 1.04, radiusX: width * 0.40, radiusZ: depth * 0.42 },
  ];
  const vertices = [];
  rings.forEach((ring) => {
    for (let side = 0; side < segments; side += 1) {
      const angle = (side / segments) * Math.PI * 2;
      vertices.push([
        Math.cos(angle) * ring.radiusX,
        ring.y,
        Math.sin(angle) * ring.radiusZ,
      ]);
    }
  });
  const topIndex = vertices.length;
  vertices.push([0, height * 1.04, 0]);
  const faces = [];
  for (let side = 0; side < segments; side += 1) {
    const next = (side + 1) % segments;
    for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
      const lower = ringIndex * segments + side;
      const nextLower = ringIndex * segments + next;
      const upper = (ringIndex + 1) * segments + side;
      const nextUpper = (ringIndex + 1) * segments + next;
      faces.push([lower, nextLower, nextUpper], [lower, nextUpper, upper]);
    }
    const topRing = (rings.length - 1) * segments;
    faces.push([topRing + side, topRing + next, topIndex]);
  }
  // Match the outward winding of the N64 head hull.
  return { vertices, faces: faces.map(([a, b, c]) => [a, c, b]) };
}

function buildLayout(recipe) {
  const style = STYLE_DEFAULTS[recipe.style];
  const height = recipe.bodyHeight;
  const footHeight = height * 0.06;
  const lowerHeight = height * style.legLower;
  const upperHeight = height * style.legUpper;
  const pelvisHeight = height * style.pelvis;
  const torsoHeight = height * style.torso;
  const neckHeight = height * style.neck;
  const ankleY = footHeight;
  const kneeY = ankleY + lowerHeight;
  const hipY = kneeY + upperHeight;
  const pelvisCenterY = hipY + pelvisHeight * 0.5;
  const torsoCenterY = hipY + pelvisHeight + torsoHeight * 0.5;
  const chestY = hipY + pelvisHeight + torsoHeight;
  const neckY = chestY + neckHeight * 0.5;
  const headAnchorY = chestY + neckHeight;
  const width = recipe.bodyWidth * style.bodyWidthScale;
  const legX = width * 0.24;
  const shoulderY = hipY + pelvisHeight + torsoHeight * 0.78;
  const shoulderX = width * 0.5 + height * 0.018;
  const upperArmHeight = height * (recipe.style === 'n64' ? 0.18 : 0.19);
  const lowerArmHeight = height * (recipe.style === 'n64' ? 0.17 : 0.18);
  const wristY = shoulderY - upperArmHeight - lowerArmHeight;
  const handHeight = Math.max(footHeight * 1.35, height * 0.085);
  return {
    style,
    height,
    width,
    depth: width * style.torsoDepthScale,
    footHeight,
    lowerHeight,
    upperHeight,
    pelvisHeight,
    torsoHeight,
    neckHeight,
    ankleY,
    kneeY,
    hipY,
    pelvisCenterY,
    torsoCenterY,
    chestY,
    neckY,
    headAnchorY,
    legX,
    shoulderY,
    shoulderX,
    upperArmHeight,
    lowerArmHeight,
    wristY,
    handHeight,
    footDepth: recipe.style === 'n64' ? width * 0.76 : width * 0.88,
    limbWidth: recipe.style === 'n64' ? width * 0.23 : width * 0.18,
  };
}

function buildBodySlots(recipe, layout) {
  const { colors } = recipe;
  const { style } = layout;
  const pieces = {
    HEAD: [labelPiece('HEAD', [0, layout.headAnchorY, 0], 'NECK', colors.skin)],
    TORSO: [
      taperedPiece({
        name: 'PELVIS',
        offset: [0, layout.pelvisCenterY, 0],
        pivot: [0, layout.hipY, 0],
        width: layout.width * 0.84,
        height: layout.pelvisHeight,
        depth: layout.depth * 0.91,
        widthTop: layout.width * 0.90,
        depthTop: layout.depth,
        material: colors.pants,
      }),
      taperedPiece({
        name: 'TORSO',
        offset: [0, layout.torsoCenterY, 0],
        pivot: [0, layout.hipY, 0],
        parent: 'PELVIS',
        width: layout.width,
        height: layout.torsoHeight,
        depth: layout.depth,
        widthTop: style === STYLE_DEFAULTS.n64 ? layout.width * 1.08 : layout.width * 0.84,
        depthTop: style === STYLE_DEFAULTS.n64 ? layout.depth * 0.92 : layout.depth * 0.78,
        material: colors.shirt,
      }),
      labelPiece('CHEST', [0, layout.chestY, 0], 'TORSO', colors.shirt),
      piece({
        template: 'CUBE',
        name: 'NECK',
        size: [layout.width * 0.20, layout.neckHeight, layout.width * 0.18],
        offset: [0, layout.neckY, 0],
        pivot: [0, layout.chestY, 0],
        parent: 'CHEST',
        material: colors.skin,
      }),
    ],
    ARM_L: [
      labelPiece('CLAVICLE_L', [-layout.shoulderX, layout.shoulderY, 0], 'CHEST', colors.shirt),
      limbPiece({
        name: 'ARM_L_UPPER',
        offset: [-layout.shoulderX, layout.shoulderY - layout.upperArmHeight / 2, 0],
        pivot: [-layout.shoulderX, layout.shoulderY, 0],
        parent: 'CLAVICLE_L',
        width: layout.limbWidth,
        height: layout.upperArmHeight,
        depth: layout.limbWidth,
        sides: style.limbSides,
        material: colors.shirt,
      }),
      limbPiece({
        name: 'ARM_L_LOWER',
        offset: [-layout.shoulderX, layout.shoulderY - layout.upperArmHeight - layout.lowerArmHeight / 2, 0],
        pivot: [-layout.shoulderX, layout.shoulderY - layout.upperArmHeight, 0],
        parent: 'ARM_L_UPPER',
        width: layout.limbWidth * 0.9,
        height: layout.lowerArmHeight,
        depth: layout.limbWidth * 0.9,
        sides: style.limbSides,
        material: colors.skin,
      }),
    ],
    ARM_R: [
      labelPiece('CLAVICLE_R', [layout.shoulderX, layout.shoulderY, 0], 'CHEST', colors.shirt),
      limbPiece({
        name: 'ARM_R_UPPER',
        offset: [layout.shoulderX, layout.shoulderY - layout.upperArmHeight / 2, 0],
        pivot: [layout.shoulderX, layout.shoulderY, 0],
        parent: 'CLAVICLE_R',
        width: layout.limbWidth,
        height: layout.upperArmHeight,
        depth: layout.limbWidth,
        sides: style.limbSides,
        material: colors.shirt,
      }),
      limbPiece({
        name: 'ARM_R_LOWER',
        offset: [layout.shoulderX, layout.shoulderY - layout.upperArmHeight - layout.lowerArmHeight / 2, 0],
        pivot: [layout.shoulderX, layout.shoulderY - layout.upperArmHeight, 0],
        parent: 'ARM_R_UPPER',
        width: layout.limbWidth * 0.9,
        height: layout.lowerArmHeight,
        depth: layout.limbWidth * 0.9,
        sides: style.limbSides,
        material: colors.skin,
      }),
    ],
    LEG_L: [
      limbPiece({
        name: 'LEG_L_UPPER',
        offset: [-layout.legX, layout.hipY - layout.upperHeight / 2, 0],
        pivot: [-layout.legX, layout.hipY, 0],
        parent: 'PELVIS',
        width: layout.width * 0.26,
        height: layout.upperHeight,
        depth: layout.width * 0.27,
        sides: style.limbSides,
        material: colors.pants,
      }),
      limbPiece({
        name: 'LEG_L_LOWER',
        offset: [-layout.legX, layout.kneeY - layout.lowerHeight / 2, 0],
        pivot: [-layout.legX, layout.kneeY, 0],
        parent: 'LEG_L_UPPER',
        width: layout.width * 0.22,
        height: layout.lowerHeight,
        depth: layout.width * 0.23,
        sides: style.limbSides,
        material: colors.pants,
      }),
      taperedPiece({
        name: 'FOOT_L',
        offset: [-layout.legX, layout.footHeight / 2, layout.footDepth * 0.16],
        pivot: [-layout.legX, layout.ankleY, 0],
        parent: 'LEG_L_LOWER',
        width: layout.width * 0.34,
        height: layout.footHeight,
        depth: layout.footDepth,
        widthTop: layout.width * 0.31,
        depthTop: layout.footDepth * 0.90,
        material: colors.shoes,
      }),
    ],
    LEG_R: [
      limbPiece({
        name: 'LEG_R_UPPER',
        offset: [layout.legX, layout.hipY - layout.upperHeight / 2, 0],
        pivot: [layout.legX, layout.hipY, 0],
        parent: 'PELVIS',
        width: layout.width * 0.26,
        height: layout.upperHeight,
        depth: layout.width * 0.27,
        sides: style.limbSides,
        material: colors.pants,
      }),
      limbPiece({
        name: 'LEG_R_LOWER',
        offset: [layout.legX, layout.kneeY - layout.lowerHeight / 2, 0],
        pivot: [layout.legX, layout.kneeY, 0],
        parent: 'LEG_R_UPPER',
        width: layout.width * 0.22,
        height: layout.lowerHeight,
        depth: layout.width * 0.23,
        sides: style.limbSides,
        material: colors.pants,
      }),
      taperedPiece({
        name: 'FOOT_R',
        offset: [layout.legX, layout.footHeight / 2, layout.footDepth * 0.16],
        pivot: [layout.legX, layout.ankleY, 0],
        parent: 'LEG_R_LOWER',
        width: layout.width * 0.34,
        height: layout.footHeight,
        depth: layout.footDepth,
        widthTop: layout.width * 0.31,
        depthTop: layout.footDepth * 0.90,
        material: colors.shoes,
      }),
    ],
    WEAPON_MAIN: [
      limbPiece({
        name: 'HAND_R',
        offset: [layout.shoulderX, layout.wristY - layout.handHeight * 0.5, 0.02],
        pivot: [layout.shoulderX, layout.wristY, 0],
        parent: 'ARM_R_LOWER',
        width: layout.limbWidth * 1.35,
        height: layout.handHeight,
        depth: layout.limbWidth * 1.35,
        sides: style.limbSides,
        material: colors.skin,
      }),
    ],
    WEAPON_SECONDARY: [
      limbPiece({
        name: 'HAND_L',
        offset: [-layout.shoulderX, layout.wristY - layout.handHeight * 0.5, 0.02],
        pivot: [-layout.shoulderX, layout.wristY, 0],
        parent: 'ARM_L_LOWER',
        width: layout.limbWidth * 1.35,
        height: layout.handHeight,
        depth: layout.limbWidth * 1.35,
        sides: style.limbSides,
        material: colors.skin,
      }),
    ],
  };

  return REQUIRED_HUMANOID_SLOTS.map((slotId) => ({
    slotId,
    pieces: pieces[slotId] || [],
  }));
}

function buildHeadPieces(recipe, layout) {
  const style = STYLE_DEFAULTS[recipe.headStyle];
  const scale = recipe.headScale;
  const width = style.headWidth * scale;
  const height = style.headHeight * scale;
  const depth = style.headDepth * scale;
  const centerY = layout.headAnchorY + height * 0.5;
  const frontZ = depth * 0.5;
  const eyeY = layout.headAnchorY + height * 0.50;
  const eyeX = width * 0.22;
  const eyeDepth = frontZ + width * 0.035;
  const eyeSize = style === STYLE_DEFAULTS.n64 ? width * 0.16 : width * 0.13;
  const dark = recipe.colors.hair;
  const pieces = [];

  if (recipe.headStyle === 'n64') {
    pieces.push(piece({
      template: 'CUSTOM',
      name: 'HEAD',
      offset: [0, centerY, 0],
      pivot: [0, layout.headAnchorY, 0],
      parent: 'NECK',
      material: recipe.colors.skin,
      params: headEllipsoidGeometry(width, height, depth, 8),
    }));
  } else {
    const hull = headCustomHull(width, height, depth);
    pieces.push(piece({
      template: 'CUSTOM',
      name: 'HEAD',
      offset: [0, centerY, 0],
      pivot: [0, layout.headAnchorY, 0],
      parent: 'NECK',
      material: recipe.colors.skin,
      params: hull,
    }));
  }

  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R';
    const eyeOffset = [side * eyeX, eyeY, eyeDepth];
    pieces.push(piece({
      template: 'SPHERE',
      name: `EYE_${suffix}`,
      size: [eyeSize, eyeSize, eyeSize],
      offset: eyeOffset,
      pivot: eyeOffset,
      parent: 'HEAD',
      material: '#f3ead5',
      params: { widthSegments: 6, heightSegments: 3 },
    }));
    const pupilOffset = [side * eyeX, eyeY, eyeDepth + eyeSize * 0.50];
    pieces.push(piece({
      template: 'CUBE',
      name: `PUPIL_${suffix}`,
      size: [eyeSize * 0.43, eyeSize * 0.55, eyeSize * 0.18],
      offset: pupilOffset,
      pivot: pupilOffset,
      parent: 'HEAD',
      material: '#18151a',
    }));
  }

  pieces.push(wedgePiece({
    name: 'NOSE',
    offset: [0, layout.headAnchorY + height * 0.38, frontZ + width * 0.09],
    pivot: [0, layout.headAnchorY, 0],
    parent: 'HEAD',
    width: width * 0.14,
    height: height * 0.15,
    depth: width * 0.17,
    material: recipe.colors.skin,
  }));
  pieces.push(piece({
    template: 'CUBE',
    name: 'MOUTH',
    size: [width * 0.24, height * 0.04, width * 0.035],
    offset: [0, layout.headAnchorY + height * 0.23, frontZ + width * 0.075],
    pivot: [0, layout.headAnchorY, 0],
    parent: 'HEAD',
    material: dark,
  }));
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'L' : 'R';
    pieces.push(piece({
      template: 'CUBE',
      name: `EAR_${suffix}`,
      size: [width * 0.10, height * 0.20, width * 0.12],
      offset: [side * width * 0.50, layout.headAnchorY + height * 0.46, 0],
      pivot: [0, layout.headAnchorY, 0],
      parent: 'HEAD',
      material: recipe.colors.skin,
    }));
  }

  if (recipe.hair !== 'none') {
    if (recipe.headStyle === 'n64') {
      const capAnchor = [0, layout.headAnchorY, 0];
      pieces.push(piece({
        template: 'CUSTOM',
        name: 'HAIR_CAP',
        offset: capAnchor,
        pivot: capAnchor,
        parent: 'HEAD',
        material: dark,
        params: headHairCapGeometry(width, height, depth, 8),
      }));
    } else {
      const capOffset = [0, layout.headAnchorY + height * 0.80, -depth * 0.04];
      pieces.push(taperedPiece({
        name: 'HAIR_CAP',
        offset: capOffset,
        pivot: capOffset,
        parent: 'HEAD',
        width: width * 1.03,
        height: height * 0.40,
        depth: depth * 0.97,
        widthTop: width * 0.82,
        depthTop: depth * 0.82,
        material: dark,
      }));
    }

    if (recipe.hair === 'spiky') {
      [-1, 0, 1].forEach((index) => {
        pieces.push(wedgePiece({
          name: `HAIR_TUFT_${index + 1}`,
          offset: [index * width * 0.23, layout.headAnchorY + height * 1.00, -depth * 0.04],
          pivot: [0, layout.headAnchorY, 0],
          parent: 'HEAD',
          width: width * 0.20,
          height: height * 0.24,
          depth: depth * 0.24,
          material: dark,
        }));
      });
    }
  }

  return pieces;
}
function buildCharacterModel(recipeInput, includeHead) {
  const baseRecipe = normalizeRetroCharacterRecipe(recipeInput);
  const recipe = {
    ...baseRecipe,
    includeHead,
  };
  const layout = buildLayout(recipe);
  const slots = buildBodySlots(recipe, layout);
  if (includeHead) {
    slots[0].pieces = buildHeadPieces(recipe, layout);
  }

  return {
    format: RETRO_CHARACTER_MODEL_FORMAT,
    version: RETRO_CHARACTER_VERSION,
    name: recipe.label,
    archetype: 'HUMANOID',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    skeletonId: 'HUMANOID_STANDARD',
    slotBindings: cloneValue(SLOT_BINDINGS),
    slots,
    retroCharacterRecipe: cloneValue(recipe),
  };
}

function resolveValidatedRecipe(input) {
  const validation = validateRetroCharacterRecipe(input);
  if (!validation.ok) {
    throw new Error(`Invalid retro character recipe: ${validation.errors.join('; ')}`);
  }
  return validation.recipe;
}
/** Build a complete low-poly CharacterModel using the selected head and body style. */
export function createRetroCharacterModel(recipe = {}) {
  const normalized = resolveValidatedRecipe(recipe);
  return buildCharacterModel(normalized, normalized.includeHead);
}

/** Build a headless reusable body while retaining a real, replaceable HEAD pivot. */
export function createRetroBodyModel(recipe = {}) {
  const normalized = resolveValidatedRecipe(recipe);
  return buildCharacterModel({ ...normalized, includeHead: false }, false);
}















