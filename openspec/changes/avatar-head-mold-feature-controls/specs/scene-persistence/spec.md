## MODIFIED Requirements

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
