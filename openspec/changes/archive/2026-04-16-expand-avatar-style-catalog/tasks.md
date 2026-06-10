## 1. Catalog Foundation

- [x] 1.1 Split the avatar style catalog into maintainable modules by type or family while preserving stable preset ids.
- [x] 1.2 Encode the canonical 15-per-type target library, including editorial metadata for every planned preset.
- [x] 1.3 Add a catalog audit helper or check that reports counts, missing metadata, and family coverage for each visible style type.

## 2. Heavy Today: Head Shapes

- [x] 2.1 Implement the five PSX head shapes from the target catalog and validate them bald in the live app on `127.0.0.1:5178`.
- [x] 2.2 Implement the five N64 head shapes from the target catalog and validate them bald in the live app on `127.0.0.1:5178`.
- [x] 2.3 Implement the five Bridge head shapes from the target catalog and tune their neutral silhouette before adding hair or facial noise.
- [x] 2.4 Refit anchor, scale, and depth maps for eyes, brows, mouth, hair, ears, and accessories across all 15 head shapes.
- [x] 2.5 Capture front, side, and three-quarter audit shots for every completed head shape and mark only the reviewed ones as validated.

## 3. Heavy Today: Hair Expansion

- [x] 3.1 Implement the five PSX hair presets with matching front and back masses and validate clipping on representative PSX and Bridge heads.
- [x] 3.2 Implement the five N64 hair presets with chunkier silhouettes and validate clipping on representative N64 and Bridge heads.
- [x] 3.3 Implement the five Bridge hair presets and use them to close the neutral coverage gaps in the catalog.
- [x] 3.4 Run a hair-versus-head compatibility pass across the completed skulls and correct scale, overlap, and silhouette regressions.

## 4. Heavy Today: Eyes, Brows, and Mouths

- [x] 4.1 Implement the ten new eye presets beyond the current set and add per-head transforms where necessary to keep both eyes readable.
- [x] 4.2 Implement the eleven new brow presets beyond the current set and align them across PSX, N64, and Bridge head families.
- [x] 4.3 Implement the eleven new mouth presets beyond the current set and correct depth, centering, and vertical placement for each head family.
- [x] 4.4 Run a focused facial audit on all completed head shapes and fix buried, floating, asymmetric, or off-center features before marking the batch validated.

## 5. Accessories and Palettes

- [x] 5.1 Implement the twelve new accessories beyond the current set, including preset-specific offsets where required.
- [x] 5.2 Implement the nine new palettes beyond the current set and confirm that palette swaps remain legible with manual color overrides.
- [x] 5.3 Audit accessory stacking, head focus framing, and palette readability on representative PSX, N64, and Bridge recipes.

## 6. Forge Integration and QA

- [x] 6.1 Update `Avatar Forge` data loading and selector ordering to consume the expanded library without empty or broken defaults.
- [x] 6.2 Preserve a centered, repeatable head-review camera flow for head-related selectors without deforming the confirmed avatar output.
- [x] 6.3 Extend smoke coverage for expanded catalog browsing, default composition, and recipe persistence.
- [x] 6.4 Save audit captures for each completed rollout pass and update preset validation status from `planned` to `draft` to `validated`.
