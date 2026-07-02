const TRI_FACES = Object.freeze([
  [0, 1, 2], [0, 2, 3],
  [4, 6, 5], [4, 7, 6],
  [0, 3, 7], [0, 7, 4],
  [1, 5, 6], [1, 6, 2],
  [3, 2, 6], [3, 6, 7],
  [0, 4, 5], [0, 5, 1],
]);

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  const normalized = String(hex || '#808080').replace('#', '').trim();
  const safe = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized.padEnd(6, '0').slice(0, 6);
  return [
    Number.parseInt(safe.slice(0, 2), 16),
    Number.parseInt(safe.slice(2, 4), 16),
    Number.parseInt(safe.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((value) => clampByte(value).toString(16).padStart(2, '0')).join('')}`;
}

function tintHex(hex, amount = 0) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  ]);
}

function shadeHex(hex, amount = 0) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([
    r * (1 - amount),
    g * (1 - amount),
    b * (1 - amount),
  ]);
}

// One shade per hull quad, in TRI_FACES order: back, front, left, right,
// top, bottom. The avatar builder re-bakes this same pattern from the
// active palette color, so keep the two in sync via this export.
export function makeFaceColors(baseHex) {
  return [
    shadeHex(baseHex, 0.26),
    tintHex(baseHex, 0.18),
    shadeHex(baseHex, 0.06),
    shadeHex(baseHex, 0.06),
    tintHex(baseHex, 0.28),
    shadeHex(baseHex, 0.38),
  ];
}

export const CHARACTER_MOLD_PROPORTIONS = Object.freeze({
  psx_humanoid_chibi_mold_cm: Object.freeze({
    totalHeight: 5.5568,
    headsHigh: 2.3153,
    shoulderWidthInHeads: 0.7149,
    armLengthFraction: 0.2699,
    legLengthFraction: 0.2288,
    handHeightInHeads: 0.15,
    footLengthInHeads: 0.45,
  }),
  psx_humanoid_heroic_mold_cm: Object.freeze({
    totalHeight: 6.6064,
    headsHigh: 4.6524,
    shoulderWidthInHeads: 1.7121,
    armLengthFraction: 0.3633,
    legLengthFraction: 0.4043,
    handHeightInHeads: 0.2535,
    footLengthInHeads: 0.8169,
  }),
  psx_humanoid_slim_mold_cm: Object.freeze({
    totalHeight: 6.4832,
    headsHigh: 4.9115,
    shoulderWidthInHeads: 1.3333,
    armLengthFraction: 0.3625,
    legLengthFraction: 0.4323,
    handHeightInHeads: 0.2424,
    footLengthInHeads: 0.7273,
  }),
  psx_humanoid_heavy_mold_cm: Object.freeze({
    totalHeight: 6.1696,
    headsHigh: 4.0589,
    shoulderWidthInHeads: 1.6129,
    armLengthFraction: 0.3485,
    legLengthFraction: 0.3388,
    handHeightInHeads: 0.2632,
    footLengthInHeads: 0.8684,
  }),
  n64_humanoid_round_mold_cm: Object.freeze({
    totalHeight: 5.9574,
    headsHigh: 2.3362,
    shoulderWidthInHeads: 0.7462,
    armLengthFraction: 0.2434,
    legLengthFraction: 0.24,
    handHeightInHeads: 0.2039,
    footLengthInHeads: 0.5098,
  }),
  n64_humanoid_classic_mold_cm: Object.freeze({
    totalHeight: 6.3588,
    headsHigh: 3.697,
    shoulderWidthInHeads: 1.1728,
    armLengthFraction: 0.3145,
    legLengthFraction: 0.3713,
    handHeightInHeads: 0.2326,
    footLengthInHeads: 0.686,
  }),
});

function makeHull({
  bottomWidth,
  topWidth,
  bottomBack,
  topBack,
  bottomFront,
  topFront,
  bottomY,
  topY,
}) {
  return {
    vertices: [
      [-bottomWidth / 2, bottomY, bottomBack],
      [bottomWidth / 2, bottomY, bottomBack],
      [topWidth / 2, topY, topBack],
      [-topWidth / 2, topY, topBack],
      [-bottomWidth * 0.46, bottomY, -bottomFront],
      [bottomWidth * 0.46, bottomY, -bottomFront],
      [topWidth * 0.44, topY, -topFront],
      [-topWidth * 0.44, topY, -topFront],
    ],
    faces: TRI_FACES,
  };
}

function makeTaperedBoxPrimitive({
  bottomWidth,
  topWidth,
  bottomBack,
  topBack,
  bottomFront,
  topFront,
  bottomY,
  topY,
  offsetTopX = 0,
}) {
  return {
    template: 'TAPERED_BOX',
    size: [bottomWidth, topY - bottomY, bottomBack + bottomFront],
    params: {
      widthTop: topWidth,
      depthTop: topBack + topFront,
      offsetTopX,
      offsetTopZ: ((topBack - topFront) - (bottomBack - bottomFront)) / 2,
    },
  };
}

function makeLoftSection(y, width, backDepth, frontDepth, offsetX = 0, offsetZ = 0) {
  return {
    y,
    radiusX: width / 2,
    radiusZ: (backDepth + frontDepth) / 2,
    offsetX,
    offsetZ: ((backDepth - frontDepth) / 2) + offsetZ,
  };
}

function makeHeadMesh({ width, height, backDepth, frontDepth }) {
  return makeHull({
    bottomWidth: width * 0.76,
    topWidth: width,
    bottomBack: backDepth,
    topBack: backDepth * 0.42,
    bottomFront: frontDepth,
    topFront: frontDepth * 0.88,
    bottomY: -height * 0.52,
    topY: height * 0.48,
  });
}

// Chest block: widest at the shoulders, tapering to the rib line, leaning
// slightly forward at the top so the side profile is not a flat slab.
function makeChestMesh({ shoulderWidth, ribWidth, height, backDepth, frontDepth }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: ribWidth,
    topWidth: shoulderWidth,
    bottomBack: backDepth * 0.78,
    topBack: backDepth * 0.46,
    bottomFront: frontDepth * 0.74,
    topFront: frontDepth,
    bottomY: -height * 0.5,
    topY: height * 0.5,
  });
}

// Waist block: bridges the rib line down to the hips.
function makeWaistMesh({ ribWidth, hipWidth, height, backDepth, frontDepth }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: hipWidth,
    topWidth: ribWidth,
    bottomBack: backDepth * 0.9,
    topBack: backDepth * 0.74,
    bottomFront: frontDepth * 0.78,
    topFront: frontDepth * 0.72,
    bottomY: -height * 0.5,
    topY: height * 0.5,
  });
}

function makePelvisMesh({ hipWidth, waistWidth, height, backDepth, frontDepth }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: hipWidth,
    topWidth: waistWidth,
    bottomBack: backDepth,
    topBack: backDepth * 0.55,
    bottomFront: frontDepth * 0.78,
    topFront: frontDepth * 0.55,
    bottomY: -height * 0.45,
    topY: height * 0.38,
  });
}

function makeNeckMesh({ width, height, depth }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: width,
    topWidth: width * 0.92,
    bottomBack: depth * 0.55,
    topBack: depth * 0.5,
    bottomFront: depth * 0.55,
    topFront: depth * 0.5,
    bottomY: -height * 0.5,
    topY: height * 0.5,
  });
}

// Rounded shoulder cap that rides the upper-arm pivot.
function makeShoulderPadMesh({ width, height, depth, offsetTopX = 0 }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: width * 0.78,
    topWidth: width,
    bottomBack: depth * 0.5,
    topBack: depth * 0.4,
    bottomFront: depth * 0.5,
    topFront: depth * 0.4,
    bottomY: -height * 0.5,
    topY: height * 0.5,
    offsetTopX,
  });
}

function makeLimbMesh({
  topWidth,
  bottomWidth,
  height,
  backDepth,
  frontDepth,
  midOffsetX = 0,
  midOffsetZ = 0,
  midScale = 1.04,
}) {
  const bottomBack = backDepth * 0.88;
  const topBack = backDepth;
  const bottomFront = frontDepth * 0.82;
  const topFront = frontDepth;
  const midWidth = Math.max(topWidth, bottomWidth) * midScale;
  const midBack = ((bottomBack + topBack) / 2) * midScale;
  const midFront = ((bottomFront + topFront) / 2) * midScale;
  const maxWidth = Math.max(topWidth, bottomWidth, midWidth);
  const maxDepth = Math.max(bottomBack + bottomFront, topBack + topFront, midBack + midFront);

  return {
    template: 'LIMB_LOFT',
    size: [maxWidth, height, maxDepth],
    params: {
      sides: 6,
      sections: [
        makeLoftSection(-height * 0.5, bottomWidth, bottomBack, bottomFront),
        makeLoftSection(0, midWidth, midBack, midFront, midOffsetX, midOffsetZ),
        makeLoftSection(height * 0.5, topWidth, topBack, topFront),
      ],
      capTop: true,
      capBottom: true,
    },
  };
}

function makeFootMesh({ heelWidth, toeWidth, height, backDepth, frontDepth }) {
  return makeTaperedBoxPrimitive({
    bottomWidth: toeWidth,
    topWidth: heelWidth,
    bottomBack: backDepth * 0.62,
    topBack: backDepth,
    bottomFront: frontDepth,
    topFront: frontDepth * 0.54,
    bottomY: -height * 0.34,
    topY: height * 0.34,
  });
}

function handPiece(name, offset, color, parent, pivot, size) {
  return {
    ...makeTaperedBoxPrimitive({
      bottomWidth: size[0] * 0.88,
      topWidth: size[0],
      bottomBack: size[2] * 0.55,
      topBack: size[2] * 0.42,
      bottomFront: size[2] * 0.76,
      topFront: size[2] * 0.7,
      bottomY: -size[1] * 0.5,
      topY: size[1] * 0.5,
    }),
    name,
    offset,
    material: color,
    parent,
    pivot,
    faceColors: makeFaceColors(color),
  };
}

function deriveMoldSpecFromProportions(id, spec) {
  const proportions = CHARACTER_MOLD_PROPORTIONS[id];
  if (!proportions) return spec;

  const headHeight = proportions.totalHeight / proportions.headsHigh;
  const footDepth = headHeight * proportions.footLengthInHeads;
  const currentFootDepth = spec.footBack + spec.footFront;
  const footBackRatio = currentFootDepth > 0 ? spec.footBack / currentFootDepth : 0.32;
  const footBack = footDepth * footBackRatio;

  return {
    ...spec,
    headHeight,
    hipY: (proportions.totalHeight * proportions.legLengthFraction) + (spec.footHeight * 0.52),
    shoulderWidth: spec.headWidth * proportions.shoulderWidthInHeads,
    armLength: proportions.totalHeight * proportions.armLengthFraction,
    handHeight: headHeight * proportions.handHeightInHeads,
    footBack,
    footFront: footDepth - footBack,
  };
}

// Expands the compact per-variant spec into every measurement the slot
// builders need, stacking segments from the ground up so feet always rest
// on y=0 and the torso blocks overlap without gaps.
function deriveConfig(spec) {
  const ankleY = spec.footHeight * 0.52;
  const legSpan = spec.hipY - ankleY;
  const legSplit = spec.legSplit ?? 0.54;
  const armSplit = spec.armSplit ?? 0.53;
  const shoulderY = spec.hipY + spec.torsoHeight;
  const neckY = shoulderY + spec.neckHeight;
  const headCenterY = neckY + spec.headHeight * 0.5;

  const pelvisHeight = spec.torsoHeight * 0.34;
  const chestHeight = spec.torsoHeight * 0.56;
  const pelvisBottom = spec.hipY - pelvisHeight * 0.3;
  const pelvisTop = pelvisBottom + pelvisHeight;
  const chestTop = shoulderY + spec.torsoHeight * 0.09;
  const chestBottom = chestTop - chestHeight;
  const waistOverlap = spec.torsoHeight * 0.05;
  const waistBottom = pelvisTop - waistOverlap;
  const waistTop = chestBottom + waistOverlap;
  const waistHeight = Math.max(waistTop - waistBottom, 0.2);

  return {
    ...spec,
    ankleY,
    shoulderY,
    neckY,
    headCenterY,
    thighLength: legSpan * legSplit,
    shinLength: legSpan * (1 - legSplit),
    upperArmLength: spec.armLength * armSplit,
    forearmLength: spec.armLength * (1 - armSplit),
    pelvisHeight,
    pelvisCenterY: pelvisBottom + pelvisHeight * 0.5,
    chestHeight,
    chestCenterY: chestBottom + chestHeight * 0.5,
    waistHeight,
    waistCenterY: waistBottom + waistHeight * 0.5,
  };
}

function armSlot(slotId, side, c, colors) {
  const sign = side === 'L' ? -1 : 1;
  const shoulderX = sign * c.shoulderX;
  const armPivot = [shoulderX, c.shoulderY, 0];
  const elbowPivot = [shoulderX, c.shoulderY - c.upperArmLength, 0];
  const wristPivot = [shoulderX, c.shoulderY - c.upperArmLength - c.forearmLength, 0];

  const pieces = [
    {
      ...makeLimbMesh({
        topWidth: c.upperArmWidth,
        bottomWidth: c.upperArmWidth * 0.8,
        height: c.upperArmLength,
        backDepth: c.upperArmWidth * 0.55,
        frontDepth: c.upperArmWidth * 0.55,
        midOffsetX: sign * c.upperArmWidth * 0.04,
        midOffsetZ: -0.02,
      }),
      name: slotId,
      offset: [shoulderX, c.shoulderY - (c.upperArmLength * 0.5), 0],
      material: colors.limb,
      parent: 'TORSO',
      pivot: armPivot,
      faceColors: makeFaceColors(colors.limb),
    },
    {
      ...makeLimbMesh({
        topWidth: c.forearmWidth,
        bottomWidth: c.forearmWidth * 0.78,
        height: c.forearmLength,
        backDepth: c.forearmWidth * 0.55,
        frontDepth: c.forearmWidth * 0.6,
        midOffsetX: sign * c.forearmWidth * 0.05,
        midOffsetZ: -0.025,
      }),
      name: `${slotId}_FOREARM`,
      offset: [shoulderX, c.shoulderY - c.upperArmLength - (c.forearmLength * 0.5), 0],
      material: colors.limbAlt,
      parent: slotId,
      pivot: elbowPivot,
      faceColors: makeFaceColors(colors.limbAlt),
    },
    handPiece(
      `HAND_${side}`,
      [shoulderX, wristPivot[1] - (c.handHeight * 0.42), -0.04],
      colors.hand,
      `${slotId}_FOREARM`,
      wristPivot,
      [c.handWidth, c.handHeight, c.handDepth]
    ),
  ];

  if (c.shoulderPad) {
    // Not named SHOULDER_*/PAULDRON_*: those are humanoid clavicle aliases
    // and the rig normalizer would reparent the arm under its own pad.
    pieces.push({
      ...makeShoulderPadMesh({
        width: c.upperArmWidth * 1.5,
        height: c.upperArmWidth * 1.0,
        depth: c.upperArmWidth * 1.2,
        offsetTopX: sign * c.upperArmWidth * 0.08,
      }),
      name: `${slotId}_PAD`,
      offset: [shoulderX + (sign * c.upperArmWidth * 0.12), c.shoulderY + 0.1, 0],
      material: colors.torso,
      parent: slotId,
      pivot: armPivot,
      faceColors: makeFaceColors(colors.torso),
    });
  }

  return { slotId, pieces };
}

function legSlot(slotId, side, c, colors) {
  const sign = side === 'L' ? -1 : 1;
  const hipX = sign * c.hipX;
  const legPivot = [hipX, c.hipY, 0];
  const kneePivot = [hipX, c.hipY - c.thighLength, 0];
  const anklePivot = [hipX, c.ankleY, 0];

  return {
    slotId,
    pieces: [
      {
        ...makeLimbMesh({
          topWidth: c.thighWidth,
          bottomWidth: c.thighWidth * 0.74,
          height: c.thighLength,
          backDepth: c.thighWidth * 0.58,
          frontDepth: c.thighWidth * 0.6,
          midOffsetX: sign * c.thighWidth * 0.035,
          midOffsetZ: -0.02,
          midScale: 1.02,
        }),
        name: slotId,
        offset: [hipX, c.hipY - (c.thighLength * 0.5), -0.02],
        material: colors.leg,
        parent: 'TORSO',
        pivot: legPivot,
        faceColors: makeFaceColors(colors.leg),
      },
      {
        ...makeLimbMesh({
          topWidth: c.shinWidth,
          bottomWidth: c.shinWidth * 0.78,
          height: c.shinLength,
          backDepth: c.shinWidth * 0.58,
          frontDepth: c.shinWidth * 0.62,
          midOffsetX: -sign * c.shinWidth * 0.03,
          midOffsetZ: 0.025,
          midScale: 1.08,
        }),
        name: `${slotId}_SHIN`,
        offset: [hipX, c.hipY - c.thighLength - (c.shinLength * 0.5), -0.03],
        material: colors.legAlt,
        parent: slotId,
        pivot: kneePivot,
        faceColors: makeFaceColors(colors.legAlt),
      },
      {
        ...makeFootMesh({
          heelWidth: c.footHeelWidth,
          toeWidth: c.footToeWidth,
          height: c.footHeight,
          backDepth: c.footBack,
          frontDepth: c.footFront,
        }),
        name: `FOOT_${side}`,
        offset: [hipX, c.footHeight * 0.42, -c.footFront * 0.44],
        material: colors.boot,
        parent: `${slotId}_SHIN`,
        pivot: anklePivot,
        faceColors: makeFaceColors(colors.boot),
      },
    ],
  };
}

function createHumanoidMoldTemplate(id, name, spec, colors, category = 'PSX') {
  const c = deriveConfig(spec);
  const headPivot = [0, c.neckY, 0];
  const torsoPivot = [0, c.chestCenterY, 0];

  return {
    id,
    name,
    category,
    archetype: 'HUMANOID',
    animationProfile: 'HUMANOID_SWORDSMAN',
    skeletonId: 'HUMANOID_DEFAULT',
    slots: [
      {
        slotId: 'HEAD',
        pieces: [
          {
            template: 'CUSTOM',
            name: 'HEAD',
            offset: [0, c.headCenterY, 0.02],
            material: colors.skin,
            parent: 'TORSO',
            pivot: headPivot,
            params: makeHeadMesh({
              width: c.headWidth,
              height: c.headHeight,
              backDepth: c.headBack,
              frontDepth: c.headFront,
            }),
            faceColors: makeFaceColors(colors.skin),
          },
          {
            template: 'CUBE',
            name: 'FACE_PLANE',
            size: [c.faceWidth, c.faceHeight, 0.06],
            offset: [0, c.headCenterY - (c.headHeight * 0.04), -c.headFront - 0.04],
            material: tintHex(colors.skin, 0.08),
            parent: 'HEAD',
            pivot: headPivot,
          },
        ],
      },
      {
        slotId: 'TORSO',
        pieces: [
          {
            ...makeChestMesh({
              shoulderWidth: c.shoulderWidth,
              ribWidth: c.ribWidth,
              height: c.chestHeight,
              backDepth: c.torsoBack,
              frontDepth: c.torsoFront,
            }),
            name: 'TORSO',
            offset: [0, c.chestCenterY, 0],
            material: colors.torso,
            faceColors: makeFaceColors(colors.torso),
          },
          {
            ...makeWaistMesh({
              ribWidth: c.ribWidth * 0.96,
              hipWidth: c.waistWidth,
              height: c.waistHeight,
              backDepth: c.torsoBack * 0.92,
              frontDepth: c.torsoFront * 0.86,
            }),
            // Not 'WAIST': that name is a humanoid pelvis anchor alias.
            name: 'TORSO_WAIST',
            offset: [0, c.waistCenterY, 0.01],
            material: colors.torso,
            parent: 'TORSO',
            pivot: torsoPivot,
            faceColors: makeFaceColors(colors.torso),
          },
          {
            ...makePelvisMesh({
              hipWidth: c.hipWidth,
              waistWidth: c.waistWidth * 0.94,
              height: c.pelvisHeight,
              backDepth: c.torsoBack * 0.86,
              frontDepth: c.torsoFront * 0.74,
            }),
            name: 'PELVIS',
            offset: [0, c.pelvisCenterY, 0.02],
            material: colors.pelvis,
            parent: 'TORSO',
            pivot: torsoPivot,
            faceColors: makeFaceColors(colors.pelvis),
          },
          {
            ...makeNeckMesh({
              width: c.neckWidth,
              height: c.neckHeight + 0.34,
              depth: c.neckWidth,
            }),
            name: 'NECK',
            offset: [0, (c.shoulderY + c.neckY) * 0.5 + 0.06, 0.02],
            material: colors.skin,
            parent: 'TORSO',
            pivot: torsoPivot,
            faceColors: makeFaceColors(colors.skin),
          },
        ],
      },
      armSlot('ARM_L', 'L', c, colors),
      armSlot('ARM_R', 'R', c, colors),
      legSlot('LEG_L', 'L', c, colors),
      legSlot('LEG_R', 'R', c, colors),
    ],
  };
}

const MOLD_VARIANTS = [
  {
    // ~2.7 heads tall: oversized head, stubby limbs, chunky mitts.
    id: 'psx_humanoid_chibi_mold_cm',
    name: 'Molde Humanoide Chibi PSX',
    spec: deriveMoldSpecFromProportions('psx_humanoid_chibi_mold_cm', {
      hipY: 1.5, torsoHeight: 1.6, neckHeight: 0.14,
      // Oversized head box: the avatar head is fitted to this box and then
      // shrunk by the mold's 0.75 cranium headScale, so the box overshoots
      // to land the rendered figure at roughly 2.7-3 heads tall.
      headWidth: 2.35, headHeight: 2.4, headBack: 0.68, headFront: 1.05,
      faceWidth: 1.5, faceHeight: 1.26,
      shoulderWidth: 1.68, ribWidth: 1.46, waistWidth: 1.22, hipWidth: 1.42,
      torsoBack: 0.52, torsoFront: 0.64, neckWidth: 0.5,
      shoulderX: 1.02, armLength: 1.5, upperArmWidth: 0.5, forearmWidth: 0.42,
      handWidth: 0.42, handHeight: 0.36, handDepth: 0.3,
      hipX: 0.42, thighWidth: 0.6, shinWidth: 0.46,
      footHeight: 0.44, footHeelWidth: 0.42, footToeWidth: 0.66, footBack: 0.28, footFront: 0.8,
    }),
    colors: {
      skin: '#e2b48f',
      torso: '#7c3a55',
      pelvis: '#3c4570',
      limb: '#d2a17d',
      limbAlt: '#c89471',
      hand: '#deb38f',
      leg: '#4a5e94',
      legAlt: '#3e5181',
      boot: '#7d573a',
    },
  },
  {
    // ~4.7 heads tall: broad shoulders, shoulder pads, classic PSX hero.
    id: 'psx_humanoid_heroic_mold_cm',
    name: 'Molde Humanoide Heroico PSX',
    spec: deriveMoldSpecFromProportions('psx_humanoid_heroic_mold_cm', {
      hipY: 2.9, torsoHeight: 2.15, neckHeight: 0.2,
      headWidth: 1.32, headHeight: 1.42, headBack: 0.48, headFront: 0.76,
      faceWidth: 0.92, faceHeight: 0.8,
      shoulderWidth: 2.26, ribWidth: 1.78, waistWidth: 1.36, hipWidth: 1.56,
      torsoBack: 0.56, torsoFront: 0.7, neckWidth: 0.44,
      shoulderX: 1.32, armLength: 2.4, upperArmWidth: 0.52, forearmWidth: 0.42,
      handWidth: 0.38, handHeight: 0.36, handDepth: 0.28,
      hipX: 0.5, thighWidth: 0.62, shinWidth: 0.46,
      footHeight: 0.44, footHeelWidth: 0.38, footToeWidth: 0.62, footBack: 0.3, footFront: 0.86,
      shoulderPad: true,
    }),
    colors: {
      skin: '#d8ad86',
      torso: '#79405e',
      pelvis: '#324270',
      limb: '#c99872',
      limbAlt: '#bc8b67',
      hand: '#d3a57f',
      leg: '#56619c',
      legAlt: '#485488',
      boot: '#6e5240',
    },
  },
  {
    // ~5 heads tall: lanky, narrow shoulders, long thin limbs.
    id: 'psx_humanoid_slim_mold_cm',
    name: 'Molde Humanoide Delgado PSX',
    spec: deriveMoldSpecFromProportions('psx_humanoid_slim_mold_cm', {
      hipY: 3.0, torsoHeight: 2.0, neckHeight: 0.22,
      headWidth: 1.2, headHeight: 1.32, headBack: 0.42, headFront: 0.7,
      faceWidth: 0.8, faceHeight: 0.74,
      shoulderWidth: 1.6, ribWidth: 1.3, waistWidth: 0.98, hipWidth: 1.14,
      torsoBack: 0.42, torsoFront: 0.54, neckWidth: 0.36,
      shoulderX: 0.96, armLength: 2.35, upperArmWidth: 0.36, forearmWidth: 0.28,
      handWidth: 0.3, handHeight: 0.32, handDepth: 0.24,
      hipX: 0.38, thighWidth: 0.44, shinWidth: 0.33,
      footHeight: 0.38, footHeelWidth: 0.28, footToeWidth: 0.5, footBack: 0.24, footFront: 0.72,
    }),
    colors: {
      skin: '#d5a881',
      torso: '#5e4a7c',
      pelvis: '#2e405e',
      limb: '#c3926d',
      limbAlt: '#b27f5f',
      hand: '#cf9e78',
      leg: '#3e578a',
      legAlt: '#344a76',
      boot: '#564537',
    },
  },
  {
    // ~4 heads tall: barrel chest, wide hips, thick limbs.
    id: 'psx_humanoid_heavy_mold_cm',
    name: 'Molde Humanoide Pesado PSX',
    spec: deriveMoldSpecFromProportions('psx_humanoid_heavy_mold_cm', {
      hipY: 2.35, torsoHeight: 2.25, neckHeight: 0.12,
      headWidth: 1.55, headHeight: 1.52, headBack: 0.52, headFront: 0.82,
      faceWidth: 1.0, faceHeight: 0.84,
      shoulderWidth: 2.5, ribWidth: 2.3, waistWidth: 2.0, hipWidth: 2.14,
      torsoBack: 0.74, torsoFront: 0.94, neckWidth: 0.56,
      shoulderX: 1.48, armLength: 2.15, upperArmWidth: 0.66, forearmWidth: 0.54,
      handWidth: 0.48, handHeight: 0.4, handDepth: 0.34,
      hipX: 0.64, thighWidth: 0.8, shinWidth: 0.62,
      footHeight: 0.5, footHeelWidth: 0.5, footToeWidth: 0.84, footBack: 0.36, footFront: 0.96,
      shoulderPad: true,
    }),
    colors: {
      skin: '#c99f7c',
      torso: '#7c3b3b',
      pelvis: '#415070',
      limb: '#b98c69',
      limbAlt: '#a77a59',
      hand: '#c79974',
      leg: '#566180',
      legAlt: '#48526e',
      boot: '#68503c',
    },
  },
  {
    // ~3 heads tall, Mario 64 silhouette: egg-shaped torso that is widest at
    // the belly (ribWidth > shoulderWidth), almost no neck, oversized glove
    // hands and big rounded shoes.
    id: 'n64_humanoid_round_mold_cm',
    name: 'Molde Humanoide N64 Redondo',
    category: 'N64',
    spec: deriveMoldSpecFromProportions('n64_humanoid_round_mold_cm', {
      hipY: 1.7, torsoHeight: 1.7, neckHeight: 0.1,
      headWidth: 2.6, headHeight: 2.55, headBack: 0.74, headFront: 1.15,
      faceWidth: 1.66, faceHeight: 1.36,
      shoulderWidth: 1.6, ribWidth: 1.94, waistWidth: 1.74, hipWidth: 1.5,
      torsoBack: 0.72, torsoFront: 0.88, neckWidth: 0.62,
      shoulderX: 0.98, armLength: 1.45, upperArmWidth: 0.44, forearmWidth: 0.38,
      handWidth: 0.62, handHeight: 0.52, handDepth: 0.46,
      hipX: 0.46, thighWidth: 0.56, shinWidth: 0.46,
      footHeight: 0.52, footHeelWidth: 0.52, footToeWidth: 0.8, footBack: 0.32, footFront: 0.98,
    }),
    colors: {
      skin: '#e5bd9b',
      torso: '#b03a3a',
      pelvis: '#2f4f8f',
      limb: '#b03a3a',
      limbAlt: '#9c3232',
      hand: '#e8e3da',
      leg: '#2f4f8f',
      legAlt: '#28447c',
      boot: '#5b3a24',
    },
  },
  {
    // ~4 heads tall, Ocarina low-LOD silhouette: lean trunk, square
    // shoulders, no pads, sturdy boots.
    id: 'n64_humanoid_classic_mold_cm',
    name: 'Molde Humanoide N64 Clásico',
    category: 'N64',
    spec: deriveMoldSpecFromProportions('n64_humanoid_classic_mold_cm', {
      hipY: 2.6, torsoHeight: 1.95, neckHeight: 0.16,
      headWidth: 1.62, headHeight: 1.72, headBack: 0.55, headFront: 0.85,
      faceWidth: 1.05, faceHeight: 0.95,
      shoulderWidth: 1.9, ribWidth: 1.58, waistWidth: 1.24, hipWidth: 1.44,
      torsoBack: 0.5, torsoFront: 0.62, neckWidth: 0.42,
      shoulderX: 1.12, armLength: 2.0, upperArmWidth: 0.44, forearmWidth: 0.36,
      handWidth: 0.46, handHeight: 0.4, handDepth: 0.32,
      hipX: 0.46, thighWidth: 0.56, shinWidth: 0.44,
      footHeight: 0.46, footHeelWidth: 0.42, footToeWidth: 0.7, footBack: 0.3, footFront: 0.88,
    }),
    colors: {
      skin: '#e5bd9b',
      torso: '#3f7a4a',
      pelvis: '#7a6238',
      limb: '#e5bd9b',
      limbAlt: '#d8ac87',
      hand: '#e5bd9b',
      leg: '#f0e3cc',
      legAlt: '#e2d2b6',
      boot: '#6b4a2c',
    },
  },
];

export const GENERATED_CHARACTER_MOLDS = MOLD_VARIANTS.map((entry) => (
  createHumanoidMoldTemplate(entry.id, entry.name, entry.spec, entry.colors, entry.category)
));
