const FULL_FACE_SPRITE_BY_PRESET_ID = Object.freeze({
  none_01: '',
  image2_hero_01: 'fullface_image2_hero',
  image2_cute_01: 'fullface_image2_cute',
  image2_elder_01: 'fullface_image2_elder',
  image2_mask_01: 'fullface_image2_mask',
});

function withSpriteId(preset) {
  const spriteId = FULL_FACE_SPRITE_BY_PRESET_ID[preset.id];
  return Object.freeze(spriteId ? { ...preset, spriteId } : preset);
}

export const AVATAR_FULL_FACE_PRESETS = Object.freeze([
  {
    id: 'none_01',
    label: 'Custom Features',
    labels: Object.freeze({ en: 'Custom Features', es: 'Rasgos sueltos' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  {
    id: 'image2_hero_01',
    label: 'Image2 Hero Face',
    labels: Object.freeze({ en: 'Image2 Hero Face', es: 'Cara heroe Image2' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  {
    id: 'image2_cute_01',
    label: 'Image2 Cute Face',
    labels: Object.freeze({ en: 'Image2 Cute Face', es: 'Cara cute Image2' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  {
    id: 'image2_elder_01',
    label: 'Image2 Elder Face',
    labels: Object.freeze({ en: 'Image2 Elder Face', es: 'Cara anciano Image2' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  {
    id: 'image2_mask_01',
    label: 'Image2 Mask Face',
    labels: Object.freeze({ en: 'Image2 Mask Face', es: 'Cara mascara Image2' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
].map(withSpriteId));
