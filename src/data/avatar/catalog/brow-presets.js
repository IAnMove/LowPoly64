const BROW_SPRITE_BY_PRESET_ID = Object.freeze({
  soft_01: 'brow_angled',
  straight_01: 'brow_flat',
  angled_01: 'brow_angled',
  short_01: 'brow_flat',
  psx_serious_01: 'brow_angled',
  psx_flat_thick_01: 'brow_thick',
  psx_sharp_v_01: 'brow_angled',
  n64_curve_01: 'brow_angled',
  n64_gentle_round_01: 'brow_angled',
  n64_sleepy_low_01: 'brow_flat',
  bridge_arched_soft_01: 'brow_angled',
  bridge_tiny_tilt_01: 'brow_angled',
  bridge_worried_rise_01: 'brow_angled',
  bridge_hero_block_01: 'brow_flat',
  bridge_mischief_01: 'brow_angled',
});

function withSpriteId(preset) {
  const spriteId = BROW_SPRITE_BY_PRESET_ID[preset.id];
  return Object.freeze(spriteId ? { ...preset, spriteId } : preset);
}

export const AVATAR_BROW_PRESETS = Object.freeze([
  {
    id: 'none_01',
    label: 'No Brows',
    markup: '',
  },
  {
    id: 'soft_01',
    label: 'Soft',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M186 218L204 206H236L240 214L222 224H190Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M272 214L276 206H308L326 218L322 224H290Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'straight_01',
    label: 'Straight',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 210H238L234 220H190Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 210H324L322 220H276Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'angled_01',
    label: 'Angled',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 222L236 204L240 212L190 228Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M272 212L276 204L328 222L322 228Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'short_01',
    label: 'Short',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M198 218L228 210L232 216L202 224Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M280 216L284 210L314 218L310 224Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'psx_serious_01',
    label: 'Serious',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 220L238 204L240 214L190 228Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M272 214L274 204L328 220L322 228Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'psx_flat_thick_01',
    label: 'Flat Thick',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M182 208H240L236 222H186Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M272 208H330L326 222H276Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'psx_sharp_v_01',
    label: 'Sharp V',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M186 224L214 202H242L232 214L194 228Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M270 214L298 202H326L326 208L318 214L280 228Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'n64_curve_01',
    label: 'Curve',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M186 220Q210 202 238 214L234 224Q210 214 190 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 214Q302 202 326 220L322 226Q302 214 278 224Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'n64_gentle_round_01',
    label: 'Gentle Round',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M190 220Q210 206 234 214L230 222Q212 216 194 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M278 214Q302 206 322 220L318 226Q300 216 282 222Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'n64_sleepy_low_01',
    label: 'Sleepy Low',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M192 224L208 216H236L232 224H198Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M280 224L284 216H312L328 224H286Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_arched_soft_01',
    label: 'Arched Soft',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 220Q212 202 236 214L232 224Q212 216 192 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M276 214Q300 202 324 220L320 226Q300 216 280 222Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_tiny_tilt_01',
    label: 'Tiny Tilt',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M202 220L224 212L228 216L206 224Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M286 216L290 212L312 220L308 224Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_worried_rise_01',
    label: 'Worried Rise',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 224L208 206L232 212L226 222L194 230Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M278 212L302 206L322 224L308 228L284 220Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_hero_block_01',
    label: 'Hero Block',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M186 214H236L232 224H188Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M276 214H326L322 224H278Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_mischief_01',
    label: 'Mischief',
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M190 226L214 206H236L230 216L196 230Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M278 214L302 206L320 216L314 224L286 220Z" fill="{{hairDark}}"/>',
  },
].map(withSpriteId));
