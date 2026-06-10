## MODIFIED Requirements

### Requirement: Transform modes
The system SHALL support three TransformControls modes: translate, rotate, and scale. When a PivotGroup is the selected object, the gizmo SHALL be centered on the PivotGroup's position (the pivot point). Rotation and scale SHALL operate around the pivot point. Translation SHALL move the entire PivotGroup (pivot + child mesh together).

#### Scenario: Rotate pivoted piece via gizmo
- **WHEN** the user selects a PivotGroup and uses the rotation gizmo
- **THEN** the piece SHALL rotate around the pivot point (PivotGroup's position), not around the mesh geometry center

#### Scenario: Translate pivoted piece via gizmo
- **WHEN** the user selects a PivotGroup and uses the translate gizmo
- **THEN** the PivotGroup SHALL move, keeping the mesh offset intact, so the piece moves as a whole

#### Scenario: Scale pivoted piece via gizmo
- **WHEN** the user selects a PivotGroup and uses the scale gizmo
- **THEN** the piece SHALL scale from the pivot point outward
