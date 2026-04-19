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
]);
