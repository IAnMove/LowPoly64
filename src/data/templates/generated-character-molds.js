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

function makeFaceColors(baseHex) {
  return [
    shadeHex(baseHex, 0.26),
    tintHex(baseHex, 0.18),
    shadeHex(baseHex, 0.06),
    shadeHex(baseHex, 0.06),
    tintHex(baseHex, 0.28),
    shadeHex(baseHex, 0.38),
  ];
}

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

function makeTorsoMesh({ shoulderWidth, waistWidth, height, backDepth, frontDepth }) {
  return makeHull({
    bottomWidth: waistWidth,
    topWidth: shoulderWidth,
    bottomBack: backDepth * 0.9,
    topBack: backDepth * 0.32,
    bottomFront: frontDepth * 0.8,
    topFront: frontDepth,
    bottomY: -height * 0.56,
    topY: height * 0.52,
  });
}

function makePelvisMesh({ hipWidth, waistWidth, height, backDepth, frontDepth }) {
  return makeHull({
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

function makeLimbMesh({ topWidth, bottomWidth, height, backDepth, frontDepth }) {
  return makeHull({
    bottomWidth,
    topWidth,
    bottomBack: backDepth * 0.88,
    topBack: backDepth,
    bottomFront: frontDepth * 0.82,
    topFront: frontDepth,
    bottomY: -height * 0.5,
    topY: height * 0.5,
  });
}

function makeFootMesh({ heelWidth, toeWidth, height, backDepth, frontDepth }) {
  return makeHull({
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

function handPiece(name, offset, color, parent, pivot, size = [0.28, 0.3, 0.24]) {
  return {
    template: 'CUSTOM',
    name,
    offset,
    material: color,
    parent,
    pivot,
    params: makeHull({
      bottomWidth: size[0] * 0.88,
      topWidth: size[0],
      bottomBack: size[2] * 0.55,
      topBack: size[2] * 0.42,
      bottomFront: size[2] * 0.76,
      topFront: size[2] * 0.7,
      bottomY: -size[1] * 0.5,
      topY: size[1] * 0.5,
    }),
    faceColors: makeFaceColors(color),
  };
}

function limbSlot(slotId, side, config, colors) {
  const sign = side === 'L' ? -1 : 1;
  const shoulderX = sign * config.shoulderX;
  const hipX = sign * config.hipX;
  const armPivot = [shoulderX, config.shoulderY, 0];
  const elbowPivot = [shoulderX, config.shoulderY - config.upperArmLength, 0];
  const wristPivot = [shoulderX, config.shoulderY - config.upperArmLength - config.forearmLength, 0];
  const legPivot = [hipX, config.hipY, 0];
  const kneePivot = [hipX, config.hipY - config.thighLength, 0];
  const anklePivot = [hipX, config.hipY - config.thighLength - config.shinLength, 0];

  if (slotId.startsWith('ARM')) {
    return {
      slotId,
      pieces: [
        {
          template: 'CUSTOM',
          name: slotId,
          offset: [shoulderX, config.shoulderY - (config.upperArmLength * 0.5), 0],
          material: colors.limb,
          parent: 'TORSO',
          pivot: armPivot,
          params: makeLimbMesh({
            topWidth: config.upperArmTopWidth,
            bottomWidth: config.upperArmBottomWidth,
            height: config.upperArmLength,
            backDepth: config.upperArmDepthBack,
            frontDepth: config.upperArmDepthFront,
          }),
          faceColors: makeFaceColors(colors.limb),
        },
        {
          template: 'CUSTOM',
          name: `${slotId}_FOREARM`,
          offset: [shoulderX, config.shoulderY - config.upperArmLength - (config.forearmLength * 0.5), 0],
          material: colors.limbAlt,
          parent: slotId,
          pivot: elbowPivot,
          params: makeLimbMesh({
            topWidth: config.forearmTopWidth,
            bottomWidth: config.forearmBottomWidth,
            height: config.forearmLength,
            backDepth: config.forearmDepthBack,
            frontDepth: config.forearmDepthFront,
          }),
          faceColors: makeFaceColors(colors.limbAlt),
        },
        handPiece(`HAND_${side}`, [shoulderX, wristPivot[1] - (config.handHeight * 0.5), -0.02], colors.hand, `${slotId}_FOREARM`, wristPivot, [config.handWidth, config.handHeight, config.handDepth]),
      ],
    };
  }

  return {
    slotId,
    pieces: [
      {
        template: 'CUSTOM',
        name: slotId,
        offset: [hipX, config.hipY - (config.thighLength * 0.5), -0.02],
        material: colors.leg,
        parent: 'TORSO',
        pivot: legPivot,
        params: makeLimbMesh({
          topWidth: config.thighTopWidth,
          bottomWidth: config.thighBottomWidth,
          height: config.thighLength,
          backDepth: config.thighDepthBack,
          frontDepth: config.thighDepthFront,
        }),
        faceColors: makeFaceColors(colors.leg),
      },
      {
        template: 'CUSTOM',
        name: `${slotId}_SHIN`,
        offset: [hipX, config.hipY - config.thighLength - (config.shinLength * 0.5), -0.04],
        material: colors.legAlt,
        parent: slotId,
        pivot: kneePivot,
        params: makeLimbMesh({
          topWidth: config.shinTopWidth,
          bottomWidth: config.shinBottomWidth,
          height: config.shinLength,
          backDepth: config.shinDepthBack,
          frontDepth: config.shinDepthFront,
        }),
        faceColors: makeFaceColors(colors.legAlt),
      },
      {
        template: 'CUSTOM',
        name: `FOOT_${side}`,
        offset: [hipX, anklePivot[1] - (config.footHeight * 0.22), -config.footFront * 0.44],
        material: colors.boot,
        parent: `${slotId}_SHIN`,
        pivot: anklePivot,
        params: makeFootMesh({
          heelWidth: config.footHeelWidth,
          toeWidth: config.footToeWidth,
          height: config.footHeight,
          backDepth: config.footBack,
          frontDepth: config.footFront,
        }),
        faceColors: makeFaceColors(colors.boot),
      },
    ],
  };
}

function createHumanoidMoldTemplate(id, name, config, colors) {
  const headPivot = [0, config.neckY, 0];
  const torsoPivot = [0, config.torsoY, 0];

  return {
    id,
    name,
    category: 'PSX',
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
            offset: [0, config.headY, 0.02],
            material: colors.skin,
            parent: 'TORSO',
            pivot: headPivot,
            params: makeHeadMesh({
              width: config.headWidth,
              height: config.headHeight,
              backDepth: config.headBack,
              frontDepth: config.headFront,
            }),
            faceColors: makeFaceColors(colors.skin),
          },
          {
            template: 'CUBE',
            name: 'FACE_PLANE',
            size: [config.faceWidth, config.faceHeight, 0.06],
            offset: [0, config.faceY, -config.headFront - 0.04],
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
            template: 'CUSTOM',
            name: 'TORSO',
            offset: [0, config.torsoY, 0],
            material: colors.torso,
            params: makeTorsoMesh({
              shoulderWidth: config.shoulderWidth,
              waistWidth: config.waistWidth,
              height: config.torsoHeight,
              backDepth: config.torsoBack,
              frontDepth: config.torsoFront,
            }),
            faceColors: makeFaceColors(colors.torso),
          },
          {
            template: 'CUSTOM',
            name: 'PELVIS',
            offset: [0, config.pelvisY, 0.02],
            material: colors.pelvis,
            parent: 'TORSO',
            pivot: torsoPivot,
            params: makePelvisMesh({
              hipWidth: config.hipWidth,
              waistWidth: config.waistWidth * 0.84,
              height: config.pelvisHeight,
              backDepth: config.pelvisBack,
              frontDepth: config.pelvisFront,
            }),
            faceColors: makeFaceColors(colors.pelvis),
          },
        ],
      },
      limbSlot('ARM_L', 'L', config, colors),
      limbSlot('ARM_R', 'R', config, colors),
      limbSlot('LEG_L', 'L', config, colors),
      limbSlot('LEG_R', 'R', config, colors),
    ],
  };
}

const MOLD_VARIANTS = [
  {
    id: 'psx_humanoid_chibi_mold_cm',
    name: 'Molde Humanoide Chibi PSX',
    config: {
      headY: 5.26, headWidth: 1.94, headHeight: 1.98, headBack: 0.52, headFront: 0.94, faceWidth: 1.24, faceHeight: 1.02, faceY: 5.14, neckY: 4.28,
      torsoY: 3.12, shoulderWidth: 1.86, waistWidth: 1.34, torsoHeight: 1.98, torsoBack: 0.44, torsoFront: 0.88,
      pelvisY: 1.98, pelvisHeight: 0.84, pelvisBack: 0.34, pelvisFront: 0.54, hipWidth: 1.44,
      shoulderX: 1.08, shoulderY: 3.98, upperArmLength: 1.02, upperArmTopWidth: 0.42, upperArmBottomWidth: 0.32, upperArmDepthBack: 0.22, upperArmDepthFront: 0.22,
      forearmLength: 0.92, forearmTopWidth: 0.3, forearmBottomWidth: 0.24, forearmDepthBack: 0.18, forearmDepthFront: 0.2,
      handWidth: 0.34, handHeight: 0.3, handDepth: 0.24,
      hipX: 0.48, hipY: 1.7, thighLength: 1.1, thighTopWidth: 0.52, thighBottomWidth: 0.38, thighDepthBack: 0.28, thighDepthFront: 0.3,
      shinLength: 1.02, shinTopWidth: 0.34, shinBottomWidth: 0.28, shinDepthBack: 0.22, shinDepthFront: 0.24,
      footHeelWidth: 0.34, footToeWidth: 0.56, footHeight: 0.42, footBack: 0.26, footFront: 0.76,
    },
    colors: {
      skin: '#e2b48f',
      torso: '#5f2940',
      pelvis: '#2f3556',
      limb: '#d2a17d',
      limbAlt: '#c89471',
      hand: '#deb38f',
      leg: '#3e4f7d',
      legAlt: '#33436d',
      boot: '#6c4b30',
    },
  },
  {
    id: 'psx_humanoid_heroic_mold_cm',
    name: 'Molde Humanoide Heroico PSX',
    config: {
      headY: 5.08, headWidth: 1.52, headHeight: 1.58, headBack: 0.48, headFront: 0.82, faceWidth: 0.98, faceHeight: 0.84, faceY: 4.98, neckY: 4.18,
      torsoY: 3.04, shoulderWidth: 2.24, waistWidth: 1.44, torsoHeight: 2.24, torsoBack: 0.48, torsoFront: 0.94,
      pelvisY: 1.78, pelvisHeight: 0.92, pelvisBack: 0.36, pelvisFront: 0.56, hipWidth: 1.52,
      shoulderX: 1.3, shoulderY: 4.02, upperArmLength: 1.34, upperArmTopWidth: 0.46, upperArmBottomWidth: 0.32, upperArmDepthBack: 0.24, upperArmDepthFront: 0.24,
      forearmLength: 1.16, forearmTopWidth: 0.32, forearmBottomWidth: 0.26, forearmDepthBack: 0.18, forearmDepthFront: 0.2,
      handWidth: 0.32, handHeight: 0.34, handDepth: 0.24,
      hipX: 0.54, hipY: 1.66, thighLength: 1.56, thighTopWidth: 0.56, thighBottomWidth: 0.4, thighDepthBack: 0.3, thighDepthFront: 0.32,
      shinLength: 1.42, shinTopWidth: 0.36, shinBottomWidth: 0.28, shinDepthBack: 0.24, shinDepthFront: 0.26,
      footHeelWidth: 0.32, footToeWidth: 0.6, footHeight: 0.42, footBack: 0.3, footFront: 0.84,
    },
    colors: {
      skin: '#d8ad86',
      torso: '#62314a',
      pelvis: '#263255',
      limb: '#c99872',
      limbAlt: '#bc8b67',
      hand: '#d3a57f',
      leg: '#4a4f7f',
      legAlt: '#3f456e',
      boot: '#5d4335',
    },
  },
  {
    id: 'psx_humanoid_slim_mold_cm',
    name: 'Molde Humanoide Delgado PSX',
    config: {
      headY: 5.14, headWidth: 1.46, headHeight: 1.68, headBack: 0.44, headFront: 0.78, faceWidth: 0.92, faceHeight: 0.86, faceY: 5.02, neckY: 4.22,
      torsoY: 3.02, shoulderWidth: 1.76, waistWidth: 1.12, torsoHeight: 2.12, torsoBack: 0.38, torsoFront: 0.8,
      pelvisY: 1.86, pelvisHeight: 0.82, pelvisBack: 0.28, pelvisFront: 0.46, hipWidth: 1.18,
      shoulderX: 1.02, shoulderY: 3.98, upperArmLength: 1.28, upperArmTopWidth: 0.32, upperArmBottomWidth: 0.24, upperArmDepthBack: 0.18, upperArmDepthFront: 0.18,
      forearmLength: 1.18, forearmTopWidth: 0.24, forearmBottomWidth: 0.18, forearmDepthBack: 0.14, forearmDepthFront: 0.16,
      handWidth: 0.24, handHeight: 0.28, handDepth: 0.2,
      hipX: 0.42, hipY: 1.72, thighLength: 1.42, thighTopWidth: 0.4, thighBottomWidth: 0.28, thighDepthBack: 0.22, thighDepthFront: 0.24,
      shinLength: 1.34, shinTopWidth: 0.28, shinBottomWidth: 0.2, shinDepthBack: 0.18, shinDepthFront: 0.2,
      footHeelWidth: 0.24, footToeWidth: 0.46, footHeight: 0.34, footBack: 0.22, footFront: 0.68,
    },
    colors: {
      skin: '#d5a881',
      torso: '#4c3c63',
      pelvis: '#24324a',
      limb: '#c3926d',
      limbAlt: '#b27f5f',
      hand: '#cf9e78',
      leg: '#31456a',
      legAlt: '#293b5b',
      boot: '#43362b',
    },
  },
  {
    id: 'psx_humanoid_heavy_mold_cm',
    name: 'Molde Humanoide Pesado PSX',
    config: {
      headY: 5.02, headWidth: 1.72, headHeight: 1.7, headBack: 0.52, headFront: 0.86, faceWidth: 1.08, faceHeight: 0.9, faceY: 4.9, neckY: 4.1,
      torsoY: 2.98, shoulderWidth: 2.42, waistWidth: 1.86, torsoHeight: 2.3, torsoBack: 0.56, torsoFront: 1.02,
      pelvisY: 1.72, pelvisHeight: 0.96, pelvisBack: 0.42, pelvisFront: 0.62, hipWidth: 1.94,
      shoulderX: 1.4, shoulderY: 3.96, upperArmLength: 1.18, upperArmTopWidth: 0.58, upperArmBottomWidth: 0.46, upperArmDepthBack: 0.32, upperArmDepthFront: 0.32,
      forearmLength: 1.02, forearmTopWidth: 0.46, forearmBottomWidth: 0.36, forearmDepthBack: 0.24, forearmDepthFront: 0.26,
      handWidth: 0.4, handHeight: 0.34, handDepth: 0.3,
      hipX: 0.64, hipY: 1.58, thighLength: 1.34, thighTopWidth: 0.7, thighBottomWidth: 0.52, thighDepthBack: 0.36, thighDepthFront: 0.38,
      shinLength: 1.22, shinTopWidth: 0.5, shinBottomWidth: 0.38, shinDepthBack: 0.3, shinDepthFront: 0.32,
      footHeelWidth: 0.42, footToeWidth: 0.78, footHeight: 0.46, footBack: 0.36, footFront: 0.94,
    },
    colors: {
      skin: '#c99f7c',
      torso: '#5b2b2b',
      pelvis: '#35425e',
      limb: '#b98c69',
      limbAlt: '#a77a59',
      hand: '#c79974',
      leg: '#49556f',
      legAlt: '#3b455d',
      boot: '#574232',
    },
  },
];

export const GENERATED_CHARACTER_MOLDS = MOLD_VARIANTS.map((entry) => (
  createHumanoidMoldTemplate(entry.id, entry.name, entry.config, entry.colors)
));
