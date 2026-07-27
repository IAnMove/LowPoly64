// Forge new CharacterModel templates using the repo's own parametric skull
// generator (src/data/avatar/generated-heads.js) plus hand-authored bodies.
//
// Run: node scripts/forge-new-characters.mjs
// Output: src/data/templates/characters/<id>.json (one per FORGE list entry)
//
// Conventions (match n64_elf_hero_cm.json):
// - characters face -Z (feature slabs and toes toward -Z)
// - canonical skull (height 1.2, y 0..1.2, face +Z) is re-centered to
//   y -= 0.6 and z-flipped before mounting on NECK
// - feature slabs are thin 8-vertex boxes: verts 0-3 inner quad, 4-7 outer
//   quad (most negative z), 12-triangle pattern, decal on the outer face

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGeneratedHeadById } from '../src/data/avatar/generated-heads.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'templates', 'characters');

const round4 = (value) => Math.round(value * 10000) / 10000;
const vec = (v) => v.map(round4);

// ---------- color helpers ----------

function shade(hex, factor) {
  const value = hex.replace('#', '');
  const channel = (i) => {
    const c = parseInt(value.slice(i, i + 2), 16);
    return Math.max(0, Math.min(255, Math.round(c * factor)));
  };
  const to2 = (c) => c.toString(16).padStart(2, '0');
  return `#${to2(channel(0))}${to2(channel(2))}${to2(channel(4))}`;
}

// faceColors order: back, front, left, right, top, bottom (front = -Z).
function faceShades(hex) {
  return [
    shade(hex, 0.62),
    shade(hex, 1.12),
    shade(hex, 0.85),
    shade(hex, 0.85),
    shade(hex, 1.28),
    shade(hex, 0.48),
  ];
}

// ---------- skull + feature slabs ----------

function slabGeometry({ cx, cy, zOuter, w, h, depth }) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const zIn = zOuter + depth;
  // 24 vertices (4 per face) so only the decal face gets the texture
  // projection; every other face maps to the transparent (0,0) texel.
  const quads = [
    { uv: [[0, 1], [1, 1], [1, 0], [0, 0]], verts: [[x0, y0, zOuter], [x1, y0, zOuter], [x1, y1, zOuter], [x0, y1, zOuter]], tris: [[0, 1, 2], [0, 2, 3]] },
    { uv: [[0, 0], [0, 0], [0, 0], [0, 0]], verts: [[x0, y0, zIn], [x1, y0, zIn], [x1, y1, zIn], [x0, y1, zIn]], tris: [[5, 4, 7], [5, 7, 6]] },
    { uv: [[0, 0], [0, 0], [0, 0], [0, 0]], verts: [[x0, y0, zIn], [x0, y1, zIn], [x0, y1, zOuter], [x0, y0, zOuter]], tris: [[8, 9, 10], [8, 10, 11]] },
    { uv: [[0, 0], [0, 0], [0, 0], [0, 0]], verts: [[x1, y0, zIn], [x1, y1, zIn], [x1, y1, zOuter], [x1, y0, zOuter]], tris: [[13, 12, 15], [13, 15, 14]] },
    { uv: [[0, 0], [0, 0], [0, 0], [0, 0]], verts: [[x0, y1, zIn], [x1, y1, zIn], [x1, y1, zOuter], [x0, y1, zOuter]], tris: [[16, 17, 18], [16, 18, 19]] },
    { uv: [[0, 0], [0, 0], [0, 0], [0, 0]], verts: [[x0, y0, zIn], [x1, y0, zIn], [x1, y0, zOuter], [x0, y0, zOuter]], tris: [[21, 20, 23], [21, 23, 22]] },
  ];
  const vertices = [];
  const uvs = [];
  const faces = [];
  quads.forEach((quad) => {
    vertices.push(...quad.verts.map(vec));
    uvs.push(...quad.uv);
    faces.push(...quad.tris.map((tri) => [...tri]));
  });
  return { vertices, faces, uvs };
}

function slabPiece({ name, material, headCenter, headPivot, geom, decal }) {
  const piece = {
    template: 'CUSTOM',
    name,
    offset: vec(headCenter),
    material,
    parent: 'HEAD',
    pivot: vec(headPivot),
    params: geom,
  };
  if (decal) piece.decal = decal;
  return piece;
}

function buildHeadPieces({
  moldId,
  headParams = {},
  headScale = 1,
  skin,
  headCenter,
  headPivot,
  neckName = 'NECK',
  face = null,
  extraPieces = [],
}) {
  const { customGeometry, landmarks } = buildGeneratedHeadById(moldId, headParams);
  const toLocal = ([x, y, z]) => [x * headScale, (y - 0.6) * headScale, -z * headScale];

  const head = {
    template: 'CUSTOM',
    name: 'HEAD',
    offset: vec(headCenter),
    material: skin,
    parent: neckName,
    pivot: vec(headPivot),
    params: {
      vertices: customGeometry.vertices.map((v) => vec(toLocal(v))),
      faces: customGeometry.faces.map((face) => [...face]),
    },
    faceColors: [skin],
  };

  const pieces = [head];
  const s = headScale;

  if (face?.eyes) {
    const eyeL = toLocal(landmarks.eyeL);
    const eyeR = toLocal(landmarks.eyeR);
    const interocular = (eyeR[0] - eyeL[0]) || 0.42 * s;
    const eyeW = interocular * 0.85;
    const eyeDepth = 0.09 * s;
    const eyeProtrude = 0.004 * s;
    const browW = interocular * 0.82;
    const browH = interocular * 0.3;
    const browLift = interocular * 0.52;
    const mouth = face.mouth ? toLocal(landmarks.mouth) : null;

    [
      { name: 'EYE_SLAB_L', point: eyeL, side: 'L' },
      { name: 'EYE_SLAB_R', point: eyeR, side: 'R' },
    ].forEach(({ name, point, side }) => {
      pieces.push(slabPiece({
        name,
        material: skin,
        headCenter,
        headPivot,
        geom: slabGeometry({
          cx: point[0], cy: point[1], zOuter: point[2] - eyeProtrude,
          w: eyeW, h: eyeW, depth: eyeDepth,
        }),
        decal: {
          resolution: [32, 32],
          background: 'transparent',
          flipY: false,
          layers: [{
            kind: 'eye', sprite: face.eyes.sprite, tint: { iris: face.eyes.iris },
            x: 0.5, y: 0.5, w: 0.96, h: 0.96, side,
          }],
        },
      }));
    });

    if (face.brows) {
      [
        { name: 'BROW_SLAB_L', x: eyeL[0], side: 'L', angle: -4 },
        { name: 'BROW_SLAB_R', x: eyeR[0], side: 'R', angle: 4 },
      ].forEach(({ name, x, side, angle }) => {
        pieces.push(slabPiece({
          name,
          material: skin,
          headCenter,
          headPivot,
          geom: slabGeometry({
            cx: x, cy: eyeL[1] + browLift, zOuter: eyeL[2] + 0.031 * s,
            w: browW, h: browH, depth: eyeDepth,
          }),
          decal: {
            resolution: [48, 16],
            background: 'transparent',
            flipY: false,
            layers: [{
              kind: 'brow', sprite: face.brows.sprite, tint: { brow: face.brows.tint },
              x: 0.5, y: 0.5, w: 0.96, h: 0.96, side, angle,
            }],
          },
        }));
      });
    }

    if (face.mouth && mouth) {
      pieces.push(slabPiece({
        name: 'MOUTH_SLAB',
        material: skin,
        headCenter,
        headPivot,
        geom: slabGeometry({
          cx: 0, cy: mouth[1], zOuter: mouth[2] - eyeProtrude,
          w: interocular * 0.95, h: interocular * 0.48, depth: eyeDepth,
        }),
        decal: {
          resolution: [48, 24],
          background: 'transparent',
          flipY: false,
          layers: [{
            kind: 'mouth', sprite: face.mouth.sprite, tint: { lip: face.mouth.lip },
            x: 0.5, y: 0.5, w: 0.96, h: 0.96,
          }],
        },
      }));
    }
  }

  return [...pieces, ...extraPieces];
}

// ---------- shared skeleton frames (world offsets, facing -Z) ----------

const HEROIC = {
  pelvis: [0, 2.2, 0], pelvisPivot: [0, 2.5, 0],
  torso: [0, 3.0, 0],
  chest: [0, 3.7, 0], chestPivot: [0, 3.28, 0],
  neck: [0, 4.3, 0], neckPivot: [0, 4.12, 0],
  headCenter: [0, 5.05, 0], headPivot: [0, 4.48, 0],
  clavicle: [0.82, 4.0, 0], armUpper: [1.06, 3.4, 0], armUpperPivot: [1.04, 3.96, 0],
  armLower: [1.08, 2.46, 0], armLowerPivot: [1.06, 2.87, 0],
  hand: [1.08, 1.9, 0], handPivot: [1.08, 2.0, 0],
  legUpper: [0.38, 1.56, 0], legUpperPivot: [0.37, 2.25, 0],
  legLower: [0.38, 0.62, 0], legLowerPivot: [0.38, 0.98, 0],
  foot: [0.38, 0.12, -0.22], footPivot: [0.38, 0.18, 0],
};

const mirror = ([x, y, z]) => [-x, y, z];

function humanoidBindings({ main = [], secondary = [] } = {}) {
  return {
    HEAD: ['HEAD'],
    TORSO: ['PELVIS', 'TORSO', 'CHEST', 'NECK'],
    ARM_L: ['CLAVICLE_L', 'ARM_L_UPPER', 'ARM_L_LOWER', 'HAND_L'],
    ARM_R: ['CLAVICLE_R', 'ARM_R_UPPER', 'ARM_R_LOWER', 'HAND_R'],
    LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
    LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
    WEAPON_MAIN: main,
    WEAPON_SECONDARY: secondary,
  };
}

