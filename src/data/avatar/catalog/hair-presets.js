const AVATAR_HAIR_PRESET_DEFINITIONS = Object.freeze([
  {
    id: 'none_01',
    label: 'No Hair',
    frontMarkup: '',
    backMarkup: '',
  },
  {
    id: 'bob_01',
    label: 'Bob',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.14" d="M156 182C170 132 212 96 256 92C300 96 342 132 356 182C366 226 358 318 328 376H184C154 318 146 226 156 182Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 170L210 124H302L342 170L324 208L290 194L256 188L222 194L188 208Z" fill="{{hair}}"/><path id="BANG_L" data-rv-role="hair" d="M194 168L226 156L222 226L198 236Z" fill="{{hairLight}}"/><path id="BANG_R" data-rv-role="hair" d="M318 168L286 156L290 226L314 236Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'side_part_01',
    label: 'Side Part',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.14" d="M170 182L206 132L286 116L334 148L348 214L336 300L308 360H204L176 304L166 228Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M172 176L218 128H324L332 170L304 202L270 182L234 188L206 206L176 198Z" fill="{{hair}}"/><path id="PART_SWEEP" data-rv-role="hair" d="M214 130L286 116L304 132L264 188L220 198Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'short_spikes_01',
    label: 'Short Spikes',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.14" d="M166 186L198 128L238 98H274L314 108L346 164L338 218L306 210L256 204L206 210L176 220Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M164 194L188 144L218 116L226 158L242 126L256 104L270 126L286 154L296 116L326 144L348 194L314 206L256 198L198 206Z" fill="{{hair}}"/>',
  },
  {
    id: 'ponytail_01',
    label: 'Ponytail',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.18" d="M150 176L184 122L246 92H286L340 122L360 206L340 308L302 374H210L172 318L150 242Z" fill="{{hairDark}}"/><path id="PONYTAIL" data-rv-role="hair_back" data-rv-shell="0.11" data-rv-depth="0.14" d="M338 246C384 260 398 314 388 362C380 400 352 430 320 446C332 416 330 388 318 356C304 322 280 298 252 284C270 264 296 252 338 246Z" fill="{{hair}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 170L214 126H298L342 170L322 206L286 194L256 188L226 194L190 206Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'psx_layered_hero_01',
    label: 'Layered Hero',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.14" d="M170 182L202 134L240 108H280L314 118L340 152L348 212L336 290L312 352H202L176 302L166 230Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 182L196 146L222 120L234 160L248 126L264 104L280 128L294 160L310 126L332 152L346 182L320 198L292 190L262 180L234 190L202 202Z" fill="{{hair}}"/><path id="HAIR_FRONT_LAYER" data-rv-role="hair" d="M194 154L222 138L252 150L284 136L312 150L298 176L258 170L220 178Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'psx_slick_back_01',
    label: 'Slick Back',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.07" data-rv-depth="0.12" d="M170 192L194 146L232 112H284L322 130L342 178L338 252L322 324L294 362H218L190 322L170 266Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M178 184L204 138H314L336 178L306 184L274 176L242 174L208 180Z" fill="{{hair}}"/><path id="HAIR_FRONT_SWEEP" data-rv-role="hair" d="M208 136H308L292 152H220Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'psx_buzz_cut_01',
    label: 'Buzz Cut',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.04" data-rv-depth="0.08" d="M176 188L194 140L232 110H280L318 120L340 164L336 216L308 208L256 202L206 208L180 218Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M182 188L204 150H308L330 184L296 190L256 188L216 192Z" fill="{{hair}}"/>',
  },
  {
    id: 'n64_flip_bob_01',
    label: 'Flip Bob',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.09" data-rv-depth="0.16" d="M154 178L186 126L238 96H286L330 112L356 160L360 236L344 322L320 378H192L168 332L152 242Z" fill="{{hairDark}}"/><path id="HAIR_FLIP_L" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.12" d="M176 330L156 366L178 392L214 374L210 342Z" fill="{{hair}}"/><path id="HAIR_FLIP_R" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.12" d="M336 330L302 342L298 374L334 392L356 366Z" fill="{{hair}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M174 174L210 128H302L338 174L316 206L286 198L256 194L226 198L196 206Z" fill="{{hair}}"/><path id="HAIR_FRONT_CURVE" data-rv-role="hair" d="M206 136H306L292 156L256 162L220 156Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'n64_round_bangs_01',
    label: 'Round Bangs',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.09" data-rv-depth="0.15" d="M160 182L194 126L244 96H286L324 108L350 150L356 220L344 316L312 372H200L170 318L156 238Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M172 174L204 132H308L340 174L328 198L304 212L278 200L256 196L234 200L208 212L184 198Z" fill="{{hair}}"/><path id="HAIR_BANG_ARC" data-rv-role="hair" d="M206 138H306L296 160L256 170L216 160Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'n64_puff_spikes_01',
    label: 'Puff Spikes',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.16" d="M162 182L190 128L228 102H286L324 110L352 160L344 220L312 212L256 208L202 212L170 222Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 194L190 148L216 120L232 158L246 126L256 108L268 126L282 156L300 120L324 148L344 194L320 208L292 202L256 198L220 202L192 208Z" fill="{{hair}}"/><path id="HAIR_PUFF_CAP" data-rv-role="hair" d="M206 140L228 126H284L306 140L294 162L256 168L218 162Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'n64_wavy_mid_01',
    label: 'Wavy Mid',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.18" d="M150 176L182 122L236 94H286L334 116L360 176L358 258L338 340L300 392H212L174 340L152 250Z" fill="{{hairDark}}"/><path id="HAIR_WAVE_L" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.12" d="M184 292L164 336L186 382L214 356L208 312Z" fill="{{hair}}"/><path id="HAIR_WAVE_R" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.12" d="M328 292L304 312L298 356L326 382L348 336Z" fill="{{hair}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M168 176L204 126H308L344 176L320 208L290 198L256 194L222 198L192 208Z" fill="{{hair}}"/><path id="HAIR_WAVE_FRONT_L" data-rv-role="hair" d="M190 174L216 158L214 220L188 236Z" fill="{{hairLight}}"/><path id="HAIR_WAVE_FRONT_R" data-rv-role="hair" d="M322 174L296 158L298 220L324 236Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'n64_chunky_pony_01',
    label: 'Chunky Pony',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.09" data-rv-depth="0.16" d="M160 184L188 132L240 102H284L330 126L346 206L332 300L298 360H214L180 304L160 242Z" fill="{{hairDark}}"/><path id="PONYTAIL" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.14" d="M334 248C372 260 384 306 376 350C370 386 344 414 314 430C324 402 320 374 308 344C294 314 272 292 246 278C262 260 288 252 334 248Z" fill="{{hair}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 172L206 126H302L340 172L320 208L288 198L256 192L224 198L192 208Z" fill="{{hairLight}}"/><path id="HAIR_FRONT_KNOT" data-rv-role="hair" d="M240 128H272L266 148H246Z" fill="{{hair}}"/>',
  },
  {
    id: 'bridge_curtain_long_01',
    label: 'Curtain Long',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.09" data-rv-depth="0.16" d="M164 182L196 132L242 106H284L322 120L344 164L342 246L326 322L294 370H218L186 324L166 240Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M174 172L206 128H306L338 172L320 204L286 194L270 158L256 188L242 158L226 194L192 204Z" fill="{{hair}}"/><path id="CURTAIN_L" data-rv-role="hair" d="M220 132L250 150L238 248L206 262Z" fill="{{hairLight}}"/><path id="CURTAIN_R" data-rv-role="hair" d="M292 132L262 150L274 248L306 262Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'bridge_bowl_01',
    label: 'Bowl Cut',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.08" data-rv-depth="0.14" d="M170 186L200 136L238 110H284L320 122L340 156L342 210L330 286L302 348H210L182 294L170 230Z" fill="{{hairDark}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M170 174L204 132H308L342 174L328 196L300 206L256 210L212 206L184 196Z" fill="{{hair}}"/><path id="BOWL_FRONT" data-rv-role="hair" d="M206 138H306L296 158L256 164L216 158Z" fill="{{hairLight}}"/>',
  },
  {
    id: 'bridge_low_pony_01',
    label: 'Low Pony',
    backMarkup: '<path id="HAIR_BACK" data-rv-role="hair_back" data-rv-shell="0.09" data-rv-depth="0.16" d="M156 178L186 126L240 94H286L336 120L354 206L338 302L304 366H208L174 306L156 236Z" fill="{{hairDark}}"/><path id="LOW_PONY" data-rv-role="hair_back" data-rv-shell="0.1" data-rv-depth="0.12" d="M248 340C278 344 302 366 308 396C314 426 304 454 284 470C286 442 282 418 270 392C260 372 244 356 224 344C232 340 238 338 248 340Z" fill="{{hair}}"/>',
    frontMarkup: '<path id="HAIR_FRONT" data-rv-role="hair" d="M172 174L206 130H304L338 174L318 206L288 196L256 192L224 196L194 206Z" fill="{{hair}}"/><path id="LOW_PONY_FRONT" data-rv-role="hair" d="M212 136H300L288 156L256 162L224 156Z" fill="{{hairLight}}"/>',
  },
]);

function createPlacementDefaults(size, offsetX = 0, offsetY = 0) {
  return Object.freeze({ size, offsetX, offsetY });
}

function createHairMoldPlacement(size, options = {}) {
  const frontScale = Number.isFinite(options.frontScale) ? options.frontScale : 0.92;
  const backScale = Number.isFinite(options.backScale) ? options.backScale : 0.74;
  const frontOffsetY = Number.isFinite(options.frontOffsetY) ? options.frontOffsetY : 0;
  const backOffsetY = Number.isFinite(options.backOffsetY) ? options.backOffsetY : -2;
  return Object.freeze({
    placementDefaults: createPlacementDefaults(size, 0, 0),
    placementDefaultsFront: createPlacementDefaults(Number((size * frontScale).toFixed(2)), 0, frontOffsetY),
    placementDefaultsBack: createPlacementDefaults(Number((size * backScale).toFixed(2)), 0, backOffsetY),
  });
}

const AVATAR_HAIR_PRESET_MOLD_METADATA = Object.freeze({
  none_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'capFront',
    mountVariantBack: 'capBack',
    ...createHairMoldPlacement(1, { frontScale: 1, backScale: 1, backOffsetY: 0 }),
  }),
  bob_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'wideFront',
    mountVariantBack: 'wideBack',
    ...createHairMoldPlacement(0.5, { frontScale: 0.92, backScale: 0.7, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  side_part_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'capFront',
    mountVariantBack: 'capBack',
    ...createHairMoldPlacement(0.5, { backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  short_spikes_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'shortFront',
    mountVariantBack: 'shortBack',
    ...createHairMoldPlacement(0.48, { frontScale: 0.9, backScale: 0.7, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  ponytail_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'ponyFront',
    mountVariantBack: 'ponyBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.9, backScale: 0.74, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  psx_layered_hero_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'capFront',
    mountVariantBack: 'capBack',
    ...createHairMoldPlacement(0.52, { backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  psx_slick_back_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'capFront',
    mountVariantBack: 'capBack',
    ...createHairMoldPlacement(0.48, { backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  psx_buzz_cut_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'shortFront',
    mountVariantBack: 'shortBack',
    ...createHairMoldPlacement(0.44, { frontScale: 0.88, backScale: 0.68, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  n64_flip_bob_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'wideFront',
    mountVariantBack: 'wideBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.92, backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  n64_round_bangs_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'wideFront',
    mountVariantBack: 'wideBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.92, backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  n64_puff_spikes_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'shortFront',
    mountVariantBack: 'shortBack',
    ...createHairMoldPlacement(0.5, { frontScale: 0.9, backScale: 0.7, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  n64_wavy_mid_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'wideFront',
    mountVariantBack: 'longBack',
    ...createHairMoldPlacement(0.54, { frontScale: 0.9, backScale: 0.76, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  n64_chunky_pony_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'ponyFront',
    mountVariantBack: 'ponyBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.9, backScale: 0.74, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  bridge_curtain_long_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'wideFront',
    mountVariantBack: 'longBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.9, backScale: 0.76, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  bridge_bowl_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'capFront',
    mountVariantBack: 'capBack',
    ...createHairMoldPlacement(0.5, { backScale: 0.72, frontOffsetY: 0, backOffsetY: -2 }),
  }),
  bridge_low_pony_01: Object.freeze({
    mountRole: 'hairCap',
    mountVariantFront: 'ponyFront',
    mountVariantBack: 'ponyBack',
    ...createHairMoldPlacement(0.52, { frontScale: 0.9, backScale: 0.74, frontOffsetY: 0, backOffsetY: -2 }),
  }),
});

export const AVATAR_HAIR_PRESETS = Object.freeze(
  AVATAR_HAIR_PRESET_DEFINITIONS.map((entry) => Object.freeze({
    ...entry,
    ...(AVATAR_HAIR_PRESET_MOLD_METADATA[entry.id] || AVATAR_HAIR_PRESET_MOLD_METADATA.none_01),
  }))
);
