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
  image2_transparent_brave_neutral_01: 'fullface_image2_transparent_brave_neutral',
  image2_transparent_young_happy_01: 'fullface_image2_transparent_young_happy',
  image2_transparent_angry_knight_01: 'fullface_image2_transparent_angry_knight',
  image2_transparent_rogue_smirk_01: 'fullface_image2_transparent_rogue_smirk',
  image2_transparent_sleepy_veteran_01: 'fullface_image2_transparent_sleepy_veteran',
  image2_transparent_worried_child_01: 'fullface_image2_transparent_worried_child',
  image2_transparent_noble_arch_01: 'fullface_image2_transparent_noble_arch',
  image2_transparent_warrior_shout_01: 'fullface_image2_transparent_warrior_shout',
  image2_transparent_sad_frown_01: 'fullface_image2_transparent_sad_frown',
  image2_transparent_spirit_diamond_01: 'fullface_image2_transparent_spirit_diamond',
  image2_transparent_robot_led_01: 'fullface_image2_transparent_robot_led',
  image2_transparent_rival_glare_01: 'fullface_image2_transparent_rival_glare',
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
    surfaceMode: 'skinPlate',
  };
}

function image2TransparentFullFace(id, en, es) {
  return {
    id,
    label: en,
    labels: Object.freeze({ en, es }),
    placementDefaults: Object.freeze({ size: 1, offsetX: 0, offsetY: -0.02 }),
    markup: '',
    surfaceMode: 'transparent',
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
  image2TransparentFullFace('image2_transparent_brave_neutral_01', 'Image2 Transparent Brave Face', 'Cara transparente valiente Image2'),
  image2TransparentFullFace('image2_transparent_young_happy_01', 'Image2 Transparent Happy Face', 'Cara transparente feliz Image2'),
  image2TransparentFullFace('image2_transparent_angry_knight_01', 'Image2 Transparent Knight Face', 'Cara transparente caballero Image2'),
  image2TransparentFullFace('image2_transparent_rogue_smirk_01', 'Image2 Transparent Rogue Face', 'Cara transparente picara Image2'),
  image2TransparentFullFace('image2_transparent_sleepy_veteran_01', 'Image2 Transparent Veteran Face', 'Cara transparente veterana Image2'),
  image2TransparentFullFace('image2_transparent_worried_child_01', 'Image2 Transparent Child Face', 'Cara transparente infantil Image2'),
  image2TransparentFullFace('image2_transparent_noble_arch_01', 'Image2 Transparent Noble Face', 'Cara transparente noble Image2'),
  image2TransparentFullFace('image2_transparent_warrior_shout_01', 'Image2 Transparent Shout Face', 'Cara transparente grito Image2'),
  image2TransparentFullFace('image2_transparent_sad_frown_01', 'Image2 Transparent Sad Face', 'Cara transparente triste Image2'),
  image2TransparentFullFace('image2_transparent_spirit_diamond_01', 'Image2 Transparent Spirit Face', 'Cara transparente espiritu Image2'),
  image2TransparentFullFace('image2_transparent_robot_led_01', 'Image2 Transparent Robot Face', 'Cara transparente robot Image2'),
  image2TransparentFullFace('image2_transparent_rival_glare_01', 'Image2 Transparent Rival Face', 'Cara transparente rival Image2'),
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
