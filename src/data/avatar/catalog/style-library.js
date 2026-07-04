const IMPLEMENTED_STATUS = 'draft';
const VALIDATED_STATUS = 'validated';

export const AVATAR_STYLE_TYPES = Object.freeze([
  'hair',
  'eyes',
  'brows',
  'mouth',
  'accessory',
  'palette',
]);

export const AVATAR_STYLE_FAMILIES = Object.freeze(['PSX', 'N64', 'Bridge']);

export const AVATAR_STYLE_LIBRARY_REQUIRED_FIELDS = Object.freeze([
  'id',
  'label',
  'type',
  'family',
  'silhouetteGoal',
  'compatibilityNotes',
  'rolloutPass',
  'validationStatus',
]);

export const AVATAR_STYLE_LIBRARY_TYPE_CONFIG = Object.freeze({
  hair: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
  eyes: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
  brows: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
  mouth: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
  accessory: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
  palette: Object.freeze({ minimumTarget: 15, requireFamilyCoverage: true }),
});

export const AVATAR_STYLE_LIBRARY_MINIMUMS = Object.freeze(
  Object.fromEntries(
    AVATAR_STYLE_TYPES.map((type) => [type, AVATAR_STYLE_LIBRARY_TYPE_CONFIG[type]?.minimumTarget || 0])
  )
);

function entry(type, id, label, family, silhouetteGoal, compatibilityNotes, rolloutPass, validationStatus = 'planned') {
  return Object.freeze({
    id,
    label,
    type,
    family,
    silhouetteGoal,
    compatibilityNotes,
    rolloutPass,
    validationStatus,
  });
}

const HAIR_TARGETS = Object.freeze([
  entry('hair', 'bob_01', 'Bob', 'PSX', 'Rigid medium bob with two solid bang masses.', 'Baseline PSX-compatible cut used in clipping checks.', 'hair-psx', VALIDATED_STATUS),
  entry('hair', 'side_part_01', 'Side Part', 'PSX', 'Compact side part with one dominant sweep.', 'Needs flatter front planes on portrait-style heads.', 'hair-psx', VALIDATED_STATUS),
  entry('hair', 'short_spikes_01', 'Short Spikes', 'Bridge', 'Short neutral spikes with low clipping risk.', 'Primary bridge hairstyle for broad compatibility sweeps.', 'hair-bridge', VALIDATED_STATUS),
  entry('hair', 'ponytail_01', 'Ponytail', 'Bridge', 'Simple ponytail with strong rear volume block.', 'Requires back-shell checks on narrow skulls.', 'hair-bridge', VALIDATED_STATUS),
  entry('hair', 'psx_layered_hero_01', 'Layered Hero', 'PSX', 'Stacked protagonist layers inspired by PS1 leads.', 'Must preserve a compact silhouette from the side.', 'hair-psx', VALIDATED_STATUS),
  entry('hair', 'psx_slick_back_01', 'Slick Back', 'PSX', 'Combed-back helmet shape with minimal fringe.', 'Used to reveal skull form without facial obstruction.', 'hair-psx', VALIDATED_STATUS),
  entry('hair', 'psx_buzz_cut_01', 'Buzz Cut', 'PSX', 'Very short PSX scalp read with almost no shell mass.', 'Should behave as the low-risk option for skull audits.', 'hair-psx', VALIDATED_STATUS),
  entry('hair', 'n64_flip_bob_01', 'Flip Bob', 'N64', 'Rounded bob with flipped-out tips.', 'Needs wider cheek clearance than the PSX bob.', 'hair-n64', VALIDATED_STATUS),
  entry('hair', 'n64_round_bangs_01', 'Round Bangs', 'N64', 'Curved bangs and compact top mass.', 'Pairs best with oval and round N64 heads.', 'hair-n64', VALIDATED_STATUS),
  entry('hair', 'n64_puff_spikes_01', 'Puff Spikes', 'N64', 'Chunky soft spikes with toy-like N64 volume.', 'Must keep a clear forehead despite thicker front shells.', 'hair-n64', VALIDATED_STATUS),
  entry('hair', 'n64_wavy_mid_01', 'Wavy Mid', 'N64', 'Mid-length soft waves with simple lowpoly curves.', 'Needs side padding on wider heads and cheeks.', 'hair-n64', VALIDATED_STATUS),
  entry('hair', 'n64_chunky_pony_01', 'Chunky Pony', 'N64', 'Thick rear pony with rounder N64 massing.', 'Used to test rear shell overlap on zeppelin heads.', 'hair-n64', VALIDATED_STATUS),
  entry('hair', 'bridge_curtain_long_01', 'Curtain Long', 'Bridge', 'Long curtain split with balanced front coverage.', 'Should read well on both slim and broad skulls.', 'hair-bridge', VALIDATED_STATUS),
  entry('hair', 'bridge_bowl_01', 'Bowl Cut', 'Bridge', 'Rounded bowl cut with neutral retro read.', 'Useful to test broad one-piece front shells.', 'hair-bridge', VALIDATED_STATUS),
  entry('hair', 'bridge_low_pony_01', 'Low Pony', 'Bridge', 'Lower ponytail with restrained front silhouette.', 'Acts as the safer long-hair option across families.', 'hair-bridge', VALIDATED_STATUS),
]);

