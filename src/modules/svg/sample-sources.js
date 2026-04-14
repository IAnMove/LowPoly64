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

const N64_CAP_HERO_HEAD = createInflatedHeadSample({
  profile: 'round',
  skinColor: '#efc29a',
  earColor: '#deab82',
  hairBackColor: '#5a301d',
  hairFrontColor: '#6f3a21',
  browColor: '#432519',
  headPath: 'M256 96L214 104L182 128L162 170L154 224L160 282L182 328L214 364L234 378L234 442H278L278 378L298 364L330 328L352 282L358 224L350 170L330 128L298 104Z',
  hairBackPath: 'M124 212L140 158L188 116L256 92L324 116L372 158L388 212L356 202L322 190L256 182L190 190L156 202Z',
  hairFrontPath: 'M164 196L194 172L228 160H284L318 172L348 196L322 206L296 220L256 226L216 220L190 206Z',
  earLeftPath: 'M132 258c-18 8-26 27-26 51 0 24 11 43 28 50 12 5 24-3 24-24v-52c0-16-8-31-26-25Z',
  earRightPath: 'M380 258c18 8 26 27 26 51 0 24-11 43-28 50-12 5-24-3-24-24v-52c0-16 8-31 26-25Z',
  browLeftPath: 'M182 224L208 210H240L220 226L194 236Z',
  browRightPath: 'M330 224L304 210H272L292 226L318 236Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M182 248L198 232H232L246 246L232 260H198Z" fill="#fff7ee"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M266 246L280 232H314L330 248L314 260H280Z" fill="#fff7ee"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M206 248L214 240L224 248L214 256Z" fill="#3a79c2"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M290 248L298 240L308 248L298 256Z" fill="#3a79c2"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M211 248L214 244L219 248L214 252Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M295 248L298 244L303 248L298 252Z" fill="#111111"/>',
  nosePath: 'M256 236L244 258L244 292H268L268 258Z',
  mouthPath: 'M220 324L236 336H276L292 324L276 320H236Z',
  extras: '<path id="CAP_BACK" data-rv-role="hat_back" data-rv-shell="0.07" data-rv-depth="0.09" d="M126 210L144 152L198 110L256 92L314 110L368 152L386 210L352 198L320 190L256 184L192 190L160 198Z" fill="#d4362f"/><path id="CAP_FRONT" data-rv-role="hat_front" d="M148 194L190 166H322L364 194L330 204L256 208L182 204Z" fill="#ef4b3e"/><path id="CAP_BRIM" data-rv-role="hat_front" d="M172 194L210 182H302L340 194L304 222H208Z" fill="#ad2623"/><path id="SIDEBURN_L" data-rv-role="hair" d="M170 198L188 190L194 236L178 260L164 238Z" fill="#6a3921"/><path id="SIDEBURN_R" data-rv-role="hair" d="M342 198L324 190L318 236L334 260L348 238Z" fill="#6a3921"/>',
});

