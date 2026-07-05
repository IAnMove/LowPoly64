const FULL_FACE_SPRITE_BY_PRESET_ID = Object.freeze({
  none_01: '',
  image2_elf_hero_01: 'fullface_image2_elf_hero',
  image2_young_hero_01: 'fullface_image2_young_hero',
  image2_knight_hero_01: 'fullface_image2_knight_hero',
  image2_rogue_hero_01: 'fullface_image2_rogue_hero',
  image2_mage_hero_01: 'fullface_image2_mage_hero',
  image2_warrior_hero_01: 'fullface_image2_warrior_hero',
  image2_ranger_hero_01: 'fullface_image2_ranger_hero',
  image2_prince_hero_01: 'fullface_image2_prince_hero',
  image2_veteran_hero_01: 'fullface_image2_veteran_hero',
  image2_child_hero_01: 'fullface_image2_child_hero',
  image2_rival_hero_01: 'fullface_image2_rival_hero',
  image2_spirit_hero_01: 'fullface_image2_spirit_hero',
});

function withSpriteId(preset) {
  const spriteId = FULL_FACE_SPRITE_BY_PRESET_ID[preset.id];
  return Object.freeze(spriteId ? { ...preset, spriteId } : preset);
}

function image2FullFace(id, en, es) {
  return {
    id,
    label: en,
    labels: Object.freeze({ en, es }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  };
}

export const AVATAR_FULL_FACE_PRESETS = Object.freeze([
  {
    id: 'none_01',
    label: 'Custom Features',
    labels: Object.freeze({ en: 'Custom Features', es: 'Rasgos sueltos' }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: 0 }),
    markup: '',
  },
  image2FullFace('image2_elf_hero_01', 'Image2 Elf Hero Face', 'Heroe elfo Image2'),
  image2FullFace('image2_young_hero_01', 'Image2 Young Hero Face', 'Heroe joven Image2'),
  image2FullFace('image2_knight_hero_01', 'Image2 Knight Hero Face', 'Caballero Image2'),
  image2FullFace('image2_rogue_hero_01', 'Image2 Rogue Hero Face', 'Picaro Image2'),
  image2FullFace('image2_mage_hero_01', 'Image2 Mage Hero Face', 'Mago Image2'),
  image2FullFace('image2_warrior_hero_01', 'Image2 Warrior Hero Face', 'Guerrero Image2'),
  image2FullFace('image2_ranger_hero_01', 'Image2 Ranger Hero Face', 'Explorador Image2'),
  image2FullFace('image2_prince_hero_01', 'Image2 Prince Hero Face', 'Principe Image2'),
  image2FullFace('image2_veteran_hero_01', 'Image2 Veteran Hero Face', 'Veterano Image2'),
  image2FullFace('image2_child_hero_01', 'Image2 Child Hero Face', 'Heroe nino Image2'),
  image2FullFace('image2_rival_hero_01', 'Image2 Rival Hero Face', 'Rival Image2'),
  image2FullFace('image2_spirit_hero_01', 'Image2 Spirit Hero Face', 'Espiritu Image2'),
].map(withSpriteId));