function makeArm(side, frame, { clavicle, upper, lower, hand }) {
  const sign = side === 'L' ? 1 : -1;
  const at = (p) => (sign === 1 ? p : mirror(p));
  return [
    {
      template: 'TAPERED_BOX', name: `CLAVICLE_${side}`,
      size: clavicle.size, offset: at(frame.clavicle), material: clavicle.material,
      parent: 'CHEST', pivot: at([frame.clavicle[0] - sign * 0.22, frame.clavicle[1], frame.clavicle[2]]),
      params: clavicle.params, ...(clavicle.faceColors ? { faceColors: clavicle.faceColors } : {}),
    },
    {
      template: 'LIMB_LOFT', name: `ARM_${side}_UPPER`,
      size: upper.size, offset: at(frame.armUpper), material: upper.material,
      parent: `CLAVICLE_${side}`, pivot: at(frame.armUpperPivot),
      params: upper.params, ...(upper.vertexColors ? { vertexColors: upper.vertexColors } : {}),
    },
    {
      template: 'LIMB_LOFT', name: `ARM_${side}_LOWER`,
      size: lower.size, offset: at(frame.armLower), material: lower.material,
      parent: `ARM_${side}_UPPER`, pivot: at(frame.armLowerPivot),
      params: lower.params, ...(lower.vertexColors ? { vertexColors: lower.vertexColors } : {}),
    },
    {
      template: 'TAPERED_BOX', name: `HAND_${side}`,
      size: hand.size, offset: at(frame.hand), material: hand.material,
      parent: `ARM_${side}_LOWER`, pivot: at(frame.handPivot),
      params: hand.params,
    },
  ];
}

function makeLeg(side, frame, { upper, lower, foot }) {
  const sign = side === 'L' ? 1 : -1;
  const at = (p) => (sign === 1 ? p : mirror(p));
  return [
    {
      template: 'LIMB_LOFT', name: `LEG_${side}_UPPER`,
      size: upper.size, offset: at(frame.legUpper), material: upper.material,
      parent: 'PELVIS', pivot: at(frame.legUpperPivot),
      params: upper.params, ...(upper.vertexColors ? { vertexColors: upper.vertexColors } : {}),
    },
    {
      template: 'LIMB_LOFT', name: `LEG_${side}_LOWER`,
      size: lower.size, offset: at(frame.legLower), material: lower.material,
      parent: `LEG_${side}_UPPER`, pivot: at(frame.legLowerPivot),
      params: lower.params, ...(lower.vertexColors ? { vertexColors: lower.vertexColors } : {}),
    },
    {
      template: 'TAPERED_BOX', name: `FOOT_${side}`,
      size: foot.size, offset: at(frame.foot), material: foot.material,
      parent: `LEG_${side}_LOWER`, pivot: at(frame.footPivot),
      params: foot.params, ...(foot.faceColors ? { faceColors: foot.faceColors } : {}),
    },
  ];
}

const loft3 = (r0, r1, r2, half, opts = {}) => ({
  sides: opts.sides ?? 6,
  sections: [
    { y: -half, radiusX: r0[0], radiusZ: r0[1], ...(opts.bottomOffset || {}) },
    { y: 0, radiusX: r1[0], radiusZ: r1[1], ...(opts.midOffset || {}) },
    { y: half, radiusX: r2[0], radiusZ: r2[1], ...(opts.topOffset || {}) },
  ],
  capTop: true,
  capBottom: true,
});

// ---------- 1. PSX black mage ----------

function buildBlackMage() {
  const robe = '#453468';
  const robeDark = '#372a55';
  const trim = '#c9a227';
  const skin = '#d9c8b8';
  const wood = '#5a4028';
  const orb = '#7fe7ff';

  const headPieces = buildHeadPieces({
    moldId: 'gen_head_long',
    headParams: { cheekFullness: -0.12, jawDrop: 0.06 },
    skin,
    headCenter: HEROIC.headCenter,
    headPivot: HEROIC.headPivot,
    face: {
      eyes: { sprite: 'eye_image2_hooded_shadow', iris: '#ffd75e' },
      brows: { sprite: 'brow_tiny_dot', tint: '#241a3a' },
      mouth: { sprite: 'mouth_neutral_small', lip: '#7a5a4a' },
    },
    extraPieces: [
      {
        template: 'LATHE', name: 'HAT_BRIM',
        size: [2.3, 0.3, 2.3], offset: [0, 5.66, 0.1], material: robeDark,
        parent: 'HEAD', pivot: HEROIC.headPivot,
        params: {
          segments: 8,
          points: [[0.62, -0.14], [1.14, -0.1], [1.15, 0.04], [0.72, 0.12], [0.58, 0.16]],
        },
        faceColors: faceShades(robeDark),
      },
      {
        template: 'LIMB_LOFT', name: 'HAT_CONE',
        size: [1.2, 1.7, 1.9], offset: [0, 6.35, 0.35], material: robeDark,
        parent: 'HEAD', pivot: HEROIC.headPivot,
        params: {
          sides: 7,
          sections: [
            { y: -0.72, radiusX: 0.6, radiusZ: 0.58 },
            { y: -0.1, radiusX: 0.46, radiusZ: 0.44, offsetZ: 0.12 },
            { y: 0.45, radiusX: 0.3, radiusZ: 0.28, offsetZ: 0.42 },
            { y: 0.98, radiusX: 0.08, radiusZ: 0.08, offsetZ: 0.78 },
          ],
          capTop: true, capBottom: true,
        },
        vertexColors: { top: shade(robeDark, 1.3), bottom: shade(robeDark, 0.7) },
      },
      {
        template: 'TAPERED_BOX', name: 'HAT_BAND',
        size: [1.24, 0.16, 1.2], offset: [0, 5.78, 0.12], material: trim,
        parent: 'HEAD', pivot: HEROIC.headPivot,
        params: { widthTop: 1.12, depthTop: 1.08 },
      },
    ],
  });

  const armSpec = {
    clavicle: { size: [0.44, 0.18, 0.4], material: robe, params: { widthTop: 0.34, depthTop: 0.34 } },
    upper: { size: [0.44, 1.1, 0.42], material: robe, params: loft3([0.16, 0.15], [0.21, 0.18], [0.23, 0.19], 0.55) },
    lower: {
      size: [0.5, 0.95, 0.48], material: robe,
      params: loft3([0.3, 0.27], [0.22, 0.19], [0.17, 0.15], 0.47),
      vertexColors: { top: shade(robe, 1.15), bottom: shade(robe, 0.8) },
    },
    hand: { size: [0.3, 0.3, 0.26], material: skin, params: { widthTop: 0.26, depthTop: 0.22 } },
  };
  const legSpec = {
    upper: { size: [0.46, 1.1, 0.42], material: robeDark, params: loft3([0.17, 0.15], [0.21, 0.18], [0.23, 0.2], 0.55) },
    lower: { size: [0.4, 1.0, 0.38], material: '#241c38', params: loft3([0.15, 0.16], [0.19, 0.17], [0.19, 0.18], 0.5) },
    foot: { size: [0.4, 0.28, 0.82], material: '#1d1830', params: { widthTop: 0.3, depthTop: 0.46, offsetTopZ: 0.1 }, faceColors: faceShades('#1d1830') },
  };

  return {
    id: 'psx_black_mage_cm',
    name: 'Mago Umbrio PSX',
    category: 'PSX',
    assetRole: 'characterModel',
    archetype: 'HUMANOID',
    skeletonId: 'HUMANOID_STANDARD',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    slotBindings: humanoidBindings({ main: ['HAND_R'] }),
    slots: [
      { slotId: 'HEAD', pieces: headPieces },
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'PELVIS', size: [1.1, 0.6, 0.72],
            offset: HEROIC.pelvis, material: robeDark, pivot: HEROIC.pelvisPivot,
            params: { widthTop: 0.98, depthTop: 0.64 }, faceColors: faceShades(robeDark),
          },
          {
            template: 'TAPERED_BOX', name: 'TORSO', size: [1.14, 1.16, 0.74],
            offset: HEROIC.torso, material: robe, parent: 'PELVIS', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.4, depthTop: 0.84, offsetTopZ: -0.03 }, faceColors: faceShades(robe),
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST', size: [1.36, 0.7, 0.8],
            offset: HEROIC.chest, material: robe, parent: 'TORSO', pivot: HEROIC.chestPivot,
            params: { widthTop: 1.62, depthTop: 0.88, offsetTopZ: -0.02 }, faceColors: faceShades(robe),
          },
          {
            template: 'LATHE', name: 'ROBE_SKIRT', size: [1.9, 1.9, 1.9],
            offset: [0, 1.95, 0], material: robe, parent: 'PELVIS', pivot: HEROIC.pelvisPivot,
            params: {
              segments: 8,
              points: [[0.95, -0.95], [0.82, -0.45], [0.68, 0.25], [0.74, 0.95]],
            },
            vertexColors: { top: shade(robe, 1.1), bottom: shade(robe, 0.65) },
          },
          {
            template: 'TAPERED_BOX', name: 'BELT_WRAP', size: [1.5, 0.16, 0.86],
            offset: [0, 2.62, -0.02], material: trim, parent: 'TORSO', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.44, depthTop: 0.82 },
          },
          {
            template: 'CUBE', name: 'AMULET', size: [0.18, 0.24, 0.08],
            offset: [0, 3.42, -0.47], material: trim, parent: 'CHEST', pivot: HEROIC.chestPivot,
          },
          {
            template: 'SPHERE', name: 'AMULET_GEM', size: [0.12, 0.12, 0.06],
            offset: [0, 3.42, -0.52], material: orb, parent: 'AMULET', pivot: HEROIC.chestPivot,
            params: { widthSegments: 6, heightSegments: 4 },
          },
          {
            template: 'TAPERED_BOX', name: 'NECK', size: [0.34, 0.36, 0.3],
            offset: HEROIC.neck, material: skin, parent: 'CHEST', pivot: HEROIC.neckPivot,
            params: { widthTop: 0.28, depthTop: 0.26 },
          },
        ],
      },
      { slotId: 'ARM_L', pieces: makeArm('L', HEROIC, armSpec) },
      { slotId: 'ARM_R', pieces: makeArm('R', HEROIC, armSpec) },
      { slotId: 'LEG_L', pieces: makeLeg('L', HEROIC, legSpec) },
      { slotId: 'LEG_R', pieces: makeLeg('R', HEROIC, legSpec) },
      {
        slotId: 'WEAPON_MAIN',
        pieces: [
          {
            template: 'CYLINDER', name: 'STAFF_SHAFT', size: [0.1, 2.7, 0.1],
            offset: [-1.16, 2.1, -0.16], material: wood, parent: 'HAND_R',
            pivot: [-1.08, 1.92, 0], rotation: [0.08, 0, 0.06],
            params: { radialSegments: 6 },
            vertexColors: { top: shade(wood, 1.25), bottom: shade(wood, 0.6) },
          },
          {
            template: 'CONE', name: 'STAFF_CLAW', size: [0.2, 0.34, 0.2],
            offset: [-1.24, 3.5, -0.27], material: trim, parent: 'STAFF_SHAFT',
            pivot: [-1.16, 2.1, -0.16], rotation: [0.08, 0, 0.06],
            params: { radialSegments: 4 },
          },
          {
            template: 'SPHERE', name: 'STAFF_ORB', size: [0.3, 0.3, 0.3],
            offset: [-1.26, 3.78, -0.29], material: orb, parent: 'STAFF_SHAFT',
            pivot: [-1.16, 2.1, -0.16],
            params: { widthSegments: 6, heightSegments: 5 },
            vertexColors: { top: '#d8fbff', bottom: '#2f9fc8' },
          },
        ],
      },
    ],
  };
}

