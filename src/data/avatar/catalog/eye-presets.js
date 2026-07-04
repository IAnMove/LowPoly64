const EYE_SPRITE_BY_PRESET_ID = Object.freeze({
  wide_01: 'eye_oval',
  dot_01: 'eye_dot',
  sleepy_01: 'eye_halfmoon',
  smile_01: 'eye_halfmoon',
  intense_01: 'eye_angry',
  psx_narrow_01: 'eye_angry',
  psx_almond_soft_01: 'eye_lash',
  psx_almond_sharp_01: 'eye_angry',
  psx_hero_square_01: 'eye_angry',
  psx_heavy_lid_01: 'eye_halfmoon',
  n64_cartool_oval_01: 'eye_oval',
  n64_round_toon_eye_01: 'eye_star',
  n64_bead_01: 'eye_dot',
  bridge_droopy_01: 'eye_halfmoon',
  bridge_confident_half_01: 'eye_angry',
  n64_round_big_01: 'eye_round_big',
  bridge_almond_01: 'eye_almond',
  bridge_happy_closed_01: 'eye_happy_closed',
  bridge_sad_closed_01: 'eye_sad_closed',
  bridge_wink_01: 'eye_wink',
  n64_surprised_round_01: 'eye_surprised',
  bridge_side_glance_01: 'eye_side_glance',
  n64_heart_01: 'eye_heart',
  psx_robot_square_01: 'eye_robot',
});

function withSpriteId(preset) {
  const spriteId = EYE_SPRITE_BY_PRESET_ID[preset.id];
  return Object.freeze(spriteId ? { ...preset, spriteId } : preset);
}

