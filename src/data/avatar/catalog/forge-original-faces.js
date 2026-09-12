// Four deliberately composed faces. All parts remain individual catalog
// features, and all measurements remain normal recipe placement controls.
function face(id, name, family, config) {
  return Object.freeze({
    id,
    labels: Object.freeze({ es: `${name} · ${family}`, en: `${name} · ${family}` }),
    originalFace: true,
    recipe: Object.freeze({
      version: 2, label: name, headBuildMode: 'mold',
      bodyPresetId: config.body, headMoldId: config.head, headScale: config.scale || 1,
      headParams: config.params,
      featureSlabPresetId: 'default_embedded', featureDepthScale: 0.65,
      features: {
        hair: { presetId: config.hair }, fullFace: { presetId: 'none_01' },
        eyes: { presetId: config.eyes, placement: { spacing: -3, offsetY: -2 } },
        brows: { presetId: config.brows, placement: { offsetY: 3 } },
        nose: { presetId: config.nose, placement: { size: 0.9 } },
        mouth: { presetId: config.mouth, placement: { offsetY: -2 } },
        ears: { presetId: 'ear_soft_01', placement: { size: 0.82 } },
      },
      accessoryIds: ['none'], paletteId: 'warm_rose', colorOverrides: config.colors,
    }),
  });
}

export const FORGE_ORIGINAL_FACES = Object.freeze([
  face('forge_nora', 'Nora', 'N64', {
    body: 'n64_round', head: 'gen_head_round', hair: 'n64_flip_bob_01',
    params: { skullWidth: 0.04, jawDrop: -0.08, crownRoundness: 0.12, cheekFullness: 0.1 },
    eyes: 'forge_eye_lively', brows: 'forge_brow_arc', nose: 'nose_button_01', mouth: 'forge_mouth_smile',
    colors: { skin: '#d99573', hair: '#493331', iris: '#438f87', bodyPrimary: '#628781', bodySecondary: '#2b4651', accent: '#dcad6a' },
  }),
  face('forge_ivo', 'Ivo', 'PSX', {
    body: 'psx_heroic', head: 'gen_head_heroic', hair: 'psx_layered_hero_01',
    params: { skullWidth: 0.04, jawDrop: 0.02, crownRoundness: -0.04, cheekFullness: -0.04 },
    eyes: 'forge_eye_resolute', brows: 'forge_brow_resolute', nose: 'nose_bridge_01', mouth: 'forge_mouth_confident',
    colors: { skin: '#c59378', hair: '#34323d', iris: '#718ba1', bodyPrimary: '#b95745', bodySecondary: '#353c4f', accent: '#d4b469' },
  }),
  face('forge_mara', 'Mara', 'N64', {
    body: 'n64_classic', head: 'gen_head_chibi', scale: 1.05, hair: 'side_part_01',
    params: { skullWidth: 0.01, jawDrop: -0.04, crownRoundness: 0.1, cheekFullness: 0.07 },
    eyes: 'forge_eye_kind', brows: 'forge_brow_gentle', nose: 'nose_flat_01', mouth: 'forge_mouth_gentle',
    colors: { skin: '#975d44', hair: '#241b24', iris: '#ba8c44', bodyPrimary: '#48618a', bodySecondary: '#353144', accent: '#d38e56' },
  }),
  face('forge_bruno', 'Bruno', 'PSX', {
    body: 'psx_heavy', head: 'gen_head_broad', hair: 'psx_slick_back_01',
    params: { skullWidth: 0.02, jawDrop: 0.03, crownRoundness: -0.03, cheekFullness: 0.05 },
    eyes: 'forge_eye_wry', brows: 'forge_brow_bold', nose: 'nose_point_01', mouth: 'forge_mouth_wry',
    colors: { skin: '#c99977', hair: '#64402f', iris: '#6e8f66', bodyPrimary: '#546c45', bodySecondary: '#3e3e36', accent: '#ca9b57' },
  }),
]);
