## 1. Preview Foundation

- [x] 1.1 Reframe Avatar Forge head focus from the canonical avatar front instead of feature-derived direction.
- [x] 1.2 Add an E2E assertion that head-focus camera position stays on the frontal side of the control target.
- [x] 1.3 Add or expose a compact preview diagnostic that reports focus mode, camera side, target, and head bounds for authoring captures.

## 2. First Feature Family: Eyes

- [x] 2.1 Pick the first eyes baseline preset and lock the representative probe recipe for validation.
- [x] 2.2 Measure current eyes bounds against the canonical mold: center, width, height, vertical position, spacing, and frontal-side placement.
- [x] 2.3 Adjust eyes anchor metadata or placement defaults until the baseline passes measurable thresholds.
- [x] 2.4 Capture a live Avatar Forge screenshot for the approved eyes baseline.
- [x] 2.5 Request human approval for the eyes baseline before generating additional eyes.

## 3. Eyes Variant Expansion

- [x] 3.1 Define the eyes variant template from the approved baseline placement model.
- [x] 3.2 Generate a small eyes variant batch from the template without changing the approved anchor model.
- [x] 3.3 Run geometry diagnostics and Playwright screenshots for every generated eyes variant.
- [x] 3.4 Add validation metadata that distinguishes generated variants from human-approved variants.

## 4. Sequential Feature Rollout

- [x] 4.1 Repeat the baseline-and-variant process for brows after eyes are approved.
- [x] 4.2 Repeat the process for nose, including frontal-side and depth checks.
- [x] 4.3 Repeat the process for mouth, including eye-mouth spacing checks.
- [x] 4.4 Repeat the process for ears and accessories after core face features are stable.
- [ ] 4.5 Repeat the process for hair last because front/back masses and clipping make it the highest-risk feature family.

## 5. SVG Roundtrip

- [ ] 5.1 Define the feature-level SVG metadata contract for role, mount target, source id, and viewBox.
- [ ] 5.2 Export one approved feature preset as SVG while preserving enough metadata for re-import.
- [ ] 5.3 Import an edited SVG back as the same feature role and validate it with the existing placement workflow.
- [ ] 5.4 Add a regression test that roundtripped SVG metadata survives export, edit, import, and validation.

## 6. Human Review Gates

- [x] 6.1 Document which screenshots and diagnostics are required before asking for human approval.
- [x] 6.2 Ask for human approval only after automated checks pass for a family baseline.
- [x] 6.3 Treat generated variants as machine-checkable until a style or readability conflict appears.
