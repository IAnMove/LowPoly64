## ADDED Requirements

### Requirement: Persist avatar recipe metadata for scene roundtrip
When a group originates from `Avatar Forge`, the system SHALL serialize its `avatarRecipe` metadata alongside the existing humanoid metadata so the avatar can be reopened and edited after `SAVE` and `LOAD`.

#### Scenario: Save and load a scene with an avatar-created group
- **WHEN** the user saves a scene containing a group created by `Avatar Forge` and later loads that scene
- **THEN** the system SHALL restore both the assembled humanoid geometry and the `avatarRecipe` needed to reopen that avatar in the builder

#### Scenario: Reopen Avatar Forge after load
- **WHEN** the user loads a scene with an avatar-created group and opens `Avatar Forge` on that group
- **THEN** the builder SHALL preload the saved `avatarRecipe` instead of starting from defaults

#### Scenario: Load scenes without avatar metadata
- **WHEN** the user loads a legacy scene or a group that has no `avatarRecipe`
- **THEN** the system SHALL load it exactly as before without requiring any avatar-specific fields
