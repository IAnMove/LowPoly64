export const AVATAR_EAR_PRESETS = Object.freeze([
  {
    id: 'ear_soft_01',
    label: 'Soft Ears',
    mountRole: 'earPair',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    leftMarkup: '<path id="EAR_L" data-rv-role="ear" d="M172 242C156 248 148 262 150 282C154 300 164 312 176 308C186 304 190 288 188 268C186 252 182 238 172 242Z" fill="{{skinShade}}"/>',
    rightMarkup: '<path id="EAR_R" data-rv-role="ear" d="M340 242C356 248 364 262 362 282C358 300 348 312 336 308C326 304 322 288 324 268C326 252 330 238 340 242Z" fill="{{skinShade}}"/>',
  },
  {
    id: 'ear_round_01',
    label: 'Round Ears',
    mountRole: 'earPair',
    placementDefaults: Object.freeze({ size: 0.48, offsetX: 0, offsetY: 2 }),
    leftMarkup: '<ellipse id="EAR_L" data-rv-role="ear" cx="176" cy="272" rx="18" ry="34" fill="{{skinShade}}"/>',
    rightMarkup: '<ellipse id="EAR_R" data-rv-role="ear" cx="336" cy="272" rx="18" ry="34" fill="{{skinShade}}"/>',
  },
  {
    id: 'ear_point_01',
    label: 'Point Ears',
    mountRole: 'earPair',
    placementDefaults: Object.freeze({ size: 0.52, offsetX: 0, offsetY: -2 }),
    leftMarkup: '<path id="EAR_L" data-rv-role="ear" d="M174 236L156 248L150 274L160 304L182 296L188 266Z" fill="{{skinShade}}"/>',
    rightMarkup: '<path id="EAR_R" data-rv-role="ear" d="M338 236L324 266L330 296L352 304L362 274L356 248Z" fill="{{skinShade}}"/>',
  },
]);
