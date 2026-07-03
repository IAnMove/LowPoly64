const MOUTH_SPRITE_BY_PRESET_ID = Object.freeze({
  smile_01: 'mouth_smile',
  neutral_01: 'mouth_flat',
  grin_01: 'mouth_grin',
  open_01: 'mouth_open',
  psx_line_01: 'mouth_flat',
  psx_smirk_left_01: 'mouth_smile',
  psx_smirk_right_01: 'mouth_smile',
  psx_frown_01: 'mouth_frown',
  n64_bean_01: 'mouth_open',
  n64_tiny_smile_01: 'mouth_smile',
  n64_wide_open_01: 'mouth_open',
  bridge_tiny_neutral_01: 'mouth_flat',
  bridge_pout_01: 'mouth_frown',
  bridge_o_shape_01: 'mouth_open',
  bridge_toothy_grin_01: 'mouth_grin',
});

function withSpriteId(preset) {
  const spriteId = MOUTH_SPRITE_BY_PRESET_ID[preset.id];
  return Object.freeze(spriteId ? { ...preset, spriteId } : preset);
}

export const AVATAR_MOUTH_PRESETS = Object.freeze([
  {
    id: 'none_01',
    label: 'No Mouth',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  {
    id: 'smile_01',
    label: 'Smile',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.018" data-rv-depth="0.014" d="M214 328C232 346 280 346 298 328L292 344C276 352 236 352 220 344Z" fill="{{lip}}"/>',
  },
  {
    id: 'neutral_01',
    label: 'Neutral',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.018" data-rv-depth="0.014" d="M220 330H292L288 340H224Z" fill="{{lip}}"/>',
  },
  {
    id: 'grin_01',
    label: 'Grin',
    placementDefaults: Object.freeze({ size: 0.52, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.018" data-rv-depth="0.014" d="M214 326C230 342 282 342 300 326L294 348C278 356 234 356 220 348Z" fill="{{lip}}"/>',
  },
  {
    id: 'open_01',
    label: 'Open',
    placementDefaults: Object.freeze({ size: 0.52, offsetX: 0, offsetY: 0 }),
    markup: '<ellipse id="MOUTH" data-rv-role="mouth" data-rv-offset="0.018" data-rv-depth="0.018" cx="256" cy="336" rx="26" ry="16" fill="{{lip}}"/>',
  },
  {
    id: 'psx_line_01',
    label: 'PSX Line',
    placementDefaults: Object.freeze({ size: 0.48, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.012" d="M228 334H286L282 340H232Z" fill="{{lip}}"/>',
  },
  {
    id: 'psx_smirk_left_01',
    label: 'Smirk Left',
    placementDefaults: Object.freeze({ size: 0.48, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.012" d="M222 336L242 328H288L284 338L236 342Z" fill="{{lip}}"/>',
  },
  {
    id: 'psx_smirk_right_01',
    label: 'Smirk Right',
    placementDefaults: Object.freeze({ size: 0.48, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.012" d="M224 328H270L290 336L276 342L228 338Z" fill="{{lip}}"/>',
  },
  {
    id: 'psx_frown_01',
    label: 'Frown',
    placementDefaults: Object.freeze({ size: 0.48, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.012" d="M228 342L238 334H276L286 342L278 346H236Z" fill="{{lip}}"/>',
  },
  {
    id: 'n64_bean_01',
    label: 'Bean',
    placementDefaults: Object.freeze({ size: 0.52, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.022" data-rv-depth="0.018" d="M224 334C232 320 280 320 290 334C282 350 232 350 224 334Z" fill="{{lip}}"/>',
  },
  {
    id: 'n64_tiny_smile_01',
    label: 'Tiny Smile',
    placementDefaults: Object.freeze({ size: 0.46, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.014" d="M232 334C240 342 272 342 280 334L276 340C268 344 244 344 236 340Z" fill="{{lip}}"/>',
  },
  {
    id: 'n64_wide_open_01',
    label: 'Wide Open',
    placementDefaults: Object.freeze({ size: 0.54, offsetX: 0, offsetY: 0 }),
    markup: '<ellipse id="MOUTH" data-rv-role="mouth" data-rv-offset="0.022" data-rv-depth="0.02" cx="256" cy="336" rx="32" ry="18" fill="{{lip}}"/>',
  },
  {
    id: 'bridge_tiny_neutral_01',
    label: 'Tiny Neutral',
    placementDefaults: Object.freeze({ size: 0.45, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.018" data-rv-depth="0.012" d="M236 334H276L274 338H238Z" fill="{{lip}}"/>',
  },
  {
    id: 'bridge_pout_01',
    label: 'Pout',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.016" d="M236 334C242 346 270 346 276 334L272 346C264 352 248 352 240 346Z" fill="{{lip}}"/>',
  },
  {
    id: 'bridge_o_shape_01',
    label: 'O Shape',
    placementDefaults: Object.freeze({ size: 0.46, offsetX: 0, offsetY: 0 }),
    markup: '<ellipse id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.018" cx="256" cy="336" rx="16" ry="18" fill="{{lip}}"/>',
  },
  {
    id: 'bridge_toothy_grin_01',
    label: 'Toothy Grin',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '<path id="MOUTH" data-rv-role="mouth" data-rv-offset="0.02" data-rv-depth="0.016" d="M220 328C232 344 280 344 292 328L286 350H226Z" fill="{{lip}}"/><path id="TEETH" data-rv-role="mouth" data-rv-offset="0.024" data-rv-depth="0.01" d="M232 334H280L276 344H236Z" fill="{{eyeWhite}}"/>',
  },
].map(withSpriteId));
