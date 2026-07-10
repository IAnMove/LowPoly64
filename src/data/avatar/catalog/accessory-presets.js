function placementDefaults(size, offsetX = 0, offsetY = 0) {
  return Object.freeze({ size, offsetX, offsetY });
}

const AVATAR_ACCESSORY_MOLD_METADATA = Object.freeze({
  none: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(1, 0, 0),
  }),
  ribbon_blue: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'topCenter',
    placementDefaults: placementDefaults(0.56, 0, 0),
  }),
  round_glasses: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'eyes',
    placementDefaults: placementDefaults(0.52, 0, 0),
  }),
  star_clip: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'clipRight',
    placementDefaults: placementDefaults(0.46, 0, 0),
  }),
  psx_square_glasses_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'eyes',
    placementDefaults: placementDefaults(0.52, 0, 0),
  }),
  psx_visor_strip_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(0.58, 0, 0),
  }),
  psx_bandana_knot_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(0.6, 0, 0),
  }),
  psx_eyepatch_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'eyes',
    placementDefaults: placementDefaults(0.58, 0, 0),
  }),
  n64_headband_sport_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(0.58, 0, 0),
  }),
  n64_goggles_up_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(0.56, 0, 0),
  }),
  n64_flower_pin_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'clipRight',
    placementDefaults: placementDefaults(0.48, 0, 0),
  }),
  n64_leaf_clip_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'clipRight',
    placementDefaults: placementDefaults(0.48, 0, 0),
  }),
  bridge_hairpin_duo_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'clipRight',
    placementDefaults: placementDefaults(0.5, 0, 0),
  }),
  bridge_tiny_horns_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'topCenter',
    placementDefaults: placementDefaults(0.54, 0, 0),
  }),
  bridge_jewel_circlet_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'headband',
    placementDefaults: placementDefaults(0.56, 0, 0),
  }),
  bridge_mono_earring_01: Object.freeze({
    mountRole: 'accessoryAnchor',
    mountVariant: 'earRight',
    placementDefaults: placementDefaults(0.44, 0, 14),
  }),
});