// ---------- 2. N64 skeleton knight ----------

function buildSkullKnight() {
  const bone = '#e6dfc8';
  const boneDim = '#c9c0a4';
  const steel = '#7a8288';
  const steelDark = '#4c545a';
  const rust = '#8a4b2d';
  const inner = '#2a2622';

  const headPieces = buildHeadPieces({
    moldId: 'gen_head_square',
    headParams: { crownRoundness: 0.1, cheekFullness: -0.08 },
    skin: bone,
    headCenter: HEROIC.headCenter,
    headPivot: HEROIC.headPivot,
    face: {
      eyes: { sprite: 'eye_blank_glow', iris: '#ff4a3a' },
      brows: { sprite: 'brow_angry_block', tint: '#57503f' },
      mouth: { sprite: 'mouth_grit_square', lip: '#4a3b2a' },
    },
    extraPieces: [
      {
        template: 'LATHE', name: 'HELM_BAND', size: [1.24, 0.42, 1.24],
        offset: [0, 5.44, 0.02], material: steelDark, parent: 'HEAD', pivot: HEROIC.headPivot,
        params: {
          segments: 8,
          points: [[0.62, -0.2], [0.64, -0.06], [0.56, 0.14], [0.3, 0.21], [0.0, 0.22]],
        },
        faceColors: faceShades(steelDark),
      },
      {
        template: 'CONE', name: 'HORN_L', size: [0.2, 0.66, 0.2],
        offset: [0.6, 5.62, 0.02], material: boneDim, parent: 'HEAD', pivot: HEROIC.headPivot,
        rotation: [0, 0, -0.55], params: { radialSegments: 4 },
      },
      {
        template: 'CONE', name: 'HORN_R', size: [0.2, 0.66, 0.2],
        offset: [-0.6, 5.62, 0.02], material: boneDim, parent: 'HEAD', pivot: HEROIC.headPivot,
        rotation: [0, 0, 0.55], params: { radialSegments: 4 },
      },
    ],
  });

  const armSpec = {
    clavicle: { size: [0.42, 0.16, 0.36], material: bone, params: { widthTop: 0.32, depthTop: 0.3 } },
    upper: { size: [0.34, 1.1, 0.32], material: bone, params: loft3([0.11, 0.11], [0.15, 0.13], [0.17, 0.14], 0.55) },
    lower: { size: [0.3, 0.95, 0.28], material: boneDim, params: loft3([0.1, 0.1], [0.13, 0.12], [0.15, 0.13], 0.47) },
    hand: { size: [0.3, 0.3, 0.26], material: bone, params: { widthTop: 0.26, depthTop: 0.22 } },
  };
  const legSpec = {
    upper: { size: [0.4, 1.15, 0.38], material: bone, params: loft3([0.13, 0.12], [0.17, 0.15], [0.19, 0.16], 0.57) },
    lower: { size: [0.36, 1.0, 0.34], material: boneDim, params: loft3([0.12, 0.13], [0.15, 0.14], [0.16, 0.15], 0.5) },
    foot: { size: [0.4, 0.28, 0.86], material: steelDark, params: { widthTop: 0.3, depthTop: 0.48, offsetTopZ: 0.1 }, faceColors: faceShades(steelDark) },
  };

  return {
    id: 'n64_skull_knight_cm',
    name: 'Caballero Osario N64',
    category: 'N64',
    assetRole: 'characterModel',
    archetype: 'HUMANOID',
    skeletonId: 'HUMANOID_STANDARD',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    slotBindings: humanoidBindings({ main: ['HAND_R'], secondary: ['HAND_L'] }),
    slots: [
      { slotId: 'HEAD', pieces: headPieces },
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'PELVIS', size: [1.08, 0.56, 0.68],
            offset: HEROIC.pelvis, material: bone, pivot: HEROIC.pelvisPivot,
            params: { widthTop: 0.94, depthTop: 0.6 }, faceColors: faceShades(bone),
          },
          {
            template: 'TAPERED_BOX', name: 'TORSO', size: [1.06, 1.14, 0.66],
            offset: HEROIC.torso, material: inner, parent: 'PELVIS', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.3, depthTop: 0.74, offsetTopZ: -0.03 }, faceColors: faceShades(inner),
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST', size: [1.3, 0.68, 0.72],
            offset: HEROIC.chest, material: inner, parent: 'TORSO', pivot: HEROIC.chestPivot,
            params: { widthTop: 1.52, depthTop: 0.78, offsetTopZ: -0.02 }, faceColors: faceShades(inner),
          },
          ...[3.32, 3.56, 3.8].map((y, i) => ({
            template: 'TAPERED_BOX', name: `RIB_${i + 1}`, size: [1.16 - i * 0.06, 0.11, 0.78],
            offset: [0, y, -0.02], material: bone, parent: 'CHEST', pivot: HEROIC.chestPivot,
            params: { widthTop: 1.1 - i * 0.06, depthTop: 0.72 },
            faceColors: faceShades(bone),
          })),
          {
            template: 'SPHERE', name: 'ARM_L_PAD', size: [0.52, 0.36, 0.52],
            offset: [0.86, 4.08, 0], material: steel, parent: 'CHEST', pivot: [0.62, 4.02, 0],
            params: { widthSegments: 5, heightSegments: 3 },
            vertexColors: { top: shade(steel, 1.3), bottom: shade(steel, 0.6) },
          },
          {
            template: 'SPHERE', name: 'ARM_R_PAD', size: [0.52, 0.36, 0.52],
            offset: [-0.86, 4.08, 0], material: steel, parent: 'CHEST', pivot: [-0.62, 4.02, 0],
            params: { widthSegments: 5, heightSegments: 3 },
            vertexColors: { top: shade(steel, 1.3), bottom: shade(steel, 0.6) },
          },
          {
            template: 'TAPERED_BOX', name: 'NECK', size: [0.3, 0.34, 0.26],
            offset: HEROIC.neck, material: boneDim, parent: 'CHEST', pivot: HEROIC.neckPivot,
            params: { widthTop: 0.26, depthTop: 0.22 },
          },
        ],
      },
      { slotId: 'ARM_L', pieces: makeArm('L', HEROIC, armSpec) },
      { slotId: 'ARM_R', pieces: makeArm('R', HEROIC, armSpec) },
      { slotId: 'LEG_L', pieces: makeLeg('L', HEROIC, legSpec) },
      { slotId: 'LEG_R', pieces: makeLeg('R', HEROIC, legSpec) },
      {
        slotId: 'WEAPON_MAIN',
        pieces: [
          {
            template: 'CUBE', name: 'SWORD_GRIP', size: [0.12, 0.46, 0.12],
            offset: [-1.1, 1.66, -0.2], material: rust, parent: 'HAND_R',
            pivot: [-1.08, 1.9, 0], rotation: [0.42, 0, 0.22],
          },
          {
            template: 'TAPERED_BOX', name: 'SWORD_BLADE', size: [0.18, 1.16, 0.07],
            offset: [-1.12, 1.04, -0.48], material: steel, parent: 'SWORD_GRIP',
            pivot: [-1.1, 1.66, -0.2], rotation: [0.42, 0, 0.22],
            params: { widthTop: 0.05, depthTop: 0.04, offsetTopX: -0.03 },
            faceColors: [shade(rust, 0.8), shade(steel, 1.25), shade(steel, 0.9), shade(rust, 0.9), shade(steel, 1.1), shade(steel, 0.6)],
          },
          {
            template: 'CUBE', name: 'SWORD_GUARD', size: [0.5, 0.09, 0.12],
            offset: [-1.1, 1.86, -0.24], material: steelDark, parent: 'SWORD_GRIP',
            pivot: [-1.1, 1.66, -0.2], rotation: [0.42, 0, 0.22],
          },
        ],
      },
      {
        slotId: 'WEAPON_SECONDARY',
        pieces: [
          {
            template: 'LATHE', name: 'SHIELD_DISK', size: [1.02, 0.24, 1.02],
            offset: [1.26, 2.3, -0.16], material: steel, parent: 'HAND_L',
            pivot: [1.08, 1.92, 0], rotation: [0, 0, -1.5708],
            params: {
              segments: 8,
              points: [[0.0, -0.1], [0.44, -0.08], [0.51, 0.0], [0.44, 0.06], [0.0, 0.1]],
            },
            faceColors: faceShades(steel),
          },
          {
            template: 'SPHERE', name: 'SHIELD_BOSS', size: [0.26, 0.26, 0.14],
            offset: [1.38, 2.3, -0.16], material: rust, parent: 'SHIELD_DISK',
            pivot: [1.26, 2.3, -0.16], rotation: [0, 0, -1.5708],
            params: { widthSegments: 6, heightSegments: 4 },
          },
        ],
      },
    ],
  };
}

