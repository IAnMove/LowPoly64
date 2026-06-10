## MODIFIED Requirements

### Requirement: Export scene to GLB
The system SHALL export to a binary .glb file using GLTFExporter. The export SHALL include PivotGroup hierarchy as glTF nodes. Animation clips SHALL be recompiled from raw animation definitions (`userData.animations`) against the cloned export group to ensure proper AnimationClip instances with correct track bindings to PivotGroup node names.

#### Scenario: Export with PivotGroup hierarchy
- **WHEN** the user exports a scene containing objects with PivotGroups
- **THEN** the .glb file SHALL contain the PivotGroup hierarchy as nested nodes, and meshes SHALL be positioned at their correct offsets within pivot nodes

#### Scenario: Export with animations on pivoted pieces
- **WHEN** a group has animations targeting pieces with pivots and the user clicks export
- **THEN** the .glb file SHALL contain animation clips where tracks reference PivotGroup node names, and rotations SHALL orbit around the pivot point when played in external viewers (Blender, Three.js viewer)

#### Scenario: Export from animation mode
- **WHEN** the user is in animation mode and clicks "EXPORTAR GLB"
- **THEN** only the animation mode object SHALL be exported with its full PivotGroup hierarchy and all animation clips

## ADDED Requirements

### Requirement: Node naming for GLB animation binding
During export preparation, each PivotGroup SHALL have its `name` property set from `userData.name` to ensure glTF animation tracks bind correctly to the pivot nodes. Mesh children of PivotGroups SHALL NOT have conflicting names.

#### Scenario: Animation track binding in exported GLB
- **WHEN** a .glb with animations is opened in Blender
- **THEN** animation tracks SHALL be bound to the correct pivot nodes and rotations SHALL occur around the pivot points
