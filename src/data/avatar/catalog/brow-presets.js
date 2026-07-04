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
  bridge_worried_sprite_01: 'brow_worried',
  n64_arch_01: 'brow_arch',
  bridge_zigzag_01: 'brow_zigzag',
  psx_thin_01: 'brow_thin',
  bridge_soft_curve_01: 'brow_soft_curve',
  bridge_heroic_slope_01: 'brow_heroic_slope',
  bridge_sad_inner_up_01: 'brow_sad_inner_up',
  n64_double_dash_01: 'brow_double_dash',
  bridge_bushy_round_01: 'brow_bushy_round',
  bridge_elder_01: 'brow_elder',
  psx_villain_hook_01: 'brow_villain_hook',
  bridge_brow_tiny_dot_01: 'brow_tiny_dot',
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
  {
    id: 'bridge_worried_sprite_01',
    label: 'Worried',
    labels: Object.freeze({ en: 'Worried', es: 'Preocupada' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 226L212 206L236 212L228 222L194 232Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M276 212L300 206L324 226L318 232L284 222Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'n64_arch_01',
    label: 'Arch',
    labels: Object.freeze({ en: 'Arch', es: 'Arco' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 222Q212 202 238 214L234 220Q212 212 192 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 214Q300 202 326 222L322 226Q300 212 278 220Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_zigzag_01',
    label: 'Zigzag',
    labels: Object.freeze({ en: 'Zigzag', es: 'Zigzag' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 218L198 204L214 220L230 204L242 218L236 224L214 214L196 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M270 218L282 204L298 220L314 204L328 218L316 226L298 214L276 224Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'psx_thin_01',
    label: 'Thin',
    labels: Object.freeze({ en: 'Thin', es: 'Fina' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M190 214H238L236 220H190Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 214H322V220H276Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_soft_curve_01',
    label: 'Soft Curve',
    labels: Object.freeze({ en: 'Soft Curve', es: 'Curva suave' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 220Q212 206 238 216L234 224Q212 216 192 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 216Q300 206 326 220L320 226Q300 216 278 224Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_heroic_slope_01',
    label: 'Heroic Slope',
    labels: Object.freeze({ en: 'Heroic Slope', es: 'Pendiente heroica' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 226L238 206L242 214L190 232Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M270 214L274 206L328 226L322 232Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_sad_inner_up_01',
    label: 'Sad Inner Up',
    labels: Object.freeze({ en: 'Sad Inner Up', es: 'Triste interior alto' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M188 208L238 222L234 230L186 218Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 222L324 208L326 218L278 230Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'n64_double_dash_01',
    label: 'Double Dash',
    labels: Object.freeze({ en: 'Double Dash', es: 'Doble guion' }),
    markup: '<path id="BROW_LA" data-rv-role="eyebrow" d="M188 220L214 212L216 220L190 228Z" fill="{{hairDark}}"/><path id="BROW_LB" data-rv-role="eyebrow" d="M222 212L240 218L236 226L220 220Z" fill="{{hairDark}}"/><path id="BROW_RA" data-rv-role="eyebrow" d="M272 218L290 212L292 220L276 226Z" fill="{{hairDark}}"/><path id="BROW_RB" data-rv-role="eyebrow" d="M298 212L324 220L322 228L296 220Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_bushy_round_01',
    label: 'Bushy Round',
    labels: Object.freeze({ en: 'Bushy Round', es: 'Poblada redonda' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 218Q212 200 242 216Q222 230 188 226Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M270 216Q300 200 328 218Q324 226 290 230Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_elder_01',
    label: 'Elder',
    labels: Object.freeze({ en: 'Elder', es: 'Anciana' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M186 210Q210 214 238 228L234 234Q208 224 186 218Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M274 228Q302 214 326 210V218Q304 224 278 234Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'psx_villain_hook_01',
    label: 'Villain Hook',
    labels: Object.freeze({ en: 'Villain Hook', es: 'Gancho villano' }),
    markup: '<path id="BROW_L" data-rv-role="eyebrow" d="M184 226Q210 198 238 214L242 226L230 220Q208 210 190 232Z" fill="{{hairDark}}"/><path id="BROW_R" data-rv-role="eyebrow" d="M270 214Q302 198 328 226L322 232Q304 210 282 220L270 226Z" fill="{{hairDark}}"/>',
  },
  {
    id: 'bridge_brow_tiny_dot_01',
    label: 'Tiny Dot',
    labels: Object.freeze({ en: 'Tiny Dot', es: 'Punto pequeno' }),
    markup: '<ellipse id="BROW_L" data-rv-role="eyebrow" cx="214" cy="216" rx="8" ry="5" fill="{{hairDark}}"/><ellipse id="BROW_R" data-rv-role="eyebrow" cx="298" cy="216" rx="8" ry="5" fill="{{hairDark}}"/>',
  },
].map(withSpriteId));
