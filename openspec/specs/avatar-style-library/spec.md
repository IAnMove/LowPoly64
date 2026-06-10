## Purpose
Define the canonical expanded `Avatar Forge` style library, its metadata, and the rollout rules used to implement and validate the catalog.
## Requirements
### Requirement: Define a canonical target catalog for each visible style type
The system SHALL define a canonical `Avatar Forge` style library for the primary mold-based workflow. The visible primary selectors SHALL include `head mold`, `hair`, `eyes`, `brows`, `nose`, `mouth`, `ears`, `accessory`, and `palette`.

The primary catalog SHALL use explicit per-type minimums instead of assuming that every type needs the same count. At minimum, the canonical library SHALL define:

- `1` canonical `head mold`
- `5` planned `nose` presets
- `3` planned `ear` presets

Existing mature libraries such as `hair`, `eyes`, `brows`, `mouth`, `accessory`, and `palette` MAY keep their broader rollout targets. Legacy full-face head entries SHALL be tracked separately and SHALL NOT count as primary head mold coverage.

#### Scenario: Review planned catalog coverage
- **WHEN** maintainers inspect the change artifacts for the mold-based avatar library
- **THEN** they SHALL find named preset lists for the visible primary selectors, including a canonical head mold entry and explicit minimum coverage for noses and ears

### Requirement: Classify each preset with editorial and rollout metadata
The system SHALL associate each planned or implemented preset in the style library with metadata that includes `id`, `label`, `type`, `family`, `silhouetteGoal`, `compatibilityNotes`, `rolloutPass`, and `validationStatus`. Presets used by the mold-based head system SHALL additionally identify their `buildMode`, `mountRole`, and any `placementDefaults` needed to land in a readable position on the canonical head mold.

#### Scenario: Inspect a planned preset definition
- **WHEN** maintainers review a preset in the canonical style library definition
- **THEN** the preset SHALL include all required metadata fields and SHALL identify whether it belongs to the mold-based system or to a legacy fallback path

### Requirement: Preserve family balance and composable defaults across the catalog
The system SHALL preserve composable defaults across the primary mold-based catalog. Mature feature libraries SHALL continue to maintain useful family coverage where relevant, but primary head authoring SHALL NOT require parallel `PSX`, `N64`, and `Bridge` skull families. The first visible preset in each primary selector SHALL compose into a readable default avatar on the canonical head mold without manual placement changes.

#### Scenario: Build the default mold audit recipe
- **WHEN** the builder loads the first visible preset for each primary selector from the mold-based library
- **THEN** the resulting avatar SHALL remain legible in preview without relying on manual re-centering or immediate feature adjustments

### Requirement: Roll out the library in validated implementation passes
The system SHALL build the expanded style library in passes that can be implemented and visually reviewed independently, and a preset SHALL NOT be marked `validated` until it has been checked in the live app on `127.0.0.1:5178` with saved audit evidence.

#### Scenario: Close a rollout pass
- **WHEN** a batch of presets is marked complete
- **THEN** the corresponding presets SHALL only move to `validated` after live preview review and linked capture artifacts exist for that pass

