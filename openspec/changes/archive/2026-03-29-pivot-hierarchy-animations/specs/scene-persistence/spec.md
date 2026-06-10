## MODIFIED Requirements

### Requirement: Save scene to localStorage
The system SHALL serialize the current scene state to JSON and store it in localStorage. PivotGroup structures SHALL be serialized preserving the pivot position and mesh offset. Upon successful save, a toast notification "Escena guardada" SHALL appear for 2 seconds.

#### Scenario: Save scene with pivoted pieces
- **WHEN** the user clicks "SAVE" and the scene contains objects with PivotGroups
- **THEN** the scene SHALL be serialized with PivotGroup data (isPivot flag, pivot position, mesh offset) and stored in localStorage

### Requirement: Load scene from localStorage
The system SHALL reconstruct the scene from a previously saved JSON state in localStorage, including PivotGroup hierarchy. Before loading, it SHALL show a confirmation dialog.

#### Scenario: Load scene with pivoted pieces
- **WHEN** the user loads a saved scene that contains PivotGroup data
- **THEN** the system SHALL reconstruct PivotGroups with correct pivot positions, mesh offsets, and parent hierarchy

## ADDED Requirements

### Requirement: Serialize PivotGroup for scene JSON
When serializing a scene object, if a child is a Group with `userData.isPivot === true`, the system SHALL serialize it as type `"pivot"` including: name, pivot position, child mesh geometry/material/offset, and any nested PivotGroup children (for parent hierarchy).

#### Scenario: PivotGroup serialization roundtrip
- **WHEN** a scene with PivotGroup-based pieces is saved and then loaded
- **THEN** the loaded scene SHALL have identical PivotGroup structure with correct pivot positions and mesh offsets

### Requirement: Export group as import-compatible JSON with pivot/parent
`serializeGroupAsImportJSON` SHALL reconstruct `pivot` and `parent` fields from the PivotGroup hierarchy. For each PivotGroup: `pivot` is the PivotGroup position (in parent space), `position` is `pivot + mesh.position` (the visual position in parent space). If the PivotGroup is nested inside another PivotGroup, the `parent` field SHALL be set to the parent PivotGroup's name.

#### Scenario: JSON export with pivot
- **WHEN** a group with PivotGroup at `[0, 3.4, 0]` and mesh offset `[0, -0.6, 0]` is exported as JSON
- **THEN** the piece SHALL have `"position": [0, 2.8, 0]` and `"pivot": [0, 3.4, 0]`

#### Scenario: JSON export with parent hierarchy
- **WHEN** a group has `CABEZA` PivotGroup nested inside `TORSO` PivotGroup
- **THEN** the exported JSON SHALL have `CABEZA` piece with `"parent": "TORSO"` and position/pivot in TORSO's local space

#### Scenario: Import-export roundtrip fidelity
- **WHEN** a JSON with pivot and parent is imported, then exported via "COPIAR JSON"
- **THEN** the resulting JSON SHALL be functionally equivalent to the original (same hierarchy, same visual positions, same pivots)