const EYE_TARGETS = Object.freeze([
  entry('eyes', 'wide_01', 'Wide', 'N64', 'Open readable eye whites with clear iris placement.', 'Baseline for N64 and broad compatibility checks.', 'eyes-n64', VALIDATED_STATUS),
  entry('eyes', 'dot_01', 'Dot', 'Bridge', 'Minimal dot eyes for low-detail characters.', 'Fallback when larger eye whites clip on narrow heads.', 'eyes-bridge', VALIDATED_STATUS),
  entry('eyes', 'sleepy_01', 'Sleepy', 'N64', 'Low relaxed lids with compact iris shapes.', 'Needs extra horizontal spacing on narrow skulls.', 'eyes-n64', VALIDATED_STATUS),
  entry('eyes', 'smile_01', 'Smile Eyes', 'Bridge', 'Closed smiling eyes for broad emotional coverage.', 'Should stay readable even with heavy front hair.', 'eyes-bridge', VALIDATED_STATUS),
  entry('eyes', 'intense_01', 'Intense', 'Bridge', 'Sharp intense eye shape with heroic tension.', 'Requires per-head tightening on the narrowest skulls.', 'eyes-bridge', VALIDATED_STATUS),
  entry('eyes', 'psx_narrow_01', 'PSX Narrow', 'PSX', 'Tight PS1 eyes with minimal sclera.', 'Designed for more realistic PSX portrait heads.', 'eyes-psx', VALIDATED_STATUS),
  entry('eyes', 'psx_almond_soft_01', 'Almond Soft', 'PSX', 'Soft almond eye with calm adult read.', 'Needs centered iris placement and restrained scale.', 'eyes-psx', VALIDATED_STATUS),
  entry('eyes', 'psx_almond_sharp_01', 'Almond Sharp', 'PSX', 'Sharper almond eye with slight tension.', 'Pairs with harder brow presets and flatter foreheads.', 'eyes-psx', VALIDATED_STATUS),
  entry('eyes', 'psx_hero_square_01', 'Hero Square', 'PSX', 'Slightly squared eye whites for hero characters.', 'Should keep a PS1 read without looking anime-large.', 'eyes-psx', VALIDATED_STATUS),
  entry('eyes', 'psx_heavy_lid_01', 'Heavy Lid', 'PSX', 'Heavy upper lid with tired or serious look.', 'Needs lower brow clearance on small skulls.', 'eyes-psx', VALIDATED_STATUS),
  entry('eyes', 'n64_cartool_oval_01', 'Cartool Oval', 'N64', 'Simple rounded ovals tuned for wider cheeks.', 'Optimized for cartoony N64 face spacing.', 'eyes-n64', VALIDATED_STATUS),
  entry('eyes', 'n64_round_toon_eye_01', 'Round Toon', 'N64', 'Rounder cartoon eye for softer characters.', 'Needs extra lid room and wider horizontal spacing.', 'eyes-n64', VALIDATED_STATUS),
  entry('eyes', 'n64_bead_01', 'Tiny Bead', 'N64', 'Very small bead eye for ultra-lowpoly reads.', 'Useful on heads that cannot support larger whites.', 'eyes-n64', VALIDATED_STATUS),
  entry('eyes', 'bridge_droopy_01', 'Droopy', 'Bridge', 'Neutral droopy eye between realism and toon.', 'Should work across PSX and N64 bridge heads.', 'eyes-bridge', VALIDATED_STATUS),
  entry('eyes', 'bridge_confident_half_01', 'Confident Half', 'Bridge', 'Half-lidded confident eye with balanced attitude.', 'Needs consistent centering so both eyes remain legible.', 'eyes-bridge', VALIDATED_STATUS),
  entry('eyes', 'n64_round_big_01', 'Round Big', 'N64', 'Very large round eye with big iris for childlike Ocarina-era reads.', 'Needs wider spacing on narrow skulls and strong brow clearance.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_almond_01', 'Almond', 'Bridge', 'Clean almond eye tuned for sprite slabs and moderate realism.', 'Acts as the broad-use replacement for hand-drawn almond decals.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_happy_closed_01', 'Happy Closed', 'Bridge', 'Closed upward arc for smiling expressions without iris tint.', 'Useful for emotional range and should not require iris recolor.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_sad_closed_01', 'Sad Closed', 'Bridge', 'Closed downward arc for sad or tired expressions without iris tint.', 'Needs placement checks so the curve does not read as brow.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_wink_01', 'Wink', 'Bridge', 'Half-lidded wink with a visible crescent iris below the lid.', 'Asymmetric source must remain intentional when mirrored.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_surprised_round_01', 'Surprised', 'N64', 'Large round eye with tiny centered iris for surprise.', 'Requires enough scale to keep the tiny iris visible.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_side_glance_01', 'Side Glance', 'Bridge', 'Oval eye with iris pushed outward for directional glances.', 'Relies on side mirroring for correct left/right orientation.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_heart_01', 'Heart', 'N64', 'Heart-shaped iris for playful cartoon reactions.', 'Should stay optional because it is expressive rather than neutral.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'psx_robot_square_01', 'Robot Square', 'PSX', 'Square mechanical eye with scanline detail.', 'Best for stylized robotic or mask-like heads.', 'eyes-h5-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_sleepy_lid_01', 'Sleepy Lid', 'Bridge', 'Heavy-lidded tired eye with iris still visible below the lid.', 'Good for sleepy or unimpressed faces without losing tint control.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'psx_sharp_hero_01', 'Sharp Hero', 'PSX', 'Angular heroic eye with compact iris and strong upper edge.', 'Intended for serious hero reads without full anger.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_tiny_dot_01', 'Tiny Dot', 'N64', 'Small eye with tiny tintable dot for sparse comic faces.', 'Must stay visible at half-scale on broad heads.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_big_sparkle_01', 'Big Sparkle', 'N64', 'Large sparkling eye with multiple white highlights.', 'Expressive option for childlike or magical characters.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_downcast_01', 'Downcast', 'Bridge', 'Eye looking downward with a marked upper lid.', 'Useful for shy or sad expressions.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'psx_masked_slit_01', 'Masked Slit', 'PSX', 'Thin masked slit eye with short tintable iris line.', 'Best for mysterious helmets or mask-like faces.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_button_01', 'Button', 'N64', 'Round button eye with tintable stitched cross.', 'Stylized toy option that remains readable at 32px.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_diamond_01', 'Diamond', 'N64', 'Diamond-shaped eye white and iris for fantasy characters.', 'Pairs well with elf or magical silhouettes.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'bridge_old_wrinkle_01', 'Old Wrinkle', 'Bridge', 'Small eye with side wrinkle pixels for older faces.', 'Adds age cue without adding separate geometry.', 'eyes-h6-sprites', VALIDATED_STATUS),
  entry('eyes', 'n64_blank_glow_01', 'Blank Glow', 'N64', 'Blank white glowing eye with no iris tint slot.', 'For ghosts, magic, or statues where tinting is not needed.', 'eyes-h6-sprites', VALIDATED_STATUS),
]);