// ---------- 3. N64 chibi ninja ----------

const CHIBI = {
  pelvis: [0, 1.62, 0], pelvisPivot: [0, 1.85, 0],
  torso: [0, 2.14, 0],
  chest: [0, 2.58, 0], chestPivot: [0, 2.3, 0],
  neck: [0, 2.92, 0], neckPivot: [0, 2.82, 0],
  headCenter: [0, 3.72, 0], headPivot: [0, 3.02, 0],
  clavicle: [0.5, 2.68, 0], armUpper: [0.66, 2.28, 0], armUpperPivot: [0.65, 2.62, 0],
  armLower: [0.68, 1.84, 0], armLowerPivot: [0.67, 2.06, 0],
  hand: [0.68, 1.5, 0], handPivot: [0.68, 1.58, 0],
  legUpper: [0.26, 1.14, 0], legUpperPivot: [0.26, 1.55, 0],
  legLower: [0.26, 0.56, 0], legLowerPivot: [0.26, 0.8, 0],
  foot: [0.26, 0.09, -0.15], footPivot: [0.26, 0.14, 0],
};

function buildChibiNinja() {
  const gi = '#2e3d66';
  const giDark = '#222e4e';
  const scarf = '#c23a3a';
  const skin = '#e8bd96';
  const steel = '#aab6c0';

  const headPieces = buildHeadPieces({
    moldId: 'gen_head_chibi',
    headParams: { cheekFullness: 0.08 },
    headScale: 1.25,
    skin,
    headCenter: CHIBI.headCenter,
    headPivot: CHIBI.headPivot,
    face: {
      eyes: { sprite: 'eye_image2_child_round', iris: '#2b4f7e' },
      brows: { sprite: 'brow_soft_curve', tint: '#3a2a1a' },
    },
    extraPieces: [
      {
        template: 'LATHE', name: 'HOOD_DOME', size: [1.56, 1.15, 1.56],
        offset: [0, 3.9, 0.14], material: gi, parent: 'HEAD', pivot: CHIBI.headPivot,
        params: {
          segments: 8,
          points: [[0.78, -0.52], [0.8, -0.1], [0.62, 0.34], [0.3, 0.55], [0.0, 0.6]],
        },
        vertexColors: { top: shade(gi, 1.25), bottom: shade(gi, 0.7) },
      },
      {
        template: 'TAPERED_BOX', name: 'MASK_BAND', size: [1.0, 0.42, 0.16],
        offset: [0, 3.32, -0.6], material: giDark, parent: 'HEAD', pivot: CHIBI.headPivot,
        params: { widthTop: 0.92, depthTop: 0.14, offsetTopZ: 0.03 },
        faceColors: faceShades(giDark),
      },
      {
        template: 'TAPERED_BOX', name: 'HEADBAND', size: [1.34, 0.2, 1.3],
        offset: [0, 4.02, 0.02], material: giDark, parent: 'HEAD', pivot: CHIBI.headPivot,
        params: { widthTop: 1.26, depthTop: 1.22 },
      },
      {
        template: 'CUBE', name: 'HEADBAND_PLATE', size: [0.4, 0.16, 0.06],
        offset: [0, 4.04, -0.66], material: steel, parent: 'HEAD', pivot: CHIBI.headPivot,
      },
      {
        template: 'LIMB_LOFT', name: 'RIBBON_TAIL', size: [0.4, 1.0, 1.1],
        offset: [0.18, 3.6, 0.72], material: giDark, parent: 'HEAD', pivot: CHIBI.headPivot,
        params: {
          sides: 5,
          sections: [
            { y: -0.42, radiusX: 0.05, radiusZ: 0.1, offsetZ: 0.5 },
            { y: 0.0, radiusX: 0.07, radiusZ: 0.13, offsetZ: 0.28 },
            { y: 0.4, radiusX: 0.09, radiusZ: 0.15, offsetZ: 0.0 },
          ],
          capTop: true, capBottom: true,
        },
      },
    ],
  });

  const armSpec = {
    clavicle: { size: [0.32, 0.14, 0.3], material: gi, params: { widthTop: 0.26, depthTop: 0.26 } },
    upper: { size: [0.32, 0.8, 0.3], material: gi, params: loft3([0.12, 0.11], [0.15, 0.13], [0.16, 0.14], 0.4) },
    lower: { size: [0.28, 0.72, 0.26], material: giDark, params: loft3([0.11, 0.11], [0.13, 0.12], [0.14, 0.13], 0.36) },
    hand: { size: [0.26, 0.24, 0.22], material: skin, params: { widthTop: 0.22, depthTop: 0.18 } },
  };
  const legSpec = {
    upper: { size: [0.36, 0.9, 0.34], material: gi, params: loft3([0.13, 0.12], [0.16, 0.15], [0.18, 0.16], 0.45) },
    lower: { size: [0.3, 0.78, 0.28], material: giDark, params: loft3([0.11, 0.12], [0.14, 0.13], [0.14, 0.14], 0.39) },
    foot: { size: [0.32, 0.2, 0.6], material: '#1a1a22', params: { widthTop: 0.24, depthTop: 0.34, offsetTopZ: 0.08 }, faceColors: faceShades('#1a1a22') },
  };

  return {
    id: 'n64_chibi_ninja_cm',
    name: 'Ninja Chibi N64',
    category: 'N64',
    assetRole: 'characterModel',
    archetype: 'HUMANOID',
    skeletonId: 'HUMANOID_STANDARD',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    slotBindings: humanoidBindings({ main: ['HAND_R'] }),
    slots: [
      { slotId: 'HEAD', pieces: headPieces },
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'PELVIS', size: [0.92, 0.48, 0.6],
            offset: CHIBI.pelvis, material: giDark, pivot: CHIBI.pelvisPivot,
            params: { widthTop: 0.82, depthTop: 0.54 }, faceColors: faceShades(giDark),
          },
          {
            template: 'TAPERED_BOX', name: 'TORSO', size: [0.98, 0.94, 0.64],
            offset: CHIBI.torso, material: gi, parent: 'PELVIS', pivot: CHIBI.pelvisPivot,
            params: { widthTop: 1.12, depthTop: 0.7, offsetTopZ: -0.02 }, faceColors: faceShades(gi),
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST', size: [1.08, 0.52, 0.68],
            offset: CHIBI.chest, material: gi, parent: 'TORSO', pivot: CHIBI.chestPivot,
            params: { widthTop: 1.2, depthTop: 0.72 }, faceColors: faceShades(gi),
          },
          {
            template: 'TORUS', name: 'SCARF_WRAP', size: [0.92, 0.3, 0.92],
            offset: [0, 2.92, 0], material: scarf, parent: 'CHEST', pivot: CHIBI.chestPivot,
            rotation: [1.5708, 0, 0],
            params: { radialSegments: 6, tubularSegments: 8 },
            vertexColors: { top: shade(scarf, 1.2), bottom: shade(scarf, 0.7) },
          },
          {
            template: 'LIMB_LOFT', name: 'SCARF_TAIL', size: [0.4, 1.0, 1.2],
            offset: [0.3, 2.5, 0.5], material: scarf, parent: 'CHEST', pivot: CHIBI.chestPivot,
            params: {
              sides: 5,
              sections: [
                { y: -0.5, radiusX: 0.07, radiusZ: 0.12, offsetZ: 0.55 },
                { y: -0.05, radiusX: 0.1, radiusZ: 0.15, offsetZ: 0.32 },
                { y: 0.42, radiusX: 0.12, radiusZ: 0.17, offsetZ: 0.05 },
              ],
              capTop: true, capBottom: true,
            },
            vertexColors: { top: shade(scarf, 1.15), bottom: shade(scarf, 0.75) },
          },
          {
            template: 'TAPERED_BOX', name: 'BELT_WRAP', size: [1.04, 0.14, 0.68],
            offset: [0, 1.86, -0.01], material: '#1a1a22', parent: 'TORSO', pivot: CHIBI.pelvisPivot,
            params: { widthTop: 1.0, depthTop: 0.64 },
          },
          {
            template: 'TAPERED_BOX', name: 'NECK', size: [0.28, 0.26, 0.24],
            offset: CHIBI.neck, material: skin, parent: 'CHEST', pivot: CHIBI.neckPivot,
            params: { widthTop: 0.24, depthTop: 0.2 },
          },
        ],
      },
      { slotId: 'ARM_L', pieces: makeArm('L', CHIBI, armSpec) },
      { slotId: 'ARM_R', pieces: makeArm('R', CHIBI, armSpec) },
      { slotId: 'LEG_L', pieces: makeLeg('L', CHIBI, legSpec) },
      { slotId: 'LEG_R', pieces: makeLeg('R', CHIBI, legSpec) },
      {
        slotId: 'WEAPON_MAIN',
        pieces: [
          {
            template: 'CUBE', name: 'NINJATO_GRIP', size: [0.1, 0.34, 0.1],
            offset: [-0.7, 1.32, -0.14], material: '#1a1a22', parent: 'HAND_R',
            pivot: [-0.68, 1.5, 0], rotation: [0.5, 0, 0.15],
          },
          {
            template: 'TAPERED_BOX', name: 'NINJATO_BLADE', size: [0.12, 0.78, 0.05],
            offset: [-0.72, 0.82, -0.38], material: steel, parent: 'NINJATO_GRIP',
            pivot: [-0.7, 1.32, -0.14], rotation: [0.5, 0, 0.15],
            params: { widthTop: 0.03, depthTop: 0.03 },
            faceColors: faceShades(steel),
          },
          {
            template: 'CUBE', name: 'NINJATO_GUARD', size: [0.3, 0.06, 0.1],
            offset: [-0.7, 1.46, -0.17], material: '#3a332c', parent: 'NINJATO_GRIP',
            pivot: [-0.7, 1.32, -0.14], rotation: [0.5, 0, 0.15],
          },
        ],
      },
    ],
  };
}