export const AVATAR_EYE_PRESETS = Object.freeze([
  {
    id: 'none_01',
    label: 'No Eyes',
    markup: '',
  },
  {
    id: 'wide_01',
    label: 'Wide',
    markup: '<ellipse id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" rx="28" ry="20" fill="{{eyeWhite}}"/><ellipse id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" rx="28" ry="20" fill="{{eyeWhite}}"/><circle id="IRIS_L" data-rv-role="iris" cx="212" cy="252" r="11" fill="{{iris}}"/><circle id="IRIS_R" data-rv-role="iris" cx="300" cy="252" r="11" fill="{{iris}}"/><circle id="PUPIL_L" data-rv-role="pupil" cx="212" cy="252" r="5" fill="{{outline}}"/><circle id="PUPIL_R" data-rv-role="pupil" cx="300" cy="252" r="5" fill="{{outline}}"/>',
  },
  {
    id: 'dot_01',
    label: 'Dot',
    markup: '<circle id="IRIS_L" data-rv-role="iris" cx="214" cy="252" r="7" fill="{{outline}}"/><circle id="IRIS_R" data-rv-role="iris" cx="298" cy="252" r="7" fill="{{outline}}"/>',
  },
  {
    id: 'sleepy_01',
    label: 'Sleepy',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M188 250L202 242H226L238 248L226 254H202Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 248L286 242H310L324 250L310 254H286Z" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M210 250L214 246L220 250L214 254Z" fill="{{irisDark}}"/><path id="IRIS_R" data-rv-role="iris" d="M294 250L298 246L304 250L298 254Z" fill="{{irisDark}}"/>',
  },
  {
    id: 'smile_01',
    label: 'Smile Eyes',
    markup: '<path id="EYE_SMILE_L" data-rv-role="eye_white" d="M188 252L198 240H230L240 252L230 258H198Z" fill="{{outline}}"/><path id="EYE_SMILE_R" data-rv-role="eye_white" d="M272 252L282 240H314L324 252L314 258H282Z" fill="{{outline}}"/>',
  },
  {
    id: 'intense_01',
    label: 'Intense',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M190 248L208 238H230L240 246L228 258H204Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 246L284 238H306L324 248L308 258H284Z" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M210 248L214 242L222 248L214 256Z" fill="{{iris}}"/><path id="IRIS_R" data-rv-role="iris" d="M292 248L298 242L306 248L298 256Z" fill="{{iris}}"/><path id="PUPIL_L" data-rv-role="pupil" d="M212 248L214 246L218 248L214 252Z" fill="{{outline}}"/><path id="PUPIL_R" data-rv-role="pupil" d="M296 248L298 246L302 248L298 252Z" fill="{{outline}}"/>',
  },
  {
    id: 'psx_narrow_01',
    label: 'PSX Narrow',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M194 248L206 242H228L236 246L228 252H206Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M276 246L286 242H308L318 248L308 252H286Z" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M212 248L216 244L220 248L216 252Z" fill="{{irisDark}}"/><path id="IRIS_R" data-rv-role="iris" d="M294 248L298 244L302 248L298 252Z" fill="{{irisDark}}"/>',
  },
  {
    id: 'psx_almond_soft_01',
    label: 'Almond Soft',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M190 248L202 238H226L240 246L228 258H204Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 246L286 238H310L322 248L308 258H284Z" fill="{{eyeWhite}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="216" cy="248" rx="7" ry="8" fill="{{iris}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="298" cy="248" rx="7" ry="8" fill="{{iris}}"/><circle id="PUPIL_L" data-rv-role="pupil" cx="216" cy="248" r="3" fill="{{outline}}"/><circle id="PUPIL_R" data-rv-role="pupil" cx="298" cy="248" r="3" fill="{{outline}}"/>',
  },
  {
    id: 'psx_almond_sharp_01',
    label: 'Almond Sharp',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M190 248L206 236H230L240 244L226 258H202Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 244L282 236H306L322 248L310 258H286Z" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M212 248L216 242L222 248L216 256Z" fill="{{irisDark}}"/><path id="IRIS_R" data-rv-role="iris" d="M294 248L298 242L304 248L298 256Z" fill="{{irisDark}}"/><path id="PUPIL_L" data-rv-role="pupil" d="M214 248L216 246L218 248L216 250Z" fill="{{outline}}"/><path id="PUPIL_R" data-rv-role="pupil" d="M296 248L298 246L300 248L298 250Z" fill="{{outline}}"/>',
  },
  {
    id: 'psx_hero_square_01',
    label: 'Hero Square',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M192 242H232L240 248L232 258H194L186 250Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M280 242H320L328 250L320 258H282L274 248Z" fill="{{eyeWhite}}"/><rect id="IRIS_L" data-rv-role="iris" x="210" y="244" width="11" height="10" rx="2" fill="{{iris}}"/><rect id="IRIS_R" data-rv-role="iris" x="292" y="244" width="11" height="10" rx="2" fill="{{iris}}"/><rect id="PUPIL_L" data-rv-role="pupil" x="214" y="246" width="4" height="6" rx="1" fill="{{outline}}"/><rect id="PUPIL_R" data-rv-role="pupil" x="296" y="246" width="4" height="6" rx="1" fill="{{outline}}"/>',
  },
  {
    id: 'psx_heavy_lid_01',
    label: 'Heavy Lid',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M190 250L204 240H230L240 246L230 256H204Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M272 246L284 240H310L324 250L310 256H286Z" fill="{{eyeWhite}}"/><path id="LID_L" data-rv-role="eye_white" d="M192 248L206 238H232L224 246H202Z" fill="{{skinShade}}"/><path id="LID_R" data-rv-role="eye_white" d="M280 244L292 238H318L310 246H288Z" fill="{{skinShade}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="216" cy="250" rx="6" ry="7" fill="{{irisDark}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="298" cy="250" rx="6" ry="7" fill="{{irisDark}}"/>',
  },
  {
    id: 'n64_cartool_oval_01',
    label: 'Cartool Oval',
    markup: '<ellipse id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" rx="24" ry="18" fill="{{eyeWhite}}"/><ellipse id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" rx="24" ry="18" fill="{{eyeWhite}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="212" cy="252" rx="10" ry="11" fill="{{iris}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="300" cy="252" rx="10" ry="11" fill="{{iris}}"/><circle id="PUPIL_L" data-rv-role="pupil" cx="212" cy="252" r="4" fill="{{outline}}"/><circle id="PUPIL_R" data-rv-role="pupil" cx="300" cy="252" r="4" fill="{{outline}}"/>',
  },
  {
    id: 'n64_round_toon_eye_01',
    label: 'Round Toon',
    markup: '<circle id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" r="22" fill="{{eyeWhite}}"/><circle id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" r="22" fill="{{eyeWhite}}"/><circle id="IRIS_L" data-rv-role="iris" cx="212" cy="252" r="10" fill="{{iris}}"/><circle id="IRIS_R" data-rv-role="iris" cx="300" cy="252" r="10" fill="{{iris}}"/><circle id="PUPIL_L" data-rv-role="pupil" cx="212" cy="252" r="4" fill="{{outline}}"/><circle id="PUPIL_R" data-rv-role="pupil" cx="300" cy="252" r="4" fill="{{outline}}"/>',
  },
  {
    id: 'n64_bead_01',
    label: 'Tiny Bead',
    markup: '<circle id="EYE_WHITE_L" data-rv-role="eye_white" cx="214" cy="250" r="7" fill="{{eyeWhite}}"/><circle id="EYE_WHITE_R" data-rv-role="eye_white" cx="298" cy="250" r="7" fill="{{eyeWhite}}"/><circle id="IRIS_L" data-rv-role="iris" cx="214" cy="250" r="4" fill="{{outline}}"/><circle id="IRIS_R" data-rv-role="iris" cx="298" cy="250" r="4" fill="{{outline}}"/>',
  },
  {
    id: 'bridge_droopy_01',
    label: 'Droopy',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M188 248L202 238H226L238 248L224 258H202Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 248L286 238H310L324 248L308 258H286Z" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M208 252L214 246L220 252L214 258Z" fill="{{irisDark}}"/><path id="IRIS_R" data-rv-role="iris" d="M292 252L298 246L304 252L298 258Z" fill="{{irisDark}}"/>',
  },
  {
    id: 'bridge_confident_half_01',
    label: 'Confident Half',
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M188 248L206 240H230L238 246L226 256H204Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 246L286 240H310L324 248L308 256H286Z" fill="{{eyeWhite}}"/><path id="LID_L" data-rv-role="eye_white" d="M190 246L206 238H232L226 244H206Z" fill="{{skinShade}}"/><path id="LID_R" data-rv-role="eye_white" d="M278 244L292 238H316L310 244H290Z" fill="{{skinShade}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="216" cy="250" rx="6" ry="7" fill="{{iris}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="298" cy="250" rx="6" ry="7" fill="{{iris}}"/>',
  },
  {
    id: 'n64_round_big_01',
    label: 'Round Big',
    labels: Object.freeze({ en: 'Round Big', es: 'Redondo grande' }),
    markup: '<circle id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" r="30" fill="{{eyeWhite}}"/><circle id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" r="30" fill="{{eyeWhite}}"/><circle id="IRIS_L" data-rv-role="iris" cx="212" cy="252" r="18" fill="{{iris}}"/><circle id="IRIS_R" data-rv-role="iris" cx="300" cy="252" r="18" fill="{{iris}}"/><circle id="PUPIL_L" data-rv-role="pupil" cx="212" cy="254" r="7" fill="{{outline}}"/><circle id="PUPIL_R" data-rv-role="pupil" cx="300" cy="254" r="7" fill="{{outline}}"/>',
  },
  {
    id: 'bridge_almond_01',
    label: 'Almond',
    labels: Object.freeze({ en: 'Almond', es: 'Almendrado' }),
    markup: '<path id="EYE_WHITE_L" data-rv-role="eye_white" d="M188 248L204 236H232L242 246L228 260H204Z" fill="{{eyeWhite}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M270 246L280 236H308L324 248L308 260H284Z" fill="{{eyeWhite}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="214" cy="250" rx="8" ry="10" fill="{{iris}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="298" cy="250" rx="8" ry="10" fill="{{iris}}"/><ellipse id="PUPIL_L" data-rv-role="pupil" cx="214" cy="252" rx="3" ry="6" fill="{{outline}}"/><ellipse id="PUPIL_R" data-rv-role="pupil" cx="298" cy="252" rx="3" ry="6" fill="{{outline}}"/>',
  },
  {
    id: 'bridge_happy_closed_01',
    label: 'Happy Closed',
    labels: Object.freeze({ en: 'Happy Closed', es: 'Cerrado feliz' }),
    markup: '<path id="EYE_SMILE_L" data-rv-role="eye_white" d="M188 254Q212 232 238 254L232 260Q212 246 194 260Z" fill="{{outline}}"/><path id="EYE_SMILE_R" data-rv-role="eye_white" d="M274 254Q300 232 324 254L318 260Q300 246 280 260Z" fill="{{outline}}"/>',
  },
  {
    id: 'bridge_sad_closed_01',
    label: 'Sad Closed',
    labels: Object.freeze({ en: 'Sad Closed', es: 'Cerrado triste' }),
    markup: '<path id="EYE_SAD_L" data-rv-role="eye_white" d="M188 242Q212 266 238 242L232 236Q212 252 194 236Z" fill="{{outline}}"/><path id="EYE_SAD_R" data-rv-role="eye_white" d="M274 242Q300 266 324 242L318 236Q300 252 280 236Z" fill="{{outline}}"/>',
  },
  {
    id: 'bridge_wink_01',
    label: 'Wink',
    labels: Object.freeze({ en: 'Wink', es: 'Guino' }),
    markup: '<path id="EYE_WINK_L" data-rv-role="eye_white" d="M188 250H238V258H188Z" fill="{{outline}}"/><path id="EYE_WHITE_R" data-rv-role="eye_white" d="M274 250L286 242H310L324 250L310 258H286Z" fill="{{eyeWhite}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="298" cy="254" rx="6" ry="7" fill="{{iris}}"/>',
  },
  {
    id: 'n64_surprised_round_01',
    label: 'Surprised',
    labels: Object.freeze({ en: 'Surprised', es: 'Sorprendido' }),
    markup: '<circle id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" r="25" fill="{{eyeWhite}}"/><circle id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" r="25" fill="{{eyeWhite}}"/><circle id="IRIS_L" data-rv-role="iris" cx="212" cy="250" r="5" fill="{{iris}}"/><circle id="IRIS_R" data-rv-role="iris" cx="300" cy="250" r="5" fill="{{iris}}"/>',
  },
  {
    id: 'bridge_side_glance_01',
    label: 'Side Glance',
    labels: Object.freeze({ en: 'Side Glance', es: 'Mirada lateral' }),
    markup: '<ellipse id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" rx="28" ry="18" fill="{{eyeWhite}}"/><ellipse id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" rx="28" ry="18" fill="{{eyeWhite}}"/><ellipse id="IRIS_L" data-rv-role="iris" cx="200" cy="250" rx="9" ry="10" fill="{{iris}}"/><ellipse id="IRIS_R" data-rv-role="iris" cx="312" cy="250" rx="9" ry="10" fill="{{iris}}"/><ellipse id="PUPIL_L" data-rv-role="pupil" cx="198" cy="252" rx="3" ry="6" fill="{{outline}}"/><ellipse id="PUPIL_R" data-rv-role="pupil" cx="314" cy="252" rx="3" ry="6" fill="{{outline}}"/>',
  },
  {
    id: 'n64_heart_01',
    label: 'Heart',
    labels: Object.freeze({ en: 'Heart', es: 'Corazon' }),
    markup: '<circle id="EYE_WHITE_L" data-rv-role="eye_white" cx="212" cy="248" r="23" fill="{{eyeWhite}}"/><circle id="EYE_WHITE_R" data-rv-role="eye_white" cx="300" cy="248" r="23" fill="{{eyeWhite}}"/><path id="IRIS_L" data-rv-role="iris" d="M212 266L194 246C184 234 202 224 212 238C222 224 240 234 230 246Z" fill="{{iris}}"/><path id="IRIS_R" data-rv-role="iris" d="M300 266L282 246C272 234 290 224 300 238C310 224 328 234 318 246Z" fill="{{iris}}"/>',
  },
  {
    id: 'psx_robot_square_01',
    label: 'Robot Square',
    labels: Object.freeze({ en: 'Robot Square', es: 'Robot cuadrado' }),
    markup: '<rect id="EYE_WHITE_L" data-rv-role="eye_white" x="190" y="226" width="44" height="40" rx="2" fill="{{eyeWhite}}"/><rect id="EYE_WHITE_R" data-rv-role="eye_white" x="278" y="226" width="44" height="40" rx="2" fill="{{eyeWhite}}"/><rect id="IRIS_L" data-rv-role="iris" x="204" y="240" width="16" height="16" fill="{{iris}}"/><rect id="IRIS_R" data-rv-role="iris" x="292" y="240" width="16" height="16" fill="{{iris}}"/><rect id="PUPIL_L" data-rv-role="pupil" x="210" y="242" width="5" height="12" fill="{{outline}}"/><rect id="PUPIL_R" data-rv-role="pupil" x="298" y="242" width="5" height="12" fill="{{outline}}"/>',
  },
].map(withSpriteId));
