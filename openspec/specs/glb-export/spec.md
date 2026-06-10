## Purpose
Define how scenes and avatar-created humanoids are exported to `.glb`, including hierarchy preservation and animation binding.

## Requirements

### Requirement: Export scene to GLB
The system SHALL export to a binary .glb file using GLTFExporter. The export SHALL include PivotGroup hierarchy as glTF nodes. Animation clips SHALL be recompiled from raw animation definitions (`userData.animations`) against the cloned export group to ensure proper AnimationClip instances with correct track bindings to PivotGroup node names.

For groups with CharacterModel metadata and a resolved skeleton or animation profile, the export SHALL include the skeleton animations filtered by the assigned animation profile even when those clips were not embedded in `userData.animations`.

#### Scenario: Export with PivotGroup hierarchy
- **WHEN** the user exports a scene containing objects with PivotGroups
- **THEN** the .glb file SHALL contain the PivotGroup hierarchy as nested nodes, and meshes SHALL be positioned at their correct offsets within pivot nodes

#### Scenario: Export with animations on pivoted pieces
- **WHEN** a group has animations targeting pieces with pivots and the user clicks export
- **THEN** the .glb file SHALL contain animation clips where tracks reference PivotGroup node names, and rotations SHALL orbit around the pivot point when played in external viewers (Blender, Three.js viewer)

#### Scenario: Export CharacterModel with animation profile
- **WHEN** a group has CharacterModel metadata and an animation profile assigned and the user exports to GLB
- **THEN** the .glb SHALL include the animation clips resolved from the profile's skeleton, not only inline animations stored on the group

#### Scenario: Export from animation mode
- **WHEN** the user is in animation mode and clicks "EXPORTAR GLB"
- **THEN** only the animation mode object SHALL be exported with its full PivotGroup hierarchy and all animation clips

### Requirement: Node naming for GLB animation binding
During export preparation, each PivotGroup SHALL have its `name` property set from `userData.name` to ensure glTF animation tracks bind correctly to the pivot nodes. Mesh children of PivotGroups SHALL NOT have conflicting names.

#### Scenario: Animation track binding in exported GLB
- **WHEN** a .glb with animations is opened in Blender
- **THEN** animation tracks SHALL be bound to the correct pivot nodes and rotations SHALL occur around the pivot points

### Requirement: Export Avatar Forge humanoids with a neutral humanoid profile
Groups created by `Avatar Forge` SHALL export as standard humanoid GLB assets through the normal export path. Unless the user explicitly changes it later, those groups SHALL carry `HUMANOID_AVATAR_BASE` so their GLB export includes a neutral humanoid animation set.

#### Scenario: Export an avatar-created humanoid
- **WHEN** the user exports a group created by `Avatar Forge`
- **THEN** the GLB SHALL contain the rebuilt humanoid hierarchy and the clips resolved from `HUMANOID_AVATAR_BASE`

#### Scenario: Export an updated avatar after editing the recipe
- **WHEN** the user edits body or face presets in `Avatar Forge`, confirms the result, and exports that group
- **THEN** the GLB SHALL reflect the updated geometry while keeping the avatar humanoid and animation-ready
