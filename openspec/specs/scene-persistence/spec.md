## Purpose
Define saving and loading scene state, including PivotGroup structure and avatar metadata roundtrips.
## Requirements
### Requirement: Save scene to localStorage
The system SHALL serialize the current scene state to JSON and store it in localStorage. PivotGroup structures SHALL be serialized preserving the pivot position and mesh offset. Upon successful save, a toast notification "Escena guardada" SHALL appear for 2 seconds.

When serializing groups that carry CharacterModel metadata (`userData.archetype`, `userData.slotMap`, `userData.animationProfile`, `userData.skeletonId`, `userData.slotBindings`), the system SHALL include that metadata in the serialized object so it can be restored on load.

#### Scenario: Save scene with pivoted pieces
- **WHEN** the user clicks "SAVE" and the scene contains objects with PivotGroups
- **THEN** the scene SHALL be serialized with PivotGroup data (isPivot flag, pivot position, mesh offset) and stored in localStorage

#### Scenario: Save scene with CharacterModel metadata
- **WHEN** the scene contains a group with archetype metadata and slot bindings
- **THEN** the serialized scene SHALL include `archetype`, `slotMap`, `animationProfile`, `skeletonId`, and `slotBindings` for that group

### Requirement: Load scene from localStorage
The system SHALL reconstruct the scene from a previously saved JSON state in localStorage, including PivotGroup hierarchy. Before loading, it SHALL show a confirmation dialog.

When loading groups that contain serialized CharacterModel metadata, the system SHALL restore `userData.archetype`, `userData.slotMap`, `userData.animationProfile`, `userData.skeletonId`, and `userData.slotBindings`.

#### Scenario: Load scene with pivoted pieces
- **WHEN** the user loads a saved scene that contains PivotGroup data
- **THEN** the system SHALL reconstruct PivotGroups with correct pivot positions, mesh offsets, and parent hierarchy

#### Scenario: Load scene with CharacterModel metadata
- **WHEN** the user loads a scene that was saved with CharacterModel metadata
- **THEN** the loaded group SHALL regain its archetype and slot metadata so the rig workflow can continue without reimporting

### Requirement: Serialize PivotGroup for scene JSON
When serializing a scene object, if a child is a Group with `userData.isPivot === true`, the system SHALL serialize it as type `"pivot"` including: name, pivot position, child mesh geometry/material/offset, and any nested PivotGroup children (for parent hierarchy).

#### Scenario: PivotGroup serialization roundtrip
- **WHEN** a scene with PivotGroup-based pieces is saved and then loaded
- **THEN** the loaded scene SHALL have identical PivotGroup structure with correct pivot positions and mesh offsets

### Requirement: Export group as import-compatible JSON with pivot/parent
`serializeGroupAsImportJSON` SHALL reconstruct `pivot` and `parent` fields from the PivotGroup hierarchy. For each PivotGroup: `pivot` is the PivotGroup position (in parent space), `position` is `pivot + mesh.position` (the visual position in parent space). If the PivotGroup is nested inside another PivotGroup, the `parent` field SHALL be set to the parent PivotGroup's name.

When the group has CharacterModel metadata, `serializeGroupAsImportJSON` SHALL be able to produce either the legacy flat format or the CharacterModel format based on the requested export option.

#### Scenario: JSON export with pivot
- **WHEN** a group with PivotGroup at `[0, 3.4, 0]` and mesh offset `[0, -0.6, 0]` is exported as JSON
- **THEN** the piece SHALL have `"position": [0, 2.8, 0]` and `"pivot": [0, 3.4, 0]`

#### Scenario: JSON export with parent hierarchy
- **WHEN** a group has `CABEZA` PivotGroup nested inside `TORSO` PivotGroup
- **THEN** the exported JSON SHALL have `CABEZA` piece with `"parent": "TORSO"` and position/pivot in TORSO's local space

#### Scenario: JSON export as CharacterModel format
- **WHEN** a group with CharacterModel metadata is exported with the CharacterModel format option
- **THEN** the output SHALL use `{ name, archetype, slots: [...], animationProfile }` instead of the legacy flat `pieces[]` format

#### Scenario: Import-export roundtrip fidelity
- **WHEN** a JSON with pivot and parent is imported, then exported via "COPIAR JSON"
- **THEN** the resulting JSON SHALL be functionally equivalent to the original (same hierarchy, same visual positions, same pivots)

### Requirement: Persist avatar recipe metadata for scene roundtrip
When a group originates from `Avatar Forge`, the system SHALL serialize its `avatarRecipe` metadata alongside the existing humanoid metadata so the avatar can be reopened and edited after `SAVE` and `LOAD`.

For mold-based avatars, the serialized recipe SHALL preserve the active `headBuildMode`, `headMoldId`, selected feature preset ids, and all placement overrides required to rebuild the face exactly. For legacy avatars, the serialized recipe SHALL preserve the legacy head route without forced migration.

#### Scenario: Save and load a scene with a mold-based avatar-created group
- **WHEN** the user saves a scene containing a group created by `Avatar Forge` in mold mode and later loads that scene
- **THEN** the system SHALL restore both the assembled humanoid geometry and the exact mold-based `avatarRecipe`, including feature placement overrides

#### Scenario: Reopen Avatar Forge after load
- **WHEN** the user loads a scene with an avatar-created group and opens `Avatar Forge` on that group
- **THEN** the builder SHALL preload the saved `avatarRecipe` in its original head build mode instead of starting from defaults

#### Scenario: Load scenes without avatar metadata
- **WHEN** the user loads a legacy scene or a group that has no `avatarRecipe`
- **THEN** the system SHALL load it exactly as before without requiring any avatar-specific fields

