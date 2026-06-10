## MODIFIED Requirements

### Requirement: Export scene to GLB
The system SHALL export to a binary .glb file using GLTFExporter. The export SHALL include PivotGroup hierarchy as glTF nodes. Animation clips SHALL be recompiled from raw animation definitions (`userData.animations`) against the cloned export group to ensure proper AnimationClip instances with correct track bindings to PivotGroup node names.

For groups with CharacterModel metadata and a resolved skeleton/animation profile, the export SHALL include the skeleton's animations (filtered by the animation profile) even if they were not embedded in `userData.animations`.

#### Scenario: Export with PivotGroup hierarchy
- **WHEN** the user exports a scene containing objects with PivotGroups
- **THEN** the .glb file SHALL contain the PivotGroup hierarchy as nested nodes, and meshes SHALL be positioned at their correct offsets within pivot nodes

#### Scenario: Export with animations on pivoted pieces
- **WHEN** a group has animations targeting pieces with pivots and the user clicks export
- **THEN** the .glb file SHALL contain animation clips where tracks reference PivotGroup node names, and rotations SHALL orbit around the pivot point when played in external viewers (Blender, Three.js viewer)

#### Scenario: Export CharacterModel with animation profile
- **WHEN** a group has archetype metadata and an animation profile assigned, and the user exports to GLB
- **THEN** the .glb SHALL include the animation clips from the profile's skeleton, not just inline animations

#### Scenario: Export from animation mode
- **WHEN** the user is in animation mode and clicks "EXPORTAR GLB"
- **THEN** only the animation mode object SHALL be exported with its full PivotGroup hierarchy and all animation clips
