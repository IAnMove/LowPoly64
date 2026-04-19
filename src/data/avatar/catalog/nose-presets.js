export const AVATAR_NOSE_PRESETS = Object.freeze([
  {
    id: 'nose_soft_01',
    label: 'Soft Nose',
    mountRole: 'nose',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: 0 }),
    markup: '<path id="NOSE" data-rv-role="nose" data-rv-bump="0.1" d="M248 270C250 258 262 258 264 270C266 286 262 302 256 302C250 302 246 286 248 270Z" fill="{{skinShade}}"/>',
  },
  {
    id: 'nose_button_01',
    label: 'Button Nose',
    mountRole: 'nose',
    placementDefaults: Object.freeze({ size: 0.47, offsetX: 0, offsetY: 2 }),
    markup: '<path id="NOSE" data-rv-role="nose" data-rv-bump="0.1" d="M248 276C252 266 260 266 264 276C264 286 260 294 256 294C252 294 248 286 248 276Z" fill="{{skinShade}}"/>',
  },
  {
    id: 'nose_bridge_01',
    label: 'Bridge Nose',
    mountRole: 'nose',
    placementDefaults: Object.freeze({ size: 0.5, offsetX: 0, offsetY: -2 }),
    markup: '<path id="NOSE" data-rv-role="nose" data-rv-bump="0.11" d="M252 262L256 248L260 262L266 286L260 306H252L246 286Z" fill="{{skinShade}}"/>',
  },
  {
    id: 'nose_point_01',
    label: 'Point Nose',
    mountRole: 'nose',
    placementDefaults: Object.freeze({ size: 0.52, offsetX: 0, offsetY: 0 }),
    markup: '<path id="NOSE" data-rv-role="nose" data-rv-bump="0.11" d="M252 258L258 254L266 276L260 308H250L246 280Z" fill="{{skinShade}}"/>',
  },
  {
    id: 'nose_flat_01',
    label: 'Flat Nose',
    mountRole: 'nose',
    placementDefaults: Object.freeze({ size: 0.46, offsetX: 0, offsetY: 4 }),
    markup: '<path id="NOSE" data-rv-role="nose" data-rv-bump="0.08" d="M242 284L252 270H260L270 284L264 292H248Z" fill="{{skinShade}}"/>',
  },
]);
