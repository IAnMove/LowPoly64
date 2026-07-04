# Avatar Heads Pipeline

Avatar Forge now uses generated skull presets only. The removed hand-authored
head meshes were replaced by `src/data/avatar/generated-heads.js`, which emits a
clean low-poly skull, generated landmarks, and canonical axes from a compact
numeric spec.

## Runtime Shape

New recipes normalize to the mold route and the default generated head:

```json
{
  "version": 2,
  "label": "Avatar",
  "headBuildMode": "mold",
  "bodyPresetId": "psx_chibi",
  "headMoldId": "gen_head_heroic",
  "headParams": {
    "skullWidth": 0,
    "jawDrop": 0,
    "crownRoundness": 0,
    "cheekFullness": 0
  },
  "features": {
    "hair": { "presetId": "bob_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0, "length": 0 } },
    "eyes": { "presetId": "wide_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0, "spacing": 0 } },
    "brows": { "presetId": "soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "nose": { "presetId": "nose_soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "mouth": { "presetId": "neutral_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
    "ears": { "presetId": "ear_soft_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } }
  },
  "accessoryIds": ["none"],
  "paletteId": "warm_rose"
}
```

Legacy saved head IDs are compatibility input only. `avatar-recipe.js` migrates
them to the nearest generated preset during load, and unknown head IDs fall back
to `gen_head_heroic`.

## Generated Head Spec

Each curated preset in `generated-heads.js` has:

```js
{
  id: 'gen_head_example',
  name: 'Example',
  spec: {
    skullWidth: 0.8,
    skullDepth: 0.86,
    jawWidth: 0.6,
    jawDrop: 0.5,
    chinShape: 0.35,
    cheekFullness: 0.35,
    faceFlatness: 0.6,
    crownRoundness: 0.6,
    eyeLineHeight: 0.5
  }
}
```

Valid ranges are enforced by `resolveSpec()`:

| Field | Range | Meaning |
|---|---:|---|
| `skullWidth` | 0.5-1.1 | Full skull width in canonical units. |
| `skullDepth` | 0.5-1.05 | Full front-to-back depth. |
| `jawWidth` | 0.35-0.95 | Jaw width as a fraction of skull width. |
| `jawDrop` | 0-1 | Face length; higher means longer jaw. |
| `chinShape` | 0-1 | Round to pointy chin. |
| `cheekFullness` | 0-1 | Flat to full cheeks. |
| `faceFlatness` | 0-1 | Strength of the front facial plate. |
| `crownRoundness` | 0-1 | Flat crown to round dome. |
| `eyeLineHeight` | 0.42-0.6 | Eye line as a fraction of the fixed head height. |

The generator emits canonical head space directly: `+Y` up, `+Z` face/front,
height `1.2`, bottom at `y = 0`, centered on X/Z.

## Landmarks

Landmarks are derived from the same formulas that build the mesh, not measured
from hand-authored geometry. Required keys:

| Key | Meaning |
|---|---|
| `eyeL`, `eyeR` | Surface points near each eye center; define interocular scale. |
| `noseTip` | Nose mount point on the front surface. |
| `mouth` | Mouth decal anchor. |
| `earL`, `earR` | Ear pair mount points. |
| `hairline` | Front cutoff for the procedural hair helmet. |
| `crown` | Top of skull for hair and bounds. |
| `chin` | Lower face bound. |

## Feature Contract

There are no checked-in head mesh JSON files. The effective feature contract is
split across:

- generated presets in `src/data/avatar/generated-heads.js`
- runtime entries in `src/data/avatar/catalog/head-meshes.js`
- mold metadata in `src/data/avatar/catalog/head-molds.js`
- preset catalog entries in `src/data/avatar/catalog/*-presets.js`
- recipe placement in `recipe.features[key].placement`
- feature slab generation in `src/modules/avatar/avatar-builder.js`
- landmark projection in `src/modules/svg/svg-head-integration.js` for non-slab features

Placement fields:

| Field | Applies to | Meaning |
|---|---|---|
| `size` | all feature keys | Multiplicative scale, default `1`. |
| `offsetX` | all feature keys | Horizontal delta from the landmark. |
| `offsetY` | all feature keys | Vertical delta from the landmark. Positive follows SVG convention: down. |
| `spacing` | eyes only | Extra distance between mirrored eye parts. |
| `length` | hair only | Procedural hair length control. |

Facial feature scale is relative to the generated head interocular distance.
The calibration head is `gen_head_heroic`.

## Face Feature Slabs

Eyes, brows, and mouths are no longer painted onto a single shrink-wrapped
`FACE_DECAL` grid. `buildFeatureSlabParts(resolved, headGeometryEntry)` emits
five independent custom-geometry pieces in canonical head space:

- `EYE_SLAB_L`
- `EYE_SLAB_R`
- `BROW_SLAB_L`
- `BROW_SLAB_R`
- `MOUTH_SLAB`

Each slab is a thin rectangular prism. Its width and height are derived from the
head interocular distance, and its depth is `0.18 * interocular`. The front face
sits slightly outside the sampled skull surface while most of the prism remains
embedded in the head, so the feature stays visible even when the sampled surface
varies across skull presets.

Each slab carries a sprite-only `decal` with exactly one layer. Valid sprites are
listed in `src/data/avatar/sprites/sprites-manifest.json`; tint placeholders are
resolved through the avatar palette. The `decal` renderer no longer draws
procedural `style` layers for eyes, brows, or mouths. Legacy imported
`FACE_DECAL` planes can still be textured when they declare sprite layers, but
Avatar Forge-generated heads should use slabs.

## Hair Helmet

`src/modules/avatar/hair-helmet.js` builds a procedural skull-following helmet
when the head has landmarks and custom geometry. It uses `hairline`, `crown`,
eye height, ear height, and chin from the generated head.

## Audits And Captures

Primary gate:

```powershell
npm run check
```

This runs release readiness, generated-head checks, sprite checks, template
asset audit, and `scripts/avatar-visual-audit.mjs`.

Manual capture sweeps:

```powershell
$env:CAPTURE_HEADS='1'; npx playwright test avatar-head-capture --reporter=line
$env:CAPTURE_BODIES='1'; npx playwright test avatar-body-capture --reporter=line
```

Head captures write to `.tmp-head-views/avatars/`. Body captures write to
`.tmp-head-views/bodies/`.

## Adding Or Adjusting A Head

1. Add or edit a preset spec in `src/data/avatar/generated-heads.js`.
2. Keep the ID prefixed with `gen_head_`.
3. Run `node scripts/check-generated-heads.mjs`.
4. Run `npm run audit:avatar-visual` and inspect `.tmp-head-views/audit/`.
5. Run `npm run check`.

Reject a spec if landmarks leave the skull bounds, symmetry breaks, feature
slabs cannot read clearly, slabs fail the protrusion audit, or the generated
head no longer looks like clean low-poly N64/PSX geometry.