const BROW_TARGETS = Object.freeze([
  entry('brows', 'soft_01', 'Soft', 'Bridge', 'Soft neutral brow with low aggression.', 'Default compatibility brow for broad recipe checks.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'straight_01', 'Straight', 'PSX', 'Straight compact brow with light PSX severity.', 'Useful on portrait and hero jaw heads.', 'brows-psx', VALIDATED_STATUS),
  entry('brows', 'angled_01', 'PSX Angled', 'PSX', 'Angled brow for sharper serious expressions.', 'Needs careful spacing on the narrowest skulls.', 'brows-psx', VALIDATED_STATUS),
  entry('brows', 'short_01', 'Short', 'Bridge', 'Short brow for small-feature faces.', 'Fallback option when larger brows collide with hair.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'psx_serious_01', 'Serious', 'PSX', 'Harder PS1 serious brow block.', 'Pairs with narrow eyes and flatter foreheads.', 'brows-psx', VALIDATED_STATUS),
  entry('brows', 'psx_flat_thick_01', 'Flat Thick', 'PSX', 'Wide thick brow with low curve.', 'Needs extra forehead room on slim heads.', 'brows-psx', VALIDATED_STATUS),
  entry('brows', 'psx_sharp_v_01', 'Sharp V', 'PSX', 'Peak-shaped brow for stronger hero tension.', 'Should remain readable without becoming villain-only.', 'brows-psx', VALIDATED_STATUS),
  entry('brows', 'n64_curve_01', 'Curve', 'N64', 'Simple curved brow with N64 softness.', 'Works best with broader eye spacing and round eyes.', 'brows-n64', VALIDATED_STATUS),
  entry('brows', 'n64_gentle_round_01', 'Gentle Round', 'N64', 'Round gentle brow for friendly faces.', 'Should sit slightly higher than PSX variants.', 'brows-n64', VALIDATED_STATUS),
  entry('brows', 'n64_sleepy_low_01', 'Sleepy Low', 'N64', 'Lower sleepy brow with toy-like softness.', 'Needs careful separation from sleepy eyes.', 'brows-n64', VALIDATED_STATUS),
  entry('brows', 'bridge_arched_soft_01', 'Arched Soft', 'Bridge', 'Natural arch between realistic and cartoon.', 'Good first bridge brow after the baseline set.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'bridge_tiny_tilt_01', 'Tiny Tilt', 'Bridge', 'Minimal tilted brow for sparse faces.', 'Designed for tiny-eye and dot-eye recipes.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'bridge_worried_rise_01', 'Worried Rise', 'Bridge', 'Raised worried brow with readable asymmetry.', 'Needs consistent mirror placement to avoid drift.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'bridge_hero_block_01', 'Hero Block', 'Bridge', 'Compact hero brow between PSX and N64 reads.', 'Useful as the neutral high-energy brow.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'bridge_mischief_01', 'Mischief', 'Bridge', 'Playful tilted brow for light expression range.', 'Should stay subtle enough for broad reuse.', 'brows-bridge', VALIDATED_STATUS),
  entry('brows', 'bridge_worried_sprite_01', 'Worried', 'Bridge', 'Inner-raised worried brow drawn as a clean sprite slab.', 'Pairs with sad closed eyes and needs clear forehead space.', 'brows-h5-sprites', VALIDATED_STATUS),
  entry('brows', 'n64_arch_01', 'Arch', 'N64', 'Thin arched brow for surprise or elegance.', 'Should remain readable at half scale without becoming a lid.', 'brows-h5-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_zigzag_01', 'Zigzag', 'Bridge', 'Two-peak zigzag brow for comic anger.', 'Expressive option; avoid in default neutral bundles.', 'brows-h5-sprites', VALIDATED_STATUS),
  entry('brows', 'psx_thin_01', 'Thin', 'PSX', 'Nearly straight thin brow for restrained PSX faces.', 'Useful when thick brows crowd the eyes.', 'brows-h5-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_soft_curve_01', 'Soft Curve', 'Bridge', 'Neutral rounded curve for kind expressions.', 'Good broad-use brow when hard angles are too severe.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_heroic_slope_01', 'Heroic Slope', 'Bridge', 'Wide brow sloping toward the inner eye for resolve.', 'Works with sharp hero and almond eyes.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_sad_inner_up_01', 'Sad Inner Up', 'Bridge', 'Inner-raised sad brow for worried expressions.', 'Must keep clear separation from downcast eyes.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'n64_double_dash_01', 'Double Dash', 'N64', 'Two short dash segments for cartoon stylization.', 'Useful on compact and toy-like faces.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_bushy_round_01', 'Bushy Round', 'Bridge', 'Puffy rounded brow with larger mass.', 'Adds age or strong personality without extra parts.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_elder_01', 'Elder', 'Bridge', 'Long drooping brow with outer tail downward.', 'Pairs with old wrinkle eyes and broad cheeks.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'psx_villain_hook_01', 'Villain Hook', 'PSX', 'High arched brow with hooked end for theatrical villains.', 'Expressive option that should stay out of default bundles.', 'brows-h6-sprites', VALIDATED_STATUS),
  entry('brows', 'bridge_brow_tiny_dot_01', 'Tiny Dot', 'Bridge', 'Minimal two-dot brow for small feature layouts.', 'Fallback when normal brows crowd hair or eyes.', 'brows-h6-sprites', VALIDATED_STATUS),
]);

const MOUTH_TARGETS = Object.freeze([
  entry('mouth', 'smile_01', 'Smile', 'Bridge', 'Baseline readable smile with soft lip mass.', 'Default mouth used in most compatibility passes.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'neutral_01', 'Neutral', 'Bridge', 'Simple neutral line for calmer faces.', 'Acts as the clean reference when auditing skulls.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'grin_01', 'Grin', 'Bridge', 'Broader grin with more energy than the base smile.', 'Needs depth control so it does not sink into the face.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'open_01', 'Open', 'Bridge', 'Simple open mouth for speech or surprise.', 'Must keep enough projection to stay visible front-on.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'psx_line_01', 'PSX Line', 'PSX', 'Thin adult PS1 mouth line with limited volume.', 'Best for portrait and hero jaw heads.', 'mouth-psx', VALIDATED_STATUS),
  entry('mouth', 'psx_smirk_left_01', 'Smirk Left', 'PSX', 'Left-biased smirk with controlled asymmetry.', 'Needs centered mounting so asymmetry feels intentional.', 'mouth-psx', VALIDATED_STATUS),
  entry('mouth', 'psx_smirk_right_01', 'Smirk Right', 'PSX', 'Right-biased smirk mirroring the left version.', 'Should share the same baseline height as the left smirk.', 'mouth-psx', VALIDATED_STATUS),
  entry('mouth', 'psx_frown_01', 'Frown', 'PSX', 'Sharper negative mouth with restrained downturn.', 'Must avoid over-cartooning on realistic heads.', 'mouth-psx', VALIDATED_STATUS),
  entry('mouth', 'n64_bean_01', 'Bean', 'N64', 'Bean-like cartoon mouth for toyish N64 reads.', 'Pairs with broader cheeks and larger eye spacing.', 'mouth-n64', VALIDATED_STATUS),
  entry('mouth', 'n64_tiny_smile_01', 'Tiny Smile', 'N64', 'Small smile for compact N64 faces.', 'Useful when larger smiles overwhelm bead eyes.', 'mouth-n64', VALIDATED_STATUS),
  entry('mouth', 'n64_wide_open_01', 'Wide Open', 'N64', 'Broader open mouth with cartoon energy.', 'Requires vertical clearance from the nose on short faces.', 'mouth-n64', VALIDATED_STATUS),
  entry('mouth', 'bridge_tiny_neutral_01', 'Tiny Neutral', 'Bridge', 'Small neutral mouth for sparse or childlike faces.', 'Fallback when larger lips read too old.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'bridge_pout_01', 'Pout', 'Bridge', 'Compact pout with readable projection.', 'Needs consistent depth to avoid becoming a hole.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'bridge_o_shape_01', 'O Shape', 'Bridge', 'Rounded surprise mouth with clear silhouette.', 'Should remain centered on both wide and narrow skulls.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'bridge_toothy_grin_01', 'Toothy Grin', 'Bridge', 'Toothy grin for a stronger playful expression.', 'Needs careful lip-to-teeth contrast at low poly counts.', 'mouth-bridge', VALIDATED_STATUS),
  entry('mouth', 'n64_grin_teeth_01', 'Grin Teeth', 'N64', 'Wide open grin with a clear white tooth row.', 'Requires enough mouth slab height to keep teeth legible.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_ooh_01', 'Ooh', 'Bridge', 'Small round o mouth for surprise or singing.', 'Must not shrink below readable ring thickness.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'n64_cat_01', 'Cat', 'N64', 'Two-arc cat mouth for playful chibi faces.', 'Pairs best with round eyes and soft brows.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_tongue_01', 'Tongue', 'Bridge', 'Smile with tongue out using the lip tint slot.', 'Expressive option that should stay clear of the chin.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_sad_open_01', 'Sad Open', 'Bridge', 'Downturned open mouth for comic crying expressions.', 'Needs vertical spacing from nose on short heads.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'psx_smirk_sprite_01', 'Sprite Smirk', 'PSX', 'Asymmetric smirk sprite for sharper PSX attitudes.', 'Asymmetry should be deliberate and centered on the slab.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_neutral_small_01', 'Neutral Small', 'Bridge', 'Short two-pixel neutral line for sparse faces.', 'Fallback when broader mouths overpower tiny eyes.', 'mouth-h5-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_soft_smile_01', 'Soft Smile', 'Bridge', 'Small gentle smile with restrained curve.', 'Broad default alternative for friendlier faces.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'n64_wide_hero_grin_01', 'Wide Hero Grin', 'N64', 'Confident grin with white tooth row and strong outline.', 'Pairs with heroic eyes and broader N64 cheeks.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_pursed_01', 'Pursed', 'Bridge', 'Small pursed diamond mouth for thinking or whistling.', 'Should remain compact and centered.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_talk_side_01', 'Talk Side', 'Bridge', 'Asymmetric open mouth for speech frames.', 'Useful for expression sets and dialogue poses.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'n64_laugh_open_01', 'Laugh Open', 'N64', 'Large open laughing mouth with upper teeth.', 'Needs clear nose-mouth spacing on short heads.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_big_frown_01', 'Big Frown', 'Bridge', 'Large downturned frown with readable emotion.', 'Expressive sadness option that should not hit the chin.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'bridge_beard_gap_01', 'Beard Gap', 'Bridge', 'Short mouth designed to sit under moustache or beard shapes.', 'Keeps enough transparent space around the lip.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'psx_serious_cut_01', 'Serious Cut', 'PSX', 'Straight serious cut with slight lowered corner.', 'Good for restrained PSX adults and guards.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'n64_surprised_square_01', 'Surprised Square', 'N64', 'Small square surprise mouth with tooth highlight.', 'Designed for toy-like reaction faces.', 'mouth-h6-sprites', VALIDATED_STATUS),
  entry('mouth', 'n64_mischief_tooth_01', 'Mischief Tooth', 'N64', 'Lopsided grin with a single white tooth.', 'Playful expressive option for trickster faces.', 'mouth-h6-sprites', VALIDATED_STATUS),
]);

const ACCESSORY_TARGETS = Object.freeze([
  entry('accessory', 'ribbon_blue', 'Ribbon', 'Bridge', 'Top ribbon that reads clearly over simple hair shells.', 'Baseline accessory for head-top offset checks.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'round_glasses', 'Round Glasses', 'Bridge', 'Rounded glasses that sit over the eye line.', 'Reference accessory for face-mounted offset testing.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'star_clip', 'Star Clip', 'Bridge', 'Side clip that tests lateral accessory placement.', 'Must remain visible on broader and slimmer hair fronts.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'psx_square_glasses_01', 'Square Glasses', 'PSX', 'Angular glasses with a straighter PS1 frame.', 'Needs flatter placement than round glasses.', 'accessories-psx', IMPLEMENTED_STATUS),
  entry('accessory', 'psx_visor_strip_01', 'Visor Strip', 'PSX', 'Thin visor or strip accessory across the forehead.', 'Used to stress front-hair and brow clearance.', 'accessories-psx', IMPLEMENTED_STATUS),
  entry('accessory', 'psx_bandana_knot_01', 'Bandana Knot', 'PSX', 'Simple bandana with lowpoly knot read.', 'Must avoid clipping through larger back hair shells.', 'accessories-psx', IMPLEMENTED_STATUS),
  entry('accessory', 'psx_eyepatch_01', 'Eyepatch', 'PSX', 'Single-eye patch with compact strap logic.', 'Useful for testing asymmetric face attachments.', 'accessories-psx', IMPLEMENTED_STATUS),
  entry('accessory', 'n64_headband_sport_01', 'Sport Headband', 'N64', 'Rounded sporty headband with cartoon mass.', 'Needs soft vertical placement over wide foreheads.', 'accessories-n64', IMPLEMENTED_STATUS),
  entry('accessory', 'n64_goggles_up_01', 'Goggles Up', 'N64', 'Raised goggles sitting on top of the hair mass.', 'Stresses top-shell stacking on thicker N64 hair.', 'accessories-n64', IMPLEMENTED_STATUS),
  entry('accessory', 'n64_flower_pin_01', 'Flower Pin', 'N64', 'Chunky flower pin for softer stylized characters.', 'Should remain legible even on busy front hair.', 'accessories-n64', IMPLEMENTED_STATUS),
  entry('accessory', 'n64_leaf_clip_01', 'Leaf Clip', 'N64', 'Leaf-shaped clip with softer rounded silhouette.', 'Pairs with friendlier N64 reads and broader cheeks.', 'accessories-n64', IMPLEMENTED_STATUS),
  entry('accessory', 'bridge_hairpin_duo_01', 'Hairpin Duo', 'Bridge', 'Two-pin accessory for neutral side placement.', 'Acts as the bridge default for small side accessories.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'bridge_tiny_horns_01', 'Tiny Horns', 'Bridge', 'Small horns testing top silhouette add-ons.', 'Must stay subtle enough to work across families.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'bridge_jewel_circlet_01', 'Jewel Circlet', 'Bridge', 'Low circlet across the forehead with center gem.', 'Used to check accessories that span both temples.', 'accessories-bridge', IMPLEMENTED_STATUS),
  entry('accessory', 'bridge_mono_earring_01', 'Mono Earring', 'Bridge', 'Single earring for ear-mounted accessory checks.', 'Needs stable ear alignment across skull families.', 'accessories-bridge', IMPLEMENTED_STATUS),
]);

const PALETTE_TARGETS = Object.freeze([
  entry('palette', 'warm_rose', 'Warm Rose', 'Bridge', 'Warm skin and burgundy body base.', 'Default readable palette with broad skin and hair contrast.', 'palettes-foundation', IMPLEMENTED_STATUS),
  entry('palette', 'olive_gold', 'Olive Gold', 'Bridge', 'Muted olive and gold retro range.', 'Useful for earthy neutral characters.', 'palettes-foundation', IMPLEMENTED_STATUS),
  entry('palette', 'cool_ash', 'Cool Ash', 'Bridge', 'Cool ash tones with blue clothing bias.', 'Supports grey and steel hair reads.', 'palettes-foundation', IMPLEMENTED_STATUS),
  entry('palette', 'sunny_tan', 'Sunny Tan', 'Bridge', 'Sunny warm skin and bright clothing contrast.', 'Acts as a saturated warm baseline.', 'palettes-foundation', IMPLEMENTED_STATUS),
  entry('palette', 'mocha_night', 'Velvet Night', 'PSX', 'Deep night palette with darker skin and cool accents.', 'PSX-leaning dramatic palette for higher contrast portraits.', 'palettes-psx', IMPLEMENTED_STATUS),
  entry('palette', 'pastel_pop', 'Bubble Pop', 'N64', 'Playful pastel mix with brighter candy accents.', 'N64-leaning playful palette for rounder characters.', 'palettes-n64', IMPLEMENTED_STATUS),
  entry('palette', 'porcelain_blue', 'Porcelain Blue', 'PSX', 'Cool porcelain skin with blue-grey fashion cues.', 'Useful for restrained PSX portrait characters.', 'palettes-psx', IMPLEMENTED_STATUS),
  entry('palette', 'cocoa_cream', 'Cocoa Cream', 'Bridge', 'Warm cocoa skin with creamy highlights.', 'Balanced neutral palette with softer contrast.', 'palettes-bridge', IMPLEMENTED_STATUS),
  entry('palette', 'mint_lilac', 'Mint Lilac', 'N64', 'Mint and lilac candy range for softer cartoon looks.', 'Optimized for friendly N64 heads and round eyes.', 'palettes-n64', IMPLEMENTED_STATUS),
  entry('palette', 'autumn_amber', 'Autumn Amber', 'PSX', 'Amber and rust tones with stronger retro warmth.', 'Supports more grounded PSX hero and civilian recipes.', 'palettes-psx', IMPLEMENTED_STATUS),
  entry('palette', 'denim_coral', 'Denim Coral', 'Bridge', 'Blue denim base with coral accent pop.', 'Bridge palette with clean contrast for QA captures.', 'palettes-bridge', IMPLEMENTED_STATUS),
  entry('palette', 'ivory_wine', 'Ivory Wine', 'PSX', 'Ivory skin values with deeper wine garments.', 'Higher-drama PSX palette for portrait heads.', 'palettes-psx', IMPLEMENTED_STATUS),
  entry('palette', 'rust_olive', 'Rust Olive', 'Bridge', 'Rust clothing and olive secondary tones.', 'Grounded bridge palette for neutral bodies.', 'palettes-bridge', IMPLEMENTED_STATUS),
  entry('palette', 'arcade_teal', 'Arcade Teal', 'N64', 'Bright teal-forward palette with synthetic retro punch.', 'N64 palette intended for louder playful recipes.', 'palettes-n64', IMPLEMENTED_STATUS),
  entry('palette', 'sandstone_plum', 'Sandstone Plum', 'Bridge', 'Sandstone skin values with plum garment accents.', 'Bridge palette that stays readable across many hair colors.', 'palettes-bridge', IMPLEMENTED_STATUS),
]);

export const AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE = Object.freeze({
  hair: HAIR_TARGETS,
  eyes: EYE_TARGETS,
  brows: BROW_TARGETS,
  mouth: MOUTH_TARGETS,
  accessory: ACCESSORY_TARGETS,
  palette: PALETTE_TARGETS,
});

export const AVATAR_STYLE_LIBRARY_TARGETS = Object.freeze(
  AVATAR_STYLE_TYPES.flatMap((type) => AVATAR_STYLE_LIBRARY_TARGETS_BY_TYPE[type] || [])
);

export const AVATAR_STYLE_LIBRARY_TARGET_MAP = Object.freeze(
  Object.fromEntries(
    AVATAR_STYLE_LIBRARY_TARGETS.map((entryDef) => [`${entryDef.type}:${entryDef.id}`, entryDef])
  )
);