// ---------- 4. PSX mecha unit ----------

function buildMecha() {
  const hull = '#4a545e';
  const hullDark = '#2e343a';
  const accent = '#e8b93a';
  const glow = '#6fe3ff';
  const visor = '#18222c';

  const helmetCenter = [0, 4.98, 0];
  const helmetPivot = [0, 4.45, 0];

  const visorGeom = slabGeometry({
    cx: 0, cy: 0.02, zOuter: -0.474, w: 0.68, h: 0.3, depth: 0.06,
  });

  const headPieces = [
    {
      template: 'TAPERED_BOX', name: 'HEAD', size: [0.98, 0.88, 0.92],
      offset: helmetCenter, material: hull, parent: 'NECK', pivot: helmetPivot,
      params: { widthTop: 0.82, depthTop: 0.78, offsetTopZ: 0.04 },
      faceColors: faceShades(hull),
    },
    {
      template: 'CUSTOM', name: 'VISOR_SLAB', offset: vec(helmetCenter),
      material: visor, parent: 'HEAD', pivot: vec(helmetPivot),
      params: visorGeom,
      decal: {
        resolution: [64, 32],
        background: 'transparent',
        flipY: false,
        layers: [
          { kind: 'eye', sprite: 'eye_image2_robot_led', tint: { iris: glow }, x: 0.27, y: 0.5, w: 0.34, h: 0.7, side: 'L' },
          { kind: 'eye', sprite: 'eye_image2_robot_led', tint: { iris: glow }, x: 0.73, y: 0.5, w: 0.34, h: 0.7, side: 'R' },
        ],
      },
    },
    {
      template: 'TAPERED_BOX', name: 'CHIN_GUARD', size: [0.6, 0.3, 0.3],
      offset: [0, 4.56, -0.36], material: hullDark, parent: 'HEAD', pivot: helmetPivot,
      params: { widthTop: 0.66, depthTop: 0.36, offsetTopZ: -0.02 },
      faceColors: faceShades(hullDark),
    },
    {
      template: 'CYLINDER', name: 'EAR_POD_L', size: [0.22, 0.16, 0.22],
      offset: [0.54, 4.98, 0], material: accent, parent: 'HEAD', pivot: helmetPivot,
      rotation: [0, 0, 1.5708], params: { radialSegments: 6 },
    },
    {
      template: 'CYLINDER', name: 'EAR_POD_R', size: [0.22, 0.16, 0.22],
      offset: [-0.54, 4.98, 0], material: accent, parent: 'HEAD', pivot: helmetPivot,
      rotation: [0, 0, 1.5708], params: { radialSegments: 6 },
    },
    {
      template: 'CYLINDER', name: 'ANTENNA', size: [0.05, 0.62, 0.05],
      offset: [0.3, 5.72, 0.08], material: hullDark, parent: 'HEAD', pivot: helmetPivot,
      params: { radialSegments: 5 },
    },
    {
      template: 'SPHERE', name: 'ANTENNA_TIP', size: [0.1, 0.1, 0.1],
      offset: [0.3, 6.06, 0.08], material: glow, parent: 'HEAD', pivot: helmetPivot,
      params: { widthSegments: 6, heightSegments: 4 },
    },
    {
      template: 'TAPERED_BOX', name: 'CREST_FIN', size: [0.12, 0.34, 0.7],
      offset: [0, 5.52, 0.06], material: accent, parent: 'HEAD', pivot: helmetPivot,
      params: { widthTop: 0.06, depthTop: 0.56, offsetTopZ: 0.06 },
      faceColors: faceShades(accent),
    },
  ];

  const armSpec = {
    clavicle: { size: [0.5, 0.22, 0.46], material: hullDark, params: { widthTop: 0.4, depthTop: 0.4 } },
    upper: { size: [0.46, 1.1, 0.44], material: hull, params: loft3([0.17, 0.16], [0.21, 0.19], [0.23, 0.2], 0.55) },
    lower: { size: [0.52, 0.95, 0.5], material: hullDark, params: loft3([0.22, 0.2], [0.25, 0.22], [0.2, 0.18], 0.47) },
    hand: { size: [0.36, 0.32, 0.3], material: hull, params: { widthTop: 0.3, depthTop: 0.26 } },
  };
  const legSpec = {
    upper: { size: [0.52, 1.15, 0.5], material: hull, params: loft3([0.19, 0.17], [0.23, 0.2], [0.25, 0.22], 0.57) },
    lower: { size: [0.48, 1.0, 0.46], material: hullDark, params: loft3([0.18, 0.19], [0.22, 0.2], [0.22, 0.21], 0.5) },
    foot: { size: [0.52, 0.3, 0.98], material: hullDark, params: { widthTop: 0.4, depthTop: 0.56, offsetTopZ: 0.12 }, faceColors: faceShades(hullDark) },
  };

  return {
    id: 'psx_mecha_unit_cm',
    name: 'Mecha Centinela PSX',
    category: 'PSX',
    assetRole: 'characterModel',
    archetype: 'HUMANOID',
    skeletonId: 'HUMANOID_STANDARD',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    slotBindings: humanoidBindings({ main: ['HAND_R'] }),
    slots: [
      { slotId: 'HEAD', pieces: headPieces },
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'PELVIS', size: [1.16, 0.62, 0.76],
            offset: HEROIC.pelvis, material: hullDark, pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.04, depthTop: 0.68 }, faceColors: faceShades(hullDark),
          },
          {
            template: 'TAPERED_BOX', name: 'TORSO', size: [1.22, 1.16, 0.8],
            offset: HEROIC.torso, material: hull, parent: 'PELVIS', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.5, depthTop: 0.9, offsetTopZ: -0.03 }, faceColors: faceShades(hull),
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST', size: [1.46, 0.74, 0.86],
            offset: HEROIC.chest, material: hull, parent: 'TORSO', pivot: HEROIC.chestPivot,
            params: { widthTop: 1.74, depthTop: 0.94, offsetTopZ: -0.02 }, faceColors: faceShades(hull),
          },
          {
            template: 'CYLINDER', name: 'CORE_REACTOR', size: [0.4, 0.16, 0.4],
            offset: [0, 3.62, -0.54], material: glow, parent: 'CHEST', pivot: HEROIC.chestPivot,
            rotation: [-1.5708, 0, 0], params: { radialSegments: 8 },
          },
          {
            template: 'TAPERED_BOX', name: 'ARM_L_PAD', size: [0.66, 0.42, 0.74],
            offset: [1.06, 4.14, 0], material: hull, parent: 'CHEST', pivot: [0.66, 4.02, 0],
            params: { widthTop: 0.5, depthTop: 0.62, offsetTopX: 0.1 },
            faceColors: faceShades(hull),
          },
          {
            template: 'TAPERED_BOX', name: 'ARM_R_PAD', size: [0.66, 0.42, 0.74],
            offset: [-1.06, 4.14, 0], material: hull, parent: 'CHEST', pivot: [-0.66, 4.02, 0],
            params: { widthTop: 0.5, depthTop: 0.62, offsetTopX: -0.1 },
            faceColors: faceShades(hull),
          },
          {
            template: 'CUBE', name: 'PAD_STRIPE_L', size: [0.5, 0.08, 0.6],
            offset: [1.14, 4.38, 0], material: accent, parent: 'ARM_L_PAD', pivot: [1.06, 4.14, 0],
          },
          {
            template: 'CUBE', name: 'PAD_STRIPE_R', size: [0.5, 0.08, 0.6],
            offset: [-1.14, 4.38, 0], material: accent, parent: 'ARM_R_PAD', pivot: [-1.06, 4.14, 0],
          },
          {
            template: 'TAPERED_BOX', name: 'NECK', size: [0.4, 0.34, 0.36],
            offset: HEROIC.neck, material: hullDark, parent: 'CHEST', pivot: HEROIC.neckPivot,
            params: { widthTop: 0.34, depthTop: 0.3 },
          },
        ],
      },
      { slotId: 'ARM_L', pieces: makeArm('L', HEROIC, armSpec) },
      { slotId: 'ARM_R', pieces: makeArm('R', HEROIC, armSpec) },
      { slotId: 'LEG_L', pieces: makeLeg('L', HEROIC, legSpec) },
      { slotId: 'LEG_R', pieces: makeLeg('R', HEROIC, legSpec) },
      {
        slotId: 'WEAPON_MAIN',
        pieces: [
          {
            template: 'CYLINDER', name: 'ARM_CANNON', size: [0.26, 0.78, 0.26],
            offset: [-1.14, 2.3, -0.28], material: hullDark, parent: 'ARM_R_LOWER',
            pivot: [-1.06, 2.86, 0], rotation: [1.5708, 0, 0],
            params: { radialSegments: 6 },
            faceColors: faceShades(hullDark),
          },
          {
            template: 'CYLINDER', name: 'CANNON_MUZZLE', size: [0.32, 0.16, 0.32],
            offset: [-1.14, 2.3, -0.72], material: hull, parent: 'ARM_CANNON',
            pivot: [-1.14, 2.3, -0.28], rotation: [1.5708, 0, 0],
            params: { radialSegments: 6 },
          },
          {
            template: 'CYLINDER', name: 'CANNON_GLOW', size: [0.18, 0.06, 0.18],
            offset: [-1.14, 2.3, -0.86], material: glow, parent: 'ARM_CANNON',
            pivot: [-1.14, 2.3, -0.28], rotation: [1.5708, 0, 0],
            params: { radialSegments: 6 },
          },
        ],
      },
    ],
  };
}