const N64_PRINCESS_HEAD = createInflatedHeadSample({
  profile: 'chibi',
  skinColor: '#f7d7c0',
  earColor: '#efc1a5',
  hairBackColor: '#e1b63a',
  hairFrontColor: '#f0c748',
  browColor: '#aa7f18',
  headPath: 'M256 92L202 100L168 126L148 170L142 228L152 286L178 336L214 374L236 388L236 446H276L276 388L298 374L334 336L360 286L370 228L364 170L344 126L310 100Z',
  hairBackPath: 'M118 214L136 150L190 102L256 80L322 102L376 150L394 214L362 204L330 194L256 186L182 194L150 204Z',
  hairFrontPath: 'M150 178L188 146L256 134L324 146L362 178L334 182L316 212L292 234L256 224L220 234L196 212L178 182Z',
  earLeftPath: 'M126 260c-17 10-24 28-24 50 0 23 9 41 24 50 13 7 28-1 28-23v-56c0-17-10-29-28-21Z',
  earRightPath: 'M386 260c17 10 24 28 24 50 0 23-9 41-24 50-13 7-28-1-28-23v-56c0-17 10-29 28-21Z',
  browLeftPath: 'M182 224L206 210H238L218 226L194 234Z',
  browRightPath: 'M330 224L306 210H274L294 226L318 234Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M176 248L194 228H232L248 246L232 266H194Z" fill="#fff8f4"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M264 246L280 228H318L336 248L318 266H280Z" fill="#fff8f4"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M204 248L214 238L224 248L214 258Z" fill="#3d94da"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M288 248L298 238L308 248L298 258Z" fill="#3d94da"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M210 248L214 244L218 248L214 252Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M294 248L298 244L302 248L298 252Z" fill="#111111"/>',
  nosePath: 'M256 248L248 274H264Z',
  mouthPath: 'M230 326L242 336H270L282 326L256 332Z',
  extras: '<path id="CROWN_BACK" data-rv-role="hat_back" data-rv-shell="0.06" data-rv-depth="0.06" d="M184 144L206 108H306L328 144L300 138L256 134L212 138Z" fill="#c78d1d"/><path id="CROWN_FRONT" data-rv-role="hat_front" d="M184 146L206 116L228 136L256 94L284 136L306 116L328 146L294 158H218Z" fill="#ffcf39"/><path id="SIDE_HAIR_L" data-rv-role="hair" d="M160 184L188 172L196 254L174 320L150 298L146 224Z" fill="#efc649"/><path id="SIDE_HAIR_R" data-rv-role="hair" d="M352 184L324 172L316 254L338 320L362 298L366 224Z" fill="#efc649"/><circle cx="256" cy="110" r="9" fill="#d63d75"/><circle cx="214" cy="128" r="6" fill="#3ea6df"/><circle cx="298" cy="128" r="6" fill="#56b970"/><circle cx="182" cy="294" r="11" fill="#f6aab4" opacity="0.38"/><circle cx="330" cy="294" r="11" fill="#f6aab4" opacity="0.38"/>',
});

const N64_ADVENTURE_HERO_HEAD = createInflatedHeadSample({
  profile: 'hero-round',
  skinColor: '#f2c8a4',
  earColor: '#e4b28d',
  hairBackColor: '#7a5432',
  hairFrontColor: '#d7a43d',
  browColor: '#6f4a19',
  headPath: 'M256 100L214 108L182 132L162 176L156 232L166 286L190 330L220 362L238 376L238 438H274L274 376L292 362L322 330L346 286L356 232L350 176L330 132L298 108Z',
  hairBackPath: 'M122 212L142 154L194 108L256 86L318 108L370 154L390 212L362 202L330 190L256 182L182 190L150 202Z',
  hairFrontPath: 'M138 180L170 152L208 132L256 122L304 132L342 152L374 180L346 180L320 202L294 218L256 214L218 218L192 202L166 180Z',
  earLeftPath: 'M134 250L122 270L124 306L140 324L158 314L156 278L166 254L156 244Z',
  earRightPath: 'M378 250L390 270L388 306L372 324L354 314L356 278L346 254L356 244Z',
  browLeftPath: 'M184 220L210 206H238L220 222L194 232Z',
  browRightPath: 'M328 220L302 206H274L292 222L318 232Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M186 248L202 236H228L240 248L228 258H202Z" fill="#fff7ee"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 248L284 236H310L326 248L310 258H284Z" fill="#fff7ee"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M206 248L214 242L222 248L214 254Z" fill="#2d8e98"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M290 248L298 242L306 248L298 254Z" fill="#2d8e98"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M211 248L214 245L217 248L214 251Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M295 248L298 245L301 248L298 251Z" fill="#111111"/>',
  nosePath: 'M256 242L246 278H266Z',
  mouthPath: 'M220 320L238 330H274L292 320L274 324H238Z',
  extras: '<path id="HAIR_SLAB_L" data-rv-role="hair" d="M160 168L180 128L220 96L214 148L226 186L196 192Z" fill="#dda93e"/><path id="HAIR_SLAB_M" data-rv-role="hair" d="M232 142L256 92L280 142L268 192H244Z" fill="#f2bf53"/><path id="HAIR_SLAB_R" data-rv-role="hair" d="M352 168L332 128L292 96L298 148L286 186L316 192Z" fill="#dda93e"/>',
});

