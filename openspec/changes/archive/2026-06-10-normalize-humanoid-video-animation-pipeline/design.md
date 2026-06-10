## Context

Humanoid animation currently crosses several naming and proportion systems: legacy editor bones (`PELVIS`, `ARM_L_UPPER`), capture-only bones (`HUMANOID_CAPTURE`), default humanoid templates (`HUMANOID_DEFAULT`), and Fast Poser/Animateur names (`Hips`, `Left_Upper_Arm`). Video capture also has two concerns that must stay separate: fitting a visually good target model and applying motion deltas without stretching the model.

The target user outcome is practical: generated or existing humanoid models should look proportionate, and video-derived animations should import, preview, export, and replay on those models.

## Goals / Non-Goals

**Goals:**
- Establish `HUMANOID_STANDARD`/Fast Poser names as the interchange contract for humanoid animation.
- Keep existing legacy templates and saved models working through aliases during migration.
- Make Motion Ripper exports round-trip through the same standard animation format used by Animateur/Fast Poser.
- Ensure non-root bones preserve target rest positions while rotations are retargeted as deltas.
- Improve generated capture rigs so body proportions, head size, torso width, and limb thickness are visually acceptable.
- Add automated coverage for standard/legacy aliases, video capture animation generation, and roundtrip animation imports.

**Non-Goals:**
- Do not batch-migrate every humanoid template in one change.
- Do not remove `HUMANOID_DEFAULT` or `HUMANOID_CAPTURE` until compatibility and template migration are complete.
- Do not add a new external animation engine.
- Do not support arbitrary non-humanoid video retargeting in this change.

## Decisions

1. Use Fast Poser/Animateur naming as the standard interchange contract.
   - Rationale: the repo already has import/export code for `fast-poser-asset`, and the external format is better suited as a stable exchange layer than the internal capture vocabulary.
   - Alternative considered: use Mixamo directly. Rejected for now because it would require broader importer/exporter work while Fast Poser already exists in the codebase.

2. Keep a shared alias layer during migration.
   - Rationale: existing templates use legacy names, and immediate migration would be high risk. A shared resolver lets standard assets animate legacy templates while standard templates can still consume legacy animation definitions.
   - Alternative considered: rename all template nodes immediately. Rejected because it would create a large unrelated diff and make regressions hard to isolate.

3. Retarget rotations as rest-pose deltas and preserve non-root positions.
   - Rationale: video-captured transforms describe source-pose motion, not target-model proportions. Applying position tracks to child bones can stretch limbs and drift pivots.
   - Alternative considered: copy source rotations and positions verbatim. Rejected because it is the source of skinny/stretched results.

4. Treat visual rig fitting and animation retargeting as separate pipelines.
   - Rationale: good-looking generated models need stable proportions, while animation correctness needs clean transform deltas. Combining both into captured landmark coordinates makes visual quality depend on noisy input.
   - Alternative considered: derive all geometry widths from landmark spans. Rejected because side captures and narrow landmark spans create flat or skinny characters.

5. Migrate templates gradually.
   - Rationale: representative templates can prove compatibility before changing the full library. Aliases keep older assets functional.
   - Alternative considered: add `HUMANOID_STANDARD` and immediately deprecate legacy skeletons. Rejected because saved projects and current templates still depend on legacy names.

## Risks / Trade-offs

- Standard and legacy aliases may map one bone to an unexpected visual node → Mitigate with tests for representative templates and explicit alias precedence.
- Motion Ripper may produce valid rotations but visually poor output for low-confidence landmarks → Mitigate with confidence suppression, half-body handling, and preview/debug exports.
- Maintaining multiple skeleton ids temporarily increases complexity → Mitigate by centralizing alias and canonical-name helpers, then removing compatibility code only after migration.
- Fast Poser `Left_Shoulder` vs older `Left_Clavicle` naming can break older assets → Mitigate by accepting both on import and exporting the standard name.
- Generated capture rigs may look good in neutral pose but deform poorly in animation → Mitigate with skinned-rig tests, rest-pose delta retargeting, and visual spot checks during implementation.

## Migration Plan

1. Add the standard skeleton and shared alias/canonical-name helpers.
2. Make Motion Ripper and Fast Poser import/export use the standard contract while preserving legacy input.
3. Improve generated capture rig proportions and animation retargeting.
4. Add tests for standard/legacy interoperability and video animation roundtrips.
5. Migrate `capture_humanoid` and `mocap_human` templates first.
6. Migrate representative humanoids (`hero`, `skeleton`, `star_ranger`) after the compatibility layer is stable.
7. Only after coverage passes, plan a separate cleanup to deprecate `HUMANOID_CAPTURE` as an interchange format.

Rollback strategy: keep legacy skeleton files and aliases intact until the final cleanup change. If standard migration causes regressions, disable standard-template selection and continue loading legacy templates through existing ids.

## Open Questions

- Should the editor UI expose `HUMANOID_STANDARD` as the default for newly created humanoids before all bundled humanoid templates migrate?
- Should Motion Ripper's main export button download `fast-poser-asset` directly, or keep standard export inside debug JSON until the UX is finalized?
- Which templates beyond `hero`, `skeleton`, and `star_ranger` should become the acceptance set for visual regression checks?