// ---------- 5. N64 fenix chick (BIRD) ----------

function buildFenixChick() {
  const ember = '#d84a30';
  const emberDark = '#a83222';
  const cream = '#f2d8a0';
  const beak = '#f2b53a';

  const eyeSlab = (side) => {
    const sign = side === 'L' ? 1 : -1;
    return {
      template: 'CUSTOM', name: `EYE_SLAB_${side}`,
      offset: [sign * 0.24, 2.1, -0.56],
      material: ember,
      parent: 'HEAD',
      pivot: [sign * 0.24, 2.1, -0.56],
      rotation: [0, -sign * 0.5, 0],
      params: slabGeometry({ cx: 0, cy: 0, zOuter: -0.02, w: 0.2, h: 0.22, depth: 0.05 }),
      decal: {
        resolution: [32, 32],
        background: 'transparent',
        flipY: false,
        layers: [{ kind: 'eye', sprite: 'eye_round_big', tint: { iris: '#3a2410' }, x: 0.5, y: 0.5, w: 0.92, h: 0.92, side }],
      },
    };
  };

  return {
    id: 'n64_fenix_chick_cm',
    name: 'Polluelo Fenix N64',
    category: 'N64',
    assetRole: 'characterModel',
    archetype: 'BIRD',
    skeletonId: 'BIRD_SIMPLE',
    animationProfile: 'BIRD_IDLE_WALK',
    slotBindings: {
      BODY: ['BODY'],
      HEAD: ['HEAD'],
      WING_L: ['WING_L'],
      WING_R: ['WING_R'],
      LEG_L: ['LEG_L'],
      LEG_R: ['LEG_R'],
      TAIL: ['TAIL'],
    },
    slots: [
      {
        slotId: 'BODY',
        pieces: [
          {
            template: 'SPHERE', name: 'BODY', size: [1.1, 1.0, 1.24],
            offset: [0, 1.18, 0.06], material: ember,
            params: { widthSegments: 8, heightSegments: 6 },
            vertexColors: { top: '#f07038', bottom: cream },
          },
          {
            template: 'SPHERE', name: 'BELLY_POOF', size: [0.8, 0.7, 0.7],
            offset: [0, 1.0, -0.3], material: cream, parent: 'BODY', pivot: [0, 1.18, 0.06],
            params: { widthSegments: 7, heightSegments: 5 },
            vertexColors: { top: '#f7e4bc', bottom: '#d9b684' },
          },
        ],
      },
      {
        slotId: 'HEAD',
        pieces: [
          {
            template: 'SPHERE', name: 'HEAD', size: [0.66, 0.62, 0.62],
            offset: [0, 2.0, -0.4], material: '#f07038', parent: 'BODY', pivot: [0, 1.72, -0.3],
            params: { widthSegments: 8, heightSegments: 6 },
            vertexColors: { top: '#f78a48', bottom: '#d84a30' },
          },
          {
            template: 'CONE', name: 'BEAK', size: [0.2, 0.34, 0.2],
            offset: [0, 1.94, -0.76], material: beak, parent: 'HEAD', pivot: [0, 2.0, -0.4],
            rotation: [-1.5708, 0, 0], params: { radialSegments: 4 },
          },
          eyeSlab('L'),
          eyeSlab('R'),
          ...[
            { name: 'CREST_1', x: 0, z: -0.34, rx: -0.35, h: 0.42, c: '#f2b53a' },
            { name: 'CREST_2', x: 0.1, z: -0.26, rx: -0.6, h: 0.36, c: '#f07038' },
            { name: 'CREST_3', x: -0.1, z: -0.26, rx: -0.6, h: 0.36, c: '#d84a30' },
          ].map(({ name, x, z, rx, h, c }) => ({
            template: 'CONE', name, size: [0.12, h, 0.12],
            offset: [x, 2.32, z], material: c, parent: 'HEAD', pivot: [0, 2.0, -0.4],
            rotation: [rx, 0, 0], params: { radialSegments: 4 },
          })),
        ],
      },
      ...['L', 'R'].map((side) => {
        const sign = side === 'L' ? 1 : -1;
        return {
          slotId: `WING_${side}`,
          pieces: [
            {
              template: 'TAPERED_BOX', name: `WING_${side}`, size: [0.78, 0.1, 0.52],
              offset: [sign * 0.66, 1.32, 0.08], material: emberDark, parent: 'BODY',
              pivot: [sign * 0.5, 1.4, 0], rotation: [0.08, 0, sign * 0.22],
              params: { widthTop: 0.6, depthTop: 0.4, offsetTopZ: 0.05 },
              faceColors: faceShades(emberDark),
            },
            {
              template: 'TAPERED_BOX', name: `WING_${side}_TIP`, size: [0.44, 0.08, 0.32],
              offset: [sign * 1.1, 1.5, 0.12], material: '#f2b53a', parent: `WING_${side}`,
              pivot: [sign * 0.66, 1.32, 0.08], rotation: [0.08, 0, sign * 0.5],
              params: { widthTop: 0.3, depthTop: 0.24 },
              faceColors: faceShades('#f2b53a'),
            },
          ],
        };
      }),
      ...['L', 'R'].map((side) => {
        const sign = side === 'L' ? 1 : -1;
        return {
          slotId: `LEG_${side}`,
          pieces: [
            {
              template: 'CYLINDER', name: `LEG_${side}`, size: [0.09, 0.55, 0.09],
              offset: [sign * 0.28, 0.55, 0], material: beak,
              pivot: [sign * 0.3, 0.82, 0], params: { radialSegments: 5 },
            },
            {
              template: 'TAPERED_BOX', name: `FOOT_${side}`, size: [0.18, 0.09, 0.36],
              offset: [sign * 0.28, 0.05, -0.06], material: beak, parent: `LEG_${side}`,
              pivot: [sign * 0.28, 0.1, 0],
              params: { widthTop: 0.13, depthTop: 0.2, offsetTopZ: 0.04 },
            },
          ],
        };
      }),
      {
        slotId: 'TAIL',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'TAIL', size: [0.3, 0.08, 0.9],
            offset: [0, 1.2, 0.85], material: '#f07038', parent: 'BODY',
            pivot: [0, 1.1, 0.45], rotation: [-0.35, 0, 0],
            params: { widthTop: 0.2, depthTop: 0.5 },
            faceColors: faceShades('#f07038'),
          },
          ...[
            { name: 'TAIL_L', ry: 0.3, c: '#f2b53a' },
            { name: 'TAIL_R', ry: -0.3, c: '#d84a30' },
          ].map(({ name, ry, c }) => ({
            template: 'TAPERED_BOX', name, size: [0.2, 0.07, 0.78],
            offset: [0, 1.16, 0.8], material: c, parent: 'TAIL',
            pivot: [0, 1.1, 0.45], rotation: [-0.42, ry, 0],
            params: { widthTop: 0.13, depthTop: 0.42 },
          })),
        ],
      },
    ],
  };
}

// ---------- 6. PSX drake pup (QUADRUPED) ----------