export const AVATAR_ACCESSORY_PRESETS = Object.freeze([
  {
    id: 'none',
    label: 'None',
    markup: '',
  },
  {
    id: 'ribbon_blue',
    label: 'Ribbon',
    markup: '<path id="ACC_RIBBON" data-rv-role="hat_front" d="M214 156L228 136H284L298 156L278 168H234Z" fill="{{accent}}"/><path id="ACC_RIBBON_KNOT" data-rv-role="hat_front" d="M244 150L256 140L268 150L256 164Z" fill="{{accentDark}}"/>',
  },
  {
    id: 'round_glasses',
    label: 'Round Glasses',
    markup: '<path id="ACC_GLASSES_L" data-rv-role="hat_front" d="M182 250L194 224H230L242 250L230 276H194Z" fill="{{outlineSoft}}"/><path id="ACC_GLASSES_L_INNER" data-rv-role="hat_front" d="M198 250L206 236H218L226 250L218 264H206Z" fill="{{eyeWhite}}"/><path id="ACC_GLASSES_R" data-rv-role="hat_front" d="M270 250L282 224H318L330 250L318 276H282Z" fill="{{outlineSoft}}"/><path id="ACC_GLASSES_R_INNER" data-rv-role="hat_front" d="M286 250L294 236H306L314 250L306 264H294Z" fill="{{eyeWhite}}"/><path id="ACC_GLASSES_BRIDGE" data-rv-role="hat_front" d="M240 246H272L268 254H244Z" fill="{{outlineSoft}}"/>',
  },
  {
    id: 'star_clip',
    label: 'Star Clip',
    markup: '<path id="ACC_STAR_CLIP" data-rv-role="hat_front" d="M326 150L334 170L356 172L340 186L346 208L326 196L306 208L312 186L296 172L318 170Z" fill="{{accent}}"/>',
  },
  {
    id: 'psx_square_glasses_01',
    label: 'Square Glasses',
    markup: '<path id="ACC_PSX_GLASSES_L" data-rv-role="hat_front" d="M184 228H238L234 276H188Z" fill="{{outlineSoft}}"/><path id="ACC_PSX_GLASSES_L_INNER" data-rv-role="hat_front" d="M196 238H226L224 264H198Z" fill="{{eyeWhite}}"/><path id="ACC_PSX_GLASSES_R" data-rv-role="hat_front" d="M274 228H328L324 276H278Z" fill="{{outlineSoft}}"/><path id="ACC_PSX_GLASSES_R_INNER" data-rv-role="hat_front" d="M286 238H316L314 264H288Z" fill="{{eyeWhite}}"/><path id="ACC_PSX_GLASSES_BRIDGE" data-rv-role="hat_front" d="M238 244H276L274 252H240Z" fill="{{outlineSoft}}"/>',
  },
  {
    id: 'psx_visor_strip_01',
    label: 'Visor Strip',
    markup: '<path id="ACC_PSX_VISOR" data-rv-role="hat_front" d="M188 206H324L314 238H198Z" fill="{{accent}}"/><path id="ACC_PSX_VISOR_SHADE" data-rv-role="hat_front" d="M202 214H310L304 230H208Z" fill="{{accentDark}}"/>',
  },
  {
    id: 'psx_bandana_knot_01',
    label: 'Bandana Knot',
    markup: '<path id="ACC_PSX_BANDANA" data-rv-role="hat_front" d="M184 168L208 152H304L328 168L320 196H192Z" fill="{{accent}}"/><path id="ACC_PSX_BANDANA_KNOT" data-rv-role="hat_front" d="M304 168L322 176L318 198L298 192Z" fill="{{accentDark}}"/><path id="ACC_PSX_BANDANA_TAIL_A" data-rv-role="hat_front" d="M320 182L340 194L328 224L314 208Z" fill="{{accent}}"/><path id="ACC_PSX_BANDANA_TAIL_B" data-rv-role="hat_front" d="M308 188L324 206L304 228L298 208Z" fill="{{accentDark}}"/>',
  },
  {
    id: 'psx_eyepatch_01',
    label: 'Eyepatch',
    markup: '<path id="ACC_PSX_EYEPATCH_STRAP" data-rv-role="hat_front" d="M166 236L196 224H324L350 236L342 248H198L170 250Z" fill="{{outlineSoft}}"/><path id="ACC_PSX_EYEPATCH" data-rv-role="hat_front" d="M182 238L202 218H240L252 246L232 278H196L176 254Z" fill="{{outline}}"/><path id="ACC_PSX_EYEPATCH_HIGHLIGHT" data-rv-role="hat_front" d="M204 232L218 224L232 238L218 250Z" fill="{{outlineSoft}}"/>',
  },
  {
    id: 'n64_headband_sport_01',
    label: 'Sport Headband',
    markup: '<path id="ACC_N64_HEADBAND" data-rv-role="hat_front" d="M186 174C208 154 304 154 326 174L318 202C298 192 214 192 194 202Z" fill="{{accent}}"/><path id="ACC_N64_HEADBAND_EDGE" data-rv-role="hat_front" d="M202 176C222 164 290 164 310 176L306 188C286 182 226 182 206 188Z" fill="{{accentDark}}"/>',
  },
  {
    id: 'n64_goggles_up_01',
    label: 'Goggles Up',
    markup: '<path id="ACC_N64_GOGGLE_STRAP" data-rv-role="hat_front" d="M176 188H336L330 204H182Z" fill="{{outlineSoft}}"/><path id="ACC_N64_GOGGLE_L" data-rv-role="hat_front" d="M194 176C204 162 238 162 248 176L244 206C232 214 210 214 198 206Z" fill="{{accent}}"/><path id="ACC_N64_GOGGLE_L_INNER" data-rv-role="hat_front" d="M206 178C214 170 234 170 240 178L236 198C228 202 218 202 210 198Z" fill="{{eyeWhite}}"/><path id="ACC_N64_GOGGLE_R" data-rv-role="hat_front" d="M264 176C274 162 308 162 318 176L314 206C302 214 280 214 268 206Z" fill="{{accent}}"/><path id="ACC_N64_GOGGLE_R_INNER" data-rv-role="hat_front" d="M276 178C284 170 304 170 310 178L306 198C298 202 288 202 280 198Z" fill="{{eyeWhite}}"/>',
  },
  {
    id: 'n64_flower_pin_01',
    label: 'Flower Pin',
    markup: '<circle id="ACC_N64_FLOWER_CORE" data-rv-role="hat_front" cx="328" cy="178" r="10" fill="{{accentDark}}"/><circle id="ACC_N64_FLOWER_PETAL_A" data-rv-role="hat_front" cx="328" cy="160" r="10" fill="{{accent}}"/><circle id="ACC_N64_FLOWER_PETAL_B" data-rv-role="hat_front" cx="346" cy="178" r="10" fill="{{accent}}"/><circle id="ACC_N64_FLOWER_PETAL_C" data-rv-role="hat_front" cx="328" cy="196" r="10" fill="{{accent}}"/><circle id="ACC_N64_FLOWER_PETAL_D" data-rv-role="hat_front" cx="310" cy="178" r="10" fill="{{accent}}"/>',
  },
  {
    id: 'n64_leaf_clip_01',
    label: 'Leaf Clip',
    markup: '<path id="ACC_N64_LEAF_MAIN" data-rv-role="hat_front" d="M308 154C338 156 356 174 350 204C326 204 304 186 308 154Z" fill="{{accent}}"/><path id="ACC_N64_LEAF_SECOND" data-rv-role="hat_front" d="M300 170C326 172 340 186 334 212C312 210 292 194 300 170Z" fill="{{accentDark}}"/><path id="ACC_N64_LEAF_STEM" data-rv-role="hat_front" d="M304 178L342 194L338 202L298 186Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_hairpin_duo_01',
    label: 'Hairpin Duo',
    markup: '<path id="ACC_BRIDGE_PIN_A" data-rv-role="hat_front" d="M300 170L350 194L344 206L294 182Z" fill="{{accent}}"/><path id="ACC_BRIDGE_PIN_B" data-rv-role="hat_front" d="M304 190L348 166L354 178L310 202Z" fill="{{eyeWhite}}"/>',
  },
  {
    id: 'bridge_tiny_horns_01',
    label: 'Tiny Horns',
    markup: '<path id="ACC_BRIDGE_HORN_L" data-rv-role="hat_front" d="M214 166L224 138L238 126L244 152L236 178Z" fill="{{hairLight}}"/><path id="ACC_BRIDGE_HORN_R" data-rv-role="hat_front" d="M298 166L288 138L274 126L268 152L276 178Z" fill="{{hairLight}}"/><path id="ACC_BRIDGE_HORN_SHADE_L" data-rv-role="hat_front" d="M224 144L236 132L238 154L230 170Z" fill="{{hairDark}}"/><path id="ACC_BRIDGE_HORN_SHADE_R" data-rv-role="hat_front" d="M288 144L276 132L274 154L282 170Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_jewel_circlet_01',
    label: 'Jewel Circlet',
    markup: '<path id="ACC_BRIDGE_CIRCLET" data-rv-role="hat_front" d="M196 178C220 164 292 164 316 178L312 192C288 182 224 182 200 192Z" fill="{{accentDark}}"/><path id="ACC_BRIDGE_GEM" data-rv-role="hat_front" d="M246 182L256 170L266 182L256 196Z" fill="{{accent}}"/><path id="ACC_BRIDGE_GEM_SHINE" data-rv-role="hat_front" d="M252 178L256 174L260 178L256 184Z" fill="{{eyeWhite}}"/>',
  },
  {
    id: 'bridge_mono_earring_01',
    label: 'Mono Earring',
    markup: '<path id="ACC_BRIDGE_EARRING_HOOK" data-rv-role="hat_front" d="M334 260C344 258 350 264 350 274C350 282 344 288 338 288L334 282C338 280 340 276 340 272C340 268 338 264 334 262Z" fill="{{accentDark}}"/><path id="ACC_BRIDGE_EARRING_RING" data-rv-role="hat_front" d="M330 286C344 286 356 298 356 314C356 330 344 342 330 342C316 342 304 330 304 314C304 298 316 286 330 286ZM330 296C322 296 316 304 316 314C316 324 322 332 330 332C338 332 344 324 344 314C344 304 338 296 330 296Z" fill="{{accent}}"/>',
  },
].map((entry) => Object.freeze({
  ...entry,
  ...(AVATAR_ACCESSORY_MOLD_METADATA[entry.id] || AVATAR_ACCESSORY_MOLD_METADATA.none),
})));
