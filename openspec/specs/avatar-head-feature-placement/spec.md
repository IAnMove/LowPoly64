# avatar-head-feature-placement Specification

## Purpose
TBD - created by archiving change avatar-head-mold-feature-controls. Update Purpose after archive.
## Requirements
### Requirement: Use a canonical head mold for new avatar sessions
The system SHALL start every new `Avatar Forge` session from a generated canonical head mold identified as `gen_head_heroic`. Old full-face head recipe fields SHALL be treated as compatibility input and normalized to the generated mold route before build.

#### Scenario: Start a new mold-based avatar
- **WHEN** the user opens a blank `Avatar Forge` session
- **THEN** the builder SHALL create a default recipe with `headBuildMode` set to `mold` and `headMoldId` set to `gen_head_heroic`

#### Scenario: Reopen an old avatar recipe
- **WHEN** the user opens an existing avatar whose recipe was saved with removed full-face head fields
- **THEN** the system SHALL migrate the editable recipe to the canonical mold path

### Requirement: Assemble detached facial features on the head mold
The system SHALL mount `eyes`, `brows`, `nose`, `mouth`, `ears`, and `hair` as separate feature groups over the active head mold instead of requiring a single full-face SVG source.

#### Scenario: Select a nose preset in mold mode
- **WHEN** the user changes the selected nose preset while editing a mold-based avatar
- **THEN** the preview SHALL rebuild the head using the active head mold and the newly selected detached nose feature

#### Scenario: Keep feature groups independent
- **WHEN** the user changes one detached facial feature in mold mode
- **THEN** the system SHALL update that feature group without requiring all other features to be reauthored as part of a single full-face asset

### Requirement: Provide per-avatar placement controls for detached features
For mold-based avatars, the system SHALL store and apply per-avatar placement controls for each movable feature group. The supported controls SHALL include `size`, `up/down`, and `left/right` for detached features, and `eyes` SHALL additionally support `spacing`. Paired features such as eyes, brows, and ears SHALL apply these controls symmetrically in the first iteration.

#### Scenario: Adjust eye spacing
- **WHEN** the user increases or decreases the eye spacing control on a mold-based avatar
- **THEN** the preview SHALL move the left and right eye pair symmetrically farther apart or closer together without changing the selected eye preset

#### Scenario: Adjust mouth position and size
- **WHEN** the user changes the mouth `size`, `up/down`, or `left/right` controls on a mold-based avatar
- **THEN** the preview SHALL keep the same mouth preset while applying the requested placement override on the active head mold

### Requirement: Provide approximate default placement for every mold feature preset
Every detached feature preset used in mold mode SHALL define an approximate default placement that lands in a readable location on the canonical head mold before the user applies manual controls.

#### Scenario: Switch to a new brow preset
- **WHEN** the user selects a brow preset that has not been manually adjusted on the current avatar
- **THEN** the brows SHALL appear in an approximately usable position on the head mold without requiring immediate manual correction