function buildDrakePup() {
  const teal = '#2f8f83';
  const tealDark = '#20615a';
  const cream = '#e8dcc0';
  const amber = '#d8923a';
  const horn = '#7a5a3a';

  const limb = (side, front) => {
    const sign = side === 'L' ? 1 : -1;
    const joint = front ? [sign * 0.78, 1.57, -0.26] : [sign * 0.82, 1.28, 0.86];
    const upper = front
      ? { size: [0.34, 0.85, 0.32], offset: [sign * 0.8, 1.15, -0.26] }
      : { size: [0.42, 0.9, 0.4], offset: [sign * 0.84, 0.95, 0.86] };
    const lowerY = front ? 0.55 : 0.42;
    const slot = front ? `ARM_${side}` : `LEG_${side}`;
    return {
      slotId: slot,
      pieces: [
        {
          template: 'LIMB_LOFT', name: `${slot}_UPPER`, size: upper.size,
          offset: upper.offset, material: teal, pivot: joint,
          params: loft3([0.13, 0.12], [0.17, 0.15], [0.19, 0.16], upper.size[1] / 2),
          vertexColors: { top: '#3aa895', bottom: '#20615a' },
        },
        {
          template: 'LIMB_LOFT', name: `${slot}_LOWER`, size: [0.26, 0.55, 0.24],
          offset: [sign * (front ? 0.8 : 0.84), lowerY, front ? -0.28 : 0.88], material: tealDark,
          parent: `${slot}_UPPER`, pivot: [sign * (front ? 0.8 : 0.84), front ? 0.75 : 0.62, front ? -0.27 : 0.87],
          params: loft3([0.1, 0.1], [0.12, 0.11], [0.13, 0.12], 0.27),
        },
        {
          template: 'TAPERED_BOX', name: `FOOT_${side}${front ? '_F' : ''}`, size: [0.34, 0.18, 0.5],
          offset: [sign * (front ? 0.8 : 0.84), 0.09, (front ? -0.34 : 0.8)], material: cream,
          parent: `${slot}_LOWER`, pivot: [sign * (front ? 0.8 : 0.84), 0.16, front ? -0.28 : 0.88],
          params: { widthTop: 0.26, depthTop: 0.3, offsetTopZ: front ? 0.06 : -0.06 },
          faceColors: faceShades(cream),
        },
      ],
    };
  };

  const wing = (side) => {
    const sign = side === 'L' ? 1 : -1;
    return {
      slotId: `WING_${side}`,
      pieces: [
        {
          template: 'CYLINDER', name: `WING_${side}_ARM`, size: [0.09, 0.85, 0.09],
          offset: [sign * 0.9, 2.75, 0.3], material: tealDark, parent: 'BODY_FRONT',
          pivot: [sign * 0.62, 2.56, 0.26], rotation: [0, 0, sign * 0.9],
          params: { radialSegments: 5 },
        },
        {
          template: 'CUSTOM', name: `WING_${side}`, size: [1.2, 1.05, 1.05],
          offset: [sign * 0.62, 2.56, 0.26], material: amber, parent: 'BODY_FRONT',
          pivot: [sign * 0.62, 2.56, 0.26], rotation: [0.15, 0, sign * 0.35],
          params: {
            vertices: [
              [0, 0, 0],
              [sign * 1.2, 0.65, 0.4],
              [sign * 0.98, 0.18, 0.98],
              [sign * 0.5, -0.24, 0.68],
            ].map(vec),
            faces: [[0, 1, 2], [0, 2, 3]],
          },
          vertexColors: { top: '#eda94e', bottom: '#a86a24' },
        },
      ],
    };
  };

  return {
    id: 'psx_drake_pup_cm',
    name: 'Cria de Draco PSX',
    category: 'PSX',
    assetRole: 'characterModel',
    archetype: 'QUADRUPED',
    skeletonId: 'QUADRUPED_MONSTER',
    animationProfile: 'QUADRUPED_MONSTER_CORE',
    slotBindings: {
      HEAD: ['HEAD'],
      TORSO: ['BODY_FRONT', 'BODY_REAR'],
      ARM_L: ['ARM_L_UPPER', 'ARM_L_LOWER', 'FOOT_L_F'],
      ARM_R: ['ARM_R_UPPER', 'ARM_R_LOWER', 'FOOT_R_F'],
      LEG_L: ['LEG_L_UPPER', 'LEG_L_LOWER', 'FOOT_L'],
      LEG_R: ['LEG_R_UPPER', 'LEG_R_LOWER', 'FOOT_R'],
      TAIL: ['TAIL_BASE', 'TAIL_TIP'],
      WING_L: ['WING_L'],
      WING_R: ['WING_R'],
    },
    slots: [
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'SPHERE', name: 'BODY_FRONT', size: [1.2, 1.05, 1.3],
            offset: [0, 2.25, -0.08], material: teal,
            params: { widthSegments: 8, heightSegments: 6 },
            vertexColors: { top: '#3aa895', bottom: cream },
          },
          {
            template: 'SPHERE', name: 'BODY_REAR', size: [1.1, 0.95, 1.2],
            offset: [0, 2.0, 0.84], material: teal,
            params: { widthSegments: 8, heightSegments: 6 },
            vertexColors: { top: '#379e92', bottom: '#20615a' },
          },
          {
            template: 'TAPERED_BOX', name: 'BELLY_PLATE', size: [0.72, 0.8, 0.9],
            offset: [0, 1.9, -0.35], material: cream, parent: 'BODY_FRONT', pivot: [0, 2.25, -0.08],
            params: { widthTop: 0.62, depthTop: 0.8, offsetTopZ: -0.06 },
            faceColors: faceShades(cream),
          },
          ...[0, 1, 2].map((i) => ({
            template: 'CONE', name: `SPINE_SPIKE_${i + 1}`, size: [0.16, 0.3 - i * 0.04, 0.16],
            offset: [0, 2.85 - i * 0.12, 0.35 + i * 0.5], material: amber,
            parent: i === 0 ? 'BODY_FRONT' : 'BODY_REAR', pivot: [0, 2.25, -0.08],
            rotation: [0.3 + i * 0.25, 0, 0], params: { radialSegments: 4 },
          })),
        ],
      },
      {
        slotId: 'HEAD',
        pieces: [
          {
            template: 'LIMB_LOFT', name: 'NECK_PIECE', size: [0.55, 0.9, 0.9],
            offset: [0, 2.42, -0.7], material: teal, parent: 'BODY_FRONT', pivot: [0, 2.3, -0.5],
            params: {
              sides: 6,
              sections: [
                { y: -0.4, radiusX: 0.3, radiusZ: 0.28, offsetZ: 0.25 },
                { y: 0.05, radiusX: 0.26, radiusZ: 0.24, offsetZ: -0.05 },
                { y: 0.45, radiusX: 0.23, radiusZ: 0.21, offsetZ: -0.3 },
              ],
              capTop: true, capBottom: true,
            },
            vertexColors: { top: '#3aa895', bottom: '#20615a' },
          },
          {
            template: 'TAPERED_BOX', name: 'HEAD', size: [0.74, 0.62, 0.9],
            offset: [0, 2.78, -1.32], material: teal, parent: 'NECK_PIECE', pivot: [0, 2.6, -1.12],
            params: { widthTop: 0.64, depthTop: 0.78, offsetTopZ: 0.06 },
            faceColors: faceShades(teal),
          },
          {
            template: 'TAPERED_BOX', name: 'SNOUT', size: [0.46, 0.36, 0.55],
            offset: [0, 2.64, -1.86], material: teal, parent: 'HEAD', pivot: [0, 2.78, -1.32],
            params: { widthTop: 0.38, depthTop: 0.42, offsetTopZ: 0.05 },
            faceColors: faceShades(teal),
          },
          {
            template: 'TAPERED_BOX', name: 'JAW', size: [0.4, 0.14, 0.5],
            offset: [0, 2.44, -1.81], material: cream, parent: 'HEAD', pivot: [0, 2.52, -1.5],
            params: { widthTop: 0.34, depthTop: 0.4 },
          },
          {
            template: 'CONE', name: 'NOSE_HORN', size: [0.14, 0.32, 0.14],
            offset: [0, 2.92, -1.9], material: horn, parent: 'HEAD', pivot: [0, 2.78, -1.32],
            rotation: [-0.5, 0, 0], params: { radialSegments: 4 },
          },
          ...['L', 'R'].map((side) => {
            const sign = side === 'L' ? 1 : -1;
            return {
              template: 'CONE', name: `HORN_${side}`, size: [0.15, 0.5, 0.15],
              offset: [sign * 0.24, 3.14, -1.14], material: horn, parent: 'HEAD',
              pivot: [0, 2.78, -1.32], rotation: [0.55, 0, sign * 0.25],
              params: { radialSegments: 4 },
            };
          }),
          ...['L', 'R'].map((side) => {
            const sign = side === 'L' ? 1 : -1;
            return {
              template: 'CUSTOM', name: `EYE_SLAB_${side}`,
              offset: [sign * 0.2, 2.92, -1.79], material: teal, parent: 'HEAD',
              pivot: [sign * 0.2, 2.92, -1.79], rotation: [0, -sign * 0.18, 0],
              params: slabGeometry({ cx: 0, cy: 0, zOuter: -0.025, w: 0.22, h: 0.2, depth: 0.05 }),
              decal: {
                resolution: [32, 32],
                background: 'transparent',
                flipY: false,
                layers: [{ kind: 'eye', sprite: 'eye_cat_slit', tint: { iris: '#f2b53a' }, x: 0.5, y: 0.5, w: 0.92, h: 0.92, side }],
              },
            };
          }),
        ],
      },
      limb('L', true),
      limb('R', true),
      limb('L', false),
      limb('R', false),
      wing('L'),
      wing('R'),
      {
        slotId: 'TAIL',
        pieces: [
          {
            template: 'LIMB_LOFT', name: 'TAIL_BASE', size: [0.45, 1.0, 1.2],
            offset: [0, 2.0, 1.7], material: teal, parent: 'BODY_REAR', pivot: [0, 1.92, 1.64],
            rotation: [0.9, 0, 0],
            params: {
              sides: 6,
              sections: [
                { y: -0.45, radiusX: 0.24, radiusZ: 0.22 },
                { y: 0.0, radiusX: 0.19, radiusZ: 0.17, offsetZ: 0.25 },
                { y: 0.5, radiusX: 0.14, radiusZ: 0.12, offsetZ: 0.5 },
              ],
              capTop: true, capBottom: true,
            },
          },
          {
            template: 'LIMB_LOFT', name: 'TAIL_TIP', size: [0.3, 0.9, 1.0],
            offset: [0, 1.7, 2.5], material: tealDark, parent: 'TAIL_BASE', pivot: [0, 1.94, 2.48],
            rotation: [1.25, 0, 0],
            params: {
              sides: 6,
              sections: [
                { y: -0.4, radiusX: 0.13, radiusZ: 0.11 },
                { y: 0.05, radiusX: 0.09, radiusZ: 0.08, offsetZ: 0.3 },
                { y: 0.42, radiusX: 0.05, radiusZ: 0.05, offsetZ: 0.5 },
              ],
              capTop: true, capBottom: true,
            },
          },
          {
            template: 'PYRAMID', name: 'TAIL_SPADE', size: [0.3, 0.34, 0.3],
            offset: [0, 1.5, 3.0], material: amber, parent: 'TAIL_TIP', pivot: [0, 1.7, 2.5],
            rotation: [1.9, 0, 0],
          },
        ],
      },
    ],
  };
}

// ---------- 7. PSX Cloud Strife (FF7) ----------

