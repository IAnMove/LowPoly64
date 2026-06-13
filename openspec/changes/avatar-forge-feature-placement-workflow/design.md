## Context

Avatar Forge now builds new avatars through a `head mold` route with detached features, but the fitting process is still too easy to expand in the wrong order. If a base eye, nose, mouth, ear, hair piece, or accessory is not placed correctly, every derived preset inherits the same bad anchor. The preview also needs to be trustworthy: head review must show the avatar front, otherwise visual approval is noisy.

The repo already has useful pieces for this: `avatarRecipe` feature placement fields, catalog audits, `compileAvatarHeadSvg`, Playwright tests, and SVG import metadata. The missing part is a disciplined authoring loop that turns these pieces into a repeatable workflow.

## Goals / Non-Goals

**Goals:**
- Make the head-review preview front-facing and comparable for every head-related selection.
- Work one feature family at a time, with `eyes` as the first recommended item.
- Establish one approved base preset before generating variants.
- Use automated diagnostics wherever the issue is measurable: bounds, center, scale, spacing, z-side and screenshot capture.
- Call out human review only where judgement is actually needed.
- Prepare SVG import/export as a final phase for LLM-assisted edits without forcing it into the first placement pass.

**Non-Goals:**
- Do not generate a large new catalog before the first feature family is approved.
- Do not add asymmetric per-side controls in this change.
- Do not replace the existing SVG Workbench.
- Do not promise full freeform sculpting, mesh editing, or blendshapes.
- Do not preserve the removed full-face SVG head route as a second authoring path.

## Decisions

### 1. Head review uses canonical avatar front

**Decision:** head-focus camera framing SHALL use the canonical mold front direction instead of inferring front from nose or feature geometry. Incoming old recipes are normalized to the mold route before preview/build.

**Why:** feature geometry is exactly what is under review. If the camera follows a misplaced feature, it can frame the back side and hide the real placement bug.

**Alternatives considered:**
- Infer from nose bounds. Rejected because mold-mode features can live on the wrong side during placement work.
- Keep the three-quarter full-body view. Rejected because it is less useful for item-by-item facial review.

### 2. Eyes are the first authoring target

**Decision:** the first placement pass SHOULD target one eye preset pair on the canonical mold before any other feature family.

**Why:** eyes are symmetric, highly visible, and measurable with center, width, height, spacing and frontal-side checks. If eyes are correct, the same anchor workflow can be reused for brows, nose and mouth.

**Alternatives considered:**
- Start with accessories. Rejected because accessories have more mount roles and styling ambiguity.
- Start with hair. Rejected because hair has front/back mass and clipping complexity.

### 3. Variants are generated only after a base preset is approved

**Decision:** each feature family SHALL have a base preset with approved anchors and validation evidence before variants are added.

**Why:** this prevents multiplying bad coordinates. Variants should change silhouette and style, not re-solve base placement from scratch.

**Alternatives considered:**
- Generate a batch and fix outliers later. Rejected because the catalog already shows the cost of that approach.

### 4. Validation combines geometry and screenshots

**Decision:** each placement pass uses two validation layers:

- geometry metrics from SVG boxes and built Three.js bounds
- Playwright screenshots of the live Avatar Forge preview

**Why:** metrics catch obvious placement errors quickly, while screenshots catch artistic and readability issues metrics cannot decide.

**Alternatives considered:**
- Screenshot-only approval. Rejected because it is slower and less reproducible.
- Metrics-only approval. Rejected because faces can pass bounds while still looking wrong.

### 5. Human intervention is explicit and narrow

**Decision:** human approval is required at gates, not during every coordinate adjustment.

Human review is needed for:
- approving the first base preset for a family
- choosing whether the style reads correctly
- accepting generated SVG edits from an LLM or external tool
- deciding exceptions where metrics and visual intent conflict

Human review is not required for:
- measuring bounds
- moving a feature to meet an approved target range
- running Playwright captures
- generating variants from an approved template and checking them against existing thresholds

### 6. SVG roundtrip is a later phase with metadata

**Decision:** SVG import/export for individual features should use existing SVG concepts (`data-rv-role`, mount target, viewBox, source metadata) and add only the missing feature-level contract.

**Why:** the app already knows how to extrude/import SVG. The new requirement is keeping feature identity and mount metadata stable enough that an exported object can be edited by an LLM and re-imported as the same feature type.

**Alternatives considered:**
- Add a new standalone SVG editor. Rejected because it duplicates the SVG Workbench.
- Store only raw SVG without metadata. Rejected because re-import would lose feature role and placement intent.

## Risks / Trade-offs

- [A base preset passes metrics but looks wrong] -> Mitigation: keep screenshot approval as a required gate.
- [Human review becomes a bottleneck] -> Mitigation: require it only at family base approval and ambiguous style decisions.
- [SVG roundtrip scope grows too large] -> Mitigation: keep it as a final phase after eyes and at least one more feature family are stable.
- [Variant generation repeats placement mistakes] -> Mitigation: variants cannot start until a base preset has validation evidence.
- [Old saved recipes contain removed head fields] -> Mitigation: normalize them to the default mold route before build and document that behavior.

## Migration Plan

1. Land the front-facing head preview and E2E assertion.
2. Add an authoring checklist and diagnostics for the first `eyes` preset.
3. Tune one eyes baseline on the canonical mold until screenshots and metrics pass.
4. Ask for human approval of that first eyes baseline.
5. Generate a small eyes variant batch from the approved baseline and run the same diagnostics.
6. Repeat for brows, nose, mouth, ears, accessories and hair in that order unless product priority changes.
7. Add SVG export/import roundtrip after the placement workflow is stable enough to preserve feature metadata.

Rollback is simple for the camera fix: restore the old offset logic. Rollback for catalog changes should remove only the current feature-family batch and keep already approved families intact.

## Open Questions

- Should the first approved eyes baseline target a neutral Mii-like shape or a PSX sharper shape?
- Which feature family follows eyes: brows for direct pairing, or nose because it exposes depth/frontal-side issues?
- Should SVG roundtrip start as developer-only metadata export before becoming visible in the Avatar Forge UI?