const PSX_SPIKY_MERC_HEAD = createInflatedHeadSample({
  profile: 'angular',
  skinColor: '#f0c39c',
  earColor: '#dbac84',
  hairBackColor: '#c48c27',
  hairFrontColor: '#efbf42',
  browColor: '#503b14',
  headPath: 'M256 126L228 132L204 158L192 206L196 258L212 300L236 330L236 378H276L276 330L300 300L316 258L320 206L308 158L284 132Z',
  hairBackPath: 'M122 208L150 148L206 102L256 80L306 102L362 148L390 208L356 198L322 188L256 176L190 188L156 198Z',
  hairFrontPath: 'M106 188L142 176L176 140L214 90L208 154L232 184L252 110L280 44L288 132L316 170L344 114L392 78L372 156L406 188L354 186L324 198L292 226L256 218L220 226L188 198L156 186Z',
  earLeftPath: 'M136 260c-15 7-24 25-24 48s10 41 23 49c10 6 21-2 21-22v-54c0-15-7-28-20-21Z',
  earRightPath: 'M376 260c15 7 24 25 24 48s-10 41-23 49c-10 6-21-2-21-22v-54c0-15 7-28 20-21Z',
  browLeftPath: 'M190 224L222 200H248L224 218L198 226Z',
  browRightPath: 'M322 224L290 200H264L288 218L314 226Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M196 248L212 240H232L238 246L232 250H212Z" fill="#fff7ef"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 246L280 240H300L316 248L300 250H280Z" fill="#fff7ef"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M216 246L220 243L224 246L220 249H216Z" fill="#4d8fc0"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M292 246L296 243L300 246L296 249H292Z" fill="#4d8fc0"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M218 246L220 245L222 246L220 247Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M294 246L296 245L298 246L296 247Z" fill="#111111"/>',
  nosePath: 'M256 240L250 270H262Z',
  mouthPath: 'M232 316L246 320H268L282 316L268 318H246Z',
  extras: '<path id="SPIKE_L1" data-rv-role="hair" d="M128 190L146 138L192 92L186 154L198 188Z" fill="#d3a52b"/><path id="SPIKE_L2" data-rv-role="hair" d="M180 154L202 90L246 42L236 126L246 188Z" fill="#ebb943"/><path id="SPIKE_TOP" data-rv-role="hair" d="M236 142L258 54L280 142L266 194H246Z" fill="#ffd65f"/><path id="SPIKE_R1" data-rv-role="hair" d="M332 154L310 90L266 42L276 126L266 188Z" fill="#ebb943"/><path id="SPIKE_R2" data-rv-role="hair" d="M384 190L366 138L320 92L326 154L314 188Z" fill="#d3a52b"/><path id="FORELOCK" data-rv-role="hair" d="M244 154L258 126L274 156L266 212H246Z" fill="#f9d96f"/><path id="SPIKE_SIDE_L" data-rv-role="hair" d="M150 202L176 192L170 236L152 252L142 230Z" fill="#c89424"/><path id="SPIKE_SIDE_R" data-rv-role="hair" d="M362 202L336 192L342 236L360 252L370 230Z" fill="#c89424"/>',
});