function buildCloudKimi() {
  const navy = '#343d94';
  const navyDark = '#252b66';
  const skin = '#e8c39a';
  const blonde = '#e0c94a';
  const leather = '#6b432b';
  const steel = '#b8c0c8';
  const blade = '#c8d3d8';

  const spike = (name, size, offset, rotation) => ({
    template: 'CONE', name, size, offset, material: blonde,
    parent: 'HEAD', pivot: HEROIC.headPivot, rotation,
    params: { radialSegments: 4 },
    vertexColors: { top: '#f2e07a', bottom: '#a8932e' },
  });

  const headPieces = buildHeadPieces({
    moldId: 'gen_head_heroic',
    headParams: { jawDrop: 0.04, cheekFullness: -0.06 },
    skin,
    headCenter: HEROIC.headCenter,
    headPivot: HEROIC.headPivot,
    face: {
      eyes: { sprite: 'eye_sharp_hero', iris: '#3a7bd5' },
      brows: { sprite: 'brow_heroic_slope', tint: '#b8912a' },
      mouth: { sprite: 'mouth_neutral_small', lip: '#7a3b2e' },
    },
    extraPieces: [
      {
        template: 'LATHE', name: 'HAIR_CAP', size: [1.24, 0.55, 1.28],
        offset: [0, 5.48, 0.06], material: blonde, parent: 'HEAD', pivot: HEROIC.headPivot,
        params: {
          segments: 8,
          points: [[0.58, -0.16], [0.62, 0.04], [0.48, 0.28], [0.22, 0.42], [0.0, 0.46]],
        },
        vertexColors: { top: '#f2e07a', bottom: '#a8932e' },
      },
      spike('SPIKE_L', [0.3, 0.78, 0.3], [0.26, 5.72, 0.16], [0.55, 0, -0.25]),
      spike('SPIKE_R', [0.3, 0.78, 0.3], [-0.26, 5.72, 0.16], [0.55, 0, 0.25]),
      spike('SPIKE_BACK', [0.42, 0.9, 0.42], [0, 5.7, 0.55], [0.6, 0, 0]),
      spike('TUFT_CROWN', [0.36, 0.6, 0.36], [0, 5.85, 0.3], [0.4, 0, 0]),
      {
        template: 'TAPERED_BOX', name: 'FRINGE', size: [0.74, 0.28, 0.16],
        offset: [0, 5.44, -0.46], material: blonde, parent: 'HEAD', pivot: HEROIC.headPivot,
        params: { widthTop: 0.52, depthTop: 0.1 },
        vertexColors: { top: '#f2e07a', bottom: '#a8932e' },
      },
      spike('SIDELOCK_L', [0.15, 0.55, 0.15], [0.44, 5.18, -0.3], [0, 0, -2.9]),
      spike('SIDELOCK_R', [0.15, 0.55, 0.15], [-0.44, 5.18, -0.3], [0, 0, 2.9]),
    ],
  });

  const armSpec = {
    clavicle: { size: [0.44, 0.18, 0.4], material: navy, params: { widthTop: 0.34, depthTop: 0.34 } },
    upper: { size: [0.42, 1.1, 0.4], material: navy, params: loft3([0.15, 0.14], [0.2, 0.17], [0.22, 0.18], 0.55) },
    lower: { size: [0.36, 0.95, 0.34], material: skin, params: loft3([0.13, 0.13], [0.16, 0.15], [0.18, 0.16], 0.47) },
    hand: { size: [0.32, 0.3, 0.28], material: leather, params: { widthTop: 0.28, depthTop: 0.24 } },
  };
  const legSpec = {
    upper: { size: [0.46, 1.15, 0.44], material: navyDark, params: loft3([0.17, 0.15], [0.21, 0.18], [0.23, 0.2], 0.57) },
    lower: {
      size: [0.42, 1.0, 0.4], material: leather,
      params: loft3([0.16, 0.17], [0.2, 0.18], [0.2, 0.19], 0.5),
      vertexColors: { top: shade(leather, 1.15), bottom: shade(leather, 0.7) },
    },
    foot: { size: [0.44, 0.3, 0.9], material: '#4b2f1d', params: { widthTop: 0.34, depthTop: 0.5, offsetTopZ: 0.1 }, faceColors: faceShades('#4b2f1d') },
  };

  return {
    id: 'psx_cloud_ff7_kimi_cm',
    name: 'Cloud FF7 by Kimi',
    category: 'PSX',
    assetRole: 'characterModel',
    archetype: 'HUMANOID',
    skeletonId: 'HUMANOID_STANDARD',
    animationProfile: 'HUMANOID_STANDARD_AVATAR_BASE',
    slotBindings: humanoidBindings(),
    slots: [
      { slotId: 'HEAD', pieces: headPieces },
      {
        slotId: 'TORSO',
        pieces: [
          {
            template: 'TAPERED_BOX', name: 'PELVIS', size: [1.08, 0.58, 0.7],
            offset: HEROIC.pelvis, material: navyDark, pivot: HEROIC.pelvisPivot,
            params: { widthTop: 0.96, depthTop: 0.62 }, faceColors: faceShades(navyDark),
          },
          {
            template: 'TAPERED_BOX', name: 'TORSO', size: [1.14, 1.16, 0.74],
            offset: HEROIC.torso, material: navy, parent: 'PELVIS', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.38, depthTop: 0.82, offsetTopZ: -0.03 }, faceColors: faceShades(navy),
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST', size: [1.34, 0.7, 0.8],
            offset: HEROIC.chest, material: navy, parent: 'TORSO', pivot: HEROIC.chestPivot,
            params: { widthTop: 1.56, depthTop: 0.86, offsetTopZ: -0.02 }, faceColors: faceShades(navy),
          },
          {
            template: 'TAPERED_BOX', name: 'BELT_WRAP', size: [1.42, 0.16, 0.84],
            offset: [0, 2.62, -0.02], material: leather, parent: 'TORSO', pivot: HEROIC.pelvisPivot,
            params: { widthTop: 1.36, depthTop: 0.8 },
          },
          {
            template: 'CUBE', name: 'BELT_BUCKLE', size: [0.3, 0.2, 0.08],
            offset: [0, 2.62, -0.5], material: steel, parent: 'BELT_WRAP', pivot: [0, 2.62, -0.44],
          },
          {
            template: 'TAPERED_BOX', name: 'CHEST_STRAP', size: [0.2, 1.5, 0.1],
            offset: [0.08, 3.4, -0.47], material: leather, parent: 'CHEST', pivot: HEROIC.chestPivot,
            rotation: [0, 0, 0.5],
          },
          {
            template: 'SPHERE', name: 'ARM_L_PAD', size: [0.58, 0.42, 0.58],
            offset: [0.88, 4.1, 0], material: steel, parent: 'CHEST', pivot: [0.62, 4.02, 0],
            params: { widthSegments: 5, heightSegments: 3 },
            vertexColors: { top: '#dde4ea', bottom: '#6a747e' },
          },
          {
            template: 'CUBE', name: 'PAD_BOLTS', size: [0.34, 0.08, 0.12],
            offset: [0.98, 4.34, 0], material: '#6a747e', parent: 'ARM_L_PAD', pivot: [0.88, 4.1, 0],
          },
          {
            template: 'TAPERED_BOX', name: 'NECK', size: [0.34, 0.36, 0.3],
            offset: HEROIC.neck, material: skin, parent: 'CHEST', pivot: HEROIC.neckPivot,
            params: { widthTop: 0.28, depthTop: 0.26 },
          },
          {
            template: 'TAPERED_BOX', name: 'SWORD_BLADE', size: [0.62, 1.95, 0.12],
            offset: [0.3, 3.3, 0.58], material: blade, parent: 'TORSO', pivot: HEROIC.pelvisPivot,
            rotation: [0.1, 0, 0.7],
            params: { widthTop: 0.42, depthTop: 0.1, offsetTopX: -0.05 },
            faceColors: faceShades(blade),
          },
          {
            template: 'CYLINDER', name: 'SWORD_GRIP', size: [0.13, 0.55, 0.13],
            offset: [0.98, 4.2, 0.66], material: leather, parent: 'SWORD_BLADE', pivot: [0.3, 3.3, 0.58],
            rotation: [0.1, 0, 0.7], params: { radialSegments: 6 },
          },
          {
            template: 'SPHERE', name: 'SWORD_POMMEL', size: [0.16, 0.16, 0.16],
            offset: [1.16, 4.48, 0.7], material: steel, parent: 'SWORD_GRIP', pivot: [0.98, 4.2, 0.66],
            params: { widthSegments: 6, heightSegments: 4 },
          },
          ...[[0.44, 3.55, 0.66], [0.58, 3.82, 0.68]].map((offset, i) => ({
            template: 'CUBE', name: `MATERIA_${i + 1}`, size: [0.11, 0.11, 0.06],
            offset, material: '#3fa46f', parent: 'SWORD_BLADE', pivot: [0.3, 3.3, 0.58],
            rotation: [0.1, 0, 0.7],
          })),
        ],
      },
      { slotId: 'ARM_L', pieces: makeArm('L', HEROIC, armSpec) },
      { slotId: 'ARM_R', pieces: makeArm('R', HEROIC, armSpec) },
      { slotId: 'LEG_L', pieces: makeLeg('L', HEROIC, legSpec) },
      { slotId: 'LEG_R', pieces: makeLeg('R', HEROIC, legSpec) },
    ],
  };
}

// ---------- write ----------

const FORGE = [
  buildBlackMage,
  buildSkullKnight,
  buildChibiNinja,
  buildMecha,
  buildFenixChick,
  buildDrakePup,
  buildCloudKimi,
];

for (const build of FORGE) {
  const model = build();
  const file = path.join(OUT_DIR, `${model.id}.json`);
  const pieceCount = model.slots.reduce((sum, slot) => sum + slot.pieces.length, 0);
  writeFileSync(file, `${JSON.stringify(model, null, 2)}\n`);
  console.log(`forged ${model.id}: ${pieceCount} pieces -> ${path.relative(ROOT, file)}`);
}
