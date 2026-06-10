## ADDED Requirements

### Requirement: Define a canonical target catalog for each visible style type
The system SHALL define a canonical `Avatar Forge` style library that includes at least 15 curated presets for each visible style selector: `head shape`, `hair`, `eyes`, `brows`, `mouth`, `accessory`, and `palette`. The accessory count SHALL exclude the optional `none` entry, and the canonical target SHALL explicitly keep `body mold` outside this 15-per-type goal.

#### Scenario: Review planned catalog coverage
- **WHEN** maintainers inspect the change artifacts for the expanded style library
- **THEN** they SHALL find a named preset list with at least 15 entries for each visible style type and a note that `body mold` is not part of this target

### Requirement: Classify each preset with editorial and rollout metadata
The system SHALL associate each planned or implemented preset in the style library with metadata that includes `id`, `label`, `type`, `family`, `silhouetteGoal`, `compatibilityNotes`, `rolloutPass`, and `validationStatus`.

#### Scenario: Inspect a planned preset definition
- **WHEN** maintainers review a preset in the canonical style library definition
- **THEN** the preset SHALL include all required metadata fields and SHALL identify whether it belongs to `PSX`, `N64`, or `Bridge`

### Requirement: Preserve family balance and composable defaults across the catalog
The system SHALL define the target library so that every visible style type includes `PSX`, `N64`, and `Bridge` coverage, and the first visible preset in each selector SHALL remain composable as part of a readable default avatar.

#### Scenario: Build the default audit recipe
- **WHEN** the builder loads the first visible preset for each selector from the expanded library
- **THEN** the resulting avatar SHALL remain legible in preview without relying on empty selectors or manual re-centering

### Requirement: Roll out the library in validated implementation passes
The system SHALL build the expanded style library in passes that can be implemented and visually reviewed independently, and a preset SHALL NOT be marked `validated` until it has been checked in the live app on `127.0.0.1:5178` with saved audit evidence.

#### Scenario: Close a rollout pass
- **WHEN** a batch of presets is marked complete
- **THEN** the corresponding presets SHALL only move to `validated` after live preview review and linked capture artifacts exist for that pass
