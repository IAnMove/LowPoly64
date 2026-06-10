## MODIFIED Requirements

### Requirement: GLB export scope
The system SHALL export only the selected objects when there is an active selection (single or multi-select). When no objects are selected, the system SHALL export all objects in the scene. The export button text SHALL reflect the current mode: "EXPORTAR SELECCIÓN" when objects are selected, "EXPORTAR GLB" when nothing is selected.

#### Scenario: Export selected objects
- **WHEN** user selects 2 objects and clicks export
- **THEN** only those 2 objects are included in the GLB file

#### Scenario: Export all when nothing selected
- **WHEN** no objects are selected and user clicks export
- **THEN** all objects in userObjects are exported (current behavior)

#### Scenario: Export single selected
- **WHEN** user selects one mesh and clicks export
- **THEN** only that mesh is included in the GLB file

## ADDED Requirements

### Requirement: GLB export with animations
The system SHALL include AnimationClip data when exporting objects that have animations. The GLTFExporter SHALL receive the clips in its `animations` option. Exported GLB files SHALL be playable in standard glTF viewers.

#### Scenario: Export animated group
- **WHEN** user exports a group that has 2 animation clips
- **THEN** the GLB file contains both animations and they play in glTF viewers like https://gltf-viewer.donmccurdy.com/

#### Scenario: Export mix of animated and static
- **WHEN** user exports a scene with animated and non-animated objects
- **THEN** only the animation clips from animated objects are included, static objects export normally
