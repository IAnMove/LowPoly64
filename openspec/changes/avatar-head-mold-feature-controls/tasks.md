## 1. Recipe And Catalog Contract

- [x] 1.1 Introduce `avatarRecipe` v2 with explicit `headBuildMode` support for `mold` and `legacy`.
- [x] 1.2 Add the canonical `head mold` catalog contract with `psx_mesh_portrait_01` as the only default mold for new sessions.
- [x] 1.3 Add new preset catalogs and metadata for detached `nose` and `ears` features, including `mountRole` and `placementDefaults`.
- [x] 1.4 Extend catalog audit or validation helpers so the mold-based library can track `head mold`, `nose`, `ears`, and legacy head entries separately.

## 2. Mold Head Runtime

- [x] 2.1 Implement a dedicated head builder path for `headBuildMode: mold` that starts from the canonical mesh head instead of a full-face SVG.
- [x] 2.2 Define and apply mount roles or anchors for `eyePair`, `browPair`, `nose`, `mouth`, `earPair`, and `hairCap` on the canonical head mold.
- [x] 2.3 Mount detached eyes, brows, nose, and mouth over the mold using preset defaults plus per-avatar placement overrides.
- [x] 2.4 Keep the current full-face SVG builder path intact for `legacy` recipes and ensure both routes can coexist without mode confusion.

## 3. Detached Feature Rollout

- [x] 3.1 Create the first usable nose preset batch and validate that each nose lands in a readable default position on the canonical head.
- [x] 3.2 Split ears out of the legacy head composition and mount them as detached mirrored features in mold mode.
- [x] 3.3 Re-anchor hair against the canonical head mold so future hair fitting no longer depends on the removed multi-skull workflow.
- [x] 3.4 Define default mold-mode feature bundles that produce a readable face before any manual slider adjustment.

## 4. Avatar Forge UI Controls

- [x] 4.1 Make blank `Avatar Forge` sessions start in mold mode with `psx_mesh_portrait_01` as the active base head.
- [x] 4.2 Add mold-mode selectors for `nose` and `ears` and update the compact character sheet to show head mode and detached feature choices.
- [x] 4.3 Add per-feature controls for `size`, `up/down`, and `left/right`, plus `spacing` for eyes.
- [x] 4.4 Keep legacy recipes editable in the builder while hiding or disabling mold-only controls when the loaded avatar stays on the legacy path.

## 5. Persistence And Compatibility

- [x] 5.1 Persist mold-mode recipes with exact feature ids and placement overrides through `SAVE` and `LOAD`.
- [x] 5.2 Preserve legacy recipes as legacy recipes when reopening saved scenes or existing avatar-created groups.
- [x] 5.3 Normalize preview and confirm flows so both head modes still output a rig-ready `HUMANOID` group with stable `avatarRecipe` metadata.

## 6. Validation And Rollout

- [x] 6.1 Add or update automated tests for mold-mode defaults, feature controls, mold/legacy reopen behavior, and persistence roundtrips.
- [x] 6.2 Validate the canonical mold flow in the live app on `127.0.0.1:5178` with saved captures for blank defaults, nose presets, and placement controls.
- [x] 6.3 Review the remaining legacy head entries and document which stay as fallback only, which become hidden, and which can be removed after the mold path is stable.
