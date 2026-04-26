## 1. Standard Humanoid Contract

- [x] 1.1 Add or verify `HUMANOID_STANDARD` with the 18 Fast Poser/Animateur humanoid bones and standard human proportions.
- [x] 1.2 Register `HUMANOID_STANDARD` in the skeleton registry with default humanoid slot bindings for head, torso, arms, legs, and hands.
- [ ] 1.3 Centralize standard, legacy, and capture bone aliases so `Hips`/`PELVIS`, `Spine`/`CHEST`, shoulders, limbs, hands, legs, and feet resolve through one lookup path.
- [ ] 1.4 Keep `HUMANOID_DEFAULT` and `HUMANOID_CAPTURE` loadable while standard templates migrate.
- [ ] 1.5 Add JSON validation or smoke coverage for `humanoid_standard.json`, `humanoid_capture.json`, and registered humanoid skeleton ids.

## 2. Capture Rig Proportions

- [ ] 2.1 Normalize capture target height to the standard humanoid height instead of the oversized capture-only height.
- [ ] 2.2 Rewrite the capture rest skeleton offsets so torso, neck, head, arms, and legs use human-looking proportions.
- [ ] 2.3 Replace landmark-span-only width heuristics with stable standard dimensions for torso, head, arms, forearms, legs, and shins.
- [ ] 2.4 Ensure side-view or narrow-silhouette captures still generate non-flat shoulders, torso, hips, arms, and legs.
- [ ] 2.5 Update generated capture character metadata so new capture models declare reusable humanoid rig and animation compatibility data.

## 3. Video Animation Retargeting

- [ ] 3.1 Implement a shared rest-delta quaternion retargeting path: `final = targetRest * (frame * inverse(referenceFrame))`.
- [ ] 3.2 Apply rest-delta rotation retargeting when building skinned capture animation definitions.
- [ ] 3.3 Apply rest-delta rotation retargeting when translating captured or imported tracks onto selected target groups.
- [ ] 3.4 Preserve root or hips motion while dropping or holding rest positions for non-root child bone position tracks.
- [ ] 3.5 Suppress low-confidence and half-body joints so unreliable lower-body or noisy tracks do not distort the target model.

## 4. Standard Animation Import And Export

- [ ] 4.1 Make Motion Ripper produce `fast-poser-asset` animation data with `format: "fast-poser-asset"`, `version: 1`, `type: "animation"`, and standard bone names.
- [ ] 4.2 Include the expected per-character suffixes in exported Fast Poser track names.
- [ ] 4.3 Accept both standard shoulder names and legacy clavicle names when importing older Fast Poser or Animateur assets.
- [ ] 4.4 Export playable rig UI clips as standard Fast Poser assets.
- [ ] 4.5 Report clear UI states when a video-derived animation import has no compatible tracks or only partially compatible tracks.

## 5. Template And Model Migration

- [ ] 5.1 Add or update capture-focused humanoid templates to use `HUMANOID_STANDARD` first.
- [ ] 5.2 Preserve legacy template compatibility through aliases before migrating representative bundled templates.
- [ ] 5.3 Migrate representative humanoid templates only after alias coverage passes.
- [ ] 5.4 Ensure generated skinned capture models serialize and re-import with rig metadata, source skeleton data, and playable animations.
- [ ] 5.5 Defer removal of `HUMANOID_CAPTURE` interchange support until a separate cleanup change after all affected templates migrate.

## 6. Verification

- [ ] 6.1 Add automated coverage for standard-to-legacy and legacy-to-standard humanoid alias resolution.
- [ ] 6.2 Add Fast Poser import/export roundtrip coverage for `Left_Shoulder`, `Right_Shoulder`, and legacy clavicle aliases.
- [ ] 6.3 Add Motion Ripper coverage for full-body and half-body captured takes, including skipped low-confidence tracks.
- [ ] 6.4 Add visual or geometry assertions that generated capture characters stay within the accepted human proportion range.
- [ ] 6.5 Verify that saved capture-generated models reload with playable captured animations.
- [ ] 6.6 Run syntax checks, `npm run check`, production build, and the relevant Playwright smoke specs before closing the change.
