## ADDED Requirements

### Requirement: Transform modes
The system SHALL support three TransformControls modes: translate, rotate, and scale. The active mode SHALL be switchable via keyboard or UI.

#### Scenario: Switch to translate mode
- **WHEN** the user presses W or selects translate mode
- **THEN** TransformControls SHALL switch to "translate" mode showing position gizmo

#### Scenario: Switch to rotate mode
- **WHEN** the user presses E or selects rotate mode
- **THEN** TransformControls SHALL switch to "rotate" mode showing rotation gizmo

#### Scenario: Switch to scale mode
- **WHEN** the user presses R or selects scale mode
- **THEN** TransformControls SHALL switch to "scale" mode showing scale gizmo

### Requirement: Disable orbit during transform drag
OrbitControls SHALL be disabled while the user is dragging a TransformControls gizmo, and re-enabled when the drag ends.

#### Scenario: Orbit disabled during gizmo drag
- **WHEN** the user starts dragging a TransformControls gizmo
- **THEN** OrbitControls.enabled SHALL be set to false
- **WHEN** the user releases the gizmo
- **THEN** OrbitControls.enabled SHALL be set to true

### Requirement: Snap mode
The system SHALL support optional snapping for translate (0.5 units), rotate (15 degrees), and scale (0.25 units). Snap SHALL be toggleable.

#### Scenario: Snap enabled
- **WHEN** the user enables snap mode
- **THEN** TransformControls SHALL use translationSnap=0.5, rotationSnap=PI/12, and scaleSnap=0.25

#### Scenario: Snap disabled
- **WHEN** the user disables snap mode
- **THEN** TransformControls SHALL use no snapping (free movement)

### Requirement: Properties panel sync during transform
While dragging a TransformControls gizmo, the properties panel SHALL update in real-time to reflect the object's current position, rotation, and scale.

#### Scenario: Panel updates during drag
- **WHEN** the user drags a gizmo on the selected object
- **THEN** the position/rotation/scale fields in the properties panel SHALL update continuously
