import { SVG_SOURCE_MODE } from './svg-metadata.js';

function pixelPatternToGrid(pattern) {
  return pattern.map((row) => [...row].map((cell) => cell === '1'));
}

function createInflatedHeadSample({
  profile = 'hero-round',
  headPath,
  hairBackPath,
  hairFrontPath,
  earLeftPath,
  earRightPath,
  browLeftPath,
  browRightPath,
  eyeWhiteLeft = '<ellipse id="EYE_WHITE_L" data-rv-role="eye_white" cx="214" cy="246" rx="28" ry="20" fill="#fff7f0"/>',
  eyeWhiteRight = '<ellipse id="EYE_WHITE_R" data-rv-role="eye_white" cx="298" cy="246" rx="28" ry="20" fill="#fff7f0"/>',
  irisLeft = '<circle id="IRIS_L" data-rv-role="iris" cx="214" cy="250" r="11" fill="#2a6fb2"/>',
  irisRight = '<circle id="IRIS_R" data-rv-role="iris" cx="298" cy="250" r="11" fill="#2a6fb2"/>',
  pupilLeft = '<circle id="PUPIL_L" data-rv-role="pupil" cx="214" cy="250" r="5" fill="#111111"/>',
  pupilRight = '<circle id="PUPIL_R" data-rv-role="pupil" cx="298" cy="250" r="5" fill="#111111"/>',
  nosePath,
  mouthPath,
  skinColor = '#f2c39b',
  earColor = '#e4b18e',
  hairBackColor = '#4a2b24',
  hairFrontColor = '#6b3e30',
  browColor = '#3e241b',
  extras = '',
}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" data-rv-import="inflated-head" data-rv-head="HEAD_BASE" data-rv-profile="${profile}">
  <path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.06" data-rv-depth="0.12" d="${hairBackPath}" fill="${hairBackColor}"/>
  <path id="EAR_L" data-rv-role="ear" d="${earLeftPath}" fill="${earColor}"/>
  <path id="EAR_R" data-rv-role="ear" d="${earRightPath}" fill="${earColor}"/>
  <path id="HEAD_BASE" data-rv-role="head" data-rv-volume="head" data-rv-back-bias="0.46" data-rv-back-boxiness="0.3" d="${headPath}" fill="${skinColor}"/>
  <path id="HAIR_FRONT" data-rv-role="hair" d="${hairFrontPath}" fill="${hairFrontColor}"/>
  <path id="BROW_L" data-rv-role="eyebrow" d="${browLeftPath}" fill="${browColor}"/>
  <path id="BROW_R" data-rv-role="eyebrow" d="${browRightPath}" fill="${browColor}"/>
  ${eyeWhiteLeft}
  ${eyeWhiteRight}
  ${irisLeft}
  ${irisRight}
  ${pupilLeft}
  ${pupilRight}
  <path id="NOSE" data-rv-role="nose" data-rv-bump="0.1" d="${nosePath}" fill="#dd9e79"/>
  <path id="MOUTH" data-rv-role="mouth" d="${mouthPath}" fill="#8e4150"/>
  ${extras}
</svg>`;
}

const FILLED_STAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#000000"/>
</svg>`;

const STROKE_BOLT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>
</svg>`;

const PIXEL_HEART = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144">
  <path d="M27,18L45,18L45,36L63,36L63,18L81,18L81,36L99,36L99,18L117,18L117,36L126,36L126,54L117,54L117,72L108,72L108,81L99,81L99,90L90,90L90,99L81,99L81,108L72,108L72,117L63,117L63,108L54,108L54,99L45,99L45,90L36,90L36,81L27,81L27,72L18,72L18,54L9,54L9,36L27,36Z" fill="#000000" fill-rule="evenodd"/>
</svg>`;

const HERO_ROUND_HEAD = createInflatedHeadSample({
  profile: 'hero-round',
  headPath: 'M256 92C191 92 136 148 136 232c0 76 41 123 82 149 20 13 32 33 32 53v10h12v-10c0-20 12-40 32-53 41-26 82-73 82-149 0-84-55-140-120-140Z',
  hairBackPath: 'M108 226C108 124 186 68 256 68c70 0 148 56 148 158 0 90-35 145-72 182H180c-37-37-72-92-72-182Z',
  hairFrontPath: 'M156 172c18-58 62-92 100-92 49 0 93 23 118 82-25-12-49-18-72-19-4 22-19 42-42 56-18-17-29-36-34-58-20 25-50 39-86 42 0-4 5-9 16-11Z',
  earLeftPath: 'M132 254c-20 8-30 28-30 52 0 24 11 45 28 54 14 7 28-4 28-25v-56c0-18-10-31-26-25Z',
  earRightPath: 'M380 254c20 8 30 28 30 52 0 24-11 45-28 54-14 7-28-4-28-25v-56c0-18 10-31 26-25Z',
  browLeftPath: 'M176 218c16-14 37-21 60-20 8 0 17 1 25 3-15 7-27 16-37 28-12-5-30-8-48-11Z',
  browRightPath: 'M336 218c-16-14-37-21-60-20-8 0-17 1-25 3 15 7 27 16 37 28 12-5 30-8 48-11Z',
  nosePath: 'M256 246c-10 14-16 31-14 48h28c2-17-4-34-14-48Z',
  mouthPath: 'M206 324c18 19 33 26 50 26 17 0 32-7 50-26-18 8-34 12-50 12-16 0-32-4-50-12Z',
});

const ROGUE_SHARP_HEAD = createInflatedHeadSample({
  profile: 'angular',
  skinColor: '#e8b28c',
  earColor: '#d79b74',
  hairBackColor: '#1d1a25',
  hairFrontColor: '#23202c',
  browColor: '#16131c',
  headPath: 'M256 94c-64 0-114 48-118 130-2 46 10 86 34 118 15 20 34 35 52 47 19 13 28 30 28 51v8h8v-8c0-21 9-38 28-51 18-12 37-27 52-47 24-32 36-72 34-118-4-82-54-130-118-130Z',
  hairBackPath: 'M114 224c0-104 72-164 142-164s142 60 142 164c0 84-29 134-76 186H190c-47-52-76-102-76-186Z',
  hairFrontPath: 'M142 182c28-70 78-104 128-104 41 0 76 13 112 44-8 7-16 17-24 31-28-18-53-27-76-27-3 18-15 37-36 58-17-10-30-26-40-48-21 29-48 47-80 54-4-2-1-5 16-8Z',
  earLeftPath: 'M136 258c-18 9-27 26-27 49s11 42 26 50c11 6 24-3 24-22v-56c0-16-8-28-23-21Z',
  earRightPath: 'M376 258c18 9 27 26 27 49s-11 42-26 50c-11 6-24-3-24-22v-56c0-16 8-28 23-21Z',
  browLeftPath: 'M180 216c22-19 44-26 69-24 11 1 18 2 24 5-18 8-31 19-42 31-14-5-30-8-51-12Z',
  browRightPath: 'M332 216c-22-19-44-26-69-24-11 1-18 2-24 5 18 8 31 19 42 31 14-5 30-8 51-12Z',
  nosePath: 'M256 244c-8 14-14 32-12 51h24c2-18-2-37-12-51Z',
  mouthPath: 'M214 326c12 12 27 18 42 18s30-6 42-18c-13 3-27 5-42 5s-29-2-42-5Z',
  extras: '<path id="SCAR" d="M315 236c-14 16-22 34-28 54" stroke="#6f2730" stroke-width="7" stroke-linecap="round" fill="none"/>',
});

const CHIBI_SOFT_HEAD = createInflatedHeadSample({
  profile: 'chibi',
  skinColor: '#f5d0b2',
  earColor: '#ebb995',
  hairBackColor: '#7b4b2f',
  hairFrontColor: '#925635',
  browColor: '#6d3d22',
  headPath: 'M256 84c-76 0-130 58-130 140 0 64 30 108 72 140 22 16 36 36 36 56v12h44v-12c0-20 14-40 36-56 42-32 72-76 72-140 0-82-54-140-130-140Z',
  hairBackPath: 'M104 220c0-106 80-166 152-166s152 60 152 166c0 88-33 140-80 194H184c-47-54-80-106-80-194Z',
  hairFrontPath: 'M152 168c16-48 54-78 104-78 55 0 92 24 118 72-20-4-40-6-61-5-12 16-28 30-49 42-18-14-31-29-38-47-23 18-49 27-78 29-4-4-2-8 4-13Z',
  earLeftPath: 'M126 258c-16 10-24 30-24 53s10 42 24 50c13 7 28-2 28-24v-60c0-18-10-28-28-19Z',
  earRightPath: 'M386 258c16 10 24 30 24 53s-10 42-24 50c-13 7-28-2-28-24v-60c0-18 10-28 28-19Z',
  browLeftPath: 'M184 220c15-10 31-15 48-15 11 0 22 2 31 5-12 6-22 13-30 22-14-4-31-8-49-12Z',
  browRightPath: 'M328 220c-15-10-31-15-48-15-11 0-22 2-31 5 12 6 22 13 30 22 14-4 31-8 49-12Z',
  eyeWhiteLeft: '<ellipse id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="250" rx="31" ry="22" fill="#fff7f0"/>',
  eyeWhiteRight: '<ellipse id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="250" rx="31" ry="22" fill="#fff7f0"/>',
  irisLeft: '<circle id="IRIS_L" data-rv-role="iris" cx="212" cy="254" r="12" fill="#31a0b7"/>',
  irisRight: '<circle id="IRIS_R" data-rv-role="iris" cx="300" cy="254" r="12" fill="#31a0b7"/>',
  pupilLeft: '<circle id="PUPIL_L" data-rv-role="pupil" cx="212" cy="254" r="5" fill="#111111"/>',
  pupilRight: '<circle id="PUPIL_R" data-rv-role="pupil" cx="300" cy="254" r="5" fill="#111111"/>',
  nosePath: 'M256 252c-8 10-12 23-10 35h20c2-12-2-25-10-35Z',
  mouthPath: 'M220 324c10 15 22 21 36 21s26-6 36-21c-12 5-24 8-36 8s-24-3-36-8Z',
  extras: '<circle cx="178" cy="292" r="12" fill="#f2a7a6" opacity="0.45"/><circle cx="334" cy="292" r="12" fill="#f2a7a6" opacity="0.45"/>',
});

const SAGE_THIN_HEAD = createInflatedHeadSample({
  profile: 'round',
  skinColor: '#dcb899',
  earColor: '#cfa282',
  hairBackColor: '#d7d8dd',
  hairFrontColor: '#f1f2f6',
  browColor: '#b8bbc4',
  headPath: 'M256 96c-62 0-112 52-112 132 0 76 36 120 74 148 18 14 30 34 30 54v8h16v-8c0-20 12-40 30-54 38-28 74-72 74-148 0-80-50-132-112-132Z',
  hairBackPath: 'M118 224c0-100 64-158 138-158 74 0 138 58 138 158 0 88-33 136-72 184H190c-39-48-72-96-72-184Z',
  hairFrontPath: 'M156 170c8-50 44-84 100-84 43 0 86 22 118 70-20-12-40-19-62-21-13 18-29 31-48 38-22-8-39-23-50-44-18 21-38 35-62 41-2-1-1-2 4-4Z',
  earLeftPath: 'M138 260c-16 7-24 25-24 46 0 22 9 40 22 49 10 7 22-1 22-20v-52c0-15-7-29-20-23Z',
  earRightPath: 'M374 260c16 7 24 25 24 46 0 22-9 40-22 49-10 7-22-1-22-20v-52c0-15 7-29 20-23Z',
  browLeftPath: 'M188 216c13-8 27-12 43-12 9 0 18 1 26 3-10 5-20 11-29 18-13-3-26-6-40-9Z',
  browRightPath: 'M324 216c-13-8-27-12-43-12-9 0-18 1-26 3 10 5 20 11 29 18 13-3 26-6 40-9Z',
  nosePath: 'M256 244c-6 15-10 32-8 50h16c2-18-1-35-8-50Z',
  mouthPath: 'M214 330c15 12 29 18 42 18s27-6 42-18c-14 2-28 4-42 4s-28-2-42-4Z',
  extras: '<path d="M204 338c18 18 34 28 52 28 18 0 34-10 52-28" stroke="#f4f6fb" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.9"/>',
});

const PONYTAIL_ADVENTURER_HEAD = createInflatedHeadSample({
  profile: 'hero-round',
  skinColor: '#f1c5a1',
  earColor: '#e2ad89',
  hairBackColor: '#7e3f22',
  hairFrontColor: '#8f4b29',
  browColor: '#6d371e',
  headPath: 'M256 92c-64 0-118 52-118 136 0 74 38 120 80 149 18 12 30 31 30 51v12h16v-12c0-20 12-39 30-51 42-29 80-75 80-149 0-84-54-136-118-136Z',
  hairBackPath: 'M108 220c0-102 72-160 148-160s148 58 148 160c0 90-32 144-78 194H188c-46-50-80-104-80-194Z',
  hairFrontPath: 'M150 174c16-58 60-92 106-92 46 0 82 17 118 58-27-5-51-3-70 5-12 18-27 35-46 49-15-16-25-33-29-50-26 18-55 28-87 31-3-1 0-2 8-1Z',
  earLeftPath: 'M134 256c-18 8-26 28-26 50 0 24 11 43 26 52 12 7 24-1 24-22v-56c0-16-8-30-24-24Z',
  earRightPath: 'M378 256c18 8 26 28 26 50 0 24-11 43-26 52-12 7-24-1-24-22v-56c0-16 8-30 24-24Z',
  browLeftPath: 'M176 220c18-14 38-21 59-20 11 1 19 2 24 5-15 7-28 16-38 28-14-5-28-8-45-13Z',
  browRightPath: 'M336 220c-18-14-38-21-59-20-11 1-19 2-24 5 15 7 28 16 38 28 14-5 28-8 45-13Z',
  nosePath: 'M256 246c-8 14-13 30-12 47h24c1-17-4-33-12-47Z',
  mouthPath: 'M212 322c15 16 30 22 44 22s29-6 44-22c-15 6-30 9-44 9s-29-3-44-9Z',
  extras: '<path id="PONYTAIL" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.1" d="M340 250c42 18 58 58 48 96-8 31-28 58-52 78 9-23 10-48 2-73-9-27-27-47-44-60 10-17 24-31 46-41Z" fill="#6f341c"/>',
});

const BRAIDS_WARRIOR_HEAD = createInflatedHeadSample({
  profile: 'angular',
  skinColor: '#dca984',
  earColor: '#ca916a',
  hairBackColor: '#2e1d12',
  hairFrontColor: '#41281a',
  browColor: '#1f150f',
  headPath: 'M256 90c-66 0-116 50-120 132-2 52 16 96 48 128 15 16 30 29 48 42 18 13 28 29 28 48v12h8v-12c0-19 10-35 28-48 18-13 33-26 48-42 32-32 50-76 48-128-4-82-54-132-120-132Z',
  hairBackPath: 'M112 224c0-106 68-166 144-166 76 0 144 60 144 166 0 84-32 136-78 190H190c-46-54-78-106-78-190Z',
  hairFrontPath: 'M142 172c22-62 68-96 114-96 50 0 88 20 126 66-18-1-37 0-58 5-12 17-28 34-48 52-18-12-31-30-40-52-24 21-54 33-88 36-5-4-3-7-6-11Z',
  earLeftPath: 'M134 256c-17 8-26 26-26 50 0 23 9 41 24 49 12 7 23-2 23-22v-56c0-17-8-28-21-21Z',
  earRightPath: 'M378 256c17 8 26 26 26 50 0 23-9 41-24 49-12 7-23-2-23-22v-56c0-17 8-28 21-21Z',
  browLeftPath: 'M176 214c22-18 44-25 66-23 9 0 16 2 24 5-17 7-31 17-44 32-14-5-31-9-46-14Z',
  browRightPath: 'M336 214c-22-18-44-25-66-23-9 0-16 2-24 5 17 7 31 17 44 32 14-5 31-9 46-14Z',
  nosePath: 'M256 244c-9 14-14 30-12 47h24c2-17-3-33-12-47Z',
  mouthPath: 'M214 324c14 14 28 20 42 20s28-6 42-20c-13 4-27 6-42 6s-29-2-42-6Z',
  extras: '<path id="BRAID_L" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.1" d="M162 266c-28 20-42 50-40 86 2 26 12 49 30 70-2-24 1-45 9-64 8-19 20-36 36-51-9-18-19-32-35-41Z" fill="#2b190f"/><path id="BRAID_R" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.1" d="M350 266c28 20 42 50 40 86-2 26-12 49-30 70 2-24-1-45-9-64-8-19-20-36-36-51 9-18 19-32 35-41Z" fill="#2b190f"/>',
});

const PIXEL_HEART_GRID = pixelPatternToGrid([
  '0000000000000000',
  '0001100000110000',
  '0011110001111000',
  '0111111011111100',
  '1111111111111110',
  '1111111111111110',
  '1111111111111110',
  '0111111111111100',
  '0011111111111000',
  '0001111111110000',
  '0000111111100000',
  '0000011111000000',
  '0000001110000000',
  '0000000100000000',
  '0000000000000000',
  '0000000000000000',
]);

export const SVG_SAMPLE_SOURCES = Object.freeze({
  filledStar: {
    name: 'Filled Star',
    buttonLabel: 'FILLED',
    library: 'general',
    section: 'Vector',
    mode: SVG_SOURCE_MODE.CODE,
    markup: FILLED_STAR,
  },
  strokeBolt: {
    name: 'Stroke Bolt',
    buttonLabel: 'STROKE',
    library: 'general',
    section: 'Vector',
    mode: SVG_SOURCE_MODE.CODE,
    markup: STROKE_BOLT,
  },
  pixelHeart: {
    name: 'Pixel Heart',
    buttonLabel: 'PIXEL',
    library: 'general',
    section: 'Pixel',
    mode: SVG_SOURCE_MODE.PIXEL,
    markup: PIXEL_HEART,
    inputs: {
      gridSize: 16,
      pixels: PIXEL_HEART_GRID,
    },
  },
  textRetro: {
    name: 'Retro Text',
    buttonLabel: 'TEXT',
    library: 'general',
    section: 'Text',
    mode: SVG_SOURCE_MODE.TEXT,
    markup: '',
    inputs: {
      text: 'RETRO',
      fontName: 'Rubik Mono One',
    },
  },
  headHeroRound: {
    name: 'Hero Round',
    buttonLabel: 'HERO',
    library: 'head',
    section: 'Heroic',
    mode: SVG_SOURCE_MODE.CODE,
    markup: HERO_ROUND_HEAD,
    settings: {
      name: 'HERO ROUND',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.1,
      smoothness: 0.28,
    },
  },
  headRogueSharp: {
    name: 'Rogue Sharp',
    buttonLabel: 'ROGUE',
    library: 'head',
    section: 'Angular',
    mode: SVG_SOURCE_MODE.CODE,
    markup: ROGUE_SHARP_HEAD,
    settings: {
      name: 'ROGUE SHARP',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.1,
      smoothness: 0.24,
    },
  },
  headChibiSoft: {
    name: 'Chibi Soft',
    buttonLabel: 'CHIBI',
    library: 'head',
    section: 'Soft',
    mode: SVG_SOURCE_MODE.CODE,
    markup: CHIBI_SOFT_HEAD,
    settings: {
      name: 'CHIBI SOFT',
      renderMode: 'inflated-head',
      targetSize: 5.4,
      depth: 1.05,
      smoothness: 0.32,
    },
  },
  headSageThin: {
    name: 'Sage Thin',
    buttonLabel: 'SAGE',
    library: 'head',
    section: 'Soft',
    mode: SVG_SOURCE_MODE.CODE,
    markup: SAGE_THIN_HEAD,
    settings: {
      name: 'SAGE THIN',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.08,
      smoothness: 0.26,
    },
  },
  headPonytailAdventurer: {
    name: 'Ponytail Adventurer',
    buttonLabel: 'PONY',
    library: 'head',
    section: 'Hair-heavy',
    mode: SVG_SOURCE_MODE.CODE,
    markup: PONYTAIL_ADVENTURER_HEAD,
    settings: {
      name: 'PONYTAIL ADVENTURER',
      renderMode: 'inflated-head',
      targetSize: 5.1,
      depth: 1.12,
      smoothness: 0.28,
    },
  },
  headBraidsWarrior: {
    name: 'Braids Warrior',
    buttonLabel: 'BRAIDS',
    library: 'head',
    section: 'Hair-heavy',
    mode: SVG_SOURCE_MODE.CODE,
    markup: BRAIDS_WARRIOR_HEAD,
    settings: {
      name: 'BRAIDS WARRIOR',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.14,
      smoothness: 0.24,
    },
  },
});

export function getDefaultSvgSample() {
  return SVG_SAMPLE_SOURCES.filledStar;
}
