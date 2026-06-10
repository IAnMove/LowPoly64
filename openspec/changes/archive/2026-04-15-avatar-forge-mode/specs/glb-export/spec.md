## ADDED Requirements

### Requirement: Export Avatar Forge humanoids with a neutral humanoid profile
Groups created by `Avatar Forge` SHALL export as standard humanoid GLB assets through the normal export path. Unless the user explicitly changes it later, those groups SHALL carry `HUMANOID_AVATAR_BASE` so their GLB export includes a neutral humanoid animation set.

#### Scenario: Export an avatar-created humanoid
- **WHEN** the user exports a group created by `Avatar Forge`
- **THEN** the GLB SHALL contain the rebuilt humanoid hierarchy and the clips resolved from `HUMANOID_AVATAR_BASE`

#### Scenario: Export an updated avatar after editing the recipe
- **WHEN** the user edits body or face presets in `Avatar Forge`, confirms the result, and exports that group
- **THEN** the GLB SHALL reflect the updated geometry while keeping the avatar humanoid and animation-ready
