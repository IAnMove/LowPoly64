## Purpose
Define how the properties panel reflects and edits object transforms and related state in the editor.

## Requirements

### Requirement: Bidirectional position/rotation/scale fields
The properties panel SHALL display numeric inputs for position (X/Y/Z), rotation (X/Y/Z in degrees), and scale (X/Y/Z). When a PivotGroup is selected, position SHALL reflect the PivotGroup's position (the pivot point), and rotation/scale SHALL reflect the PivotGroup's rotation/scale. Changes in the panel SHALL update the PivotGroup, and gizmo transforms SHALL update the panel.

#### Scenario: Edit position of pivoted piece via panel
- **WHEN** the user changes the position of a selected PivotGroup in the panel
- **THEN** the PivotGroup's position (pivot point) SHALL update, moving the entire piece (pivot + mesh together)

#### Scenario: Gizmo transform updates panel for PivotGroup
- **WHEN** the user drags the rotation gizmo on a selected PivotGroup
- **THEN** the rotation fields SHALL update in real-time and the piece SHALL rotate around the pivot point

### Requirement: Pivot indicator in properties panel
When a PivotGroup is selected, the properties panel SHALL display a visual indicator that the piece has a pivot, showing the piece name and that transforms apply to the pivot point.

#### Scenario: PivotGroup selected shows indicator
- **WHEN** a PivotGroup with `userData.name = "BRAZO_IZQ"` is selected
- **THEN** the properties panel SHALL show the name "BRAZO_IZQ" and the position fields SHALL reflect the pivot point position

