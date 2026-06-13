# Avatar Heads Pipeline

This document describes the current Avatar Forge head pipeline used by the mold-only head builder.

## Runtime Shape

New Avatar Forge sessions use the mold route. A recipe is normalized to:

```json
{
  "version": 2,
  "label": "Avatar",
  "headBuildMode": "mold",
  "bodyPresetId": "psx_chibi",
  "headMoldId": "psx_mesh_portrait_01",
  "features": {
    "hair": { "presetId": "bob_01", "placement": { "size": 1, "offsetX": 0, "offsetY": 0 } },
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

Old saved fields are compatibility input only. The runtime normalizer migrates incoming head data to `headBuildMode: "mold"` and the default `headMoldId` instead of preserving the removed full-face SVG route.

## `head.json`

Head sources live under `src/data/avatar/heads/`. Each file is a JSON model with a `HEAD_BASE` custom mesh, axis metadata, and nine landmarks:

```json
{
  "name": "small portrait head",
  "axes": { "up": "+y", "front": "+z" },
  "pieces": [
    {
      "name": "HEAD_BASE",
      "geometry": {
        "type": "custom",
        "params": {
          "vertices": [[0, 0, 0.2], [0.3, 0.6, 0.1], [-0.3, 0.6, 0.1]],
          "faces": [[0, 1, 2]]
        }
      }
    }
  ],
  "landmarks": {
    "eyeL": [-0.16, 0.66, 0.28],
    "eyeR": [0.16, 0.66, 0.28],
    "noseTip": [0, 0.54, 0.36],
    "mouth": [0, 0.38, 0.29],
    "earL": [-0.36, 0.58, 0.02],
    "earR": [0.36, 0.58, 0.02],
    "hairline": [0, 0.88, 0.2],
    "crown": [0, 1.12, 0.02],
    "chin": [0, 0.16, 0.2]
  }
}
```

Supported axes are:

- `{ "up": "+y", "front": "+z" }` for standard glTF-style exports.
- `{ "up": "+z", "front": "-y" }` for the older Z-up portrait export.

At runtime, `src/data/avatar/catalog/head-meshes.js` converts every head to canonical space:

- `+Y` is up.
- `+Z` points toward the face.
- The head is centered on X/Z.
- The bottom is normalized to `y = 0`.
- Height is normalized to `1.2`.
- Landmarks are transformed with the exact same axis conversion and normalization as vertices.

## Landmarks

Required landmarks:

| Key | Meaning |
|---|---|
| `eyeL`, `eyeR` | Surface points near the center of each eye. They define interocular scale. |
| `noseTip` | Nose tip on the front surface, below the eye line. |
| `mouth` | Center of the mouth mount area. |
| `earL`, `earR` | Side points for ear and ear-mounted accessory placement. |
| `hairline` | Front hairline cutoff used by the procedural hair helmet. |
| `crown` | Top of skull. Used for hair and vertical bounds. |
| `chin` | Lower face bound. Facial features must not drop below this. |

Run:

```powershell
node scripts/derive-head-landmarks.mjs
node scripts/derive-head-landmarks.mjs --write
```

The first command writes preview SVGs to `.tmp-head-views/`. The second also writes `axes` and `landmarks` into each source head JSON.

## Feature Contract

There is no separate checked-in `feature.json` file today. The effective feature contract is split across:

- preset catalog entries in `src/data/avatar/catalog/*-presets.js`
- SVG metadata such as `data-rv-role`
- mold mount roles and anchors in `src/data/avatar/catalog/head-molds.js`
- recipe placement in `recipe.features[key].placement`
- landmark projection in `src/modules/svg/svg-head-integration.js`

Placement fields:

| Field | Applies to | Meaning |
|---|---|---|
| `size` | all feature keys | Multiplicative scale, default `1`. |
| `offsetX` | all feature keys | Horizontal delta from the landmark. |
| `offsetY` | all feature keys | Vertical delta from the landmark. Positive follows SVG convention: down. |
| `spacing` | eyes only | Extra distance between mirrored eye parts. Brows follow eye spacing in the 3D mount plan. |

Facial feature scale is relative to skull size. `avatar-builder.js` computes the current head interocular distance divided by the reference interocular distance of `psx_mesh_portrait_01`; `svg-head-integration.js` applies that factor when mounting eyes, brows, nose and mouth.

## Hair Helmet

`src/modules/avatar/hair-helmet.js` replaces flat SVG hair with a procedural skull-following helmet when the head has landmarks and custom geometry.

The current styles are:

- `bowl`
- `cap`
- `buzz`
- `spikes`
- `ponytail`

The helmet is built in canonical head space from the head mesh, `hairline`, `crown`, eye height, ear height and chin. Current limitation: hair placement sliders do not move the procedural helmet because it replaces the SVG hair feature before landmark mounting.

## Audits And Captures

Primary gate:

```powershell
npm run check
```

This runs release readiness, template asset audit, and `scripts/avatar-visual-audit.mjs`.

The visual audit builds each registered head mold against the default feature bundle and checks:

- feature center distance to its landmark is at most `0.18` in normalized head-height units.
- `browEyeGap >= -0.02`
- `eyeNoseGap >= 0`
- `noseMouthGap >= 0.015`
- `mouthBottom <= 0.9`
- `earTop >= 0.38`
- feature bounds stay above `chin.y` and below `crown.y + 0.1`.

Manual capture sweeps:

```powershell
$env:CAPTURE_HEADS='1'; npx playwright test avatar-head-capture --reporter=line
$env:CAPTURE_BODIES='1'; npx playwright test avatar-body-capture --reporter=line
```

Head captures write to `.tmp-head-views/avatars/`. Body captures write to `.tmp-head-views/bodies/`.

## Adding A Head

1. Add the `head.json` source under `src/data/avatar/heads/`.
2. Include `axes`, `pieces[0].geometry.params.vertices`, `faces`, and the nine landmarks.
3. Register the JSON in `src/data/avatar/catalog/head-meshes.js`.
4. Add or map a mold in `src/data/avatar/catalog/head-molds.js`.
5. Run `node scripts/derive-head-landmarks.mjs` and inspect front/profile previews.
6. Run `npm run check`.

Reject the head if the face direction is ambiguous, the interocular distance is near zero, landmarks sit behind the visible surface, or the audit fails without a clear intentional exception.