const PSX_GUARD_HELM_HEAD = createInflatedHeadSample({
  profile: 'angular',
  skinColor: '#d9b18d',
  earColor: '#ca9b72',
  hairBackColor: '#1c1f2e',
  hairFrontColor: '#23293c',
  browColor: '#23283a',
  headPath: 'M256 118L222 126L194 154L180 202L184 258L204 304L232 336L232 388H280L280 336L308 304L328 258L332 202L318 154L290 126Z',
  hairBackPath: 'M144 212L166 154L210 116L256 98L302 116L346 154L368 212L338 202L306 194L256 188L206 194L174 202Z',
  hairFrontPath: 'M190 190L216 174H296L322 190L296 196L256 198L216 196Z',
  earLeftPath: 'M144 262c-13 8-20 24-20 44 0 20 8 37 20 45 9 6 18-2 18-20v-48c0-14-7-27-18-21Z',
  earRightPath: 'M368 262c13 8 20 24 20 44 0 20-8 37-20 45-9 6-18-2-18-20v-48c0-14 7-27 18-21Z',
  browLeftPath: 'M198 230L224 214H248L224 226L202 232Z',
  browRightPath: 'M314 230L288 214H264L288 226L310 232Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M200 250L214 244H234L240 248L234 252H214Z" fill="#fff7ef"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 248L278 244H298L312 250L298 252H278Z" fill="#fff7ef"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M218 248L222 246L226 248L222 252H218Z" fill="#6ba0c3"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M288 248L292 246L296 248L292 252H288Z" fill="#6ba0c3"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M220 248L222 247L224 248L222 249Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M290 248L292 247L294 248L292 249Z" fill="#111111"/>',
  nosePath: 'M256 246L250 274H262Z',
  mouthPath: 'M234 320L246 324H266L278 320L266 321H246Z',
  extras: '<path id="HELM_BACK" data-rv-role="hat_back" data-rv-shell="0.08" data-rv-depth="0.09" d="M144 212L168 144L214 106L256 94L298 106L344 144L368 212L336 202L306 192L256 188L206 192L176 202Z" fill="#49556f"/><path id="HELM_FRONT" data-rv-role="hat_front" d="M164 188L206 148H306L348 188L314 198H198Z" fill="#617291"/><path id="HELM_BAND" data-rv-role="hat_front" d="M182 190L214 180H298L330 190L304 222H208Z" fill="#7f93bb"/><path id="CHEEK_GUARD_L" data-rv-role="hat_front" d="M178 194L198 198L196 260L176 284L164 252Z" fill="#5a6885"/><path id="CHEEK_GUARD_R" data-rv-role="hat_front" d="M334 194L314 198L316 260L336 284L348 252Z" fill="#5a6885"/><path d="M256 124L266 144L288 148L272 164L276 186L256 176L236 186L240 164L224 148L246 144Z" fill="#d4b45b"/>',
});

const PSX_PRINCESS_BOB_HEAD = createInflatedHeadSample({
  profile: 'angular',
  skinColor: '#f0cbb0',
  earColor: '#e0b695',
  hairBackColor: '#5d2c3f',
  hairFrontColor: '#7a3751',
  browColor: '#542335',
  headPath: 'M256 112L220 120L192 148L178 196L182 252L202 304L230 340L236 374L276 374L282 340L310 304L330 252L334 196L320 148L292 120Z',
  hairBackPath: 'M136 212L156 152L204 112L256 94L308 112L356 152L376 212L346 202L314 192L256 186L198 192L166 202Z',
  hairFrontPath: 'M154 180L192 150H320L358 180L330 192L312 226L290 244L256 236L222 244L200 226L182 192Z',
  earLeftPath: 'M132 260c-16 9-24 27-24 49 0 23 10 41 24 49 11 7 22-1 22-21v-54c0-16-8-30-22-23Z',
  earRightPath: 'M380 260c16 9 24 27 24 49 0 23-10 41-24 49-11 7-22-1-22-21v-54c0-16 8-30 22-23Z',
  browLeftPath: 'M192 228L214 214H240L218 228L196 234Z',
  browRightPath: 'M320 228L298 214H272L294 228L316 234Z',
  eyeWhiteLeft: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M192 252L206 244H228L238 250L228 256H206Z" fill="#fff8f2"/>',
  eyeWhiteRight: '<path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 250L284 244H306L320 252L306 256H284Z" fill="#fff8f2"/>',
  irisLeft: '<path id="IRIS_L" data-rv-role="iris" d="M209 250L214 246L219 250L214 254Z" fill="#60a7cd"/>',
  irisRight: '<path id="IRIS_R" data-rv-role="iris" d="M293 250L298 246L303 250L298 254Z" fill="#60a7cd"/>',
  pupilLeft: '<path id="PUPIL_L" data-rv-role="pupil" d="M212 250L214 248L216 250L214 252Z" fill="#111111"/>',
  pupilRight: '<path id="PUPIL_R" data-rv-role="pupil" d="M296 250L298 248L300 250L298 252Z" fill="#111111"/>',
  nosePath: 'M256 248L250 274H262Z',
  mouthPath: 'M232 322L244 326H268L280 322L268 324H244Z',
  extras: '<path id="BOB_L" data-rv-role="hair" d="M154 196L190 166L198 254L176 338L150 314L144 236Z" fill="#683046"/><path id="BOB_R" data-rv-role="hair" d="M358 196L322 166L314 254L336 338L362 314L368 236Z" fill="#683046"/><path id="BANG_PANEL_L" data-rv-role="hair" d="M196 168L224 156L220 220L198 234Z" fill="#7e3a54"/><path id="BANG_PANEL_R" data-rv-role="hair" d="M316 168L288 156L292 220L314 234Z" fill="#7e3a54"/><path id="RIBBON" data-rv-role="hat_front" d="M214 158L228 138H284L298 158L278 168H234Z" fill="#2b87b6"/>',
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
  headN64CapHero: {
    name: 'N64 Cap Hero',
    buttonLabel: 'N64 MASCOT',
    library: 'head',
    section: 'N64 Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: N64_CAP_HERO_HEAD,
    settings: {
      name: 'N64 CAP HERO',
      renderMode: 'inflated-head',
      targetSize: 5.2,
      depth: 1.1,
      smoothness: 0.18,
    },
  },
  headN64Princess: {
    name: 'N64 Princess',
    buttonLabel: 'N64 CROWN',
    library: 'head',
    section: 'N64 Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: N64_PRINCESS_HEAD,
    settings: {
      name: 'N64 PRINCESS',
      renderMode: 'inflated-head',
      targetSize: 5.3,
      depth: 1.08,
      smoothness: 0.2,
    },
  },
  headN64AdventureHero: {
    name: 'N64 Adventure Hero',
    buttonLabel: 'N64 QUEST',
    library: 'head',
    section: 'N64 Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: N64_ADVENTURE_HERO_HEAD,
    settings: {
      name: 'N64 ADVENTURE HERO',
      renderMode: 'inflated-head',
      targetSize: 5.1,
      depth: 1.1,
      smoothness: 0.18,
    },
  },
  headPsxSpikyMerc: {
    name: 'PSX Spiky Merc',
    buttonLabel: 'PSX FF7',
    library: 'head',
    section: 'PSX Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: PSX_SPIKY_MERC_HEAD,
    settings: {
      name: 'PSX SPIKY MERC',
      renderMode: 'inflated-head',
      targetSize: 5.1,
      depth: 1.12,
      smoothness: 0.05,
    },
  },
  headPsxGuardHelm: {
    name: 'PSX Guard Helm',
    buttonLabel: 'PSX GUARD',
    library: 'head',
    section: 'PSX Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: PSX_GUARD_HELM_HEAD,
    settings: {
      name: 'PSX GUARD HELM',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.1,
      smoothness: 0.08,
    },
  },
  headPsxPrincessBob: {
    name: 'PSX Princess Bob',
    buttonLabel: 'PSX BOB',
    library: 'head',
    section: 'PSX Style',
    mode: SVG_SOURCE_MODE.CODE,
    markup: PSX_PRINCESS_BOB_HEAD,
    settings: {
      name: 'PSX PRINCESS BOB',
      renderMode: 'inflated-head',
      targetSize: 5,
      depth: 1.08,
      smoothness: 0.1,
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
